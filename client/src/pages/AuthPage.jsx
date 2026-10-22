import React, { useState } from 'react';
import { Lock, Mail, User, ShieldCheck, Zap, AlertCircle, Key, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthPage({ onLoginSuccess }) {
  const { login, signup, loginDirectDemo } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('trader@firm.com');
  const [password, setPassword] = useState('MacroTrader2026!');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signup(email, password, fullName);
      } else {
        await login(email, password);
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAccess() {
    setError('');
    setLoading(true);
    try {
      // 1. Try pre-verified institutional trader login
      await login('trader@firm.com', 'MacroTrader2026!');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      try {
        // 2. Try demo account
        await login('demo.trader@macrosigint.io', 'demo123456');
        if (onLoginSuccess) onLoginSuccess();
      } catch (e2) {
        // 3. Guaranteed instant access fallback
        if (loginDirectDemo) loginDirectDemo();
        if (onLoginSuccess) onLoginSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleUsePreset(presetEmail, presetPass) {
    setEmail(presetEmail);
    setPassword(presetPass);
    setIsSignUp(false);
    setError('');
  }

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-terminal-surface border border-terminal-border rounded-2xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-sm bg-terminal-cyan glow-cyan animate-pulse"></div>
            <span className="font-mono font-bold tracking-widest text-lg text-white">
              MACRO<span className="text-terminal-cyan">SIGINT</span>
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400">
            Institutional News Intelligence & Pre-News Scenario Terminal
          </p>
        </div>

        {/* Pre-Verified Institutional Credentials Card */}
        <div className="mb-4 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/40 text-xs font-mono text-cyan-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Key className="w-3.5 h-3.5 text-terminal-cyan" />
              <span>Verified System Logins</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">● PRE-VERIFIED</span>
          </div>

          <div className="grid grid-cols-1 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => handleUsePreset('trader@firm.com', 'MacroTrader2026!')}
              className="text-left p-1.5 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-terminal-cyan transition-colors flex items-center justify-between"
              title="Click to auto-fill"
            >
              <div>
                <span className="text-slate-400">Firm: </span>
                <span className="text-white font-bold">trader@firm.com</span>
                <span className="text-slate-500 ml-1">/ MacroTrader2026!</span>
              </div>
              <span className="text-[10px] text-terminal-cyan underline">Use</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 pt-0.5">
            Registered accounts have been verified. You can also click <strong>Instant Demo</strong> below for 1-click access.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-rose-950/80 border border-rose-500 text-xs font-mono text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-terminal-red" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {isSignUp && (
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Lead Macro Trader"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Institutional Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="trader@firm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Passphrase</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded font-mono font-bold text-xs bg-terminal-cyan text-black hover:bg-cyan-300 shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : (isSignUp ? 'Create Trader Account' : 'Authenticate Terminal Access')}</span>
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="mt-4 pt-4 border-t border-terminal-border text-center">
          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={loading}
            className="w-full py-2.5 rounded font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-terminal-cyan border border-terminal-border flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-terminal-gold" />
            <span>Instant Demo Trader Mode (Skip Password)</span>
          </button>
        </div>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-xs font-mono text-slate-400 hover:text-terminal-cyan transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Need an account? Register new profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
