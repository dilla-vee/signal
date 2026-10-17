import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Layers, Shield, DollarSign, Activity, Upload, RefreshCw } from 'lucide-react';
import { SignalCard } from '../components/signals/SignalCard';
import { MarketSnapshotCard } from '../components/snapshots/MarketSnapshotCard';
import { ReactionStatsTable } from '../components/reactions/ReactionStatsTable';
import { PriceImportModal } from '../components/prices/PriceImportModal';

export function PairViewPage({ signals = [] }) {
  const [selectedPair, setSelectedPair] = useState('XAUUSD');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const pairsInfo = {
    XAUUSD: {
      name: 'Spot Gold / US Dollar',
      price: '2,658.40',
      change: '+14.20 (+0.54%)',
      positive: true,
      atr14: '28.50',
      keySupport: '2,635.00',
      keyResistance: '2,685.00',
      spreadTypical: '$0.25',
      spreadNewsSpike: '$1.80 - $3.20',
      correlations: [
        { asset: 'US 10Y Yield', value: '-0.82', desc: 'Strong Inverse' },
        { asset: 'US Dollar Index (DXY)', value: '-0.74', desc: 'Inverse' },
        { asset: 'US Real Yield (TIPS)', value: '-0.88', desc: 'Dominant Driver' }
      ]
    },
    USDJPY: {
      name: 'US Dollar / Japanese Yen',
      price: '149.85',
      change: '-0.42 (-0.28%)',
      positive: false,
      atr14: '1.20',
      keySupport: '148.80',
      keyResistance: '150.80',
      spreadTypical: '0.8 pips',
      spreadNewsSpike: '4.5 - 8.0 pips',
      correlations: [
        { asset: 'US-JP 10Y Yield Spread', value: '+0.91', desc: 'Core Driver' },
        { asset: 'US 2Y Yield', value: '+0.84', desc: 'Direct Rate Path' },
        { asset: 'Nikkei 225', value: '+0.65', desc: 'Exporter Sensitivity' }
      ]
    },
    EURJPY: {
      name: 'Euro / Japanese Yen',
      price: '163.20',
      change: '-0.65 (-0.40%)',
      positive: false,
      atr14: '1.35',
      keySupport: '162.00',
      keyResistance: '164.50',
      spreadTypical: '1.2 pips',
      spreadNewsSpike: '6.0 - 11.0 pips',
      correlations: [
        { asset: 'EURUSD & USDJPY Blend', value: '+0.85', desc: 'Cross Factor' },
        { asset: 'Risk Sentiment (VIX)', value: '-0.68', desc: 'Carry Sensitivity' }
      ]
    },
    GBPJPY: {
      name: 'British Pound / Japanese Yen',
      price: '195.40',
      change: '-0.85 (-0.43%)',
      positive: false,
      atr14: '1.80',
      keySupport: '193.50',
      keyResistance: '197.00',
      spreadTypical: '1.5 pips',
      spreadNewsSpike: '7.5 - 14.0 pips',
      correlations: [
        { asset: 'BoE vs BoJ Stance', value: '+0.78', desc: 'Central Bank Differential' },
        { asset: 'Global Equities', value: '+0.71', desc: 'High Beta Carry' }
      ]
    },
    AUDJPY: {
      name: 'Australian Dollar / Japanese Yen',
      price: '100.25',
      change: '-0.30 (-0.30%)',
      positive: false,
      atr14: '1.15',
      keySupport: '99.00',
      keyResistance: '101.50',
      spreadTypical: '1.4 pips',
      spreadNewsSpike: '6.5 - 12.0 pips',
      correlations: [
        { asset: 'Global Risk-On Index', value: '+0.89', desc: 'Purest Risk Proxy' },
        { asset: 'Copper & Commodities', value: '+0.76', desc: 'Commodity Demand' }
      ]
    }
  };

  const currentInfo = pairsInfo[selectedPair];
  const pairSignals = signals.filter(s => s.pair === selectedPair);

  return (
    <div className="space-y-6">
      {/* Pair Switcher Bar & MT5 CSV Import Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-terminal-surface border border-terminal-border rounded-xl shadow-lg">
        <div>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Active Macro Focus Pair</div>
          <div className="text-lg font-mono font-bold text-white mt-0.5">{selectedPair} — {currentInfo.name}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(pairsInfo).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPair(p)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                selectedPair === p
                  ? 'bg-terminal-cyan text-black font-bold shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-terminal-border'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="ml-2 px-3 py-1.5 rounded text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-terminal-cyan border border-cyan-500/40 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import MT5 CSV</span>
          </button>
        </div>
      </div>

      {/* Realtime Metrics & Levels Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">Current Quote</div>
          <div className="text-xl font-bold text-white tabular-nums mt-1">{currentInfo.price}</div>
          <div className={`text-[10px] tabular-nums mt-0.5 ${currentInfo.positive ? 'text-terminal-green' : 'text-terminal-red'}`}>
            {currentInfo.change}
          </div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">14-Day ATR Volatility</div>
          <div className="text-xl font-bold text-terminal-cyan tabular-nums mt-1">{currentInfo.atr14}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Average Daily Movement</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">Key Support / Resistance</div>
          <div className="text-xs font-bold text-emerald-400 tabular-nums mt-1">S: {currentInfo.keySupport}</div>
          <div className="text-xs font-bold text-rose-400 tabular-nums mt-0.5">R: {currentInfo.keyResistance}</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3.5">
          <div className="text-[10px] text-slate-500 uppercase">News Spread Model</div>
          <div className="text-xs font-bold text-slate-300 tabular-nums mt-1">Normal: {currentInfo.spreadTypical}</div>
          <div className="text-[10px] text-amber-400/90 mt-0.5">News Spike: {currentInfo.spreadNewsSpike}</div>
        </div>
      </div>

      {/* STRUCTURED POINT-IN-TIME MARKET SNAPSHOT (Phase 2) */}
      <MarketSnapshotCard pair={selectedPair} key={`snapshot-${selectedPair}-${refreshKey}`} />

      {/* EMPIRICAL HISTORICAL REACTIONS DATABASE (Phase 2) */}
      <ReactionStatsTable pair={selectedPair} eventType="CPI" key={`reaction-${selectedPair}-${refreshKey}`} />

      {/* Macro Correlations & Cross-Asset Weights */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-terminal-cyan" />
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wide">
            Primary Macro Cross-Asset Correlations for {selectedPair}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {currentInfo.correlations.map((corr, i) => (
            <div key={i} className="p-3 rounded bg-slate-950 border border-terminal-border font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">{corr.asset}</span>
                <span className="font-bold text-terminal-cyan">{corr.value}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{corr.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Pre-News Signals for this Pair */}
      <div>
        <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 flex items-center gap-2">
          <span>Active Pre-News Playbooks for {selectedPair}</span>
        </h2>
        {pairSignals.length === 0 ? (
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-8 text-center text-xs font-mono text-slate-400">
            No active signals for {selectedPair}. Waiting for scheduled news snapshot.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pairSignals.map(sig => (
              <SignalCard key={sig.id} signal={sig} />
            ))}
          </div>
        )}
      </div>

      {/* MT5 CSV Import Modal */}
      <PriceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => setRefreshKey(k => k + 1)}
      />
    </div>
  );
}
