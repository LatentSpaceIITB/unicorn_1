'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Silence thresholds in milliseconds
export const SILENCE_THRESHOLDS = {
  AWKWARD: 15000,       // 15 sec - first warning
  VERY_AWKWARD: 30000,  // 30 sec - second warning
  CRITICAL: 45000,      // 45 sec - final warning
  GHOST: 60000,         // 60 sec - game over
} as const;

export type SilenceLevel = 'awkward' | 'very_awkward' | 'critical' | 'ghost';

interface UseTimerOptions {
  onThresholdHit: (level: SilenceLevel) => void;
  enabled?: boolean;
}

interface UseTimerReturn {
  elapsed: number;
  isRunning: boolean;
  currentLevel: SilenceLevel | null;
  reset: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Hook for managing the silence timer
 *
 * Tracks how long the player has been silent and triggers
 * callbacks when thresholds are crossed.
 */
export function useTimer({ onThresholdHit, enabled = true }: UseTimerOptions): UseTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<SilenceLevel | null>(null);

  // Track which thresholds have been triggered to avoid double-firing
  const triggeredRef = useRef<Set<SilenceLevel>>(new Set());

  // Start/resume the timer
  const resume = useCallback(() => {
    if (enabled) {
      setIsRunning(true);
    }
  }, [enabled]);

  // Pause the timer
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Reset the timer (called after player sends a message)
  const reset = useCallback(() => {
    setElapsed(0);
    setCurrentLevel(null);
    triggeredRef.current.clear();
    if (enabled) {
      setIsRunning(true);
    }
  }, [enabled]);

  // Main timer effect
  useEffect(() => {
    if (!isRunning || !enabled) return;

    const interval = setInterval(() => {
      setElapsed(prev => {
        const newElapsed = prev + 1000;

        // Check thresholds and fire callbacks
        if (newElapsed >= SILENCE_THRESHOLDS.GHOST && !triggeredRef.current.has('ghost')) {
          triggeredRef.current.add('ghost');
          setCurrentLevel('ghost');
          onThresholdHit('ghost');
          setIsRunning(false); // Stop timer on game over
        } else if (newElapsed >= SILENCE_THRESHOLDS.CRITICAL && !triggeredRef.current.has('critical')) {
          triggeredRef.current.add('critical');
          setCurrentLevel('critical');
          onThresholdHit('critical');
        } else if (newElapsed >= SILENCE_THRESHOLDS.VERY_AWKWARD && !triggeredRef.current.has('very_awkward')) {
          triggeredRef.current.add('very_awkward');
          setCurrentLevel('very_awkward');
          onThresholdHit('very_awkward');
        } else if (newElapsed >= SILENCE_THRESHOLDS.AWKWARD && !triggeredRef.current.has('awkward')) {
          triggeredRef.current.add('awkward');
          setCurrentLevel('awkward');
          onThresholdHit('awkward');
        }

        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, enabled, onThresholdHit]);

  // Disable timer effect
  useEffect(() => {
    if (!enabled) {
      setIsRunning(false);
    }
  }, [enabled]);

  return {
    elapsed,
    isRunning,
    currentLevel,
    reset,
    pause,
    resume,
  };
}
