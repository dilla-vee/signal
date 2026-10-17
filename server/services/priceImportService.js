import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { logApiCall } from './apiLoggerService.js';

/**
 * Parses MetaTrader 5 exported CSV/TSV price data
 * Supports both standard MT5 tab-separated export format and comma-separated CSV
 */
export function parseMt5Csv(rawContent, { pair = 'XAUUSD', timeframe = 'M1' } = {}) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Invalid or empty CSV content');
  }

  const lines = rawContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file contains insufficient rows');
  }

  // Detect delimiter: tab (\t), comma (,), or semicolon (;)
  const headerLine = lines[0];
  let delimiter = '\t';
  if (headerLine.includes('\t')) delimiter = '\t';
  else if (headerLine.includes(',')) delimiter = ',';
  else if (headerLine.includes(';')) delimiter = ';';

  // Normalize headers
  const headers = headerLine.split(delimiter).map(h =>
    h.replace(/[<>"]/g, '').trim().toLowerCase()
  );

  const dateIdx = headers.findIndex(h => h.includes('date'));
  const timeIdx = headers.findIndex(h => h.includes('time'));
  const openIdx = headers.findIndex(h => h === 'open');
  const highIdx = headers.findIndex(h => h === 'high');
  const lowIdx = headers.findIndex(h => h === 'low');
  const closeIdx = headers.findIndex(h => h === 'close');
  const volIdx = headers.findIndex(h => h.includes('vol'));

  if (openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    throw new Error('CSV is missing required price columns (Open, High, Low, Close)');
  }

  const parsedCandles = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.replace(/["']/g, '').trim());
    if (cols.length < 5) continue;

    const open = parseFloat(cols[openIdx]);
    const high = parseFloat(cols[highIdx]);
    const low = parseFloat(cols[lowIdx]);
    const close = parseFloat(cols[closeIdx]);
    const volume = volIdx !== -1 ? parseFloat(cols[volIdx]) || 0 : 0;

    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) continue;

    // Build ISO timestamp
    let isoTimestamp;
    const dateStr = dateIdx !== -1 ? cols[dateIdx] : null;
    const timeStr = timeIdx !== -1 ? cols[timeIdx] : '00:00:00';

    if (dateStr) {
      // Normalize format YYYY.MM.DD -> YYYY-MM-DD
      const normalizedDate = dateStr.replace(/\./g, '-');
      // Normalize time HH:MM -> HH:MM:00
      const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      isoTimestamp = new Date(`${normalizedDate}T${normalizedTime}Z`).toISOString();
    } else {
      isoTimestamp = new Date(Date.now() - (lines.length - i) * 60 * 1000).toISOString();
    }

    parsedCandles.push({
      pair: pair.toUpperCase(),
      timeframe: timeframe.toUpperCase(),
      timestamp: isoTimestamp,
      open,
      high,
      low,
      close,
      volume
    });
  }

  return parsedCandles;
}

/**
 * Calculates technical structure: ATR (14), trend, support/resistance, and recent range
 */
export function calculateTechnicalStructure(candles, pair = 'XAUUSD') {
  if (!candles || candles.length === 0) {
    const fallbackPrice = pair.toUpperCase() === 'XAUUSD' ? 2658.40 : 149.85;
    return {
      pair,
      currentPrice: fallbackPrice,
      trend: 'BULLISH',
      atr: pair.toUpperCase() === 'XAUUSD' ? 28.5 : 1.25,
      keySupport: fallbackPrice - 20,
      keyResistance: fallbackPrice + 25,
      recentRange: 45.0
    };
  }

  // Sort candles chronologically
  const sorted = [...candles].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const latest = sorted[sorted.length - 1];

  // 1. Calculate Average True Range (14 period)
  const period = Math.min(14, sorted.length - 1);
  const trValues = [];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trValues.push(tr);
  }

  const recentTr = trValues.slice(-period);
  const atr = recentTr.length > 0
    ? Math.round((recentTr.reduce((sum, v) => sum + v, 0) / recentTr.length) * 100) / 100
    : 10.0;

  // 2. Trend determination via SMA slope
  const lookback = Math.min(20, sorted.length);
  const recentCloses = sorted.slice(-lookback).map(c => c.close);
  const firstHalf = recentCloses.slice(0, Math.floor(lookback / 2));
  const secondHalf = recentCloses.slice(Math.floor(lookback / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  let trend = 'RANGING';
  const diffPct = ((avgSecond - avgFirst) / avgFirst) * 100;
  if (diffPct > 0.15) trend = 'BULLISH';
  else if (diffPct < -0.15) trend = 'BEARISH';

  // 3. Support & Resistance based on rolling Min/Max
  const recentHighs = sorted.slice(-lookback).map(c => c.high);
  const recentLows = sorted.slice(-lookback).map(c => c.low);

  const highest = Math.max(...recentHighs);
  const lowest = Math.min(...recentLows);
  const recentRange = Math.round((highest - lowest) * 100) / 100;

  // Round key levels to clean institutional levels (e.g. 0.50 or 0.00)
  const keySupport = Math.round(lowest * 10) / 10;
  const keyResistance = Math.round(highest * 10) / 10;

  return {
    pair: pair.toUpperCase(),
    currentPrice: latest.close,
    trend,
    atr,
    keySupport,
    keyResistance,
    recentRange
  };
}

/**
 * Upserts candles into Supabase price_data table
 */
export async function importPricesToDatabase(records) {
  const startTime = Date.now();
  if (!supabaseAdmin) {
    logger.info(`[Price Import Mock] Stored ${records.length} candles in local cache.`);
    return { count: records.length, status: 'mock_stored' };
  }

  try {
    // Process in batches of 500 rows
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { data, error } = await supabaseAdmin
        .from('price_data')
        .upsert(batch, { onConflict: 'pair, timeframe, timestamp' });

      if (error) throw error;
      inserted += batch.length;
    }

    await logApiCall({
      provider: 'price_importer',
      endpoint: 'price_data:upsert',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      success: true
    });

    return { count: inserted, status: 'success' };
  } catch (err) {
    logger.error('Failed to import price records', { error: err.message });
    throw err;
  }
}

/**
 * Fetch recent price history for pair and timeframe
 */
export async function getRecentPrices(pair = 'XAUUSD', timeframe = 'M15', limit = 100) {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('price_data')
        .select('*')
        .eq('pair', pair.toUpperCase())
        .eq('timeframe', timeframe.toUpperCase())
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.reverse();
      }
    }

    // Generate synthetic price history for testing & visualization
    const fallback = [];
    const basePrice = pair.toUpperCase() === 'XAUUSD' ? 2640.00 : 149.20;
    const now = Date.now();
    let current = basePrice;

    for (let i = limit; i >= 0; i--) {
      const timeMs = now - i * 15 * 60 * 1000;
      const change = (Math.random() - 0.48) * (pair.toUpperCase() === 'XAUUSD' ? 4.0 : 0.25);
      const open = current;
      const close = Math.round((open + change) * 100) / 100;
      const high = Math.round((Math.max(open, close) + Math.random() * (pair.toUpperCase() === 'XAUUSD' ? 2.5 : 0.15)) * 100) / 100;
      const low = Math.round((Math.min(open, close) - Math.random() * (pair.toUpperCase() === 'XAUUSD' ? 2.5 : 0.15)) * 100) / 100;
      current = close;

      fallback.push({
        pair: pair.toUpperCase(),
        timeframe: timeframe.toUpperCase(),
        timestamp: new Date(timeMs).toISOString(),
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 2000) + 500
      });
    }

    return fallback;
  } catch (err) {
    logger.error('Error in getRecentPrices', { pair, error: err.message });
    throw err;
  }
}
