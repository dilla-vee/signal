import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildMarketSnapshot } from '../services/marketSnapshotService.js';

describe('Market Snapshot Builder Tests', () => {
  test('buildMarketSnapshot produces complete cross-asset snapshot with yields, COT, and technicals', async () => {
    const snapshot = await buildMarketSnapshot({
      eventId: 'a0000000-0000-0000-0000-000000000001',
      pair: 'XAUUSD'
    });

    assert.equal(snapshot.pair, 'XAUUSD');
    assert.ok(snapshot.us_10y_yield > 0);
    assert.ok(snapshot.us_2y_yield > 0);
    assert.ok(snapshot.us_real_yield !== undefined);
    assert.ok(snapshot.dxy > 80 && snapshot.dxy < 130);
    assert.ok(snapshot.us_jp_spread > 0);
    assert.ok(snapshot.spx > 3000);
    assert.ok(snapshot.vix > 5 && snapshot.vix < 100);
    assert.ok(snapshot.cot_gold_net !== undefined);
    assert.ok(snapshot.cot_jpy_net !== undefined);

    // Verify technical structure is embedded
    assert.ok(snapshot.technical_summary);
    assert.ok(snapshot.technical_summary.atr > 0);
    assert.ok(['BULLISH', 'BEARISH', 'RANGING'].includes(snapshot.technical_summary.trend));
    assert.ok(snapshot.technical_summary.keySupport > 0);

    // Verify Central Bank tone
    assert.ok(snapshot.central_bank_tone);
    assert.ok(snapshot.central_bank_tone.fed_stance);
    assert.ok(snapshot.central_bank_tone.boj_stance);
  });
});
