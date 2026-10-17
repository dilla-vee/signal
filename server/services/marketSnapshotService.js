import { marketDataService } from './marketDataService.js';
import { getRecentPrices, calculateTechnicalStructure } from './priceImportService.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { logApiCall } from './apiLoggerService.js';

export async function buildMarketSnapshot({ eventId = null, pair = 'XAUUSD' } = {}) {
  const startTime = Date.now();
  logger.info(`Building point-in-time Market Snapshot for ${pair} (Event: ${eventId || 'None'})...`);

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
      central_bank_tone: macroData.central_bank_tone
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
        return data;
      }
    }

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
