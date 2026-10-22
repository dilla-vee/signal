import React, { useState } from 'react';
import { Bot, CheckCircle2, ShieldAlert, Cpu, Sparkles, Scale, Play, RefreshCw, Layers, Clock, Database } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export function AgentsPage() {
  const [selectedPair, setSelectedPair] = useState('XAUUSD');
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [liveRunResult, setLiveRunResult] = useState(null);

  const specializedAgents = [
    {
      id: 1,
      name: 'Fundamentals Agent',
      role: 'Consensus vs previous, recent trend in data, and likelihood of surprise',
      weight: '12%',
      status: 'READY'
    },
    {
      id: 2,
      name: 'Central Bank Agent',
      role: 'Fed and BoJ tone, expected policy path (hawkish/dovish), and statement changes',
      weight: '14%',
      status: 'READY'
    },
    {
      id: 3,
      name: 'Rates & Yield Agent',
      role: 'US 2Y/10Y yields, US real yields (TIPS), US-Japan spread and implications',
      weight: '15%',
      status: 'READY'
    },
    {
      id: 4,
      name: 'Cross-Asset & Risk-Sentiment Agent',
      role: 'DXY, S&P 500, Nasdaq, VIX, Oil, and JPY carry-trade unwind conditions',
      weight: '10%',
      status: 'READY'
    },
    {
      id: 5,
      name: 'Technical Structure Agent',
      role: 'Trend, key support/resistance, ATR volatility, and institutional order blocks',
      weight: '9%',
      status: 'READY'
    },
    {
      id: 6,
      name: 'Positioning & Sentiment Agent',
      role: 'CFTC COT positioning for Gold and JPY, retail skew, and crowding metrics',
      weight: '8%',
      status: 'READY'
    },
    {
      id: 7,
      name: 'Geopolitical & Event-Risk Agent',
      role: 'Safe-haven premium, Japan MoF intervention risk, and tail shocks',
      weight: '9%',
      status: 'READY'
    },
    {
      id: 8,
      name: 'Historical Reaction Agent',
      role: 'Empirical past reactions (+1m/+5m/+15m/+60m moves, spike sizes, reversal odds)',
      weight: '11%',
      status: 'READY'
    },
    {
      id: 9,
      name: 'Scenario Builder Agent',
      role: 'Constructs the 5-point outcome matrix, probability distribution, and expected value',
      weight: 'Engine',
      status: 'READY'
    },
    {
      id: 10,
      name: "Devil's Advocate Agent",
      role: 'Actively attacks the emerging consensus, lists invalidation levels and what makes signal wrong',
      weight: 'Safeguard',
      status: 'READY'
    },
    {
      id: 11,
      name: 'Judge / Synthesizer Agent',
      role: 'Weighs all 10 agents, enforces user rules, computes exact pre-news entry/SL/TP, outputs BUY/SELL/NO TRADE',
      weight: 'Master',
      status: 'READY'
    }
  ];

  async function handleRunAnalysis() {
    setRunningAnalysis(true);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: selectedPair })
      });
      if (res.ok) {
        const json = await res.json();
        setLiveRunResult(json.data);
      }
    } catch (err) {
      console.warn('Analysis execution failed:', err);
    } finally {
      setRunningAnalysis(false);
    }
  }

  // Merge live outputs if run
  const displayAgents = specializedAgents.map(ag => {
    if (liveRunResult?.outputs) {
      const live = liveRunResult.outputs.find(o => o.agent_name.toLowerCase().includes(ag.name.toLowerCase().split(' ')[0]));
      if (live) {
        return {
          ...ag,
          bias: live.bias,
          confidence: live.confidence,
          factors: live.key_factors || [],
          status: 'EVALUATED_LIVE'
        };
      }
    }
    return {
      ...ag,
      bias: 'STANDBY',
      confidence: null,
      factors: [`Specialized role: ${ag.role}`],
      status: 'STANDBY'
    };
  });

  return (
    <div className="space-y-6">
      {/* Header & Execution Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-terminal-cyan" />
            <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide">
              11-Agent Intelligence Architecture
            </h1>
            <Badge variant="cyan" size="xs">CLAUDE 3.5 SONNET + QUANT HYBRID</Badge>
          </div>
          <p className="text-xs font-mono text-slate-400">
            Parallel multi-agent consensus matrix. Evaluates macroeconomic releases with strict input validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-terminal-border">
            {['XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPair(p)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  selectedPair === p
                    ? 'bg-terminal-cyan text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={runningAnalysis}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-cyan text-black font-mono font-bold text-xs hover:bg-cyan-300 transition-colors shadow-md disabled:opacity-50"
          >
            {runningAnalysis ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black" />
            )}
            <span>{runningAnalysis ? 'Analyzing...' : `Run Analysis on ${selectedPair}`}</span>
          </button>
        </div>
      </div>

      {/* Consensus Summary Banner if live run executed */}
      {liveRunResult && (
        <div className="p-4 rounded-xl bg-slate-950 border border-terminal-cyan/50 font-mono text-xs shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-terminal-cyan" />
              <span className="font-bold text-white uppercase">Live Synthesis Verdict for {selectedPair}</span>
              <Badge variant={liveRunResult.consensusSummary?.prevailingBias === 'BULLISH' ? 'buy' : 'sell'}>
                {liveRunResult.consensusSummary?.prevailingBias} ({liveRunResult.consensusSummary?.weightedConfidence}%)
              </Badge>
            </div>
            <span className="text-[10px] text-slate-400">Run ID: {liveRunResult.runId.substring(0, 8)}...</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-[11px]">
            <div>Bull Votes: <strong className="text-terminal-green">{liveRunResult.consensusSummary?.bullishVotes}</strong></div>
            <div>Bear Votes: <strong className="text-terminal-red">{liveRunResult.consensusSummary?.bearishVotes}</strong></div>
            <div>Neutral Votes: <strong className="text-slate-400">{liveRunResult.consensusSummary?.neutralVotes}</strong></div>
            <div>Agreement: <strong className="text-terminal-cyan">{liveRunResult.consensusSummary?.agreementRatio}%</strong></div>
          </div>
        </div>
      )}

      {/* Agents Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayAgents.map((ag) => {
          const isEvaluated = ag.status === 'EVALUATED_LIVE';
          const isBull = ag.bias === 'BULLISH';
          const isBear = ag.bias === 'BEARISH';

          return (
            <div
              key={ag.id}
              className={`bg-terminal-surface border ${isEvaluated ? (isBull ? 'border-emerald-500/40' : isBear ? 'border-rose-500/40' : 'border-slate-700') : 'border-terminal-border'} rounded-xl p-4 shadow-lg space-y-3 font-mono text-xs transition-all`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-bold">#{ag.id}</span>
                    <h3 className="font-bold text-white text-sm">{ag.name}</h3>
                  </div>
                  <div className="text-[10px] text-terminal-cyan mt-0.5">Role: {ag.weight} weight</div>
                </div>

                {isEvaluated ? (
                  <Badge variant={isBull ? 'buy' : isBear ? 'sell' : 'neutral'} size="xs">
                    {ag.bias} ({ag.confidence}%)
                  </Badge>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    READY
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed border-t border-terminal-border/50 pt-2">
                {ag.role}
              </p>

              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Evaluation Focus:</div>
                {ag.factors.map((f, i) => (
                  <div key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                    <span className="text-terminal-cyan shrink-0">›</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
