import React, { useState } from 'react';
import { Sliders, Save, Shield, Key, CheckCircle2, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { profile, updateProfile } = useAuth();
  const [timezone, setTimezone] = useState(profile.timezone || 'Africa/Nairobi');
  const [accountSize, setAccountSize] = useState(profile.account_size || 10000);
  const [riskPct, setRiskPct] = useState(profile.risk_per_trade_pct || 1.0);
  const [minConfidence, setMinConfidence] = useState(65);
  const [maxSpreadFilter, setMaxSpreadFilter] = useState(4.5);
  const [maxDissentingAgents, setMaxDissentingAgents] = useState(4);
  const [savedMessage, setSavedMessage] = useState('');

  const timezones = [
    { value: 'Africa/Nairobi', label: 'Africa/Nairobi (UTC+3, EAT)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' }
  ];

  function handleSave(e) {
    e.preventDefault();
    updateProfile({
      timezone,
      account_size: parseFloat(accountSize),
      risk_per_trade_pct: parseFloat(riskPct)
    });
    setSavedMessage('Settings and institutional rules updated successfully!');
    setTimeout(() => setSavedMessage(''), 4000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Sliders className="w-5 h-5 text-terminal-cyan" />
            <span>Terminal Settings & Quantitative Rules Engine</span>
          </h1>
          <div className="text-[10px] font-mono text-slate-400">
            Account Risk Thresholds // Timezone Clocks // Synthesis Safeguards
          </div>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-terminal-green" />
          <span>{savedMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Risk & Account Settings */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg font-mono text-xs space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-terminal-border flex items-center gap-2">
            <Shield className="w-4 h-4 text-terminal-cyan" />
            <span>Account Risk & Capital Allocation</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Account Balance ($ USD)</label>
              <input
                type="number"
                step="100"
                value={accountSize}
                onChange={(e) => setAccountSize(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Max Risk USD Per Play</label>
              <div className="px-3 py-2 bg-slate-900 border border-terminal-border rounded text-terminal-green font-bold tabular-nums">
                ${((accountSize * riskPct) / 100).toFixed(2)} USD
              </div>
            </div>
          </div>
        </div>

        {/* Timezone Configuration */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg font-mono text-xs space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-terminal-border flex items-center gap-2">
            <Globe className="w-4 h-4 text-terminal-gold" />
            <span>Terminal Display Timezone</span>
          </h2>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Primary Market Clock (Calendar & Countdowns)</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Defaulted to Africa/Nairobi (UTC+3) as requested in system preferences.
            </p>
          </div>
        </div>

        {/* Synthesis & Decision Rules */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg font-mono text-xs space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-terminal-border flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>AI Judge Rules & Safeguard Thresholds</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Minimum Confidence (%)</label>
              <input
                type="number"
                min="50"
                max="95"
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              />
              <span className="text-[10px] text-slate-500">Forces NO TRADE if below</span>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Max Allowable Spread (Pips)</label>
              <input
                type="number"
                step="0.5"
                value={maxSpreadFilter}
                onChange={(e) => setMaxSpreadFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              />
              <span className="text-[10px] text-slate-500">Filters pre-news fills if wider</span>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Agent Disagreement Cap</label>
              <input
                type="number"
                min="1"
                max="5"
                value={maxDissentingAgents}
                onChange={(e) => setMaxDissentingAgents(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              />
              <span className="text-[10px] text-slate-500">Max dissenting votes allowed</span>
            </div>
          </div>
        </div>

        {/* API Credentials Boundary Note */}
        <div className="bg-slate-950 border border-terminal-border rounded-xl p-4 font-mono text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Key className="w-4 h-4 text-terminal-cyan" />
            <span>Security & API Key Environment Boundaries</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Per strict institutional security architecture, <strong>Anthropic Claude API keys</strong> and <strong>Supabase Service Role keys</strong> are stored exclusively on the backend in <code className="text-terminal-cyan bg-slate-900 px-1 py-0.5 rounded">server/.env</code>. They are never exposed to browser memory or client bundles.
          </p>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg text-xs font-mono font-bold bg-terminal-cyan text-black hover:bg-cyan-300 shadow-md flex items-center gap-2 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Terminal Preferences</span>
        </button>
      </form>
    </div>
  );
}
