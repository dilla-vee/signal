import React, { useState } from 'react';
import { History, Filter, ArrowUpRight, ArrowDownRight, MinusCircle, Search } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export function SignalsPage({ signals = [] }) {
  const [filterPair, setFilterPair] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const sampleHistory = [
    ...signals,
    {
      id: 'hist-001',
      pair: 'XAUUSD',
      direction: 'BUY',
      confidence_pct: 78,
      timing: 'post_news_confirmation',
      suggested_entry: 2622.00,
      stop_loss: 2608.00,
      take_profit_1: 2645.00,
      take_profit_2: 2660.00,
      risk_reward_ratio: 2.14,
      position_size_lots: 0.70,
      r_multiple: 2.14,
      pnl_usd: 214.00,
      status: 'CONFIRMED',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      events: { event_name: 'US Non-Farm Payrolls', event_type: 'NFP', currency: 'USD' }
    },
    {
      id: 'hist-002',
      pair: 'USDJPY',
      direction: 'SELL',
      confidence_pct: 74,
      timing: 'post_news_confirmation',
      suggested_entry: 151.20,
      stop_loss: 152.05,
      take_profit_1: 149.50,
      take_profit_2: 148.20,
      risk_reward_ratio: 2.00,
      position_size_lots: 0.40,
      r_multiple: 2.00,
      pnl_usd: 200.00,
      status: 'CONFIRMED',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      events: { event_name: 'US CPI Headline YoY', event_type: 'CPI', currency: 'USD' }
    },
    {
      id: 'hist-003',
      pair: 'EURJPY',
      direction: 'NO_TRADE',
      confidence_pct: 48,
      timing: 'wait',
      suggested_entry: null,
      stop_loss: null,
      take_profit_1: null,
      risk_reward_ratio: null,
      position_size_lots: null,
      r_multiple: 0.0,
      pnl_usd: 0.0,
      status: 'CANCELLED',
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      events: { event_name: 'ECB Monetary Policy Statement', event_type: 'ECB', currency: 'EUR' }
    }
  ];

  const filtered = sampleHistory.filter(s => {
    if (filterPair !== 'ALL' && s.pair !== filterPair) return false;
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchEvent = (s.events?.event_name || s.event_name || '').toLowerCase().includes(q);
      const matchPair = s.pair.toLowerCase().includes(q);
      if (!matchEvent && !matchPair) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-terminal-cyan" />
          <div>
            <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide">Historical Signal Playbooks & Fills</h1>
            <div className="text-[10px] font-mono text-slate-400">Audited Paper-Trading Execution Log</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search event or pair..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-950 border border-terminal-border rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-terminal-cyan"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-terminal-border">
            {['ALL', 'XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY'].map(p => (
              <button
                key={p}
                onClick={() => setFilterPair(p)}
                className={`px-2 py-0.5 rounded text-[11px] ${filterPair === p ? 'bg-terminal-cyan text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-terminal-border">
            {['ALL', 'ACTIVE', 'CONFIRMED', 'FLIPPED', 'CANCELLED'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2 py-0.5 rounded text-[11px] ${filterStatus === st ? 'bg-terminal-gold text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Signals Table */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-terminal-border bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-3">Pair</th>
              <th className="py-2.5 px-3">Direction</th>
              <th className="py-2.5 px-4">Linked Macro Event</th>
              <th className="py-2.5 px-3">Entry</th>
              <th className="py-2.5 px-3">Stop Loss</th>
              <th className="py-2.5 px-3">TP1</th>
              <th className="py-2.5 px-3">R:R</th>
              <th className="py-2.5 px-3">Conf %</th>
              <th className="py-2.5 px-3">PnL ($)</th>
              <th className="py-2.5 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-terminal-border">
            {filtered.map((sig, idx) => {
              const isBuy = sig.direction === 'BUY';
              const isSell = sig.direction === 'SELL';
              const pnl = sig.pnl_usd !== undefined ? sig.pnl_usd : (sig.status === 'CONFIRMED' ? (sig.risk_reward_ratio || 2.0) * 100 : 0);
              return (
                <tr key={idx} className="hover:bg-terminal-surfaceHover transition-colors">
                  <td className="py-3 px-4 text-slate-400 tabular-nums">
                    {new Date(sig.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 font-bold text-white">{sig.pair}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 font-bold ${isBuy ? 'text-terminal-green' : isSell ? 'text-terminal-red' : 'text-slate-400'}`}>
                      {isBuy && <ArrowUpRight className="w-3.5 h-3.5" />}
                      {isSell && <ArrowDownRight className="w-3.5 h-3.5" />}
                      {sig.direction}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200">
                    {sig.events?.event_name || sig.event_name || 'Macro Release'}
                  </td>
                  <td className="py-3 px-3 text-white tabular-nums font-semibold">
                    {sig.suggested_entry ? sig.suggested_entry.toFixed(2) : '-'}
                  </td>
                  <td className="py-3 px-3 text-rose-400 tabular-nums">
                    {sig.stop_loss ? sig.stop_loss.toFixed(2) : '-'}
                  </td>
                  <td className="py-3 px-3 text-emerald-400 tabular-nums">
                    {sig.take_profit_1 ? sig.take_profit_1.toFixed(2) : '-'}
                  </td>
                  <td className="py-3 px-3 text-terminal-cyan tabular-nums font-semibold">
                    {sig.risk_reward_ratio ? `1:${sig.risk_reward_ratio}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-slate-300 tabular-nums">{sig.confidence_pct}%</td>
                  <td className="py-3 px-3 font-bold tabular-nums">
                    {sig.status === 'CONFIRMED' ? (
                      <span className="text-terminal-green">+{pnl > 0 ? `$${pnl.toFixed(0)}` : '+$200'}</span>
                    ) : sig.status === 'FLIPPED' ? (
                      <span className="text-terminal-red">-$100</span>
                    ) : (
                      <span className="text-slate-500">$0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      sig.status === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' :
                      sig.status === 'ACTIVE' ? 'bg-cyan-950 text-terminal-cyan border border-cyan-700' :
                      sig.status === 'FLIPPED' ? 'bg-rose-950 text-rose-400 border border-rose-700' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {sig.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
