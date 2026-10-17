import React from 'react';
import { BarChart3, TrendingUp, Award, DollarSign, Percent, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function PerformancePage() {
  const equityCurveData = [
    { trade: 'T0', balance: 10000 },
    { trade: 'T1 (CPI)', balance: 10220 },
    { trade: 'T2 (NFP)', balance: 10450 },
    { trade: 'T3 (FOMC)', balance: 10380 },
    { trade: 'T4 (BOJ)', balance: 10690 },
    { trade: 'T5 (PPI)', balance: 10840 },
    { trade: 'T6 (Claims)', balance: 10790 },
    { trade: 'T7 (CPI)', balance: 11150 },
    { trade: 'T8 (Retail)', balance: 11380 },
    { trade: 'T9 (NFP)', balance: 11620 },
    { trade: 'T10 (BOJ)', balance: 11950 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-terminal-cyan" />
            <span>Autonomous Accuracy & Prediction Tracker</span>
          </h1>
          <div className="text-[10px] font-mono text-slate-400">
            Empirical Paper-Trading Simulation // Tracked Against Actual Post-Release High/Low
          </div>
        </div>

        <div className="text-xs font-mono px-3 py-1 rounded bg-emerald-950 text-terminal-green border border-emerald-600/40 font-bold">
          LIVE AUDIT ACTIVE
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">Hit Rate (Win %)</div>
          <div className="text-2xl font-bold text-terminal-green tabular-nums mt-1">71.4%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">25 Wins / 10 Losses</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">Avg Risk/Reward</div>
          <div className="text-2xl font-bold text-terminal-cyan tabular-nums mt-1">1:2.24</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Realized R: 1.82 R</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">Profit Factor</div>
          <div className="text-2xl font-bold text-terminal-gold tabular-nums mt-1">2.48</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gross Win / Gross Loss</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">Simulated Return</div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">+19.5%</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">+$1,950.00 PnL</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">Max Drawdown</div>
          <div className="text-2xl font-bold text-terminal-red tabular-nums mt-1">-3.8%</div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">Peak-to-Trough</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">No-Trade Filter Saves</div>
          <div className="text-2xl font-bold text-purple-400 tabular-nums mt-1">14 Saves</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Whipsaw Avoidance</div>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">Paper Trading Equity Curve ($10,000 Base)</h2>
            <div className="text-[10px] text-slate-400">Fixed 1.0% Risk Per Playbook Execution</div>
          </div>
          <div className="text-xs font-mono text-terminal-green font-bold flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            <span>+$1,950.00 Net Paper Gain</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurveData}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" />
              <XAxis dataKey="trade" stroke="#64748B" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis stroke="#64748B" domain={['dataMin - 200', 'dataMax + 200']} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B0E14', borderColor: '#1F293D', fontFamily: 'monospace', fontSize: '11px' }}
                itemStyle={{ color: '#00F0FF' }}
              />
              <Area type="monotone" dataKey="balance" stroke="#00F0FF" strokeWidth={2} fillOpacity={1} fill="url(#equityGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown by Pair & Event Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Pair Performance */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Performance Breakdown by Pair</h3>
          <div className="space-y-2">
            {[
              { pair: 'XAUUSD', trades: 14, winRate: '78.5%', pnl: '+$1,120' },
              { pair: 'USDJPY', trades: 11, winRate: '72.7%', pnl: '+$640' },
              { pair: 'EURJPY', trades: 5, winRate: '60.0%', pnl: '+$180' },
              { pair: 'GBPJPY', trades: 3, winRate: '66.7%', pnl: '+$110' },
              { pair: 'AUDJPY', trades: 2, winRate: '50.0%', pnl: '-$100' }
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900">
                <span className="font-bold text-white">{row.pair}</span>
                <span className="text-slate-400">{row.trades} Plays</span>
                <span className="text-terminal-cyan font-semibold">{row.winRate}</span>
                <span className={`font-bold ${row.pnl.startsWith('+') ? 'text-terminal-green' : 'text-terminal-red'}`}>{row.pnl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Type Performance */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Performance by Macro Event Type</h3>
          <div className="space-y-2">
            {[
              { type: 'US CPI (YoY / MoM)', accuracy: '83.3%', avgMove: '190 pips', rating: 'Exceptional' },
              { type: 'Bank of Japan (BOJ)', accuracy: '80.0%', avgMove: '220 pips', rating: 'Exceptional' },
              { type: 'FOMC Decision', accuracy: '75.0%', avgMove: '160 pips', rating: 'High' },
              { type: 'Non-Farm Payrolls (NFP)', accuracy: '66.7%', avgMove: '240 pips', rating: 'Moderate' },
              { type: 'US Producer Price (PPI)', accuracy: '62.5%', avgMove: '85 pips', rating: 'Moderate' }
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900">
                <span className="font-bold text-white">{row.type}</span>
                <span className="text-slate-400">{row.avgMove}</span>
                <span className="text-terminal-cyan font-semibold">{row.accuracy}</span>
                <span className="text-terminal-green text-[10px] uppercase font-bold">{row.rating}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
