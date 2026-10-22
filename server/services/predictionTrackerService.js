import crypto from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { localSignalStore } from './postReleaseService.js';

// In-memory store for recorded live paper-trading outcomes
export const localOutcomeStore = new Map();

export class PredictionTrackerService {
  /**
   * Logs a completed paper trade outcome and calculates R-multiple & PnL
   */
  async recordSignalOutcome({
    signalId,
    actualEntryFilled,
    outcomeType = 'WIN', // 'WIN', 'LOSS', 'SCRATCH', 'EXPIRED'
    price15m,
    price1h,
    price4h,
    hitTp1 = false,
    hitTp2 = false,
    hitSl = false,
    riskRewardRatio = 2.0,
    riskAmountUsd = 100.0,
    pair = 'XAUUSD',
    eventType = 'CPI',
    notes = ''
  }) {
    const outcomeId = crypto.randomUUID();

    let rMultiple = 0;
    let pnlUsd = 0;

    if (outcomeType === 'WIN') {
      rMultiple = hitTp2 ? Number((riskRewardRatio * 1.5).toFixed(2)) : Number(riskRewardRatio.toFixed(2));
      pnlUsd = Math.round(riskAmountUsd * rMultiple * 100) / 100;
    } else if (outcomeType === 'LOSS') {
      rMultiple = -1.0;
      pnlUsd = -Math.abs(riskAmountUsd);
    } else {
      rMultiple = 0.0;
      pnlUsd = 0.0;
    }

    const outcomeRecord = {
      id: outcomeId,
      signal_id: signalId,
      pair: pair.toUpperCase(),
      event_type: eventType,
      actual_entry_filled: actualEntryFilled,
      outcome_type: outcomeType,
      price_15m: price15m,
      price_1h: price1h,
      price_4h: price4h,
      hit_tp1: hitTp1,
      hit_tp2: hitTp2,
      hit_sl: hitSl,
      r_multiple_achieved: rMultiple,
      pnl_usd: pnlUsd,
      notes,
      closed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    localOutcomeStore.set(outcomeId, outcomeRecord);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('signal_outcomes').insert(outcomeRecord);
      } catch (err) {
        logger.warn('Could not persist outcome to Supabase', { error: err.message });
      }
    }

