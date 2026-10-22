import React, { useState, useEffect } from 'react';
import { Activity, Clock, Globe, Shield, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Header({ nextEvent, sidebarOpen, setSidebarOpen }) {
  const { user, profile, logout } = useAuth();
  const [timeUtc, setTimeUtc] = useState('');
  const [timeLocal, setTimeLocal] = useState('');

  useEffect(() => {
    function updateClocks() {
      const now = new Date();
      setTimeUtc(now.toUTCString().slice(17, 25) + ' UTC');

      try {
        const localTimeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: profile.timezone || 'Africa/Nairobi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now);
        setTimeLocal(`${localTimeStr} (${profile.timezone ? profile.timezone.split('/')[1] : 'NBO'})`);
      } catch (e) {
        setTimeLocal(now.toLocaleTimeString());
      }
    }

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [profile.timezone]);

  return (
    <header className="bg-terminal-surface border-b border-terminal-border px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand & Market Focus */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Drawer Toggle */}
        <button
          onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded-lg bg-slate-900 border border-terminal-border text-slate-300 hover:text-terminal-cyan hover:border-terminal-cyan transition-colors"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          title="Toggle Navigation Menu"
        >
          {sidebarOpen ? <X className="w-4 h-4 text-terminal-cyan" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-terminal-cyan glow-cyan animate-pulse"></div>
          <span className="font-mono font-bold tracking-widest text-xs sm:text-sm text-white">
            MACRO<span className="text-terminal-cyan">SIGINT</span>
          </span>
          <span className="hidden xs:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-terminal-border text-terminal-cyan border border-cyan-500/30">
            v1.0
          </span>
        </div>

        {/* Focus Instruments */}
        <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-terminal-border text-xs font-mono">
          <span className="text-slate-400">FOCUS:</span>
          {['XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'].map((pair) => (
            <span
              key={pair}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                pair === 'XAUUSD'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-600/40'
                  : 'bg-slate-800/60 text-slate-300 border border-slate-700'
              }`}
            >
              {pair}
            </span>
          ))}
        </div>
      </div>

      {/* Clocks & Realtime Status */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-5">
        {/* Realtime Stream Heartbeat */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-terminal-green animate-ping shrink-0"></span>
          <span className="hidden sm:inline">REALTIME FEED</span>
          <span className="text-[10px] text-slate-400">SYNCED</span>
        </div>

        {/* Global Terminal Clocks */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2 py-1 rounded border border-terminal-border">
            <Clock className="w-3.5 h-3.5 text-terminal-cyan shrink-0" />
            <span className="font-semibold text-white tabular-nums text-[11px] sm:text-xs">{timeUtc}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-terminal-border">
            <Globe className="w-3.5 h-3.5 text-terminal-gold shrink-0" />
            <span className="text-terminal-textBright tabular-nums text-[11px] sm:text-xs">{timeLocal}</span>
          </div>
        </div>

        {/* User Account / Profile */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-terminal-border">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-medium text-white truncate max-w-[120px]">{profile.full_name || 'Macro Trader'}</div>
            <div className="text-[10px] font-mono text-slate-400">
              Risk: <span className="text-terminal-cyan font-bold">{profile.risk_per_trade_pct}%</span> (${(profile.account_size * profile.risk_per_trade_pct / 100).toFixed(0)})
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
