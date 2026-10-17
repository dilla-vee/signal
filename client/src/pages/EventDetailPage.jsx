import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Zap,
  ShieldAlert,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Percent,
  Play,
  RotateCcw,
  AlertTriangle,
  Scale,
  Crosshair,
  Compass
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { MarketSnapshotCard } from '../components/snapshots/MarketSnapshotCard';
import { ReactionStatsTable } from '../components/reactions/ReactionStatsTable';

export function EventDetailPage({ event, onBack }) {
  const [activePair, setActivePair] = useState('XAUUSD');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [expectedValueSummary, setExpectedValueSummary] = useState('');
  const [judgeSignal, setJudgeSignal] = useState(null);
  const [devilsAdvocate, setDevilsAdvocate] = useState(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Post-Release Simulator state
  const [simActual, setSimActual] = useState('');
  const [simPrice, setSimPrice] = useState('');
  const [evaluatingRelease, setEvaluatingRelease] = useState(false);
  const [postReleaseResult, setPostReleaseResult] = useState(null);

  if (!event) return null;

  // Load scenarios from API or fallback
  useEffect(() => {
    fetchScenarios();
  }, [event.id, activePair]);

  const fetchScenarios = async () => {
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/signals/event/${event.id}?pair=${activePair}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.scenarios && json.data.scenarios.length > 0) {
          setScenarios(json.data.scenarios);
          if (json.data.expected_value_summary) {
            setExpectedValueSummary(json.data.expected_value_summary);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch scenarios from backend, using default matrix', err);
    }
  };

  // Run full 11-agent intelligence pipeline
  const handleRunFullPipeline = async () => {
    setLoadingPlaybook(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/signals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          pair: activePair,
          userRules: { min_confidence: 60, risk_pct: 1.0, account_balance: 10000 }
        })
      });

      if (!res.ok) {
        throw new Error(`Pipeline execution failed: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.data) {
        if (json.data.scenarioPlaybook?.scenarios) {
          setScenarios(json.data.scenarioPlaybook.scenarios);
          setExpectedValueSummary(json.data.scenarioPlaybook.expected_value_summary);
        }
        if (json.data.signal) {
          setJudgeSignal(json.data.signal);
          // Set simulator defaults
          if (json.data.signal.suggested_entry) {
            setSimPrice(json.data.signal.suggested_entry.toString());
          }
        }
        if (json.data.devilsAdvocate) {
          setDevilsAdvocate(json.data.devilsAdvocate);
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingPlaybook(false);
    }
  };

  // Evaluate Actual Post-Release Result
  const handleEvaluateRelease = async () => {
    if (!simActual) return;
    setEvaluatingRelease(true);
    try {
      const sigId = judgeSignal?.id || 'mock-sig-001';
      const res = await fetch(`/api/signals/${sigId}/post-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualValue: simActual,
          currentPrice: simPrice ? parseFloat(simPrice) : null,
          eventForecast: event.forecast_val || '3.1%'
        })
      });

      if (!res.ok) {
        throw new Error('Post-release evaluation failed');
      }

      const json = await res.json();
      setPostReleaseResult(json.data);
      if (judgeSignal) {
        setJudgeSignal(prev => ({
          ...prev,
          status: json.data.status,
          post_release_action: json.data.post_release_action,
          post_release_notes: json.data.post_release_notes
        }));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setEvaluatingRelease(false);
    }
  };

  // Fallback 5-point scenarios if not loaded from server
  const activeScenarios = scenarios.length === 5 ? scenarios : [
    {
      scenario_key: 'MUCH_HOTTER',
      scenario_name: 'Much Hotter (> 3.3%)',
      probability_pct: 15,
      expected_first_reaction: activePair === 'XAUUSD' ? 'Sharp plunge -120 to -160 pips on surging yields' : 'Rapid surge +80 to +110 pips',
      expected_follow_through: activePair === 'XAUUSD' ? 'Sustained selling testing 2620 support' : 'Push towards 151.20 resistance',
      conditional_action: activePair === 'XAUUSD' ? 'If actual > 3.3% then SELL on 1m pullback; invalidation at 2665.00' : 'If actual > 3.3% then BUY above 150.20',
      invalidation_level: activePair === 'XAUUSD' ? 2665.00 : 149.20,
      risk_notes: 'Severe initial slippage. Avoid chasing the first 60 seconds spike.',
      expected_value_rating: activePair === 'XAUUSD' ? 'NEGATIVE_ASYMMETRIC' : 'POSITIVE_HIGH'
    },
    {
      scenario_key: 'SLIGHTLY_HOTTER',
      scenario_name: 'Slightly Hotter (3.2%)',
      probability_pct: 25,
      expected_first_reaction: activePair === 'XAUUSD' ? 'Initial knee-jerk dip -50 to -80 pips' : 'Rally +35 to +55 pips',
      expected_follow_through: 'Consolidation within intraday range; mean reversion risk',
      conditional_action: 'Wait for 5m candle close before executing',
      invalidation_level: activePair === 'XAUUSD' ? 2660.00 : 149.50,
      risk_notes: 'High probability of move fading within 15 minutes.',
      expected_value_rating: 'POSITIVE_MODERATE'
    },
    {
      scenario_key: 'IN_LINE',
      scenario_name: 'In-Line with Consensus (3.1%)',
      probability_pct: 25,
      expected_first_reaction: 'Two-way whipsaw within 25 pips; rapid spread widening',
      expected_follow_through: 'Market returns to pre-news range and technical baseline',
      conditional_action: 'WAIT - Avoid pre-news execution due to spread widening',
      invalidation_level: activePair === 'XAUUSD' ? 2655.00 : 150.00,
      risk_notes: 'Spread widening will consume any edge; stay flat.',
      expected_value_rating: 'NEUTRAL'
    },
    {
      scenario_key: 'SLIGHTLY_COOLER',
      scenario_name: 'Slightly Cooler (3.0%)',
      probability_pct: 25,
      expected_first_reaction: activePair === 'XAUUSD' ? 'Swift rally +60 to +90 pips as yields soften' : 'Pullback -40 to -65 pips',
      expected_follow_through: 'Grinding continuation toward intraday resistance',
      conditional_action: activePair === 'XAUUSD' ? 'BUY pullbacks with invalidation at 2640.00' : 'SELL rallies below 150.60',
      invalidation_level: activePair === 'XAUUSD' ? 2640.00 : 150.80,
      risk_notes: 'Monitor prior-month revisions counteracting soft headline.',
      expected_value_rating: 'POSITIVE_MODERATE'
    },
    {
      scenario_key: 'MUCH_COOLER',
      scenario_name: 'Much Cooler (< 2.9%)',
      probability_pct: 10,
      expected_first_reaction: activePair === 'XAUUSD' ? 'Explosive breakout +140 to +200 pips' : 'Sharp cascade lower -90 to -140 pips',
      expected_follow_through: 'Multi-day momentum breakout breaking previous highs',
      conditional_action: activePair === 'XAUUSD' ? 'Aggressively BUY dips with target 2690.00' : 'Aggressively SELL USDJPY',
      invalidation_level: activePair === 'XAUUSD' ? 2635.00 : 151.20,
      risk_notes: 'Gap risk on market orders. Limit orders recommended.',
      expected_value_rating: activePair === 'XAUUSD' ? 'POSITIVE_HIGH' : 'NEGATIVE_ASYMMETRIC'
    }
  ];

  const totalProb = activeScenarios.reduce((sum, s) => sum + (s.probability_pct || s.probability || 0), 0);

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  ? 'bg-terminal-cyan text-black font-bold shadow-sm'
                  : 'bg-terminal-surface text-slate-400 hover:text-white border border-terminal-border'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Event Details & Live AI Trigger Card */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-terminal-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="high">{event.impact_level || 'HIGH'} IMPACT</Badge>
              <span className="text-xs font-mono text-slate-400">{event.currency} Release</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Playbook for <strong className="text-white">{activePair}</strong>
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-mono text-white">{event.event_name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunFullPipeline}
              disabled={loadingPlaybook}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-terminal-cyan text-black font-mono font-bold text-xs hover:bg-cyan-400 transition-all shadow-md disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{loadingPlaybook ? 'Synthesizing 11 Agents...' : 'RUN FULL AI PLAYBOOK'}</span>
            </button>

            <div className="text-right font-mono text-xs">
              <div className="text-[10px] text-slate-500 uppercase">Countdown to Release</div>
              <CountdownTimer targetTime={event.release_time} />
            </div>
          </div>
        </div>

        {/* Forecast & Previous Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-950 border border-terminal-border">
            <div className="text-[10px] text-slate-500">CONSENSUS FORECAST</div>
            <div className="text-sm font-bold text-terminal-cyan tabular-nums">{event.forecast_val || '3.1%'}</div>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-terminal-border">
            <div className="text-[10px] text-slate-500">PREVIOUS PRINT</div>
            <div className="text-sm font-bold text-slate-300 tabular-nums">{event.previous_val || '3.2%'}</div>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-terminal-border">
            <div className="text-[10px] text-slate-500">SUM OF PROBABILITIES</div>
            <div className="text-sm font-bold text-white tabular-nums">{totalProb}% (Exact)</div>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-terminal-border">
            <div className="text-[10px] text-slate-500">EXPECTED VALUE</div>
            <div className="text-sm font-bold text-terminal-green">Positive Asymmetry</div>
          </div>
        </div>

        {expectedValueSummary && (
          <div className="mt-3 p-2.5 rounded bg-slate-950/70 border border-terminal-border text-xs font-mono text-slate-300 flex items-center gap-2">
            <Percent className="w-4 h-4 text-terminal-cyan shrink-0" />
            <span>{expectedValueSummary}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded bg-rose-950/40 border border-rose-800 text-xs font-mono text-rose-300">
            {errorMsg}
          </div>
        )}
      </div>

      {/* JUDGE'S SYNTHESIZED PRE-NEWS TRADE SIGNAL (Agent 11) */}
      {judgeSignal && (
        <div className="bg-terminal-surface border border-terminal-cyan/60 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-terminal-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-cyan-950/80 border border-cyan-500/40 text-terminal-cyan">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">CHIEF INVESTMENT OFFICER / JUDGE VERDICT:</span>
                  <Badge variant={judgeSignal.direction === 'BUY' ? 'buy' : judgeSignal.direction === 'SELL' ? 'sell' : 'neutral'}>
                    {judgeSignal.direction}
                  </Badge>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    {judgeSignal.confidence_pct}% CONFIDENCE
                  </span>
                  {judgeSignal.status && judgeSignal.status !== 'ACTIVE' && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      judgeSignal.status === 'CONFIRMED'
                        ? 'bg-emerald-950 text-terminal-green border border-emerald-500'
                        : judgeSignal.status === 'FLIPPED'
                        ? 'bg-rose-950 text-terminal-red border border-rose-500'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      ● {judgeSignal.status}
                    </span>
                  )}
                </div>
                <div className="text-sm font-mono text-slate-200 mt-1">
                  Timing Recommendation: <strong className="text-amber-400 uppercase tracking-wide">
                    {judgeSignal.timing === 'pre_news_limit' ? 'Pre-News Limit Entry' : 'Wait for Post-News Retest'}
                  </strong>
                </div>
              </div>
            </div>

            {judgeSignal.post_release_action && (
              <div className="px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-600/40 text-xs font-mono text-terminal-green font-bold uppercase">
                Action: {judgeSignal.post_release_action.replace(/_/g, ' ')}
              </div>
            )}
          </div>

          {/* Trade Parameters Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 bg-slate-950 rounded-lg border border-terminal-border font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Suggested Entry</div>
              <div className="text-base font-bold text-white tabular-nums mt-0.5">
                {judgeSignal.suggested_entry ? judgeSignal.suggested_entry.toFixed(2) : '-'}
              </div>
              <div className="text-[10px] text-terminal-cyan mt-0.5">
                Zone: {judgeSignal.entry_zone_min?.toFixed(2)} - {judgeSignal.entry_zone_max?.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase">Stop Loss (1.2x ATR)</div>
              <div className="text-base font-bold text-terminal-red tabular-nums mt-0.5">
                {judgeSignal.stop_loss ? judgeSignal.stop_loss.toFixed(2) : '-'}
              </div>
              <div className="text-[10px] text-rose-400 mt-0.5">
                Risk Dist: {Math.abs(judgeSignal.suggested_entry - judgeSignal.stop_loss).toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase">Take Profit 1 / 2</div>
              <div className="text-base font-bold text-terminal-green tabular-nums mt-0.5">
                {judgeSignal.take_profit_1 ? judgeSignal.take_profit_1.toFixed(2) : '-'}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                TP2: {judgeSignal.take_profit_2 ? judgeSignal.take_profit_2.toFixed(2) : 'Runner'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase">Reward/Risk & Lots</div>
              <div className="text-base font-bold text-terminal-cyan tabular-nums mt-0.5">
                1:{judgeSignal.risk_reward_ratio || '2.0'}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Size: <strong className="text-white">{judgeSignal.position_size_lots || 0.10} Lots</strong> (1% Risk)
              </div>
            </div>
          </div>

          {/* Institutional Reasoning Narrative */}
          <div className="text-xs font-mono text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded border border-terminal-border">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Judge Synthesis & Resolution Narrative:</div>
            {judgeSignal.reasoning_synthesis}
          </div>

          {/* Consensus Alignment Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono">
            <span className="text-slate-500">Agreed Agents ({judgeSignal.agreed_agents?.length || 0}):</span>
            {judgeSignal.agreed_agents?.map((a, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                {a}
              </span>
            ))}
            {judgeSignal.disagreed_agents?.length > 0 && (
              <>
                <span className="text-slate-500 ml-2">Dissenting Agents:</span>
                {judgeSignal.disagreed_agents.map((d, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/80">
                    {d}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* DEVIL'S ADVOCATE CONTRARIAN INTERROGATION (Agent 10) */}
      {devilsAdvocate && (
        <div className="bg-terminal-surface border border-amber-600/40 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-terminal-border">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-terminal-gold" />
              <div>
                <h2 className="text-sm font-bold font-mono text-terminal-gold uppercase tracking-wider">
                  Devil's Advocate Stress-Test & Vulnerability Interrogation
                </h2>
                <div className="text-xs text-slate-400 font-mono">
                  Relentless contrarian attack on the emerging consensus
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase">Consensus Vulnerability Score</div>
                <div className="text-sm font-bold text-amber-400 tabular-nums">
                  {devilsAdvocate.consensus_vulnerability_score}/100
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs font-mono">
            {/* Counter-Thesis */}
            <div className="p-3 rounded bg-amber-950/20 border border-amber-800/30">
              <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">Counter-Thesis:</div>
              <p className="text-slate-200 leading-relaxed">{devilsAdvocate.counter_thesis}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Falsification Triggers */}
              <div className="p-3 rounded bg-slate-950 border border-terminal-border">
                <div className="text-[10px] text-terminal-red font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Immediate Falsification Triggers (Kill Trade):</span>
                </div>
                <ul className="space-y-1">
                  {devilsAdvocate.falsification_triggers?.map((trigger, i) => (
                    <li key={i} className="text-slate-300 flex items-start gap-1.5">
                      <span className="text-terminal-red">✕</span>
                      <span>{trigger}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Objections List */}
              <div className="p-3 rounded bg-slate-950 border border-terminal-border">
                <div className="text-[10px] text-terminal-gold font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Specific Objections & Traps:</span>
                </div>
                <ul className="space-y-1">
                  {devilsAdvocate.objection_list?.map((obj, i) => (
                    <li key={i} className="text-slate-300 flex items-start gap-1.5">
                      <span className="text-terminal-gold">!</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Point-in-Time Market Snapshot Telemetry */}
      <MarketSnapshotCard pair={activePair} eventId={event.id} />

      {/* Empirical Historical Reaction Intelligence */}
      <ReactionStatsTable pair={activePair} eventType={event.event_type || 'CPI'} />

      {/* 5-POINT PRE-NEWS SCENARIO PLAYBOOK MATRIX (Agent 9) */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-terminal-cyan" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              Pre-News 5-Point Scenario Matrix & Conditional Rules
            </h2>
          </div>
          <div className="text-xs text-slate-400">
            Synthesized by Scenario Builder Agent (All 5 Scenarios Sum to 100%)
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {activeScenarios.map((sc) => {
            const isSelected = selectedScenario === sc.scenario_key;
            return (
              <div
                key={sc.scenario_key}
                onClick={() => setSelectedScenario(isSelected ? null : sc.scenario_key)}
                className={`bg-terminal-surface border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-terminal-cyan bg-slate-900/90 shadow-md' : 'border-terminal-border hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-terminal-border">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">{sc.scenario_name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-terminal-cyan border border-cyan-500/30">
                      {sc.probability_pct || sc.probability}% PROBABILITY
                    </span>
                    <span className="text-xs font-mono text-slate-400 hidden md:inline">
                      {sc.condition_description}
                    </span>
                  </div>

                  <div className="text-xs font-mono font-semibold text-terminal-cyan">
                    {sc.expected_value_rating || 'POSITIVE_MODERATE'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs font-mono">
                  {/* First Reaction & Follow-Through */}
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Initial Reaction (+1m to +5m)</div>
                    <div className="text-slate-200">{sc.expected_first_reaction || sc.firstReaction}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-2 mb-0.5">Likely Follow-Through (+15m to +60m)</div>
                    <div className="text-slate-300">{sc.expected_follow_through || sc.followThrough}</div>
                  </div>

                  {/* Conditional Action & Risk */}
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-terminal-cyan font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Conditional Execution Rule</span>
                    </div>
                    <div className="text-white font-medium mb-2">{sc.conditional_action || sc.action}</div>
                    <div className="text-[10px] text-slate-400">
                      Invalidation: <span className="text-terminal-red font-semibold">{sc.invalidation_level ? sc.invalidation_level.toFixed(2) : '-'}</span>
                    </div>
                    <div className="text-[10px] text-amber-400/90 mt-1">
                      {sc.risk_notes || sc.riskNotes}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POST-RELEASE ACTUAL EVALUATOR SIMULATOR */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-3 border-b border-terminal-border">
          <RotateCcw className="w-5 h-5 text-terminal-cyan" />
          <div>
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Post-Release Outcome Evaluator & Stop Management
            </h2>
            <div className="text-xs text-slate-400 font-mono">
              When actual figure prints, re-runs Judge logic to update signal (Confirm, Flip, or Cancel).
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs font-mono">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Actual Economic Print:
            </label>
            <input
              type="text"
              placeholder="e.g. 2.8% or 3.5%"
              value={simActual}
              onChange={(e) => setSimActual(e.target.value)}
              className="w-full bg-slate-950 border border-terminal-border rounded px-3 py-2 text-white font-mono focus:border-terminal-cyan outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Current Market Price ({activePair}):
            </label>
            <input
              type="text"
              placeholder={activePair === 'XAUUSD' ? '2665.00' : '150.20'}
              value={simPrice}
              onChange={(e) => setSimPrice(e.target.value)}
              className="w-full bg-slate-950 border border-terminal-border rounded px-3 py-2 text-white font-mono focus:border-terminal-cyan outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleEvaluateRelease}
              disabled={evaluatingRelease || !simActual}
              className="w-full py-2.5 px-4 rounded bg-terminal-cyan text-black font-mono font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {evaluatingRelease ? 'Evaluating Release...' : 'Evaluate Actual Release'}
            </button>
          </div>
        </div>

        {/* Post-Release Evaluation Output */}
        {postReleaseResult && (
          <div className={`mt-4 p-4 rounded-lg border font-mono text-xs ${
            postReleaseResult.status === 'CONFIRMED'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : postReleaseResult.status === 'FLIPPED'
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-sm uppercase">
                STATUS: {postReleaseResult.status} (Surprise: {postReleaseResult.actual_surprise > 0 ? '+' : ''}{postReleaseResult.actual_surprise})
              </span>
              <span className="font-bold text-terminal-cyan">
                ACTION: {postReleaseResult.post_release_action?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              {postReleaseResult.post_release_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
