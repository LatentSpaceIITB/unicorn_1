'use client';

import { motion } from 'framer-motion';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color: string;
  delta?: number;
}

export function StatBar({ label, value, max = 100, color, delta }: StatBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {/* Label */}
      <span
        className="w-16 text-right"
        style={{ color: 'var(--terminal-dim)' }}
      >
        {label}
      </span>

      {/* Bar container */}
      <div
        className="flex-1 h-2 relative overflow-hidden"
        style={{ backgroundColor: 'rgba(102, 102, 102, 0.3)' }}
      >
        {/* Animated fill */}
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Value */}
      <span
        className="w-8 text-right tabular-nums"
        style={{ color }}
      >
        {value}
      </span>

      {/* Delta indicator */}
      <div className="w-10 text-right">
        {delta !== undefined && delta !== 0 && (
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs tabular-nums"
            style={{
              color: delta > 0 ? 'var(--terminal-success)' : 'var(--terminal-danger)'
            }}
          >
            {delta > 0 ? '+' : ''}{delta}
          </motion.span>
        )}
      </div>
    </div>
  );
}

interface StatsHUDProps {
  vibe: number;
  trust: number;
  tension: number;
  turn: number;
  act: string;
  deltas?: {
    vibe: number;
    trust: number;
    tension: number;
  };
  showDebug?: boolean;
}

export function StatsHUD({ vibe, trust, tension, turn, act, deltas, showDebug = false }: StatsHUDProps) {
  // Format act name for display
  const actDisplay = act.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Calculate turn urgency color
  const getTurnColor = (currentTurn: number) => {
    const remaining = 21 - currentTurn; // Turns left including current
    if (remaining > 10) return 'var(--terminal-success)';   // Green - plenty of time
    if (remaining > 5) return 'var(--terminal-trust)';      // Yellow/Amber - getting short
    if (remaining > 2) return '#FF8C00';                    // Orange - running out
    return 'var(--terminal-tension)';                       // Red - critical!
  };

  // Format turn display
  const turnsLeft = 21 - turn; // Turns remaining including current
  const turnDisplay = turnsLeft <= 5
    ? `${turnsLeft} LEFT`
    : `TURN ${turn}/20`;

  const turnColor = getTurnColor(turn);
  const isUrgent = turnsLeft <= 3;

  return (
    <div
      className="sticky top-0 z-10 p-4 border-b"
      style={{
        backgroundColor: 'var(--terminal-bg)',
        borderColor: 'var(--terminal-dim)'
      }}
    >
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Header */}
        <div className="flex justify-between items-center font-mono mb-3">
          <motion.span
            className="text-sm font-bold"
            style={{ color: turnColor }}
            animate={isUrgent ? {
              scale: [1, 1.05, 1],
              opacity: [1, 0.8, 1],
            } : {}}
            transition={isUrgent ? {
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            } : {}}
          >
            {turnDisplay}
          </motion.span>
          <span className="text-xs" style={{ color: 'var(--terminal-vibe)' }}>
            {actDisplay}
          </span>
        </div>

        {/* Stat bars */}
        <StatBar
          label="VIBE"
          value={vibe}
          color="var(--terminal-vibe)"
          delta={deltas?.vibe}
        />
        <StatBar
          label="TRUST"
          value={trust}
          color="var(--terminal-trust)"
          delta={deltas?.trust}
        />
        <StatBar
          label="TENSION"
          value={tension}
          color="var(--terminal-tension)"
          delta={deltas?.tension}
        />

        {/* Debug toggle */}
        {showDebug && (
          <div
            className="text-xs font-mono text-center mt-2 pt-2 border-t"
            style={{
              color: 'var(--terminal-dim)',
              borderColor: 'var(--terminal-dim)'
            }}
          >
            V:{vibe} T:{trust} X:{tension}
          </div>
        )}
      </div>
    </div>
  );
}
