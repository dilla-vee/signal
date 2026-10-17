import React, { useState } from 'react';
import { ShieldAlert, Download, Clock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { CountdownTimer } from '../components/common/CountdownTimer';

export function RiskMt5Page({ events = [] }) {
  const [downloadSuccess, setDownloadSuccess] = useState('');

  const nextHighImpact = events.find(e => e.impact_level === 'HIGH') || events[0];

  function handleExport(format) {
    const exportData = events.map(e => ({
      event_id: e.id,
      event_name: e.event_name,
      currency: e.currency,
      release_time: e.release_time,
      impact: e.impact_level,
      no_trade_start: new Date(new Date(e.release_time).getTime() - 15 * 60 * 1000).toISOString(),
      no_trade_end: new Date(new Date(e.release_time).getTime() + 15 * 60 * 1000).toISOString(),
      max_spread_allowed_pips: e.currency === 'USD' ? 4.5 : 5.0
    }));

    let blob;
    let filename;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      filename = `mt5_news_filter_${Date.now()}.json`;
    } else {
      const headers = 'event_id,event_name,currency,release_time,impact,no_trade_start,no_trade_end,max_spread\n';
      const rows = exportData.map(d =>
        `"${d.event_id}","${d.event_name}","${d.currency}","${d.release_time}","${d.impact}","${d.no_trade_start}","${d.no_trade_end}",${d.max_spread_allowed_pips}`
      ).join('\n');
      blob = new Blob([headers + rows], { type: 'text/csv' });
      filename = `mt5_news_filter_${Date.now()}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Exported MT5 filter in ${format.toUpperCase()} format successfully!`);
    setTimeout(() => setDownloadSuccess(''), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-terminal-gold" />
            <span>Pre-News Risk Sentinel & MT5 EA Integration</span>
          </h1>
          <div className="text-[10px] font-mono text-slate-400">
            No-Trade Window Enforcement // Spread Spikes // MetaTrader 5 Expert Advisor Filter
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-terminal-cyan border border-cyan-500/30 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MT5 JSON</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-terminal-cyan text-black hover:bg-cyan-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MT5 CSV</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-terminal-green" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* No-Trade Lockdown Active Warning Card */}
      {nextHighImpact && (
        <div className="bg-gradient-to-r from-rose-950/40 via-terminal-surface to-rose-950/40 border border-rose-600/50 rounded-xl p-5 shadow-xl font-mono text-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-terminal-red animate-ping"></span>
                <span className="font-bold text-terminal-red uppercase tracking-wider text-xs">
                  Automated No-Trade Window Monitor
                </span>
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {nextHighImpact.event_name} ({nextHighImpact.currency})
              </div>
              <div className="text-slate-400 text-[11px] mt-1">
                Strict Window: <strong>15 minutes prior</strong> to <strong>15 minutes post-release</strong>. All automated scalp EAs should pause.
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-terminal-border text-center">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Event Countdown</div>
              <CountdownTimer targetTime={nextHighImpact.release_time} />
            </div>
          </div>
        </div>
      )}

      {/* Spread Widening Simulator & Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-terminal-gold" />
            <span>Expected News Spread Widening by Pair</span>
          </h2>
          <div className="space-y-2">
            {[
              { pair: 'XAUUSD (Spot Gold)', normal: '$0.20 - $0.35', newsSpike: '$1.80 - $3.50', risk: 'HIGH' },
              { pair: 'USDJPY', normal: '0.7 - 1.0 pips', newsSpike: '4.5 - 8.5 pips', risk: 'MODERATE' },
              { pair: 'EURJPY', normal: '1.2 - 1.6 pips', newsSpike: '6.0 - 11.0 pips', risk: 'HIGH' },
              { pair: 'GBPJPY', normal: '1.5 - 2.2 pips', newsSpike: '8.0 - 15.0 pips', risk: 'EXTREME' },
              { pair: 'AUDJPY', normal: '1.4 - 2.0 pips', newsSpike: '6.5 - 12.0 pips', risk: 'HIGH' }
            ].map((p, i) => (
              <div key={i} className="p-2.5 rounded bg-slate-950 border border-slate-900 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{p.pair}</div>
                  <div className="text-[10px] text-slate-500">Normal: {p.normal}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-400 tabular-nums">{p.newsSpike}</div>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    p.risk === 'EXTREME' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'
                  }`}>
                    {p.risk} SPREAD RISK
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MT5 EA Setup Guide */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-terminal-cyan" />
            <span>How to Connect to MetaTrader 5 EA</span>
          </h2>
          <div className="space-y-3 text-slate-300 leading-relaxed text-[11px]">
            <p>
              1. Download the <strong>MT5 CSV or JSON news schedule</strong> using the buttons above.
            </p>
            <p>
              2. Place the file inside your MetaTrader 5 terminal directory:
              <br />
              <code className="text-terminal-cyan bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">
                MQL5/Files/macro_news_filter.csv
              </code>
            </p>
            <p>
              3. Configure your EA to read the file before placing orders. If current time is within
              <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded text-[10px] ml-1">
                [no_trade_start, no_trade_end]
              </code>, order execution is suspended.
            </p>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
              💡 <em>Prevents stop-loss triggers caused by broker spread expansion rather than directional market price movement.</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
