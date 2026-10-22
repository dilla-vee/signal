import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, AlertTriangle, RefreshCw, Play, Clock, CheckCircle, XCircle, Database, Server } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { TimeAgo } from '../components/common/TimeAgo';

export function HealthPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState(null);

  async function fetchHealth() {
    try {
      const res = await fetch('/api/health/jobs');
      if (res.ok) {
        const json = await res.json();
        setReport(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch job health report:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); // 5s poll for health telemetry
    return () => clearInterval(interval);
  }, []);

  async function handleTriggerJob(jobId) {
    setTriggeringJob(jobId);
    try {
      const res = await fetch(`/api/health/jobs/${jobId}/run`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setReport(json.data);
      }
    } catch (err) {
      console.warn(`Failed to trigger job ${jobId}:`, err);
    } finally {
      setTriggeringJob(null);
    }
  }

  function formatUptime(seconds) {
    if (!seconds && seconds !== 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. Header Banner */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-terminal-cyan" />
            <h1 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              Background Schedulers & Data Feed Health Monitor
            </h1>
            {report?.status === 'OPERATIONAL' ? (
              <Badge variant="live" size="sm">OPERATIONAL</Badge>
            ) : report?.status === 'DEGRADED' ? (
              <Badge variant="stale" size="sm">DEGRADED</Badge>
            ) : (
              <Badge variant="high" size="sm">{report?.status || 'INITIALIZING'}</Badge>
            )}
          </div>
          <p className="text-slate-400 text-[11px]">
            Node-cron scheduled workers ingest live prices every 15s, yields every 60s, official calendar every 15m, and central bank tone every 10m.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 self-end md:self-auto">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase">Server Uptime</div>
            <div className="text-xs sm:text-sm font-bold text-white tabular-nums">
              {formatUptime(report?.uptime_seconds)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase">Jobs Monitored</div>
            <div className="text-xs sm:text-sm font-bold text-terminal-cyan tabular-nums">
              {report?.healthy_jobs || 0} / {report?.total_jobs || 0} Healthy
            </div>
          </div>

          <button
            onClick={fetchHealth}
            className="p-2 rounded bg-slate-900 border border-terminal-border text-slate-300 hover:text-terminal-cyan transition-colors"
            title="Refresh Health Now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Scheduled Jobs Table */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-terminal-border bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-terminal-cyan" />
            <span className="font-bold text-white uppercase tracking-wider text-xs">
              Automated Ingestion Jobs Registry
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Auto-refreshing every 5 seconds
          </span>
        </div>

        <div className="divide-y divide-terminal-border">
          {report?.jobs?.map((job) => {
            const isJobStale = Boolean(job.is_stale);
            const hasErrors = job.error_count > 0;

            return (
              <div key={job.id} className="p-4 hover:bg-slate-900/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{job.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {job.interval}
                    </span>
                    {job.status === 'RUNNING' ? (
                      <Badge variant="cyan" size="xs">RUNNING</Badge>
                    ) : isJobStale ? (
                      <Badge variant="stale" size="xs">STALE</Badge>
                    ) : job.status === 'HEALTHY' ? (
                      <Badge variant="live" size="xs">HEALTHY</Badge>
                    ) : (
                      <Badge variant="high" size="xs">{job.status}</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Last Run:</span>
                      <span className="text-slate-200">
                        {job.last_run ? new Date(job.last_run).toLocaleTimeString() : 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>Last Success:</span>
                      <span className="text-emerald-300">
                        {job.last_success ? new Date(job.last_success).toLocaleTimeString() : 'None yet'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Latency:</span>
                      <span className="text-slate-300 font-bold tabular-nums">
                        {job.latency_ms || 0} ms
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Window:</span>
                      <span className="text-slate-300">{job.refresh_window_sec}s</span>
                    </div>
                  </div>

                  {job.last_error && (
                    <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900/50 rounded p-1.5 mt-1">
                      Last Error: {job.last_error}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-slate-500 uppercase">Error Count</div>
                    <div className={`text-sm font-bold tabular-nums ${hasErrors ? 'text-rose-400' : 'text-slate-400'}`}>
                      {job.error_count}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTriggerJob(job.id)}
                    disabled={triggeringJob === job.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-terminal-cyan border border-terminal-border transition-all disabled:opacity-50"
                  >
                    <Play className={`w-3 h-3 ${triggeringJob === job.id ? 'animate-spin' : ''}`} />
                    <span>{triggeringJob === job.id ? 'Running...' : 'Run Now'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