    logger.info(`[Tracker] Recorded trade outcome ${outcomeType} (${rMultiple}R, $${pnlUsd}) for signal ${signalId}`);
    return outcomeRecord;
  }

  /**
   * Retrieves aggregated platform performance metrics & equity curve
   */
  async getPerformanceSummary({ pair = null, eventType = null } = {}) {
    let outcomes = Array.from(localOutcomeStore.values());

    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('signal_outcomes')
          .select(`
            *,
            signals (
              pair, direction, confidence_pct, timing, suggested_entry, stop_loss, take_profit_1,
              events ( event_type, event_name )
            )
          `);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          outcomes = data.map(d => ({
            ...d,
            pair: d.pair || d.signals?.pair || 'XAUUSD',
            event_type: d.event_type || d.signals?.events?.event_type || 'CPI',
            confidence_pct: d.signals?.confidence_pct || 70,
            direction: d.signals?.direction || 'BUY'
          }));
        }
      } catch (e) {
        logger.warn('Error querying signal outcomes from Supabase, using local store', { error: e.message });
      }
    }

    // Apply filters
    if (pair && pair !== 'ALL') {
      outcomes = outcomes.filter(o => o.pair === pair.toUpperCase());
    }
    if (eventType && eventType !== 'ALL') {
      outcomes = outcomes.filter(o => o.event_type === eventType.toUpperCase());
    }

    // If 0 real executed outcomes exist, return clear uncalibrated state
    if (outcomes.length === 0) {
      return {
        totalSignals: 0,
        completedDecisions: 0,
        totalWins: 0,
        totalLosses: 0,
        totalScratches: 0,
        hitRatePct: 0,
        profitFactor: 0,
        avgRiskRewardAchieved: 0,
        totalPnlUsd: 0,
        returnPct: 0,
        currentBalance: 10000.0,
        maxDrawdownPct: 0,
        maxDrawdownUsd: 0,
        equityCurve: [
          {
            tradeIndex: 0,
            label: 'Baseline',
            balance: 10000.0,
            pnl: 0,
            drawdownPct: 0,
            date: new Date().toISOString()
          }
        ],
        pairStats: [],
        eventStats: [],
        confidenceStats: [
          { tier: 'HIGH', trades: 0, winRate: '0%', pnl: '$0' },
          { tier: 'MEDIUM', trades: 0, winRate: '0%', pnl: '$0' },
          { tier: 'LOW', trades: 0, winRate: '0%', pnl: '$0' }
        ],
        source_name: 'Live Verified Execution Ledger',
        last_updated: new Date().toISOString(),
        is_stale: false,
        is_demo: false,
        has_live_data: false
      };
    }

    // Sort by created_at ascending for equity curve calculation
    outcomes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let totalWins = 0;
    let totalLosses = 0;
    let totalScratches = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalR = 0;
    let currentEquity = 10000.0;
    let peakEquity = 10000.0;
    let maxDrawdownUsd = 0;
    let maxDrawdownPct = 0;

    const equityCurve = [
      {
        tradeIndex: 0,
        label: 'Baseline',
        balance: 10000.0,
        pnl: 0,
        drawdownPct: 0,
        date: outcomes[0]?.created_at || new Date().toISOString()
      }
    ];

    const pairBreakdown = {};
    const eventBreakdown = {};
    const confidenceBreakdown = {
      HIGH: { count: 0, wins: 0, pnl: 0 },
      MEDIUM: { count: 0, wins: 0, pnl: 0 },
      LOW: { count: 0, wins: 0, pnl: 0 }
    };

    let tradeIdx = 1;
    for (const out of outcomes) {
      const pnl = Number(out.pnl_usd) || 0;
      const r = Number(out.r_multiple_achieved) || 0;
      const p = out.pair || 'XAUUSD';
      const et = out.event_type || 'CPI';
      const conf = out.confidence_pct || 70;

      // Update Equity
      currentEquity += pnl;
      if (currentEquity > peakEquity) peakEquity = currentEquity;
      const currentDdUsd = peakEquity - currentEquity;
      const currentDdPct = peakEquity > 0 ? (currentDdUsd / peakEquity) * 100 : 0;

      if (currentDdUsd > maxDrawdownUsd) maxDrawdownUsd = currentDdUsd;
      if (currentDdPct > maxDrawdownPct) maxDrawdownPct = currentDdPct;

      equityCurve.push({
        tradeIndex: tradeIdx,
        label: `T${tradeIdx} (${et})`,
        balance: Math.round(currentEquity * 100) / 100,
        pnl,
        drawdownPct: Math.round(currentDdPct * 10) / 10,
        date: out.created_at
      });
      tradeIdx++;

      // Tally wins / losses
      if (out.outcome_type === 'WIN') {
        totalWins++;
        grossProfit += pnl;
        totalR += r;
      } else if (out.outcome_type === 'LOSS') {
        totalLosses++;
        grossLoss += Math.abs(pnl);
        totalR += r;
      } else {
        totalScratches++;
      }

      // Pair Breakdown
      if (!pairBreakdown[p]) pairBreakdown[p] = { pair: p, trades: 0, wins: 0, pnl: 0 };
      pairBreakdown[p].trades++;
      if (out.outcome_type === 'WIN') pairBreakdown[p].wins++;
      pairBreakdown[p].pnl += pnl;

      // Event Breakdown
      if (!eventBreakdown[et]) eventBreakdown[et] = { type: et, trades: 0, wins: 0, pnl: 0 };
      eventBreakdown[et].trades++;
      if (out.outcome_type === 'WIN') eventBreakdown[et].wins++;
      eventBreakdown[et].pnl += pnl;

      // Confidence Breakdown
      const confTier = conf >= 75 ? 'HIGH' : (conf >= 60 ? 'MEDIUM' : 'LOW');
      confidenceBreakdown[confTier].count++;
      if (out.outcome_type === 'WIN') confidenceBreakdown[confTier].wins++;
      confidenceBreakdown[confTier].pnl += pnl;
    }

    const completedDecisions = totalWins + totalLosses;
    const hitRatePct = completedDecisions > 0 ? Math.round((totalWins / completedDecisions) * 1000) / 10 : 0;
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : (grossProfit > 0 ? 9.99 : 1.0);
    const avgRiskRewardAchieved = completedDecisions > 0 ? Math.round((totalR / completedDecisions) * 100) / 100 : 0;
    const totalPnlUsd = Math.round((currentEquity - 10000.0) * 100) / 100;
    const returnPct = Math.round((totalPnlUsd / 10000.0) * 1000) / 10;

    // Format Pair breakdown table
    const pairStats = Object.values(pairBreakdown).map(b => ({
      pair: b.pair,
      trades: b.trades,
      winRate: b.trades > 0 ? `${Math.round((b.wins / b.trades) * 100)}%` : '0%',
      pnl: `${b.pnl >= 0 ? '+' : ''}$${Math.round(b.pnl)}`
    }));

    // Format Event breakdown table
    const eventStats = Object.values(eventBreakdown).map(e => ({
      type: e.type,
      trades: e.trades,
      winRate: e.trades > 0 ? `${Math.round((e.wins / e.trades) * 100)}%` : '0%',
      pnl: `${e.pnl >= 0 ? '+' : ''}$${Math.round(e.pnl)}`
    }));

    // Format Confidence breakdown
    const confStats = Object.entries(confidenceBreakdown).map(([tier, c]) => ({
      tier,
      trades: c.count,
      winRate: c.count > 0 ? `${Math.round((c.wins / c.count) * 100)}%` : '0%',
      pnl: `${c.pnl >= 0 ? '+' : ''}$${Math.round(c.pnl)}`
    }));

    return {
      totalSignals: outcomes.length,
      completedDecisions,
      totalWins,
      totalLosses,
      totalScratches,
      hitRatePct,
      profitFactor,
      avgRiskRewardAchieved,
      totalPnlUsd,
      returnPct,
      currentBalance: Math.round(currentEquity * 100) / 100,
      maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
      maxDrawdownUsd: Math.round(maxDrawdownUsd * 100) / 100,
      equityCurve,
      pairStats,
      eventStats,
      confidenceStats: confStats,
      source_name: 'Live Verified Execution Ledger',
      last_updated: new Date().toISOString(),
      is_stale: false,
      is_demo: false,
      has_live_data: true
    };
  }

  /**
   * Compares agent accuracy individually and computes dynamic weighting
   */
  async getAgentAccuracyLeaderboard() {
    const outcomes = Array.from(localOutcomeStore.values()).filter(o => o.outcome_type === 'WIN' || o.outcome_type === 'LOSS');

    const agentNames = [
      'Fundamentals Agent',
      'Central Bank Agent',
      'Rates & Yield Agent',
      'Cross-Asset Agent',
      'Technical Structure Agent',
      'Positioning Agent',
      'Geopolitical Agent',
      'Historical Reaction Agent'
    ];

    const agentScores = {};
    for (const name of agentNames) {
      agentScores[name] = {
        name,
        signalsEvaluated: 0,
        correctCount: 0,
        wrongCount: 0,
        neutralCount: 0
      };
    }

    for (const out of outcomes) {
      const votes = out.agent_votes || {};
      const tradeWon = out.outcome_type === 'WIN';
      const tradeDirection = out.direction || 'BUY';

      for (const name of agentNames) {
        const vote = votes[name];
        if (!vote) continue;

        agentScores[name].signalsEvaluated++;

        // Determine if agent's vote supported the trade
        const agentSupported = (tradeDirection === 'BUY' && vote === 'BULLISH') || (tradeDirection === 'SELL' && vote === 'BEARISH');
        const agentOpposed = (tradeDirection === 'BUY' && vote === 'BEARISH') || (tradeDirection === 'SELL' && vote === 'BULLISH');

        if (tradeWon) {
          if (agentSupported) agentScores[name].correctCount++;
          else if (agentOpposed) agentScores[name].wrongCount++;
          else agentScores[name].neutralCount++;
        } else {
          // Trade Lost
          if (agentOpposed) agentScores[name].correctCount++; // Correctly opposed losing trade
          else if (agentSupported) agentScores[name].wrongCount++; // Led into a loss
          else agentScores[name].neutralCount++;
        }
      }
    }

    // Compute calibration and dynamic weights
    const leaderboard = Object.values(agentScores).map(a => {
      const accuracyPct = a.signalsEvaluated > 0
        ? Math.round((a.correctCount / a.signalsEvaluated) * 1000) / 10
        : 70.0;

      let suggestedWeight = 1.0;
      let calibrationStatus = 'BALANCED';

      if (accuracyPct >= 75) {
        suggestedWeight = 1.25;
        calibrationStatus = 'HIGH_EDGE';
      } else if (accuracyPct < 60) {
        suggestedWeight = 0.70;
        calibrationStatus = 'UNDERPERFORMING';
      }

      return {
        agent_name: a.name,
        signals_evaluated: a.signalsEvaluated,
        correct_signals: a.correctCount,
        accuracy_pct: accuracyPct,
        suggested_weight: suggestedWeight,
        calibration_status: calibrationStatus,
        source_name: 'Empirical Agent Calibration',
        last_updated: new Date().toISOString(),
        is_stale: false,
        is_demo: false
      };
    });

    // Sort descending by accuracy
    leaderboard.sort((a, b) => (b.accuracy_pct || 0) - (a.accuracy_pct || 0));

    return leaderboard;
  }
}

export const predictionTrackerService = new PredictionTrackerService();
