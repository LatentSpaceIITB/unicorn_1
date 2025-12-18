'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getTopOperatives, TopOperativesResponse } from '@/lib/leaderboard';
import { LeaderboardTable } from './LeaderboardTable';

export function TopOperatives() {
  const [data, setData] = useState<TopOperativesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopOperatives()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono text-center py-4"
        style={{ color: 'var(--terminal-dim)' }}
      >
        [ LOADING INTERCEPTS... ]
      </motion.div>
    );
  }

  // Show cheeky placeholder when empty
  if (!data || data.entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono"
      >
        <div
          className="border p-4"
          style={{ borderColor: 'var(--terminal-dim)' }}
        >
          {/* Header */}
          <div
            className="text-xs tracking-widest text-center mb-4"
            style={{ color: 'var(--terminal-dim)' }}
          >
            [ TOP SIGNAL INTERCEPTS ]
          </div>

          <div className="space-y-2 text-center">
            <div style={{ color: 'var(--terminal-dim)' }}>
              <span className="mr-2">01</span>
              <span style={{ color: 'var(--terminal-tension)' }}>████████</span>
              <span className="ml-2">YOU?</span>
            </div>
            <div
              className="text-xs mt-4"
              style={{ color: 'var(--terminal-dim)' }}
            >
              No intercepts yet. Be the first.
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="font-mono"
    >
      <div
        className="border p-4"
        style={{ borderColor: 'var(--terminal-dim)' }}
      >
        {/* Header */}
        <div
          className="text-xs tracking-widest text-center mb-4"
          style={{ color: 'var(--terminal-dim)' }}
        >
          [ TOP SIGNAL INTERCEPTS ]
        </div>

        {/* Table */}
        <LeaderboardTable entries={data.entries} showScore={false} compact />

        {/* Footer */}
        {data.total_players > 5 && (
          <div
            className="text-xs text-center mt-4"
            style={{ color: 'var(--terminal-dim)' }}
          >
            +{data.total_players - 5} more operatives
          </div>
        )}
      </div>
    </motion.div>
  );
}
