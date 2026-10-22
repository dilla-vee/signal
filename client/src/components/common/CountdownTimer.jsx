import React, { useState, useEffect } from 'react';

export function CountdownTimer({ targetTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    if (!targetTime) return { totalMs: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
    const diff = new Date(targetTime).getTime() - Date.now();
    if (diff <= 0) {
      return { totalMs: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { totalMs: diff, days, hours, minutes, seconds, isPassed: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated.isPassed && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  if (timeLeft.isPassed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-terminal-surface border border-slate-700 text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        EVENT RELEASED (UTC)
      </span>
    );
  }

  const isImminent = timeLeft.totalMs < 30 * 60 * 1000; // < 30 mins
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className={`inline-flex items-center gap-2 font-mono ${isImminent ? 'text-terminal-red' : 'text-terminal-cyan'}`}>
      <span className={`w-2 h-2 rounded-full ${isImminent ? 'bg-terminal-red animate-ping' : 'bg-terminal-cyan'}`}></span>
      <span className="font-bold tracking-wider tabular-nums">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
      {isImminent && (
        <span className="text-[10px] uppercase font-bold tracking-widest px-1 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
          IMMINENT
        </span>
      )}
    </div>
  );
}
