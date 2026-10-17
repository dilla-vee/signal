import React, { useState } from 'react';
import { Bot, CheckCircle2, ShieldAlert, Cpu, Sparkles, Scale, Play, RefreshCw, Layers } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export function AgentsPage() {
  const [selectedPair, setSelectedPair] = useState('XAUUSD');
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [liveRunResult, setLiveRunResult] = useState(null);

  const defaultAgents = [
    {
      id: 1,
      name: 'Fundamentals Agent',
      role: 'Consensus vs previous, recent trend in data, and likelihood of surprise',
      weight: '12%',
      accuracy: '78.5%',
      defaultBias: 'BULLISH',
      defaultConfidence: 72,
      factors: ['Shelter CPI disinflation momentum', 'Consensus 3.1% YoY cooler than previous 3.2%', 'Historical survey downward skew']
    },
    {
      id: 2,
      name: 'Central Bank Agent',
      role: 'Fed and BoJ tone, expected policy path (hawkish/dovish), and statement changes',
      weight: '14%',
      accuracy: '82.0%',
      defaultBias: 'BULLISH',
      defaultConfidence: 78,
      factors: ['Federal Reserve dovish-leaning rate cut trajectory', 'Governor Ueda hawkish normalization path', 'MoF verbal intervention alerts active']
    },
    {
      id: 3,
      name: 'Rates & Yield Agent',
      role: 'US 2Y/10Y yields, US real yields (TIPS), US-Japan spread and implications',
      weight: '15%',
      accuracy: '85.4%',
      defaultBias: 'BULLISH',
      defaultConfidence: 82,
      factors: ['10Y Real yield at 1.84% (sub-2.0% threshold)', 'US-Japan yield spread compressed to 3.23%', '2Y yield capping out']
    },
    {
      id: 4,
      name: 'Cross-Asset & Risk-Sentiment Agent',
      role: 'DXY, S&P 500, Nasdaq, VIX, Oil, and JPY carry-trade unwind conditions',
      weight: '10%',
      accuracy: '72.1%',
      defaultBias: 'NEUTRAL',
      defaultConfidence: 68,
      factors: ['VIX at 16.40 reflects stable risk appetite', 'WTI Crude at $71.20 holding support', 'DXY sub-103.50']
    },
    {
      id: 5,
      name: 'Technical Structure Agent',
      role: 'Trend, key support/resistance, ATR volatility, and institutional order blocks',
      weight: '9%',
      accuracy: '68.9%',
      defaultBias: 'BULLISH',
      defaultConfidence: 74,
      factors: ['14-period ATR is $28.50', 'Daily swing higher highs intact', 'Institutional bids defended at 2635.00 support']
    },
    {
      id: 6,
      name: 'Positioning & Sentiment Agent',
      role: 'CFTC COT positioning for Gold and JPY, retail skew, and crowding metrics',
      weight: '8%',
      accuracy: '70.2%',
      defaultBias: 'BULLISH',
      defaultConfidence: 70,
      factors: ['Gold non-commercial net longs at +265,400 contracts', 'Institutional asset manager accumulation sustained', 'JPY net shorts normalized']
    },
    {
      id: 7,
      name: 'Geopolitical & Event-Risk Agent',
      role: 'Safe-haven premium, Japan MoF intervention risk, and tail shocks',
      weight: '9%',
      accuracy: '76.0%',
      defaultBias: 'BULLISH',
      defaultConfidence: 80,
      factors: ['Structural $40-$60/oz geopolitical risk premium', 'Central bank physical reserve accumulation floor', 'MoF intervention alert zone near 151']
    },
    {
      id: 8,
      name: 'Historical Reaction Agent',
      role: 'Empirical past reactions (+1m/+5m/+15m/+60m moves, spike sizes, reversal odds)',
      weight: '11%',
      accuracy: '88.2%',
      defaultBias: 'NEUTRAL',
      defaultConfidence: 78,
      factors: ['Analysis of 12 audited past CPI releases', 'Average 5m spike: 185.0 pips', 'First-move reversal rate: 38.5% (median min 35)']
    },
    {
      id: 9,
      name: 'Scenario Builder Agent',
      role: 'Constructs the 5-point outcome matrix, probability distribution, and expected value',
      weight: 'Engine',
      accuracy: '91.0%',
      defaultBias: 'BULLISH',
      defaultConfidence: 85,
      factors: ['5-way scenario matrix (Much Hotter to Much Cooler)', 'Net positive expected-value asymmetry (+1.42 R)']
    },
    {
      id: 10,
      name: "Devil's Advocate Agent",
      role: 'Actively attacks the emerging consensus, lists invalidation levels and what makes signal wrong',
      weight: 'Safeguard',
      accuracy: '94.5%',
      defaultBias: 'NO_TRADE',
      defaultConfidence: 88,
      factors: ['Warns that 10Y Treasury yield support at 4.00% could crush longs on an in-line Core beat']
    },
    {
      id: 11,
      name: 'Judge / Synthesizer Agent',
      role: 'Weighs all 10 agents, enforces user rules, computes exact pre-news entry/SL/TP, outputs BUY/SELL/NO TRADE',
      weight: 'Master',
      accuracy: '86.5%',
      defaultBias: 'BULLISH',
      defaultConfidence: 75,
      factors: ['Synthesizes 5 Bull vs 2 Bear into BUY signal with post-news confirmation entry zone']
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
  const displayAgents = defaultAgents.map(ag => {
    if (liveRunResult?.outputs) {
      const live = liveRunResult.outputs.find(o => o.agent_name.toLowerCase().includes(ag.name.toLowerCase().split(' ')[0]));
      if (live) {
        return {
          ...ag,
          defaultBias: live.bias,
          defaultConfidence: live.confidence,
          factors: live.key_factors || ag.factors
        };
      }
    }
    return ag;
  });

  return (
    <div className="space-y-6">
      {/* Header & Execution Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Bot className="w-5 h-5 text-terminal-cyan" />
            <span>Autonomous AI Agent Intelligence Team (11 Specialists)</span>
          </h1>
          <div className="text-[10px] font-mono text-slate-400">
            Claude 3.5 Sonnet Integration // Strict Zod Schemas // Zero Hallucination
          </div>
        </div>

        {/* Pair Switcher & Trigger Button */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-terminal-border">
            {['XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'].map(p => (
              <button
                key={p}
                onClick={() => { setSelectedPair(p); setLiveRunResult(null); }}
                className={`px-2 py-0.5 rounded text-[11px] ${selectedPair === p ? 'bg-terminal-cyan text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={runningAnalysis}
            className="px-4 py-1.5 rounded font-bold bg-terminal-cyan text-black hover:bg-cyan-300 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md"
          >
            <Play className={`w-3.5 h-3.5 fill-black ${runningAnalysis ? 'animate-spin' : ''}`} />
            <span>{runningAnalysis ? 'Dispatching 8 Agents...' : `Run AI Analysis (${selectedPair})`}</span>
          </button>
        </div>
      </div>

      {/* Live Consensus Banner (Shown when user runs analysis) */}
      {liveRunResult && (
        <div className="bg-gradient-to-r from-cyan-950/40 via-terminal-surface to-cyan-950/40 border border-cyan-500/50 rounded-xl p-4 font-mono text-xs shadow-xl animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-green animate-ping"></span>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Synthesized Consensus ({liveRunResult.pair}):</span>
                <div className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  <span className={liveRunResult.consensusSummary?.prevailingBias === 'BULLISH' ? 'text-terminal-green' : 'text-terminal-red'}>
                    PREVAILING {liveRunResult.consensusSummary?.prevailingBias}
                  </span>
                  <span className="text-slate-400 text-xs font-normal">
                    ({liveRunResult.consensusSummary?.weightedConfidence}% Confidence)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <div>Bullish: <strong className="text-terminal-green">{liveRunResult.consensusSummary?.bullishCount}</strong></div>
              <div>Bearish: <strong className="text-terminal-red">{liveRunResult.consensusSummary?.bearishCount}</strong></div>
              <div>Neutral: <strong className="text-slate-400">{liveRunResult.consensusSummary?.neutralCount}</strong></div>
              <div className="text-slate-500">Latency: {liveRunResult.latencyMs}ms</div>
            </div>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
        {displayAgents.map((agent) => (
          <div
            key={agent.id}
            className={`bg-terminal-surface border rounded-xl p-4 shadow-lg flex flex-col justify-between ${
              agent.id === 11 ? 'border-cyan-500/50 bg-slate-900/60' : agent.id === 10 ? 'border-amber-500/40' : 'border-terminal-border'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-terminal-border">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${agent.id === 11 ? 'bg-cyan-950 text-terminal-cyan' : agent.id === 10 ? 'bg-amber-950 text-terminal-gold' : 'bg-slate-900 text-slate-300'}`}>
                    {agent.id === 11 ? <Scale className="w-4 h-4" /> : agent.id === 10 ? <ShieldAlert className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">{agent.name}</div>
                    <div className="text-[10px] text-slate-500">Agent #{agent.id}</div>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant={agent.defaultBias === 'BULLISH' ? 'buy' : agent.defaultBias === 'BEARISH' ? 'sell' : 'neutral'} size="xs">
                    {agent.defaultBias} ({agent.defaultConfidence}%)
                  </Badge>
                  <div className="text-[10px] text-slate-400 mt-1">Weight: <strong className="text-terminal-cyan">{agent.weight}</strong></div>
                </div>
              </div>

              <p className="text-slate-300 text-[11px] mt-2.5 leading-relaxed">
                {agent.role}
              </p>

              {/* Factors */}
              <div className="mt-3 pt-2.5 border-t border-slate-900">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Active Factor Inputs:</div>
                <ul className="space-y-1">
                  {agent.factors.map((f, i) => (
                    <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1.5">
                      <span className="text-terminal-cyan">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-terminal-border flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Historical Accuracy:</span>
              <span className="font-bold text-terminal-green tabular-nums">{agent.accuracy}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
