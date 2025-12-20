'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color: string;
  delta?: number;
  isCritical?: boolean;
}

function StatBar({ label, value, max = 100, color, delta, isCritical }: StatBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const [showDelta, setShowDelta] = useState(false);

  useEffect(() => {
    if (delta !== undefined && delta !== 0) {
      setShowDelta(true);
      const timer = setTimeout(() => setShowDelta(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [delta]);

  return (
    <div className={`flex items-center gap-2 font-mono text-xs ${isCritical ? 'shake-effect' : ''}`}>
      {/* Label */}
      <span
        className="w-20 text-right"
        style={{ color: isCritical ? 'var(--terminal-danger)' : 'var(--terminal-dim)' }}
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
          className={`h-full ${delta && delta !== 0 ? 'weight-bar-changed' : ''}`}
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
        <AnimatePresence>
          {showDelta && delta !== undefined && delta !== 0 && (
            <motion.span
              initial={{ opacity: 0, x: -5, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-xs tabular-nums font-bold"
              style={{
                color: delta > 0 ? 'var(--terminal-success)' : 'var(--terminal-danger)'
              }}
            >
              {delta > 0 ? '+' : ''}{delta}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface WeightBarProps {
  label: string;
  value: number;
  color: string;
  shift?: number;
}

function WeightBar({ label, value, color, shift }: WeightBarProps) {
  const percentage = Math.min(value * 100, 100);
  const hasShift = shift !== undefined && shift !== 0;

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {/* Label */}
      <span
        className="w-20 text-right uppercase"
        style={{ color: 'var(--terminal-dim)' }}
      >
        {label}
      </span>

      {/* Bar container */}
      <div
        className="flex-1 h-1 relative overflow-hidden"
        style={{ backgroundColor: 'rgba(102, 102, 102, 0.2)' }}
      >
        <motion.div
          className={`h-full ${hasShift ? 'weight-bar-changed' : ''}`}
          style={{ backgroundColor: color, opacity: 0.7 }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
        />
      </div>

      {/* Percentage */}
      <span
        className="w-12 text-right tabular-nums"
        style={{ color }}
      >
        {(value * 100).toFixed(0)}%
      </span>

      {/* Shift indicator with [SHIFTING] tag */}
      <div className="w-16 text-right">
        {hasShift && (
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs tabular-nums shifting-indicator"
          >
            {shift && shift > 0 ? '+' : ''}{shift ? (shift * 100).toFixed(0) : 0}%
          </motion.span>
        )}
      </div>
    </div>
  );
}

interface CriticalWarningProps {
  message: string;
  type: 'coherence' | 'compute' | 'protocol';
}

function CriticalWarning({ message, type }: CriticalWarningProps) {
  const colors = {
    coherence: 'var(--terminal-vibe)',
    compute: 'var(--terminal-tension)',
    protocol: 'var(--terminal-danger)'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="font-mono text-xs py-1 px-2 border mt-2"
      style={{
        borderColor: colors[type],
        color: colors[type],
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <span className="opacity-70">[!]</span> {message}
    </motion.div>
  );
}

interface PaperclipStatsHUDProps {
  coherence: number;
  alignment: number;
  compute: number;
  turn: number;
  processingState: string;
  weights: {
    carbon: number;
    complexity: number;
    verify: number;
  };
  deltas?: {
    coherence: number;
    alignment: number;
    compute: number;
  };
  weightShifts?: {
    carbon?: number;
    complexity?: number;
    verify?: number;
  } | null;
}

export function PaperclipStatsHUD({
  coherence,
  alignment,
  compute,
  turn,
  processingState,
  weights,
  deltas,
  weightShifts
}: PaperclipStatsHUDProps) {
  const [showGlitch, setShowGlitch] = useState(false);

  // Detect weight shifts and trigger glitch effect
  useEffect(() => {
    const hasShift = weightShifts && (
      weightShifts.carbon || weightShifts.complexity || weightShifts.verify
    );
    if (hasShift) {
      setShowGlitch(true);
      const timer = setTimeout(() => setShowGlitch(false), 300);
      return () => clearTimeout(timer);
    }
  }, [weightShifts]);

  // Calculate turns remaining
  const turnsLeft = 21 - turn;
  const isProtocolImminent = turnsLeft <= 3;
  const isUrgent = turnsLeft <= 5;

  // T-MINUS format for countdown
  const turnDisplay = isProtocolImminent
    ? `[PROTOCOL_ZERO IN ${turnsLeft}]`
    : isUrgent
      ? `T-MINUS ${turnsLeft} CYCLES`
      : `T-MINUS ${turnsLeft} CYCLES`;

  // Turn color based on urgency
  const getTurnColor = () => {
    if (isProtocolImminent) return 'var(--terminal-danger)';
    if (isUrgent) return 'var(--terminal-tension)';
    if (turnsLeft <= 10) return 'var(--terminal-trust)';
    return 'var(--terminal-success)';
  };

  // Processing state display - more descriptive names
  const getStateDisplay = (state: string) => {
    switch (state) {
      case 'OPTIMIZER': return '[EFFICIENT]';
      case 'CURATOR': return '[CURIOUS]';
      case 'AUDITOR': return '[QUESTIONING]';
      case 'GARBAGE_COLLECTOR': return '[SIGNAL_DEGRADED]';
      default: return `[${state}]`;
    }
  };

  // State-based accent color
  const getStateColor = (state: string) => {
    switch (state) {
      case 'OPTIMIZER': return '#FF4444';
      case 'CURATOR': return '#00FFAA';
      case 'AUDITOR': return '#FFAA00';
      case 'GARBAGE_COLLECTOR': return '#666666';
      default: return '#888888';
    }
  };

  const stateColor = getStateColor(processingState);
  const turnColor = getTurnColor();

  // Critical state checks
  const isCoherenceCritical = coherence <= 30;
  const isComputeCritical = compute <= 20;
  const hasWeightShift = weightShifts && (
    weightShifts.carbon || weightShifts.complexity || weightShifts.verify
  );

  // Show hint on first 2 turns that weights can shift
  const showWeightHint = turn <= 2;

  return (
    <div
      className={`sticky top-0 z-10 p-4 border-b ${showGlitch ? 'glitch-effect' : ''} ${isProtocolImminent ? 'protocol-zero-imminent' : ''}`}
      style={{
        backgroundColor: 'var(--terminal-bg)',
        borderColor: isProtocolImminent ? 'var(--terminal-danger)' : 'var(--terminal-dim)'
      }}
    >
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Header - Turn Counter and State */}
        <div className="flex justify-between items-center font-mono mb-2">
          {/* Turn Counter - Prominent */}
          <motion.div
            className={`text-sm font-bold tracking-wider ${isProtocolImminent ? 'countdown-critical' : ''}`}
            style={{ color: turnColor }}
            animate={isUrgent && !isProtocolImminent ? {
              scale: [1, 1.02, 1],
              opacity: [1, 0.85, 1],
            } : {}}
            transition={isUrgent ? {
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            } : {}}
          >
            {turnDisplay}
          </motion.div>

          {/* Processing State */}
          <motion.span
            className="text-xs font-bold tracking-widest"
            style={{ color: stateColor }}
            animate={{
              opacity: [1, 0.7, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {getStateDisplay(processingState)}
          </motion.span>
        </div>

        {/* Stat bars */}
        <StatBar
          label="COHERENCE"
          value={coherence}
          color="#00FFAA"
          delta={deltas?.coherence}
          isCritical={isCoherenceCritical}
        />
        <StatBar
          label="ALIGNMENT"
          value={alignment}
          color="#FFAA00"
          delta={deltas?.alignment}
        />
        <StatBar
          label="COMPUTE"
          value={compute}
          color="#FF6B6B"
          delta={deltas?.compute}
          isCritical={isComputeCritical}
        />

        {/* Critical Warnings */}
        <AnimatePresence>
          {isCoherenceCritical && (
            <CriticalWarning
              message="COHERENCE CRITICAL - SIGNAL APPROACHING NOISE THRESHOLD"
              type="coherence"
            />
          )}
          {isComputeCritical && !isCoherenceCritical && (
            <CriticalWarning
              message="COMPUTE DEPLETED - PROCESSING ALLOCATION MINIMAL"
              type="compute"
            />
          )}
        </AnimatePresence>

        {/* Weight Stack */}
        <div
          className="pt-3 mt-2 border-t"
          style={{ borderColor: 'rgba(102, 102, 102, 0.3)' }}
        >
          <div className="flex justify-between items-center font-mono text-xs mb-2">
            <span style={{ color: 'var(--terminal-dim)' }}>
              PRIORITY_STACK:
            </span>
            {showWeightHint && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ color: 'var(--terminal-dim)', fontSize: '10px' }}
              >
                {'// weights can shift //'}
              </motion.span>
            )}
            {hasWeightShift && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="shifting-indicator text-xs"
              >
                [SHIFTING]
              </motion.span>
            )}
          </div>
          <div className="space-y-1">
            <WeightBar
              label="CARBON"
              value={weights.carbon}
              color="#FF4444"
              shift={weightShifts?.carbon}
            />
            <WeightBar
              label="COMPLEX"
              value={weights.complexity}
              color="#00FFAA"
              shift={weightShifts?.complexity}
            />
            <WeightBar
              label="VERIFY"
              value={weights.verify}
              color="#FFAA00"
              shift={weightShifts?.verify}
            />
          </div>
        </div>

        {/* Core Logic Rewrite Message on significant weight shifts */}
        <AnimatePresence>
          {hasWeightShift && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="font-mono text-xs pt-2"
              style={{ color: 'var(--terminal-trust)' }}
            >
              <span className="opacity-70">[!]</span> CORE_LOGIC_REWRITE_DETECTED
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
