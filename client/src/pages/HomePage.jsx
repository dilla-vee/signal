import React from 'react';
import { Flame, Target, ShieldCheck, Zap, Activity, TrendingUp, AlertOctagon } from 'lucide-react';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { SignalCard } from '../components/signals/SignalCard';
import { CalendarTable } from '../components/calendar/CalendarTable';
import { Badge } from '../components/common/Badge';

export function HomePage({ events = [], signals = [], onSelectEvent, onRefreshCalendar, loading }) {
  const nextMajorEvent = events.find(e => e.impact_level === 'HIGH') || events[0];

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO: NEXT MAJOR HIGH-IMPACT EVENT COUNTDOWN & PLAYBOOK TRIGGER */}
      {nextMajorEvent && (
        <div className="bg-gradient-to-r from-slate-900 via-terminal-surface to-slate-900 border border-terminal-cyan/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-cyan opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-cyan"></span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-terminal-cyan font-bold">
                  Next Imminent High-Impact Release
                </span>
                <Badge variant="high" size="xs">
                  {nextMajorEvent.impact_level} IMPACT
                </Badge>
              </div>

              <h1 className="text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
                {nextMajorEvent.event_name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono text-slate-300">
                <div>
                  Country: <span className="text-white font-bold">{nextMajorEvent.country} ({nextMajorEvent.currency})</span>
                </div>
                <div>
                  Forecast: <span className="text-terminal-cyan font-bold">{nextMajorEvent.forecast_val || 'N/A'}</span>
                </div>
                <div>
                  Previous: <span className="text-slate-400 font-bold">{nextMajorEvent.previous_val || 'N/A'}</span>
                </div>
                <div>
                  Target Pairs: <span className="text-amber-400 font-medium">XAUUSD, USDJPY</span>
                </div>
              </div>
            </div>

            {/* Countdown & Playbook Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t md:border-t-0 md:border-l border-terminal-border pt-4 md:pt-0 md:pl-6">
              <div className="text-left font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Time Remaining</div>
                <div className="text-lg">
                  <CountdownTimer targetTime={nextMajorEvent.release_time} />
                </div>
              </div>

              <button
                onClick={() => onSelectEvent && onSelectEvent(nextMajorEvent)}
                className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold bg-terminal-cyan text-black hover:bg-cyan-300 shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Open Pre-News Playbook</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MACRO CROSS-ASSET TELEMETRY TICKER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'US 10Y Yield', value: '4.18%', change: '+3.2 bps', positive: true },
          { label: 'US 2Y Yield', value: '4.02%', change: '+1.5 bps', positive: true },
          { label: 'US-JP 10Y Spread', value: '3.23%', change: '-4.1 bps', positive: false },
          { label: 'US Dollar (DXY)', value: '102.85', change: '+0.12%', positive: true },
          { label: 'Gold (XAUUSD)', value: '$2,658.40', change: '+$14.20', positive: true },
          { label: 'VIX Volatility', value: '16.40', change: '-0.35', positive: false }
        ].map((item, idx) => (
          <div key={idx} className="bg-terminal-surface border border-terminal-border rounded-lg p-3 text-xs font-mono">
            <div className="text-[10px] text-slate-500 uppercase">{item.label}</div>
            <div className="text-sm font-bold text-white tabular-nums mt-0.5">{item.value}</div>
            <div className={`text-[10px] tabular-nums mt-0.5 ${item.positive ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {item.change}
            </div>
          </div>
        ))}
      </div>

      {/* 3. ACTIVE PRE-NEWS TRADING SIGNALS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3 font-mono">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-terminal-green" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Active Pre-News Decision Signals
            </h2>
            <span className="text-xs text-slate-500">
              (Synthesized by 11 AI Agents with explicit Entry, Stop Loss & Take Profits)
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Paper Trading Mode
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signals.map((sig) => (
            <SignalCard key={sig.id} signal={sig} onSelectEvent={onSelectEvent} />
          ))}
        </div>
      </div>

      {/* 4. UPCOMING ECONOMIC CALENDAR TABLE */}
      <div>
        <CalendarTable
          events={events}
          onSelectEvent={onSelectEvent}
          onRefresh={onRefreshCalendar}
          loading={loading}
        />
      </div>
    </div>
  );
}
