import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, MinusCircle, AlertTriangle, CheckCircle, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../common/Badge';

export function SignalCard({ signal, onSelectEvent }) {
  const [expanded, setExpanded] = useState(false);

  if (!signal) return null;

  const isBuy = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';
  const isNoTrade = signal.direction === 'NO_TRADE';

  const directionColor = isBuy
    ? 'text-terminal-green'
    : isSell
    ? 'text-terminal-red'
    : 'text-slate-400';

  const borderColor = isBuy
    ? 'border-emerald-500/40'
    : isSell
    ? 'border-rose-500/40'
    : 'border-slate-700';

  return (
    <div className={`bg-terminal-surface border ${borderColor} rounded-lg p-5 shadow-lg relative overflow-hidden transition-all hover:border-terminal-cyan/50`}>
      {/* Top Banner: Instrument & Direction */}
      <div className="flex items-start justify-between pb-3 border-b border-terminal-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-tight text-white">{signal.pair}</span>
            <Badge variant={isBuy ? 'buy' : isSell ? 'sell' : 'neutral'} size="md">
              {isBuy ? 'PRE-NEWS BUY' : isSell ? 'PRE-NEWS SELL' : 'NO TRADE'}
            </Badge>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {signal.confidence_pct}% CONFIDENCE
            </span>
          </div>

          <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
            <span>Linked Event:</span>
            <span className="text-terminal-cyan font-medium">{signal.events?.event_name || 'US Macro Release'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{signal.events?.currency}</span>
          </div>
        </div>

        {/* Direction Icon & Timing Mode */}
        <div className="text-right font-mono">
          <div className="flex items-center justify-end gap-1">
            {isBuy && <ArrowUpRight className="w-7 h-7 text-terminal-green animate-bounce" />}
            {isSell && <ArrowDownRight className="w-7 h-7 text-terminal-red animate-bounce" />}
            {isNoTrade && <MinusCircle className="w-7 h-7 text-slate-400" />}
          </div>
          <div className="text-[10px] text-amber-400/90 font-medium tracking-wide uppercase mt-0.5">
            {signal.timing === 'post_news_confirmation' ? 'Wait for Post-News Retest' : 'Pre-News Limit Entry'}
          </div>
        </div>
      </div>

      {/* TRADE EXECUTION PARAMETERS (User Requirement: Entry points, SL, TP1, TP2, RR, Lots) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 bg-slate-950/70 rounded border border-terminal-border text-xs font-mono">
        {/* Entry Zone */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Suggested Entry</div>
          <div className="text-base font-bold text-white tabular-nums mt-0.5">
            {signal.suggested_entry ? signal.suggested_entry.toFixed(2) : 'Market'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Zone: <span className="text-terminal-cyan">{signal.entry_zone_min?.toFixed(2)} - {signal.entry_zone_max?.toFixed(2)}</span>
          </div>
        </div>

        {/* Stop Loss */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Stop Loss (Risk)</div>
          <div className="text-base font-bold text-terminal-red tabular-nums mt-0.5">
            {signal.stop_loss ? signal.stop_loss.toFixed(2) : 'N/A'}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">
            Distance: {signal.suggested_entry && signal.stop_loss ? Math.abs(signal.suggested_entry - signal.stop_loss).toFixed(2) : '-'}
          </div>
        </div>

        {/* Take Profit Targets */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Targets (TP1 / TP2)</div>
          <div className="text-base font-bold text-terminal-green tabular-nums mt-0.5">
            {signal.take_profit_1?.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">
            TP2: <span className="font-semibold">{signal.take_profit_2?.toFixed(2) || 'Runner'}</span>
          </div>
        </div>

        {/* Risk/Reward & Lot Sizing */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">R:R & Lots (1% Risk)</div>
          <div className="text-base font-bold text-terminal-cyan tabular-nums mt-0.5">
            {signal.risk_reward_ratio ? `1:${signal.risk_reward_ratio}` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">
            Size: <span className="font-bold text-white">{signal.position_size_lots || 0.10} Lots</span>
          </div>
        </div>
      </div>

      {/* DEVIL'S ADVOCATE OBJECTION (Crucial Safeguard) */}
      {signal.dev_advocate_objections && signal.dev_advocate_objections.length > 0 && (
        <div className="mb-3 p-2.5 rounded bg-amber-950/30 border border-amber-600/30 text-xs font-mono text-amber-300/90 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-terminal-gold shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-terminal-gold uppercase tracking-wider mr-1.5">Devil's Advocate Warning:</span>
            <span>{signal.dev_advocate_objections[0]}</span>
          </div>
        </div>
      )}

      {/* Expandable Agent Breakdown & Key Drivers */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-terminal-cyan pt-2 border-t border-terminal-border transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>Agent Consensus:</span>
            <span className="text-terminal-green font-semibold">{signal.agreed_agents?.length || 5} Agreed</span>
            <span className="text-slate-600">/</span>
            <span className="text-terminal-red font-semibold">{signal.disagreed_agents?.length || 2} Disagreed</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span>{expanded ? 'Hide Analysis' : 'Inspect Reasoning'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono space-y-3">
            {/* Key Drivers */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Key Drivers for Playbook:</div>
              <ul className="space-y-1">
                {signal.key_drivers?.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-terminal-cyan shrink-0 mt-0.5" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Risks */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Tail & Execution Risks:</div>
              <ul className="space-y-1">
                {signal.key_risks?.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-rose-300/90">
                    <AlertTriangle className="w-3.5 h-3.5 text-terminal-red shrink-0 mt-0.5" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Agreed / Disagreed Agents Tags */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="text-[10px] text-slate-500 py-0.5">Agreed:</span>
              {signal.agreed_agents?.map((agent, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                  {agent}
                </span>
              ))}
              <span className="text-[10px] text-slate-500 py-0.5 ml-2">Disagreed:</span>
              {signal.disagreed_agents?.map((agent, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800">
                  {agent}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
