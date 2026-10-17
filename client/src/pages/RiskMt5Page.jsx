import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Download,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Copy,
  Terminal,
  Activity,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { CountdownTimer } from '../components/common/CountdownTimer';

export function RiskMt5Page({ events = [] }) {
  const [windows, setWindows] = useState([]);
  const [spreadMatrix, setSpreadMatrix] = useState([]);
  const [mql5Snippet, setMql5Snippet] = useState('');
  const [preBuffer, setPreBuffer] = useState('15');
  const [postBuffer, setPostBuffer] = useState('15');
  const [downloadSuccess, setDownloadSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRiskData();
  }, [preBuffer, postBuffer]);

  async function loadRiskData() {
    setLoading(true);
    try {
      const [winRes, spreadRes, codeRes] = await Promise.all([
        fetch(`/api/risk/windows?preMinutes=${preBuffer}&postMinutes=${postBuffer}`).catch(() => null),
        fetch('/api/risk/spread-matrix').catch(() => null),
        fetch('/api/risk/mt5-code-snippet').catch(() => null)
      ]);

      if (winRes && winRes.ok) {
        const json = await winRes.json();
        if (json.data) setWindows(json.data);
      }

      if (spreadRes && spreadRes.ok) {
        const json = await spreadRes.json();
        if (json.data) setSpreadMatrix(json.data);
      }

      if (codeRes && codeRes.ok) {
        const json = await codeRes.json();
        if (json.data?.code) setMql5Snippet(json.data.code);
      }
    } catch (err) {
      console.warn('Error loading risk data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Find nearest imminent or active window
  const activeWindow = windows.find(w => w.window_status === 'IN_LOCKDOWN') ||
                       windows.find(w => w.window_status === 'APPROACHING') ||
                       windows[0];

  function handleExport(format) {
    // Direct browser trigger to server endpoint for authentic file generation
    const url = `/api/risk/mt5-export?format=${format}&download=true&preMinutes=${preBuffer}&postMinutes=${postBuffer}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `mt5_news_filter_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadSuccess(`Exported MT5 filter in ${format.toUpperCase()} format successfully!`);
    setTimeout(() => setDownloadSuccess(''), 4000);
  }

  function handleCopySnippet() {
    if (!mql5Snippet) return;
    navigator.clipboard.writeText(mql5Snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg font-mono">
        <div>
          <h1 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-terminal-gold" />
            <span>Pre-News Risk Sentinel & MT5 EA Integration</span>
          </h1>
          <div className="text-[10px] text-slate-400">
            Automated No-Trade Lockdowns // Spread Widening Forecaster // MQL5 EA Integration
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-1.5 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-terminal-cyan border border-cyan-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MT5 JSON</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 rounded text-xs font-bold bg-terminal-cyan text-black hover:bg-cyan-300 flex items-center gap-1.5 transition-colors shadow-sm"
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

      {/* 2. Buffer Controls & Active Lockdown Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* Buffer Config */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white uppercase text-xs">Lockdown Buffer Rules</span>
              <span className="text-[10px] text-slate-400">MQL5 Safety</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Suspends automated order placement before release to protect against broker spread expansion.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-terminal-border">
            <div>
              <label className="text-[9px] text-slate-500 uppercase block mb-1">Pre-News Buffer</label>
              <select
                value={preBuffer}
                onChange={(e) => setPreBuffer(e.target.value)}
                className="w-full bg-slate-950 border border-terminal-border rounded px-2 py-1 text-white text-xs outline-none focus:border-terminal-cyan"
              >
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes (Default)</option>
                <option value="30">30 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase block mb-1">Post-News Buffer</label>
              <select
                value={postBuffer}
                onChange={(e) => setPostBuffer(e.target.value)}
                className="w-full bg-slate-950 border border-terminal-border rounded px-2 py-1 text-white text-xs outline-none focus:border-terminal-cyan"
              >
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes (Default)</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Lockdown Banner */}
        <div className={`md:col-span-2 rounded-xl p-5 shadow-xl border flex flex-col justify-between ${
          activeWindow?.window_status === 'IN_LOCKDOWN'
            ? 'bg-rose-950/40 border-rose-600/60'
            : activeWindow?.window_status === 'APPROACHING'
            ? 'bg-amber-950/30 border-amber-500/50'
            : 'bg-terminal-surface border-terminal-border'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  activeWindow?.window_status === 'IN_LOCKDOWN'
                    ? 'bg-terminal-red animate-ping'
                    : activeWindow?.window_status === 'APPROACHING'
                    ? 'bg-terminal-gold animate-pulse'
                    : 'bg-terminal-green'
                }`}></span>
                <span className={`font-bold uppercase tracking-wider text-[11px] ${
                  activeWindow?.window_status === 'IN_LOCKDOWN'
                    ? 'text-terminal-red'
                    : activeWindow?.window_status === 'APPROACHING'
                    ? 'text-terminal-gold'
                    : 'text-terminal-green'
                }`}>
                  {activeWindow?.window_status === 'IN_LOCKDOWN'
                    ? 'NO-TRADE LOCKDOWN ACTIVE (SUSPEND ORDERS)'
                    : activeWindow?.window_status === 'APPROACHING'
                    ? 'NO-TRADE WINDOW APPROACHING (<45M)'
                    : 'TRADING ENVIRONMENT CLEAR'}
                </span>
              </div>
              <div className="text-base font-bold text-white mt-0.5">
                {activeWindow?.event_name || 'US Macroeconomic Release'} ({activeWindow?.currency || 'USD'})
              </div>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-terminal-border text-center shrink-0">
              <div className="text-[9px] text-slate-500 uppercase mb-0.5">Release Countdown</div>
              <CountdownTimer targetTime={activeWindow?.release_time_utc} />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
            <div>
              Lockdown Window: <span className="text-white font-semibold">
                {activeWindow ? new Date(activeWindow.no_trade_start_utc).toLocaleTimeString() : '-'}
              </span> to <span className="text-white font-semibold">
                {activeWindow ? new Date(activeWindow.no_trade_end_utc).toLocaleTimeString() : '-'}
              </span>
            </div>
            <div className="text-amber-400 font-semibold">
              Max Allowed Spread: {activeWindow?.max_spread_allowed_pips || 5.0} Pips
            </div>
          </div>
        </div>
      </div>

      {/* 3. Expected News Spread Widening Matrix */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-terminal-border mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-terminal-gold" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Empirical News Spread Widening Model by Instrument
            </h2>
          </div>
          <span className="text-[10px] text-slate-400">
            Gold & JPY Currency Crosses
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {(spreadMatrix.length > 0 ? spreadMatrix : [
            { pair: 'XAUUSD', displayName: 'Gold (XAUUSD)', normalSpread: '$0.25 - $0.35', newsSpikeSpread: '$1.80 - $3.80', riskTier: 'EXTREME', maxAllowedSpread: '$2.50', advisory: 'Spread blowout of 8-12x. Retail stops hunted by widening.' },
            { pair: 'USDJPY', displayName: 'USD/JPY', normalSpread: '0.7 - 1.0 pips', newsSpikeSpread: '4.5 - 8.5 pips', riskTier: 'HIGH', maxAllowedSpread: '5.0 pips', advisory: 'Slippage on market orders. Limit orders recommended.' },
            { pair: 'EURJPY', displayName: 'EUR/JPY', normalSpread: '1.2 - 1.6 pips', newsSpikeSpread: '6.0 - 11.0 pips', riskTier: 'HIGH', maxAllowedSpread: '6.5 pips', advisory: 'Liquidity thinness during first 45 seconds.' },
            { pair: 'GBPJPY', displayName: 'GBP/JPY (Dragon)', normalSpread: '1.5 - 2.2 pips', newsSpikeSpread: '8.0 - 15.0 pips', riskTier: 'EXTREME', maxAllowedSpread: '8.0 pips', advisory: 'Violent two-way whipsaws. EAs must halt trading.' },
            { pair: 'AUDJPY', displayName: 'AUD/JPY', normalSpread: '1.4 - 2.0 pips', newsSpikeSpread: '6.5 - 12.0 pips', riskTier: 'HIGH', maxAllowedSpread: '6.5 pips', advisory: 'Carry unwind gap risk on unexpected BoJ releases.' }
          ]).map((item, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-900 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">{item.pair}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    item.riskTier === 'EXTREME'
                      ? 'bg-rose-950 text-terminal-red border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {item.riskTier}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mb-2">{item.displayName}</div>

                <div className="space-y-1 mb-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Normal Spread:</span>
                    <span className="text-slate-200">{item.normalSpread}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">News Spike:</span>
                    <span className="text-terminal-gold font-bold">{item.newsSpikeSpread}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Max Permitted:</span>
                    <span className="text-terminal-cyan font-bold">{item.maxAllowedSpread}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-400 leading-tight">
                {item.advisory}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MetaTrader 5 Expert Advisor Integration & Code Snippet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Instructions */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-terminal-border mb-3">
              <FileText className="w-4 h-4 text-terminal-cyan" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                How to Hook Into MetaTrader 5 (MT5 EA)
              </h2>
            </div>

            <div className="space-y-3 text-slate-300 text-[11px] leading-relaxed">
              <p>
                <strong>Method 1: Local CSV News Filter</strong>
                <br />
                Download <code className="text-terminal-cyan bg-slate-950 px-1 py-0.5 rounded text-[10px]">macro_news_filter.csv</code> and place it inside your terminal's:
                <br />
                <code className="text-terminal-gold bg-slate-950 px-1.5 py-0.5 rounded text-[10px] block mt-1">
                  MQL5/Files/macro_news_filter.csv
                </code>
              </p>

              <p>
                <strong>Method 2: Realtime WebRequest API</strong>
                <br />
                In MT5 Options &rarr; Expert Advisors, allow WebRequest for:
                <br />
                <code className="text-terminal-cyan bg-slate-950 px-1.5 py-0.5 rounded text-[10px] block mt-1">
                  http://localhost:5000/api/risk/mt5-export?format=csv
                </code>
              </p>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                🛡️ <em>When the EA detects <code className="text-terminal-red">IsNewsLockdownActive() == true</code>, it suspends order execution and tightens open position stop-losses to breakeven.</em>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-terminal-border flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Universal MQL5 Compatible</span>
            <button
              onClick={() => handleExport('csv')}
              className="text-xs text-terminal-cyan hover:text-white font-bold underline"
            >
              Download Latest Schedule (.CSV) &rarr;
            </button>
          </div>
        </div>

        {/* Copyable MQL5 Code Snippet */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-terminal-border mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-terminal-gold" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                MQL5 Drop-In Function Code
              </h2>
            </div>
            <button
              onClick={handleCopySnippet}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-terminal-cyan border border-cyan-500/30 text-[11px] flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy MQL5 Code'}</span>
            </button>
          </div>

          <div className="bg-slate-950 rounded-lg p-3 border border-slate-900 max-h-72 overflow-y-auto text-[10px] font-mono text-slate-300 leading-normal">
            <pre className="whitespace-pre-wrap">
              {mql5Snippet || `//+------------------------------------------------------------------+
//| Macro News Filter Integration for MetaTrader 5 Expert Advisor   |
//| Reads macro_news_filter.csv from MQL5/Files/                     |
//+------------------------------------------------------------------+
bool IsNewsLockdownActive(string targetCurrency = "USD")
{
   string filename = "macro_news_filter.csv";
   int fileHandle = FileOpen(filename, FILE_READ | FILE_CSV | FILE_ANSI, ',');
   if(fileHandle == INVALID_HANDLE) return false;

   datetime currentTime = TimeCurrent();
   FileReadString(fileHandle); // Skip header

   while(!FileIsEnding(fileHandle))
   {
      string id = FileReadString(fileHandle);
      string name = FileReadString(fileHandle);
      string curr = FileReadString(fileHandle);
      string impact = FileReadString(fileHandle);
      string relStr = FileReadString(fileHandle);
      string startStr = FileReadString(fileHandle);
      string endStr = FileReadString(fileHandle);

      if(curr == targetCurrency || curr == "ALL")
      {
         datetime tStart = StringToTime(startStr);
         datetime tEnd = StringToTime(endStr);
         if(currentTime >= tStart && currentTime <= tEnd)
         {
            FileClose(fileHandle);
            return true; // Trading Locked
         }
      }
   }
   FileClose(fileHandle);
   return false;
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
