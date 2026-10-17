import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';

export function PriceImportModal({ isOpen, onClose, onImportSuccess }) {
  const [pair, setPair] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('M1');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setFileContent(text);

      // Generate a quick client-side line preview
      const lines = text.split(/\r?\n/).slice(0, 5);
      setPreview(lines);
    };
    reader.readAsText(file);
  }

  function handlePasteSample() {
    const sample = `<DATE>\t<TIME>\t<OPEN>\t<HIGH>\t<LOW>\t<CLOSE>\t<TICKVOL>\t<VOL>\t<SPREAD>
2024.10.15\t12:30:00\t2650.50\t2658.20\t2649.10\t2656.80\t1420\t0\t25
2024.10.15\t12:31:00\t2656.80\t2662.00\t2655.00\t2660.40\t1850\t0\t30
2024.10.15\t12:32:00\t2660.40\t2661.10\t2654.20\t2655.00\t1200\t0\t28
2024.10.15\t12:33:00\t2655.00\t2657.80\t2653.40\t2657.10\t980\t0\t25`;

    setFileName('sample_mt5_xauusd_m1.csv');
    setFileContent(sample);
    setPreview(sample.split('\n'));
    setError('');
  }

  async function handleImport() {
    if (!fileContent) {
      setError('Please choose a file or paste sample MT5 data');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/prices/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: fileContent,
          pair,
          timeframe
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Import failed');
      }

      setSuccess(`Successfully imported ${json.data.importedCount} candles for ${pair} (${timeframe})!`);
      if (onImportSuccess) onImportSuccess(json.data);
      setTimeout(() => {
        onClose();
        setSuccess('');
        setFileContent('');
        setPreview(null);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error importing price file');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-terminal-border">
          <Upload className="w-5 h-5 text-terminal-cyan" />
          <h2 className="text-base font-bold font-mono text-white uppercase tracking-wide">
            Import MT5 Price History (CSV / TSV)
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-rose-950/80 border border-rose-500 text-xs font-mono text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-terminal-red shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-emerald-950/80 border border-emerald-500 text-xs font-mono text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-terminal-green shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-4 font-mono text-xs">
          {/* Target Pair & Timeframe */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Target Instrument</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              >
                {['XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-terminal-border rounded text-white focus:outline-none focus:border-terminal-cyan"
              >
                {['M1', 'M5', 'M15', 'H1', 'D1'].map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File Picker / Drag Drop */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">MT5 Export File (.csv or .txt)</label>
            <div className="border-2 border-dashed border-terminal-border hover:border-terminal-cyan/50 rounded-lg p-5 text-center transition-colors">
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="hidden"
                id="mt5-file-input"
              />
              <label htmlFor="mt5-file-input" className="cursor-pointer block">
                <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <div className="text-slate-300 font-medium">
                  {fileName ? fileName : 'Click to select MT5 CSV export file'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Supports standard MetaTrader 5 tab-separated or comma-separated formats
                </div>
              </label>
            </div>
          </div>

          {/* Sample Paste Button */}
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Don't have an MT5 export handy?</span>
            <button
              type="button"
              onClick={handlePasteSample}
              className="text-terminal-cyan hover:underline font-bold"
            >
              Load Sample MT5 Gold M1 Data
            </button>
          </div>

          {/* Data Preview */}
          {preview && (
            <div className="p-3 bg-slate-950 rounded border border-terminal-border text-[10px] text-slate-300">
              <div className="text-slate-500 uppercase font-bold mb-1">File Header & Data Preview:</div>
              <pre className="overflow-x-auto whitespace-pre font-mono text-terminal-cyan">
                {preview.join('\n')}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-terminal-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !fileContent}
              className="px-5 py-2 rounded font-bold bg-terminal-cyan text-black hover:bg-cyan-300 disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              <span>{loading ? 'Importing...' : 'Confirm & Ingest'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
