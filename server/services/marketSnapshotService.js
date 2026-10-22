import { marketDataService } from './marketDataService.js';
import { getRecentPrices, calculateTechnicalStructure } from './priceImportService.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { logApiCall } from './apiLoggerService.js';

// Cost control: Cache snapshots for 5 minutes (300,000ms)
const snapshotCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function buildMarketSnapshot({ eventId = null, pair = 'XAUUSD', forceRefresh = false } = {}) {
  const normalizedPair = pair.toUpperCase();
  const cacheKey = `${normalizedPair}_${eventId || 'none'}`;

  if (!forceRefresh && snapshotCache.has(cacheKey)) {
    const cached = snapshotCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug(`[Market Snapshot] Returning cached snapshot for ${cacheKey}`);
      return cached.data;
    }
  }

  const startTime = Date.now();
  logger.info(`Building point-in-time Market Snapshot for ${normalizedPair} (Event: ${eventId || 'None'})...`);

  try {
    // 1. Fetch cross-asset rates, yields, sentiment, and COT
    const macroData = await marketDataService.getMacroMarketData();

    // 2. Fetch candles and compute technical structure
    const candles = await getRecentPrices(pair, 'M15', 50);
    const technicalStructure = calculateTechnicalStructure(candles, pair);

    // 3. Assemble complete snapshot record
    const snapshotRecord = {
      event_id: eventId,
      pair: pair.toUpperCase(),
      snapshot_time: new Date().toISOString(),
      us_2y_yield: macroData.us_2y_yield,
      us_10y_yield: macroData.us_10y_yield,
      us_real_yield: macroData.us_real_yield,
      dxy: macroData.dxy,
      jgb_yield: macroData.jgb_yield,
      us_jp_spread: macroData.us_jp_spread,
      spx: macroData.spx,
      nasdaq: macroData.nasdaq,
      vix: macroData.vix,
      oil_wti: macroData.oil_wti,
      cot_gold_net: macroData.cot_gold_net,
      cot_jpy_net: macroData.cot_jpy_net,
      technical_summary: technicalStructure,
      central_bank_tone: macroData.central_bank_tone,
      source_name: macroData.source_name || 'Yahoo Finance Live Market Feed',
      last_updated: macroData.last_updated || new Date().toISOString(),
      is_stale: Boolean(macroData.is_stale),
      is_demo: Boolean(macroData.is_demo)
    };

    // 4. Save to Supabase if connected
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('market_snapshots')
        .insert(snapshotRecord)
        .select()
        .single();

      if (!error && data) {
        await logApiCall({
          provider: 'market_snapshot_builder',
          endpoint: 'market_snapshots:insert',
          statusCode: 200,
          latencyMs: Date.now() - startTime,
          success: true
        });
        snapshotCache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      }
    }

    snapshotCache.set(cacheKey, { timestamp: Date.now(), data: snapshotRecord });
    return snapshotRecord;
  } catch (err) {
    logger.error('Failed to build market snapshot', { pair, eventId, error: err.message });
    throw err;
  }
}

export async function getLatestSnapshotForPair(pair = 'XAUUSD') {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('market_snapshots')
        .select('*')
        .eq('pair', pair.toUpperCase())
        .order('snapshot_time', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) return data;
    }

    // Otherwise build on the fly
    return await buildMarketSnapshot({ pair });
  } catch (err) {
    logger.warn('Could not fetch stored snapshot, building fresh one', { pair, error: err.message });
    return await buildMarketSnapshot({ pair });
  }
}
