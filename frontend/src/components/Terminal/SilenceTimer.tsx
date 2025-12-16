'use client';

import { SILENCE_THRESHOLDS, SilenceLevel } from '@/hooks/useTimer';

interface SilenceTimerProps {
  elapsed: number;
  currentLevel: SilenceLevel | null;
  isRunning: boolean;
}

/**
 * Visual indicator for the silence timer
 *
 * Shows a progress bar that changes color as the player stays silent longer.
 * Color progression: Green → Yellow → Orange → Red
 */
export function SilenceTimer({ elapsed, currentLevel, isRunning }: SilenceTimerProps) {
  if (!isRunning && elapsed === 0) {
    return null; // Don't show when game hasn't started
  }

  const maxTime = SILENCE_THRESHOLDS.GHOST;
  const percentage = Math.min((elapsed / maxTime) * 100, 100);

  // Determine color based on elapsed time
  const getColor = () => {
    if (elapsed >= SILENCE_THRESHOLDS.CRITICAL) return 'var(--color-danger)';
    if (elapsed >= SILENCE_THRESHOLDS.VERY_AWKWARD) return '#ff8c00'; // Orange
    if (elapsed >= SILENCE_THRESHOLDS.AWKWARD) return 'var(--color-trust)'; // Yellow/amber
    return 'var(--color-success)'; // Green
  };

  // Get warning message based on level
  const getWarningMessage = () => {
    switch (currentLevel) {
      case 'critical':
        return "She's losing interest...";
      case 'very_awkward':
        return 'The silence is getting awkward...';
      case 'awkward':
        return 'Say something...';
      default:
        return null;
    }
  };

  const color = getColor();
  const warningMessage = getWarningMessage();
  const remainingPercent = 100 - percentage;

  return (
    <div className="silence-timer">
      <div className="timer-track">
        <div
          className="timer-bar"
          style={{
            width: `${remainingPercent}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {warningMessage && (
        <span className="timer-warning" style={{ color }}>
          {warningMessage}
        </span>
      )}

      <style jsx>{`
        .silence-timer {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 8px;
        }

        .timer-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .timer-bar {
          height: 100%;
          transition: width 1s linear, background-color 0.3s ease;
          border-radius: 2px;
        }

        .timer-warning {
          font-size: 11px;
          font-family: var(--font-mono);
          text-align: center;
          animation: pulse 1.5s ease-in-out infinite;
          opacity: 0.9;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
