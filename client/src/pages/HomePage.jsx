import React, { useState, useEffect } from 'react';
import { Flame, Target, ShieldCheck, Zap, Activity, TrendingUp, AlertOctagon, Clock, Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { SignalCard } from '../components/signals/SignalCard';
import { CalendarTable } from '../components/calendar/CalendarTable';
import { Badge } from '../components/common/Badge';
import { TimeAgo } from '../components/common/TimeAgo';

export function HomePage({ events = [], signals = [], onSelectEvent, onRefreshCalendar, loading }) {
  const [tickerData, setTickerData] = useState(null);
  const [tickerLoading, setTickerLoading] = useState(true);

  async function fetchTicker() {
    try {
      const res = await fetch('/api/snapshots/ticker');
      if (res.ok) {
        const json = await res.json();
        setTickerData(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch ticker data:', err);
    } finally {
      setTickerLoading(false);
    }
  }

  useEffect(() => {
    fetchTicker();
    // 15 seconds polling interval
    const interval = setInterval(fetchTicker, 15000);
    return () => clearInterval(interval);
  }, []);

  const nextMajorEvent = events.find(e => e.impact_level === 'HIGH') || events[0];

  const tickerItems = tickerData?.items || [];
  const isTickerStale = tickerData ? Boolean(tickerData.is_stale) : false;
  const isTickerDemo = tickerData ? Boolean(tickerData.is_demo) : false;

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
                {nextMajorEvent.is_demo ? (
                  <Badge variant="demo" size="xs">DEMO DATA</Badge>
                ) : nextMajorEvent.is_stale ? (
                  <Badge variant="stale" size="xs">STALE</Badge>
                ) : (
                  <Badge variant="live" size="xs">LIVE CALENDAR</Badge>
                )}
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
                  Source: <span className="text-slate-300 font-semibold">{nextMajorEvent.source_name || 'ForexFactory Live'}</span>
                </div>
              </div>
            </div>

            {/* Countdown & Playbook Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 border-t md:border-t-0 md:border-l border-terminal-border pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
              <div className="text-left font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Time Remaining</div>
                <div className="text-base sm:text-lg">
                  <CountdownTimer targetTime={nextMajorEvent.release_time} />
                </div>
              </div>

              <button
                onClick={() => onSelectEvent && onSelectEvent(nextMajorEvent)}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-lg text-xs font-mono font-bold bg-terminal-cyan text-black hover:bg-cyan-300 shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Open Pre-News Playbook</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MACRO CROSS-ASSET TELEMETRY TICKER */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-terminal-cyan" />
            <span className="uppercase font-bold text-slate-300">Live Macro Telemetry</span>
            <span className="text-slate-600">|</span>
            <TimeAgo
              timestamp={tickerData?.last_updated}
              refreshWindowSec={60}
              sourceName={tickerData?.source_name || 'Yahoo Finance Live'}
              isStale={tickerData?.is_stale}
              isDemo={tickerData?.is_demo}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTicker}
              className="p-1 rounded bg-slate-900 border border-terminal-border text-slate-400 hover:text-terminal-cyan transition-colors"
              title="Refresh Quotes"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {tickerItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {tickerItems.map((item, idx) => (
              <div key={idx} className="bg-terminal-surface border border-terminal-border rounded-lg p-2.5 text-xs font-mono">
                <div className="text-[10px] text-slate-500 uppercase truncate">{item.label}</div>
                <div className="text-sm font-bold text-white tabular-nums mt-0.5 truncate">{item.value}</div>
                <div className={`text-[10px] tabular-nums mt-0.5 ${item.positive ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {item.change}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-terminal-surface border border-terminal-border rounded-lg text-center text-xs font-mono text-slate-400">
            {tickerLoading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-terminal-cyan" />
                <span>Ingesting live macro feeds (15s interval)...</span>
              </div>
            ) : (
              <span className="text-rose-400 font-semibold">Live market data feed temporarily connecting...</span>
            )}
          </div>
        )}
      </div>

      {/* 3. ACTIVE PRE-NEWS TRADING SIGNALS SECTION */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3 font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <Target className="w-4 h-4 text-terminal-green shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
              Active Pre-News Decision Signals
            </h2>
            <span className="text-xs text-slate-500 hidden md:inline">
              (Synthesized by 11 AI Agents with explicit Entry, Stop Loss & Take Profits)
            </span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-400">
            Paper Trading Mode
          </div>
        </div>

        {signals.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {signals.map((sig) => (
              <SignalCard key={sig.id} signal={sig} onSelectEvent={onSelectEvent} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-terminal-surface border border-terminal-border text-center font-mono space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <div className="text-sm font-bold text-white uppercase tracking-wide">
              No Active Pre-News Signals Recorded
            </div>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Signals are strictly synthesized when real macro release inputs and live market telemetry align. Select an upcoming high-impact event from the calendar below to generate a real pre-news decision playbook.
            </p>
          </div>
        )}
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
