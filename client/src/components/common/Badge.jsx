import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm' }) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };

  const variantClasses = {
    buy: 'bg-emerald-950/80 text-terminal-green border border-emerald-500/30',
    sell: 'bg-rose-950/80 text-terminal-red border border-rose-500/30',
    neutral: 'bg-slate-800/80 text-slate-300 border border-slate-700',
    cyan: 'bg-cyan-950/80 text-terminal-cyan border border-cyan-500/30',
    gold: 'bg-amber-950/80 text-terminal-gold border border-amber-500/30',
    high: 'bg-rose-950/90 text-rose-400 border border-rose-600/50 font-bold',
    medium: 'bg-amber-950/90 text-amber-400 border border-amber-600/50',
    low: 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
  };

  return (
    <span className={`inline-flex items-center justify-center font-mono font-medium rounded ${sizeClasses[size] || sizeClasses.sm} ${variantClasses[variant] || variantClasses.neutral}`}>
      {children}
    </span>
  );
}
