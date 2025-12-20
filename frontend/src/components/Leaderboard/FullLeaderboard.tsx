'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  getFullLeaderboard,
  updateCallsign,
  FullLeaderboardResponse,
} from '@/lib/leaderboard';
import { useDeviceId } from '@/hooks/useDeviceId';
import { LeaderboardTable } from './LeaderboardTable';
import { CallsignModal } from './CallsignModal';

interface FullLeaderboardProps {
  onClose: () => void;
  gameMode?: 'dating' | 'paperclip';
}

export function FullLeaderboard({ onClose, gameMode }: FullLeaderboardProps) {
  const { deviceId } = useDeviceId();
  const [data, setData] = useState<FullLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentCallsign, setCurrentCallsign] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const result = await getFullLeaderboard(deviceId || undefined, 100, gameMode);
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
  }, [deviceId, gameMode]);

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
        // Refresh the leaderboard
        await fetchLeaderboard();
      }
    } catch (error) {
      console.error('Failed to update callsign:', error);
    }

    setShowEditModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ backgroundColor: 'var(--terminal-bg)' }}
    >
      <div className="min-h-screen p-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div
              className="font-mono text-sm tracking-wider"
              style={{ color: 'var(--terminal-dim)' }}
            >
              [ {gameMode === 'paperclip' ? 'ALIGNMENT TEST' : 'SOCIAL DYNAMICS'} RANKINGS ]
            </div>
            <button
              onClick={onClose}
              className="font-mono text-sm px-3 py-1 border hover:opacity-70 transition-opacity"
              style={{
                borderColor: 'var(--terminal-dim)',
                color: 'var(--terminal-dim)',
                backgroundColor: 'transparent',
              }}
            >
              [ CLOSE ]
            </button>
          </div>

          {/* Your Rank Banner */}
          {data?.your_rank && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 border text-center font-mono"
              style={{
                borderColor: 'var(--terminal-tension)',
                backgroundColor: 'rgba(255, 46, 99, 0.1)',
              }}
            >
              <span style={{ color: 'var(--terminal-dim)' }}>
                YOUR RANK:{' '}
              </span>
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
          <div
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
          </div>
        </div>
      </div>

      {/* Edit Callsign Modal */}
      <CallsignModal
        isOpen={showEditModal}
        onSubmit={handleEditSubmit}
        onClose={() => setShowEditModal(false)}
        mode="edit"
        currentCallsign={currentCallsign}
      />
    </motion.div>
  );
}
