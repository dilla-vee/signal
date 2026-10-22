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

  test('GET /api/signals/latest returns pre-news signals array without seed data', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/signals/latest`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
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

  test('GET /api/agents returns analytical agent team', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/agents`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 8);
    assert.equal(json.data[0].name, 'Fundamentals Agent');
  });

  test('POST /api/agents/run runs AI analysis on pair and returns outputs and consensus', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/agents/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair: 'XAUUSD' })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.outputs.length, 8);
    assert.ok(json.data.consensusSummary.prevailingBias);
  });

  test('POST /api/signals/generate triggers 11-agent pipeline and returns pre-news signal and scenarios', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/signals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair: 'XAUUSD', eventId: 'mock-event-cpi' })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.signalId);
    assert.ok(['BUY', 'SELL', 'NO_TRADE'].includes(json.data.signal.direction));
    assert.equal(json.data.scenarioPlaybook.scenarios.length, 5);
    assert.ok(json.data.devilsAdvocate.objection_list.length > 0);
  });

  test('GET /api/signals/event/:eventId returns 5-point scenario matrix', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/signals/event/mock-event-cpi?pair=XAUUSD`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.scenarios.length, 5);
    const probSum = json.data.scenarios.reduce((sum, s) => sum + s.probability_pct, 0);
    assert.equal(probSum, 100);
  });

  test('POST /api/signals/:id/post-release re-evaluates signal with actual outcome', async () => {
    // Generate a fresh signal first
    const genRes = await fetch(`http://localhost:${PORT}/api/signals/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair: 'XAUUSD' })
    });
    const genJson = await genRes.json();
    const sigId = genJson.data.signalId;

    const res = await fetch(`http://localhost:${PORT}/api/signals/${sigId}/post-release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualValue: '2.8%', eventForecast: '3.1%', currentPrice: 2670.00 })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(['CONFIRMED', 'FLIPPED', 'CANCELLED'].includes(json.data.status));
    assert.ok(json.data.post_release_action);
  });

  test('GET /api/performance/summary returns hit rate, profit factor and equity curve', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/performance/summary`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.hitRatePct !== undefined);
    assert.ok(json.data.profitFactor !== undefined);
    assert.ok(Array.isArray(json.data.equityCurve));
    assert.ok(Array.isArray(json.data.pairStats));
  });

  test('GET /api/performance/agent-accuracy returns agent ranking and suggested weights', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/performance/agent-accuracy`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.equal(json.data.length, 8);
    assert.ok(json.data[0].suggested_weight > 0);
  });

  test('POST /api/backtest/run executes historical backtest simulation and returns trade log', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/backtest/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair: 'XAUUSD', eventType: 'CPI', accountBalance: 10000 })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.totalTrades > 0);
    assert.ok(json.data.winRatePct > 0);
    assert.ok(Array.isArray(json.data.tradeLog));
  });

  test('GET /api/backtest/presets returns strategy preset configurations', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/backtest/presets`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 3);
  });

  test('GET /api/risk/windows returns no-trade windows and countdown', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/risk/windows?preMinutes=15&postMinutes=15`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
    assert.ok(json.data[0].no_trade_start_utc);
  });

  test('GET /api/risk/spread-matrix returns pairs and spike pips', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/risk/spread-matrix`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 5);
  });

  test('GET /api/risk/mt5-export returns CSV formatted filter', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/risk/mt5-export?format=csv`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8');
    const text = await res.text();
    assert.ok(text.startsWith('event_id,event_name,currency,impact'));
  });

  test('GET /api/risk/mt5-code-snippet returns MQL5 sample function', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/risk/mt5-code-snippet`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.code.includes('IsNewsLockdownActive'));
  });
});
