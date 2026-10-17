import React, { useState } from 'react';
import { Calendar, Filter, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';
import { CountdownTimer } from '../common/CountdownTimer';
import { useAuth } from '../../context/AuthContext';

export function CalendarTable({ events = [], onSelectEvent, onRefresh, loading }) {
  const { profile } = useAuth();
  const [filterImpact, setFilterImpact] = useState('HIGH');
  const [filterCurrency, setFilterCurrency] = useState('ALL');

  const filteredEvents = events.filter((ev) => {
    if (filterImpact !== 'ALL' && ev.impact_level !== filterImpact) return false;
    if (filterCurrency !== 'ALL' && ev.currency !== filterCurrency) return false;
    return true;
  });

  function formatTime(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: profile.timezone || 'Africa/Nairobi',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d);
    } catch (e) {
      return new Date(isoString).toLocaleString();
    }
  }

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden shadow-lg">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-terminal-border flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-terminal-cyan" />
          <span className="font-mono text-sm font-bold text-white tracking-wide">Macro Economic Release Schedule</span>
          <span className="text-xs font-mono text-slate-400">
            ({filteredEvents.length} events in window)
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Currency Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-terminal-border">
            <span className="text-slate-500">CURRENCY:</span>
            {['ALL', 'USD', 'JPY'].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCurrency(c)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  filterCurrency === c
                    ? 'bg-terminal-cyan text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Impact Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-terminal-border">
            <span className="text-slate-500">IMPACT:</span>
            {['HIGH', 'ALL'].map((imp) => (
              <button
                key={imp}
                onClick={() => setFilterImpact(imp)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  filterImpact === imp
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {imp}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-terminal-cyan transition-colors"
            title="Refresh Economic Calendar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-terminal-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-terminal-border bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-4">Release Time ({profile.timezone ? profile.timezone.split('/')[1] : 'Local'})</th>
              <th className="py-2.5 px-3">Impact</th>
              <th className="py-2.5 px-3">Currency</th>
              <th className="py-2.5 px-4">Economic Event</th>
              <th className="py-2.5 px-4">Countdown</th>
              <th className="py-2.5 px-3">Forecast</th>
              <th className="py-2.5 px-3">Previous</th>
              <th className="py-2.5 px-4 text-right">Pre-News Playbook</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-terminal-border">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">
                  No upcoming macro events match the selected filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => (
                <tr
                  key={ev.id}
                  className="hover:bg-terminal-surfaceHover transition-colors group cursor-pointer"
                  onClick={() => onSelectEvent && onSelectEvent(ev)}
                >
                  <td className="py-3 px-4 font-semibold text-slate-200 tabular-nums">
                    {formatTime(ev.release_time)}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={ev.impact_level === 'HIGH' ? 'high' : 'medium'}>
                      {ev.impact_level}
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                      ev.currency === 'USD' ? 'bg-blue-950/80 text-blue-300 border border-blue-700' : 'bg-red-950/80 text-red-300 border border-red-700'
                    }`}>
                      {ev.currency}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-white group-hover:text-terminal-cyan transition-colors">
                    {ev.event_name}
                  </td>
                  <td className="py-3 px-4">
                    <CountdownTimer targetTime={ev.release_time} />
                  </td>
                  <td className="py-3 px-3 font-semibold text-terminal-cyan tabular-nums">
                    {ev.forecast_val || '-'}
                  </td>
                  <td className="py-3 px-3 text-slate-400 tabular-nums">
                    {ev.previous_val || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent && onSelectEvent(ev);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-terminal-cyan/10 text-terminal-cyan border border-cyan-500/30 hover:bg-terminal-cyan hover:text-black transition-all"
                    >
                      <span>Inspect Matrix</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
