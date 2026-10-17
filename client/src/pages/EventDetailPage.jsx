import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, ShieldAlert, CheckCircle, TrendingUp, TrendingDown, Clock, Percent } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { MarketSnapshotCard } from '../components/snapshots/MarketSnapshotCard';
import { ReactionStatsTable } from '../components/reactions/ReactionStatsTable';

export function EventDetailPage({ event, onBack }) {
  const [activePair, setActivePair] = useState('XAUUSD');
  const [selectedScenario, setSelectedScenario] = useState(null);

  if (!event) return null;

  // 5-Point Pre-News Scenario Matrix
  const defaultScenarios = [
    {
      key: 'MUCH_HOTTER',
      name: 'Much Hotter (> 3.3%)',
      probability: 15,
      impact: 'High Bearish for Gold, Bullish USD',
      firstReaction: 'Aggressive plunge 150-250 pips in XAUUSD as US 2Y/10Y yields surge +6-10 bps',
      followThrough: 'Sustained downtrend toward major daily support at 2630.00',
      action: 'If actual > 3.3% then SELL on 5-min pullback to 2648.00 zone',
      invalidation: 2675.00,
      riskNotes: 'Extreme slippage in first 60 seconds; avoid instant market fills.',
      rating: 'High Conviction Short'
    },
    {
      key: 'SLIGHTLY_HOTTER',
      name: 'Slightly Hotter (3.2%)',
      probability: 25,
      impact: 'Moderate Bearish Gold, Modest USD Support',
      firstReaction: 'Knee-jerk dip 60-100 pips followed by two-way consolidation',
      followThrough: 'Choppy range contraction between 2645.00 and 2665.00',
      action: 'If actual == 3.2% then WAIT for 15M candle close before taking position',
      invalidation: 2670.00,
      riskNotes: 'High likelihood of false initial break followed by mean reversion.',
      rating: 'Neutral / No Trade'
    },
    {
      key: 'IN_LINE',
      name: 'In-Line (3.1%)',
      probability: 30,
      impact: 'Trend Continuation (Bullish Gold, Soft USD)',
      firstReaction: 'Muted 30-50 pips whip with fast spread normalization',
      followThrough: 'Resumes prevailing macro trend; physical bids step in',
      action: 'If actual == 3.1% then BUY dips toward 2650.00 support',
      invalidation: 2638.00,
      riskNotes: 'Tight pre-news stops risk being hunted during two-way volatility.',
      rating: 'Moderate Bullish'
    },
    {
      key: 'SLIGHTLY_COOLER',
      name: 'Slightly Cooler (3.0%)',
      probability: 20,
      impact: 'Bullish Gold, Bearish USD',
      firstReaction: 'Swift rally 120-180 pips as yields ease 4-6 bps',
      followThrough: 'Bullish expansion toward 2678.00 resistance',
      action: 'If actual <= 3.0% then BUY pullback to 2660.00 with tight SL',
      invalidation: 2645.00,
      riskNotes: 'Monitor 2680 psychological resistance for short-term profit taking.',
      rating: 'High Conviction Long'
    },
    {
      key: 'MUCH_COOLER',
      name: 'Much Cooler (< 3.0%)',
      probability: 10,
      impact: 'Maximum Bullish Gold, Heavy USD Selloff',
      firstReaction: 'Explosive rally > 250 pips breaking recent swing highs',
      followThrough: 'Strong multi-session trend expansion toward all-time highs',
      action: 'If actual < 3.0% then aggressive BUY breakout with trailing stop',
      invalidation: 2650.00,
      riskNotes: 'Broker spreads may take 3-5 minutes to return to standard limits.',
      rating: 'Maximum Bullish'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-terminal-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Command Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">SELECT PAIR:</span>
          {['XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'].map((p) => (
            <button
              key={p}
              onClick={() => setActivePair(p)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                activePair === p
                  ? 'bg-terminal-cyan text-black font-bold'
                  : 'bg-terminal-surface text-slate-400 hover:text-white border border-terminal-border'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Event Details Card */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-terminal-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="high">{event.impact_level} IMPACT</Badge>
              <span className="text-xs font-mono text-slate-400">{event.currency} Release</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Playbook for <strong className="text-white">{activePair}</strong>
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-mono text-white">{event.event_name}</h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase">Countdown to Release</div>
              <CountdownTimer targetTime={event.release_time} />
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-terminal-border">
              <div className="text-[10px] text-slate-500">CONSENSUS</div>
              <div className="text-sm font-bold text-terminal-cyan tabular-nums">{event.forecast_val || 'N/A'}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-terminal-border">
              <div className="text-[10px] text-slate-500">PREVIOUS</div>
              <div className="text-sm font-bold text-slate-300 tabular-nums">{event.previous_val || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Expected-Value Summary */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-terminal-border text-xs font-mono flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-terminal-cyan" />
            <span className="text-slate-300">
              Expected-Value Profile: <strong className="text-terminal-green">Net Bullish Asymmetry (+1.42 R)</strong> across outcome probabilities.
            </span>
          </div>
          <div className="text-slate-400">
            Sum of Probabilities: <span className="text-white font-bold">100.0%</span>
          </div>
        </div>
      </div>

      {/* Point-in-Time Market Snapshot Telemetry */}
      <MarketSnapshotCard pair={activePair} eventId={event.id} />

      {/* Empirical Historical Reaction Intelligence */}
      <ReactionStatsTable pair={activePair} eventType={event.event_type || 'CPI'} />

      {/* 5-POINT PRE-NEWS SCENARIO PLAYBOOK MATRIX */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-terminal-cyan" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              Pre-News 5-Point Scenario Matrix & Conditional Rules
            </h2>
          </div>
          <div className="text-xs text-slate-400">
            Synthesized by Scenario Builder Agent
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {defaultScenarios.map((sc) => {
            const isSelected = selectedScenario === sc.key;
            return (
              <div
                key={sc.key}
                onClick={() => setSelectedScenario(isSelected ? null : sc.key)}
                className={`bg-terminal-surface border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-terminal-cyan bg-slate-900/90 shadow-md' : 'border-terminal-border hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-terminal-border">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">{sc.name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-terminal-cyan border border-cyan-500/30">
                      {sc.probability}% PROBABILITY
                    </span>
                    <span className="text-xs font-mono text-slate-400 hidden md:inline">
                      {sc.impact}
                    </span>
                  </div>

                  <div className="text-xs font-mono font-semibold text-terminal-cyan">
                    {sc.rating}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs font-mono">
                  {/* First Reaction & Follow-Through */}
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Initial Reaction (+1m to +5m)</div>
                    <div className="text-slate-200">{sc.firstReaction}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-2 mb-0.5">Likely Follow-Through (+15m to +60m)</div>
                    <div className="text-slate-300">{sc.followThrough}</div>
                  </div>

                  {/* Conditional Action & Risk */}
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-terminal-cyan font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Conditional Execution Rule</span>
                    </div>
                    <div className="text-white font-medium mb-2">{sc.action}</div>
                    <div className="text-[10px] text-slate-400">
                      Invalidation: <span className="text-terminal-red font-semibold">{sc.invalidation.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-amber-400/90 mt-1">
                      {sc.riskNotes}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
