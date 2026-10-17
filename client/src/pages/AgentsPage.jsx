import React from 'react';
import { Bot, CheckCircle2, ShieldAlert, Cpu, Sparkles, Scale } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export function AgentsPage() {
  const agents = [
    {
      id: 1,
      name: 'Fundamentals Agent',
      role: 'Consensus vs previous, recent trend in data, and likelihood of surprise',
      weight: '12%',
      accuracy: '78.5%',
      status: 'ONLINE',
      factors: ['Shelter CPI deceleration', 'Sticky auto insurance subcomponents', 'Historical survey skew']
    },
    {
      id: 2,
      name: 'Central Bank Agent',
      role: 'Fed and BoJ tone, expected policy path (hawkish/dovish), and statement changes',
      weight: '14%',
      accuracy: '82.0%',
      status: 'ONLINE',
      factors: ['Ueda hawkish normalization guidance', 'FOMC dot plot neutrality', 'MoF verbal intervention alerts']
    },
    {
      id: 3,
      name: 'Rates & Yield Agent',
      role: 'US 2Y/10Y yields, US real yields (TIPS), US-Japan spread and implications',
      weight: '15%',
      accuracy: '85.4%',
      status: 'ONLINE',
      factors: ['US-JP spread compressed to 3.23%', '10Y real yield at 1.84%', '2Y yield consolidation']
    },
    {
      id: 4,
      name: 'Cross-Asset & Risk-Sentiment Agent',
      role: 'DXY, S&P 500, Nasdaq, VIX, Oil, and JPY carry-trade unwind conditions',
      weight: '10%',
      accuracy: '72.1%',
      status: 'ONLINE',
      factors: ['VIX at 16.40 (benign volatility)', 'WTI Oil holding $71 support', 'Tech beta stability']
    },
    {
      id: 5,
      name: 'Technical Structure Agent',
      role: 'Trend, key support/resistance, ATR volatility, and institutional order blocks',
      weight: '9%',
      accuracy: '68.9%',
      status: 'ONLINE',
      factors: ['XAUUSD ATR at $28.50', 'Support tested at 2635.00', 'USDJPY 150.80 resistance cap']
    },
    {
      id: 6,
      name: 'Positioning & Sentiment Agent',
      role: 'CFTC COT positioning for Gold and JPY, retail skew, and crowding metrics',
      weight: '8%',
      accuracy: '70.2%',
      status: 'ONLINE',
      factors: ['Gold non-commercial net longs: +265.4k contracts', 'JPY net short covering accelerating']
    },
    {
      id: 7,
      name: 'Geopolitical & Event-Risk Agent',
      role: 'Safe-haven premium, Japan MoF currency intervention risks, and tail shocks',
      weight: '9%',
      accuracy: '76.0%',
      status: 'ONLINE',
      factors: ['Middle East escalation premium embedded in Gold', 'MoF active warning zone: 151.00-152.00']
    },
    {
      id: 8,
      name: 'Historical Reaction Agent',
      role: 'Empirical past reactions (+1m/+5m/+15m/+60m moves, spike sizes, reversal odds)',
      weight: '11%',
      accuracy: '88.2%',
      status: 'ONLINE',
      factors: ['Past 12 CPI prints: Gold reversed initial move 38% of times within 35 mins', 'Average 5m spike: 180 pips']
    },
    {
      id: 9,
      name: 'Scenario Builder Agent',
      role: 'Constructs the 5-point outcome matrix, probability distribution, and expected value',
      weight: 'Engine',
      accuracy: '91.0%',
      status: 'ONLINE',
      factors: ['Sum of probabilities: 100%', 'Conditional rules for Much Hotter to Much Cooler']
    },
    {
      id: 10,
      name: "Devil's Advocate Agent",
      role: 'Actively attacks the emerging consensus, lists invalidation levels and what makes signal wrong',
      weight: 'Safeguard',
      accuracy: '94.5%',
      status: 'ONLINE',
      factors: ['Identified 10Y yield support at 4.00% as fatal threat to Gold longs on inline print']
    },
    {
      id: 11,
      name: 'Judge / Synthesizer Agent',
      role: 'Weighs all 10 agents, enforces user rules, computes exact pre-news entry/SL/TP, outputs BUY/SELL/NO TRADE',
      weight: 'Master',
      accuracy: '86.5%',
      status: 'ONLINE',
      factors: ['Resolved 5 Bull vs 2 Bear split into post-news confirmed Long with 1:2.28 RR']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Bot className="w-5 h-5 text-terminal-cyan" />
            <span>Autonomous AI Agent Intelligence Team (11 Specialists)</span>
          </h1>
          <div className="text-[10px] font-mono text-slate-400">
            Powered by Anthropic Claude 3.5 Sonnet // Zero Hallucination // Strict Zod Schemas
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse"></span>
          <span className="text-terminal-green font-bold">ALL 11 AGENTS OPERATIONAL</span>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
        {agents.map((agent) => (
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
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {agent.status}
                  </span>
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
