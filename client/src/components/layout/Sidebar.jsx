import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  History,
  BarChart3,
  Bot,
  ShieldAlert,
  Sliders,
  Radio
} from 'lucide-react';

export function Sidebar({ currentTab, setTab }) {
  const navItems = [
    { id: 'home', label: 'Command Hub', icon: LayoutDashboard, badge: 'LIVE' },
    { id: 'pairs', label: 'Pair Intelligence', icon: TrendingUp, subtitle: 'XAU & JPY' },
    { id: 'event-detail', label: 'Scenario Playbook', icon: FileText, subtitle: '5-Way Matrix' },
    { id: 'signals', label: 'Signal History', icon: History },
    { id: 'performance', label: 'Accuracy & PnL', icon: BarChart3, subtitle: 'Paper Trades' },
    { id: 'agents', label: 'AI Agent Team', icon: Bot, subtitle: '11 Analysts' },
    { id: 'risk-mt5', label: 'Risk & MT5 EA', icon: ShieldAlert, subtitle: 'News Filter' },
    { id: 'settings', label: 'Terminal Rules', icon: Sliders, subtitle: 'Risk & Time' }
  ];

  return (
    <aside className="w-64 bg-terminal-surface border-r border-terminal-border flex flex-col justify-between select-none">
      <div className="py-4">
        {/* Navigation Section Title */}
        <div className="px-4 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
          Navigation Modules
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-terminal-surfaceHover text-terminal-cyan border-l-2 border-terminal-cyan font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-terminal-cyan' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <div>{item.label}</div>
                    {item.subtitle && (
                      <div className="text-[10px] text-slate-500 font-normal">{item.subtitle}</div>
                    )}
                  </div>
                </div>

                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-950 text-terminal-green border border-emerald-600/50 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Terminal Status Footer */}
      <div className="p-4 border-t border-terminal-border bg-slate-950/40 text-[11px] font-mono text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span>AI AGENTS:</span>
          <span className="text-terminal-green font-semibold">11 ONLINE</span>
        </div>
        <div className="flex items-center justify-between">
          <span>MT5 EA SYNC:</span>
          <span className="text-terminal-cyan font-semibold">STANDBY</span>
        </div>
        <div className="pt-2 text-[9px] text-slate-500 text-center border-t border-slate-800">
          XAUUSD // USDJPY // EURJPY // GBPJPY // AUDJPY
        </div>
      </div>
    </aside>
  );
}
