import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

export function DisclaimerBanner() {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-1 flex items-center justify-between text-xs font-mono text-amber-400">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-terminal-gold" />
          <span>SIMULATION & PAPER TRADING ONLY // NOT FINANCIAL ADVICE</span>
        </div>
        <button
          onClick={() => setMinimized(false)}
          className="text-[10px] text-slate-400 hover:text-white underline"
        >
          Expand Notice
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-b border-amber-500/30 px-3 sm:px-4 py-2 text-xs font-mono text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm shrink-0">
      <div className="flex items-start sm:items-center gap-2 sm:gap-2.5">
        <AlertTriangle className="w-4 h-4 text-terminal-gold shrink-0 mt-0.5 sm:mt-0 animate-pulse" />
        <div className="text-[11px] sm:text-xs leading-relaxed">
          <span className="font-bold text-terminal-gold uppercase tracking-wider mr-1.5">Institutional Disclaimer:</span>
          <span>
            This platform operates strictly for <strong>pre-news macroeconomic analysis, scenario modeling, and paper-trading evaluation</strong>. It does NOT execute automated orders and is NOT financial advice. Spot Gold (XAUUSD) and leveraged JPY crosses entail extreme volatility, slippage, and spread widening during major releases.
          </span>
        </div>
      </div>
      <button
        onClick={() => setMinimized(true)}
        className="self-end sm:self-center text-slate-400 hover:text-white p-1 sm:ml-4 rounded hover:bg-slate-800 transition-colors shrink-0"
        title="Minimize notice"
        aria-label="Minimize notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
