import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { riskFilterService } from '../services/riskFilterService.js';

describe('Phase 6: Pre-News Risk & MT5 EA Integration Tests', () => {
  test('riskFilterService calculates accurate no-trade windows with countdown seconds', async () => {
    const windows = await riskFilterService.getNoTradeWindows({ preMinutes: 15, postMinutes: 15 });

    assert.ok(Array.isArray(windows));
    assert.ok(windows.length > 0);

    const first = windows[0];
    assert.ok(first.event_id);
    assert.ok(first.event_name);
    assert.ok(first.currency);
    assert.ok(first.release_time_utc);
    assert.ok(first.no_trade_start_utc);
    assert.ok(first.no_trade_end_utc);
    assert.ok(['CLEAR', 'APPROACHING', 'IN_LOCKDOWN'].includes(first.window_status));
    assert.ok(typeof first.countdown_seconds === 'number');

    // Verify 15-minute buffer arithmetic
    const releaseMs = new Date(first.release_time_utc).getTime();
    const startMs = new Date(first.no_trade_start_utc).getTime();
    const endMs = new Date(first.no_trade_end_utc).getTime();

    assert.equal(releaseMs - startMs, 15 * 60 * 1000);
    assert.equal(endMs - releaseMs, 15 * 60 * 1000);
  });

  test('riskFilterService returns empirical spread widening forecasts for Gold and JPY crosses', () => {
    const matrix = riskFilterService.getSpreadWideningMatrix();

    assert.ok(Array.isArray(matrix));
    assert.equal(matrix.length, 5);

    const gold = matrix.find(m => m.pair === 'XAUUSD');
    assert.ok(gold);
    assert.equal(gold.riskTier, 'EXTREME');
    assert.ok(gold.newsSpikeSpread.includes('$'));

    const gbpjpy = matrix.find(m => m.pair === 'GBPJPY');
    assert.ok(gbpjpy);
    assert.equal(gbpjpy.riskTier, 'EXTREME');
    assert.ok(gbpjpy.newsSpikeSpread.includes('15.0'));
  });

  test('riskFilterService generates valid JSON and CSV formats for MT5 Expert Advisor filter', async () => {
    // 1. JSON Export
    const jsonExport = await riskFilterService.generateMt5Export({ format: 'json', preMinutes: 15, postMinutes: 15 });
    assert.equal(jsonExport.format, 'json');
    assert.equal(jsonExport.contentType, 'application/json');
    assert.ok(jsonExport.filename.endsWith('.json'));

    const parsedJson = JSON.parse(jsonExport.content);
    assert.ok(Array.isArray(parsedJson));
    assert.ok(parsedJson[0].event_name);
    assert.ok(parsedJson[0].no_trade_start_utc);

    // 2. CSV Export
    const csvExport = await riskFilterService.generateMt5Export({ format: 'csv', preMinutes: 15, postMinutes: 15 });
    assert.equal(csvExport.format, 'csv');
    assert.equal(csvExport.contentType, 'text/csv');
    assert.ok(csvExport.filename.endsWith('.csv'));
    assert.ok(csvExport.content.startsWith('event_id,event_name,currency,impact,release_time_utc,no_trade_start_utc,no_trade_end_utc,max_spread_allowed_pips'));
  });
});
