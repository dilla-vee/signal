import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';

let server;
const PORT = 5055;

describe('API Route Integration Tests', () => {
  before(() => {
    return new Promise((resolve) => {
      server = app.listen(PORT, () => {
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  test('GET /api/health returns operational status', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/health`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'operational');
    assert.equal(json.data.service, 'macro-signal-server');
  });

  test('GET /api/calendar/upcoming returns events array', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/calendar/upcoming?limit=5`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
    assert.ok(json.data[0].event_name);
    assert.ok(json.data[0].release_time);
  });

  test('GET /api/signals/latest returns pre-news signals with entry and take profit', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/signals/latest`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);

    const signal = json.data[0];
    assert.ok(['BUY', 'SELL', 'NO_TRADE'].includes(signal.direction));
    assert.ok(signal.suggested_entry !== undefined);
    assert.ok(signal.stop_loss !== undefined);
    assert.ok(signal.take_profit_1 !== undefined);
    assert.ok(signal.risk_reward_ratio !== undefined);
  });

  test('POST /api/signals/calculate-trade returns computed parameters', async () => {
    const payload = {
      pair: 'XAUUSD',
      direction: 'BUY',
      entryPrice: 2650.00,
      stopLoss: 2638.00,
      takeProfit1: 2675.00,
      accountBalance: 10000,
      riskPct: 1.0
    };

    const res = await fetch(`http://localhost:${PORT}/api/signals/calculate-trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.riskRewardRatio, 2.08);
    assert.equal(json.data.riskAmountUsd, 100);
    assert.equal(json.data.positionSizeLots, 0.08);
  });

  test('GET /api/prices/:pair returns candles and technical structure', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/prices/XAUUSD?timeframe=M15&limit=20`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.pair, 'XAUUSD');
    assert.ok(Array.isArray(json.data.candles));
    assert.ok(json.data.technicals.atr > 0);
  });

  test('POST /api/prices/import-csv parses and returns imported count', async () => {
    const rawCsv = `<DATE>\t<TIME>\t<OPEN>\t<HIGH>\t<LOW>\t<CLOSE>\t<TICKVOL>\t<VOL>\t<SPREAD>
2024.10.15\t12:30:00\t2650.50\t2658.20\t2649.10\t2656.80\t1420\t0\t25`;

    const res = await fetch(`http://localhost:${PORT}/api/prices/import-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: rawCsv, pair: 'XAUUSD', timeframe: 'M1' })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.importedCount, 1);
  });

  test('GET /api/reactions returns empirical past moves and reversal stats', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/reactions?eventType=CPI&pair=XAUUSD`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.reactions));
    assert.ok(json.data.stats.reversalRatePct >= 0);
    assert.ok(json.data.stats.avgSpikePips > 0);
  });

  test('GET /api/snapshots/latest/:pair returns cross-asset yields and COT', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/snapshots/latest/XAUUSD`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.us_10y_yield > 0);
    assert.ok(json.data.dxy > 80);
    assert.ok(json.data.cot_gold_net !== undefined);
    assert.ok(json.data.technical_summary !== undefined);
  });
});
