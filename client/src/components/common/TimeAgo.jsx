import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge';

export function TimeAgo({
  timestamp,
  refreshWindowSec = 60,
  sourceName = 'Live Market Feed',
  isStale = false,
  isDemo = false,
  showSource = true
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timestamp) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
        <Clock className="w-3 h-3 text-slate-500" />
        <span>Awaiting timestamp...</span>
      </div>
    );
  }

  const updatedMs = new Date(timestamp).getTime();
  const diffSec = Math.max(0, Math.floor((now - updatedMs) / 1000));
  const isExpired = Boolean(isStale) || (refreshWindowSec > 0 && diffSec > refreshWindowSec);

  let formattedTimeAgo = 'just now';
  if (diffSec >= 3600) {
    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    formattedTimeAgo = `${hours}h ${mins}m ago`;
  } else if (diffSec >= 60) {
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    formattedTimeAgo = `${mins}m ${secs}s ago`;
  } else if (diffSec > 5) {
    formattedTimeAgo = `${diffSec}s ago`;
  } else {
    formattedTimeAgo = 'just now';
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
      {showSource && (
        <span className="text-slate-400">
          Source: <span className="text-slate-200 font-semibold">{sourceName}</span>
        </span>
      )}

      <span className="text-slate-600">•</span>

      <span className={`flex items-center gap-1 ${isExpired ? 'text-rose-400 font-semibold' : 'text-slate-400'}`}>
        <Clock className={`w-3 h-3 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`} />
        <span>Updated {formattedTimeAgo}</span>
      </span>

      {isDemo ? (
        <Badge variant="demo" size="xs">DEMO DATA</Badge>
      ) : isExpired ? (
        <Badge variant="stale" size="xs">STALE</Badge>
      ) : (
        <Badge variant="live" size="xs">LIVE</Badge>
      )}
    </div>
  );
}
