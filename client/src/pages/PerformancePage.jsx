import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  DollarSign,
  Percent,
  ArrowUpRight,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Scale,
  Sliders,
  Filter,
  Clock,
  Database
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Badge } from '../components/common/Badge';

export function PerformancePage() {
  const [summary, setSummary] = useState(null);
  const [agentAccuracy, setAgentAccuracy] = useState([]);
  const [loading, setLoading] = useState(true);

  // Backtester Studio state
  const [btPair, setBtPair] = useState('XAUUSD');
  const [btEvent, setBtEvent] = useState('ALL');
  const [btBalance, setBtBalance] = useState('10000');
  const [btRiskPct, setBtRiskPct] = useState('1.0');
  const [btSpreadBuffer, setBtSpreadBuffer] = useState('2.5');
  const [btLoading, setBtLoading] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  async function loadPerformanceData() {
    setLoading(true);
    try {
      const [sumRes, agentRes] = await Promise.all([
        fetch('/api/performance/summary').catch(() => null),
        fetch('/api/performance/agent-accuracy').catch(() => null)
      ]);

      if (sumRes && sumRes.ok) {
        const sumJson = await sumRes.json();
        if (sumJson.data) setSummary(sumJson.data);
      }

      if (agentRes && agentRes.ok) {
        const agentJson = await agentRes.json();
        if (agentJson.data) setAgentAccuracy(agentJson.data);
      }
    } catch (err) {
      console.warn('Error loading performance data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunBacktest() {
    setBtLoading(true);
    try {
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: btPair,
          eventType: btEvent,
          accountBalance: parseFloat(btBalance) || 10000,
          riskPct: parseFloat(btRiskPct) || 1.0,
          spreadBufferPips: parseFloat(btSpreadBuffer) || 2.5
        })
      });

      if (res.ok) {
        const json = await res.json();
        setBacktestResult(json.data);
      }
    } catch (err) {
      console.error('Backtest error:', err);
    } finally {
      setBtLoading(false);
    }
  }

  function formatTime(isoString) {
    if (!isoString) return 'Unknown';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoString;
    }
  }

  const hasLiveData = Boolean(summary?.has_live_data) && (summary?.completedDecisions > 0);

  const equityCurveData = (hasLiveData && summary?.equityCurve?.length > 1) ? summary.equityCurve : [
    { tradeIndex: 0, label: 'Baseline', balance: 10000, pnl: 0, drawdownPct: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header with Live Status & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <h1 className="font-mono text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-terminal-cyan" />
            <span>Prediction Tracker & Performance Intelligence</span>
          </h1>
          <div className="text-[10px] font-mono text-slate-400">
            Audited Paper-Trading Execution Log // Realized R-Multiples & Drawdown Tracking
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>Source: <strong className="text-slate-300">{summary?.source_name || 'Live Verified Execution Ledger'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Updated: <strong className="text-slate-300">{formatTime(summary?.last_updated)}</strong></span>
          </div>

          <button
            onClick={loadPerformanceData}
            className="p-1.5 rounded bg-slate-900 border border-terminal-border text-slate-300 hover:text-terminal-cyan transition-colors"
            title="Refresh Metrics"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasLiveData ? (
            <div className="text-xs font-mono px-3 py-1 rounded bg-emerald-950 text-terminal-green border border-emerald-600/40 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse"></span>
              <span>LIVE AUDIT ACTIVE</span>
            </div>
          ) : (
            <div className="text-xs font-mono px-3 py-1 rounded bg-slate-900 text-slate-400 border border-slate-700 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>AWAITING LIVE TRADES</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] text-slate-500 uppercase">Hit Rate (Win %)</div>
          <div className="text-2xl font-bold text-terminal-green tabular-nums mt-1">
            {hasLiveData ? `${summary.hitRatePct}%` : '0.0%'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {summary?.totalWins || 0} Wins / {summary?.totalLosses || 0} Losses
          </div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] text-slate-500 uppercase">Avg Risk/Reward</div>
          <div className="text-2xl font-bold text-terminal-cyan tabular-nums mt-1">
            {hasLiveData ? `1:${summary.avgRiskRewardAchieved}` : '1:0.0'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Realized Multiplier</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] text-slate-500 uppercase">Profit Factor</div>
          <div className="text-2xl font-bold text-terminal-gold tabular-nums mt-1">
            {hasLiveData ? (summary.profitFactor || '0.00') : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gross Win / Gross Loss</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] text-slate-500 uppercase">Paper Return</div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">
            {hasLiveData ? `+${summary.returnPct}%` : '0.0%'}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">
            ${summary?.totalPnlUsd ? summary.totalPnlUsd.toFixed(2) : '0.00'} PnL
          </div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] text-slate-500 uppercase">Max Drawdown</div>
          <div className="text-2xl font-bold text-terminal-red tabular-nums mt-1">
            {hasLiveData ? `-${summary.maxDrawdownPct}%` : '0.0%'}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">
            -${summary?.maxDrawdownUsd ? summary.maxDrawdownUsd.toFixed(2) : '0.00'}
          </div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] text-slate-500 uppercase">Filtered Traps</div>
          <div className="text-2xl font-bold text-purple-400 tabular-nums mt-1">
            {summary?.totalScratches || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">NO_TRADE Preservations</div>
        </div>
      </div>

      {/* 3. Paper Trading Equity Curve Chart */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 sm:p-5 shadow-lg min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="font-mono">
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
              Cumulative Equity Curve ($10,000 Base)
            </h2>
            <div className="text-[10px] text-slate-400">
              Continuous performance tracking with 1.0% fixed risk allocation per trade
            </div>
          </div>
          <div className="text-xs font-mono text-terminal-green font-bold flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            <span>Balance: ${summary?.currentBalance ? summary.currentBalance.toFixed(2) : '10,000.00'}</span>
          </div>
        </div>

        {hasLiveData ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis
                  stroke="#64748B"
                  domain={['dataMin - 150', 'dataMax + 150']}
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B0E14',
                    borderColor: '#1F293D',
                    fontFamily: 'monospace',
                    fontSize: '11px'
                  }}
                  itemStyle={{ color: '#00F0FF' }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#00F0FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center font-mono border border-dashed border-terminal-border/60 rounded-lg">
            <p className="text-xs text-slate-400">
              Seed demo equity curves have been purged. Complete trade executions on live releases will dynamically plot the audited equity curve here.
            </p>
          </div>
        )}
      </div>

      {/* 4. Performance Breakdowns: Pair, Event Type, & Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {/* Pair Breakdown */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Performance by Pair</h3>
          {summary?.pairStats && summary.pairStats.length > 0 ? (
            <div className="space-y-2">
              {summary.pairStats.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900">
                  <span className="font-bold text-white">{row.pair}</span>
                  <span className="text-slate-400">{row.trades} Plays</span>
                  <span className="text-terminal-cyan font-semibold">{row.winRate}</span>
                  <span className={`font-bold ${row.pnl.startsWith('+') ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {row.pnl}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-[11px]">
              No pair-specific trade records logged yet.
            </div>
          )}
        </div>

        {/* Event Type Breakdown */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Performance by Event Type</h3>
          {summary?.eventStats && summary.eventStats.length > 0 ? (
            <div className="space-y-2">
              {summary.eventStats.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900">
                  <span className="font-bold text-white">{row.type}</span>
                  <span className="text-slate-400">{row.trades} Plays</span>
                  <span className="text-terminal-cyan font-semibold">{row.winRate}</span>
                  <span className={`font-bold ${row.pnl.startsWith('+') ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {row.pnl}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-[11px]">
              No event-specific trade records logged yet.
            </div>
          )}
        </div>

        {/* Confidence Tier Breakdown */}
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Performance by Confidence</h3>
          {summary?.confidenceStats && summary.confidenceStats.length > 0 ? (
            <div className="space-y-2">
              {summary.confidenceStats.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900">
                  <span className="font-bold text-white">{row.tier}</span>
                  <span className="text-slate-400">{row.trades} Plays</span>
                  <span className="text-terminal-cyan font-semibold">{row.winRate}</span>
                  <span className={`font-bold ${row.pnl?.startsWith('+') ? 'text-terminal-green' : 'text-slate-400'}`}>
                    {row.pnl}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-[11px]">
              No confidence records logged yet.
            </div>
          )}
        </div>
      </div>

      {/* 5. INDIVIDUAL AGENT ACCURACY COMPARISON & DYNAMIC WEIGHTING */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-terminal-border font-mono">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-terminal-cyan" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Agent Accuracy Comparison & Dynamic Weight Calibration
              </h2>
              <div className="text-[10px] text-slate-400">
                Weak agents automatically get lower weight over time; high-edge agents are amplified
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            {agentAccuracy.length || 8} Specialized Agents Monitored
          </span>
        </div>

        <div className="overflow-x-auto mt-4 font-mono text-xs w-full">
          <table className="w-full min-w-[650px] text-left border-collapse">
            <thead>
              <tr className="border-b border-terminal-border text-slate-400 text-[10px] uppercase">
                <th className="py-2.5 px-3">Agent Name</th>
                <th className="py-2.5 px-3">Signals Evaluated</th>
                <th className="py-2.5 px-3">Correct Direction</th>
                <th className="py-2.5 px-3">Historical Accuracy</th>
                <th className="py-2.5 px-3">Calibration Status</th>
                <th className="py-2.5 px-3 text-right">Suggested Dynamic Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border/40">
              {agentAccuracy.map((agent, i) => (
                <tr key={i} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="text-slate-600">#{i + 1}</span>
                    <span>{agent.agent_name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{agent.signals_evaluated}</td>
                  <td className="py-2.5 px-3 text-terminal-green font-semibold">{agent.correct_signals}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tabular-nums">
                        {agent.signals_evaluated > 0 ? `${agent.accuracy_pct}%` : 'Pending'}
                      </span>
                      {agent.signals_evaluated > 0 && (
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              agent.accuracy_pct >= 75
                                ? 'bg-terminal-green'
                                : agent.accuracy_pct >= 60
                                ? 'bg-terminal-cyan'
                                : 'bg-terminal-red'
                            }`}
                            style={{ width: `${agent.accuracy_pct}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      agent.calibration_status === 'HIGH_EDGE'
                        ? 'bg-emerald-950 text-terminal-green border border-emerald-800'
                        : agent.calibration_status === 'BALANCED'
                        ? 'bg-cyan-950 text-terminal-cyan border border-cyan-800'
                        : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}>
                      {agent.signals_evaluated > 0 ? agent.calibration_status : 'UNCALIBRATED'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-white">
                    {agent.suggested_weight ? `${agent.suggested_weight.toFixed(2)}x` : '1.00x'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. QUANTITATIVE HISTORICAL BACKTESTER STUDIO */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-terminal-border font-mono">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Sliders className="w-5 h-5 text-terminal-gold" />
              <span>Quantitative Historical Playbook Backtester</span>
            </h2>
            <div className="text-[10px] text-slate-400">
              Stress-test pre-news execution rules on empirical historical releases with spread widening & slippage
            </div>
          </div>

          <button
            onClick={handleRunBacktest}
            disabled={btLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-gold text-black font-bold text-xs hover:bg-yellow-400 transition-colors disabled:opacity-50 shadow-md"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>{btLoading ? 'Simulating Backtest...' : 'Run Quantitative Backtest'}</span>
          </button>
        </div>

        {/* Backtest Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 my-4 font-mono text-xs">
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Target Instrument</label>
            <select
              value={btPair}
              onChange={(e) => setBtPair(e.target.value)}
              className="w-full bg-slate-950 border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-terminal-cyan outline-none"
            >
              <option value="XAUUSD">XAUUSD (Gold)</option>
              <option value="USDJPY">USDJPY</option>
              <option value="EURJPY">EURJPY</option>
              <option value="GBPJPY">GBPJPY</option>
              <option value="ALL">All Pairs Portfolio</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Event Type Filter</label>
            <select
              value={btEvent}
              onChange={(e) => setBtEvent(e.target.value)}
              className="w-full bg-slate-950 border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-terminal-cyan outline-none"
            >
              <option value="ALL">All Macro Events</option>
              <option value="CPI">CPI (Inflation)</option>
              <option value="NFP">NFP (Labor)</option>
              <option value="FOMC">FOMC Decisions</option>
              <option value="BOJ_DECISION">BoJ Decisions</option>
              <option value="PPI">PPI</option>
              <option value="RETAIL_SALES">Retail Sales</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Account Balance ($)</label>
            <input
              type="number"
              value={btBalance}
              onChange={(e) => setBtBalance(e.target.value)}
              className="w-full bg-slate-950 border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-terminal-cyan outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Risk Per Trade (%)</label>
            <input
              type="number"
              step="0.5"
              value={btRiskPct}
              onChange={(e) => setBtRiskPct(e.target.value)}
              className="w-full bg-slate-950 border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-terminal-cyan outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Spread Buffer (Pips)</label>
            <input
              type="number"
              step="0.5"
              value={btSpreadBuffer}
              onChange={(e) => setBtSpreadBuffer(e.target.value)}
              className="w-full bg-slate-950 border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-terminal-cyan outline-none"
            />
          </div>
        </div>

        {/* Backtest Simulation Results */}
        {backtestResult && (
          <div className="mt-6 pt-5 border-t border-terminal-border space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-terminal-green" />
                <span>Simulation Complete ({backtestResult.totalTrades} Executions Evaluated)</span>
              </div>
              <div className="text-xs text-slate-400">
                Preset: Fixed 1% Risk Sizing (Gold 100 oz/lot, JPY 100k/lot)
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded border border-terminal-border">
                <div className="text-[10px] text-slate-500 uppercase">Simulated Win Rate</div>
                <div className="text-xl font-bold text-terminal-green mt-1">{backtestResult.winRatePct}%</div>
                <div className="text-[10px] text-slate-400">{backtestResult.winningTrades}W / {backtestResult.losingTrades}L</div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-terminal-border">
                <div className="text-[10px] text-slate-500 uppercase">Simulated Return</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">+{backtestResult.returnPct}%</div>
                <div className="text-[10px] text-slate-400">+${backtestResult.netProfitUsd} Net PnL</div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-terminal-border">
                <div className="text-[10px] text-slate-500 uppercase">Profit Factor</div>
                <div className="text-xl font-bold text-terminal-gold mt-1">{backtestResult.profitFactor}</div>
                <div className="text-[10px] text-slate-400">Empirical Edge</div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-terminal-border">
                <div className="text-[10px] text-slate-500 uppercase">Max Drawdown</div>
                <div className="text-xl font-bold text-terminal-red mt-1">-{backtestResult.maxDrawdownPct}%</div>
                <div className="text-[10px] text-slate-400">Peak to Trough</div>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-terminal-border">
                <div className="text-[10px] text-slate-500 uppercase">Sharpe Ratio</div>
                <div className="text-xl font-bold text-terminal-cyan mt-1">{backtestResult.sharpeRatio}</div>
                <div className="text-[10px] text-slate-400">Risk-Adjusted</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
