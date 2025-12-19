'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useDeviceId } from '@/hooks/useDeviceId';
import { createGame } from '@/lib/api';
import { createRoom, getRoomState } from '@/lib/wingman';

export default function CreateRoomPage() {
  const router = useRouter();
  const { deviceId } = useDeviceId();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wingmanJoined, setWingmanJoined] = useState(false);

  // Create room on mount
  useEffect(() => {
    if (!deviceId || roomCode) return;

    const initRoom = async () => {
      setLoading(true);
      setError(null);

      try {
        // First create a game session
        const game = await createGame(deviceId);
        localStorage.setItem('session_id', game.session_id);

        // Then create a wingman room
        const room = await createRoom(deviceId, game.session_id);
        setRoomCode(room.room_code);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create room');
      } finally {
        setLoading(false);
      }
    };

    initRoom();
  }, [deviceId, roomCode]);

  // Poll for wingman joining
  useEffect(() => {
    if (!roomCode || wingmanJoined) return;

    const interval = setInterval(async () => {
      try {
        const state = await getRoomState(roomCode);
        if (state.wingman_device_id) {
          setWingmanJoined(true);
          clearInterval(interval);
          // Redirect to game after short delay
          setTimeout(() => {
            router.push(`/wingman/play/dater/${roomCode}`);
          }, 1500);
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomCode, wingmanJoined, router]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'var(--terminal-bg)' }}
    >
      <div className="max-w-md w-full text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1
            className="text-xl font-mono mb-2"
            style={{ color: 'var(--terminal-text)' }}
          >
            [ CREATING ROOM ]
          </h1>
          <p
            className="font-mono text-xs"
            style={{ color: 'var(--terminal-dim)' }}
          >
            You are THE DATER
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono"
            style={{ color: 'var(--terminal-dim)' }}
          >
            [ INITIALIZING SECURE CHANNEL... ]
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono mb-4"
            style={{ color: 'var(--terminal-tension)' }}
          >
            [ ERROR: {error} ]
          </motion.div>
        )}

        {/* Room Code Display */}
        {roomCode && !wingmanJoined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div
              className="p-6 border-2"
              style={{ borderColor: 'var(--terminal-tension)' }}
            >
              <div
                className="text-xs font-mono mb-2"
                style={{ color: 'var(--terminal-dim)' }}
              >
                ROOM CODE
              </div>
              <div
                className="text-5xl font-mono font-bold tracking-widest"
                style={{ color: 'var(--terminal-tension)' }}
              >
                {roomCode}
              </div>
            </div>

            <div
              className="font-mono text-sm animate-pulse"
              style={{ color: 'var(--terminal-dim)' }}
            >
              [ WAITING FOR HANDLER... ]
            </div>

            <div
              className="font-mono text-xs"
              style={{ color: 'var(--terminal-dim)' }}
            >
              Share this code with your wingman.
              <br />
              They should go to [ JOIN ROOM ] and enter it.
            </div>
          </motion.div>
        )}

        {/* Wingman Joined */}
        {wingmanJoined && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div
              className="text-2xl font-mono"
              style={{ color: 'var(--terminal-trust)' }}
            >
              [ HANDLER CONNECTED ]
            </div>
            <div
              className="font-mono text-sm animate-pulse"
              style={{ color: 'var(--terminal-dim)' }}
            >
              Starting mission...
            </div>
          </motion.div>
        )}

        {/* Back Button */}
        {!wingmanJoined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <Link
              href="/wingman"
              className="font-mono text-xs px-4 py-2 border hover:opacity-70 transition-opacity inline-block"
              style={{
                borderColor: 'var(--terminal-dim)',
                color: 'var(--terminal-dim)',
              }}
            >
              [ CANCEL ]
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
