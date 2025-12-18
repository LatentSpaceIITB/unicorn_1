'use client';

import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/leaderboard';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  showScore?: boolean;
  compact?: boolean;
}

const gradeColors: Record<string, string> = {
  S: 'var(--terminal-success)',
  A: 'var(--terminal-vibe)',
  B: 'var(--terminal-trust)',
  C: 'var(--terminal-dim)',
  D: 'var(--terminal-tension)',
};

export function LeaderboardTable({
  entries,
  showScore = true,
  compact = false,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div
        className="font-mono text-center py-4"
        style={{ color: 'var(--terminal-dim)' }}
      >
        [ NO SIGNAL INTERCEPTS YET ]
      </div>
    );
  }

  return (
    <div className="font-mono w-full overflow-x-auto">
      {/* Header */}
      <div
        className="border-b pb-2 mb-2 text-xs tracking-wider"
        style={{ borderColor: 'var(--terminal-dim)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-10 text-center" style={{ color: 'var(--terminal-dim)' }}>
            #
          </span>
          <span className="flex-1" style={{ color: 'var(--terminal-dim)' }}>
            OPERATIVE
          </span>
          <span className="w-8 text-center" style={{ color: 'var(--terminal-dim)' }}>
            RNK
          </span>
          {showScore && (
            <span
              className="w-12 text-center hidden sm:block"
              style={{ color: 'var(--terminal-dim)' }}
            >
              SCORE
            </span>
          )}
          <span
            className="w-20 text-right text-xs"
            style={{ color: 'var(--terminal-dim)' }}
          >
            STATUS
          </span>
        </div>
      </div>

      {/* Entries */}
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        {entries.map((entry, index) => {
          const isHighlighted = entry.is_you;
          const gradeColor = gradeColors[entry.grade] || 'var(--terminal-text)';

          return (
            <motion.div
              key={`${entry.rank}-${entry.callsign}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-2 py-1 px-1 ${
                isHighlighted ? 'border-l-2' : ''
              }`}
              style={{
                backgroundColor: isHighlighted
                  ? 'rgba(255, 46, 99, 0.1)'
                  : 'transparent',
                borderColor: isHighlighted
                  ? 'var(--terminal-tension)'
                  : 'transparent',
              }}
            >
              {/* Rank */}
              <span
                className="w-10 text-center text-sm"
                style={{
                  color: isHighlighted
                    ? 'var(--terminal-tension)'
                    : 'var(--terminal-dim)',
                }}
              >
                {entry.rank.toString().padStart(2, '0')}
              </span>

              {/* Callsign */}
              <span
                className="flex-1 truncate"
                style={{
                  color: isHighlighted
                    ? 'var(--terminal-tension)'
                    : 'var(--terminal-text)',
                }}
              >
                {entry.callsign}
                {entry.is_you && (
                  <span
                    className="ml-1 text-xs"
                    style={{ color: 'var(--terminal-tension)' }}
                  >
                    (YOU)
                  </span>
                )}
              </span>

              {/* Grade */}
              <span
                className="w-8 text-center font-bold"
                style={{ color: gradeColor }}
              >
                {entry.grade}
              </span>

              {/* Score (hidden on mobile) */}
              {showScore && (
                <span
                  className="w-12 text-center hidden sm:block text-sm"
                  style={{ color: 'var(--terminal-dim)' }}
                >
                  {entry.score}
                </span>
              )}

              {/* Status */}
              <span
                className="w-20 text-right text-xs truncate"
                style={{ color: 'var(--terminal-dim)' }}
              >
                {entry.status}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
