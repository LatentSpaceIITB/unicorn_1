'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  getFullLeaderboard,
  updateCallsign,
  FullLeaderboardResponse,
} from '@/lib/leaderboard';
import { useDeviceId } from '@/hooks/useDeviceId';
import { LeaderboardTable } from '@/components/Leaderboard/LeaderboardTable';
import { CallsignModal } from '@/components/Leaderboard/CallsignModal';

export default function LeaderboardPage() {
  const { deviceId } = useDeviceId();
  const [data, setData] = useState<FullLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentCallsign, setCurrentCallsign] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const result = deviceId
        ? await getFullLeaderboard(deviceId)
        : await getFullLeaderboard();
      setData(result);

      // Find current user's callsign
      const userEntry = result.entries.find((e) => e.is_you);
      if (userEntry) {
        setCurrentCallsign(userEntry.callsign);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [deviceId]);

  const handleEditCallsign = () => {
    setShowEditModal(true);
  };

  const handleEditSubmit = async (newCallsign: string | null) => {
    if (!newCallsign || !deviceId) {
      setShowEditModal(false);
      return;
    }

    try {
      const result = await updateCallsign({
        device_id: deviceId,
        new_callsign: newCallsign,
      });

      if (result.success) {
        await fetchLeaderboard();
      }
    } catch (error) {
      console.error('Failed to update callsign:', error);
    }

    setShowEditModal(false);
  };

  return (
    <main
      className="min-h-screen p-4"
      style={{ backgroundColor: 'var(--terminal-bg)' }}
    >
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div
            className="font-mono text-sm tracking-wider"
            style={{ color: 'var(--terminal-dim)' }}
          >
            [ FULL SIGNAL INTERCEPT LOG ]
          </div>
          <Link
            href="/"
            className="font-mono text-sm px-3 py-1 border hover:opacity-70 transition-opacity"
            style={{
              borderColor: 'var(--terminal-dim)',
              color: 'var(--terminal-dim)',
              backgroundColor: 'transparent',
            }}
          >
            [ BACK TO BASE ]
          </Link>
        </motion.div>

        {/* Your Rank Banner */}
        {data?.your_rank && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-3 border text-center font-mono"
            style={{
              borderColor: 'var(--terminal-tension)',
              backgroundColor: 'rgba(255, 46, 99, 0.1)',
            }}
          >
            <span style={{ color: 'var(--terminal-dim)' }}>YOUR RANK: </span>
            <span
              className="text-xl font-bold"
              style={{ color: 'var(--terminal-tension)' }}
            >
              #{data.your_rank}
            </span>
            <span style={{ color: 'var(--terminal-dim)' }}>
              {' '}
              of {data.total_count}
            </span>
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border p-4"
          style={{ borderColor: 'var(--terminal-dim)' }}
        >
          {loading ? (
            <div
              className="font-mono text-center py-8"
              style={{ color: 'var(--terminal-dim)' }}
            >
              [ DECRYPTING SIGNALS... ]
            </div>
          ) : data ? (
            <LeaderboardTable
              entries={data.entries}
              showScore
              onEditCallsign={handleEditCallsign}
            />
          ) : (
            <div
              className="font-mono text-center py-8"
              style={{ color: 'var(--terminal-tension)' }}
            >
              [ SIGNAL INTERFERENCE - RETRY LATER ]
            </div>
          )}
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Link
            href="/"
            className="inline-block font-mono text-sm px-6 py-2 border-2 hover:opacity-80 transition-opacity"
            style={{
              borderColor: 'var(--terminal-tension)',
              color: 'var(--terminal-tension)',
              backgroundColor: 'transparent',
            }}
          >
            [ PLAY NOW ]
          </Link>
        </motion.div>
      </div>

      {/* Edit Callsign Modal */}
      <CallsignModal
        isOpen={showEditModal}
        onSubmit={handleEditSubmit}
        onClose={() => setShowEditModal(false)}
        mode="edit"
        currentCallsign={currentCallsign}
      />
    </main>
  );
}
