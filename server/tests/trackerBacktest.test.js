import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { predictionTrackerService } from '../services/predictionTrackerService.js';
import { backtesterService } from '../services/backtesterService.js';

describe('Phase 5: Prediction Tracker & Backtester Tests', () => {
  test('predictionTrackerService records trade outcome and calculates R-multiple and PnL', async () => {
    const recordedWin = await predictionTrackerService.recordSignalOutcome({
      signalId: 'sig-test-01',
      actualEntryFilled: 2650.00,
      outcomeType: 'WIN',
      price15m: 2665.00,
      price1h: 2672.00,
      price4h: 2675.00,
      hitTp1: true,
      hitTp2: false,
      hitSl: false,
      riskRewardRatio: 2.2,
      riskAmountUsd: 100.0,
      pair: 'XAUUSD',
      eventType: 'CPI',
      notes: 'Clean TP1 hit after inflation undershoot'
    });

    assert.equal(recordedWin.outcome_type, 'WIN');
    assert.equal(recordedWin.r_multiple_achieved, 2.2);
    assert.equal(recordedWin.pnl_usd, 220.0);
    assert.ok(recordedWin.id);

    const recordedLoss = await predictionTrackerService.recordSignalOutcome({
      signalId: 'sig-test-02',
      actualEntryFilled: 150.00,
      outcomeType: 'LOSS',
      price15m: 150.80,
      price1h: 151.10,
      price4h: 151.30,
      hitTp1: false,
      hitTp2: false,
      hitSl: true,
      riskRewardRatio: 2.0,
      riskAmountUsd: 100.0,
      pair: 'USDJPY',
      eventType: 'NFP',
      notes: 'Stopped out on hot NFP print'
    });

    assert.equal(recordedLoss.outcome_type, 'LOSS');
    assert.equal(recordedLoss.r_multiple_achieved, -1.0);
    assert.equal(recordedLoss.pnl_usd, -100.0);
  });

  test('predictionTrackerService generates accurate aggregated performance summary and equity curve', async () => {
    const summary = await predictionTrackerService.getPerformanceSummary();

    assert.ok(summary.totalSignals > 0);
    assert.ok(summary.completedDecisions > 0);
    assert.ok(summary.hitRatePct >= 50 && summary.hitRatePct <= 100);
    assert.ok(summary.profitFactor > 1.0);
    assert.ok(summary.avgRiskRewardAchieved > 0);
    assert.ok(summary.totalPnlUsd > 0);
    assert.ok(summary.maxDrawdownPct >= 0);
    assert.ok(Array.isArray(summary.equityCurve) && summary.equityCurve.length > 1);
    assert.ok(Array.isArray(summary.pairStats) && summary.pairStats.length > 0);
    assert.ok(Array.isArray(summary.eventStats) && summary.eventStats.length > 0);
    assert.ok(Array.isArray(summary.confidenceStats) && summary.confidenceStats.length > 0);

    // Verify equity curve continuity
    const firstPoint = summary.equityCurve[0];
    assert.equal(firstPoint.balance, 10000.0);
    const lastPoint = summary.equityCurve[summary.equityCurve.length - 1];
    assert.ok(lastPoint.balance > 10000.0);
  });

  test('predictionTrackerService evaluates individual agent accuracy and dynamic weights', async () => {
    const leaderboard = await predictionTrackerService.getAgentAccuracyLeaderboard();

    assert.ok(Array.isArray(leaderboard));
    assert.equal(leaderboard.length, 8);

    for (const agent of leaderboard) {
      assert.ok(agent.agent_name);
      assert.ok(agent.accuracy_pct >= 0 && agent.accuracy_pct <= 100);
      assert.ok(agent.suggested_weight > 0);
      assert.ok(['HIGH_EDGE', 'BALANCED', 'UNDERPERFORMING'].includes(agent.calibration_status));
    }

    // Verify descending order
    for (let i = 0; i < leaderboard.length - 1; i++) {
      assert.ok(leaderboard[i].accuracy_pct >= leaderboard[i + 1].accuracy_pct);
    }
  });

  test('backtesterService runs historical playbook simulation and computes drawdown and Sharpe ratio', async () => {
    const backtest = await backtesterService.runBacktest({
      pair: 'XAUUSD',
      eventType: 'ALL',
      accountBalance: 10000,
      riskPct: 1.0,
      spreadBufferPips: 2.5
    });

    assert.equal(backtest.pair, 'XAUUSD');
    assert.ok(backtest.totalTrades > 0);
    assert.ok(backtest.winningTrades > 0);
    assert.ok(backtest.winRatePct >= 50);
    assert.ok(backtest.profitFactor > 1.0);
    assert.ok(backtest.maxDrawdownPct >= 0);
    assert.ok(backtest.sharpeRatio > 0);
    assert.ok(Array.isArray(backtest.equityCurve) && backtest.equityCurve.length > 1);
    assert.ok(Array.isArray(backtest.tradeLog) && backtest.tradeLog.length > 0);

    // Verify trade log structure
    const trade = backtest.tradeLog[0];
    assert.ok(trade.event_name);
    assert.ok(trade.pair);
    assert.ok(['BUY', 'SELL', 'NO_TRADE'].includes(trade.direction));
    assert.ok(['WIN', 'LOSS', 'SCRATCH'].includes(trade.outcome));
    assert.ok(trade.entryPrice > 0);
    assert.ok(trade.stopLoss > 0);
    assert.ok(trade.takeProfit > 0);
  });
});
