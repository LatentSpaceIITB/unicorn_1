'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useDeviceId } from '@/hooks/useDeviceId';
import { joinRoom } from '@/lib/wingman';

export default function JoinRoomPage() {
  const router = useRouter();
  const { deviceId } = useDeviceId();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceId || code.length !== 4) return;

    setLoading(true);
    setError(null);

    try {
      const result = await joinRoom(code, deviceId);
      if (result.success) {
        // Store session_id for reference
        localStorage.setItem('wingman_session_id', result.session_id);
        localStorage.setItem('wingman_room_code', result.room_code);
        // Redirect to handler view
        router.push(`/wingman/play/handler/${result.room_code}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 4) {
      setCode(value);
      setError(null);
    }
  };

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
            [ JOIN ROOM ]
          </h1>
          <p
            className="font-mono text-xs"
            style={{ color: 'var(--terminal-dim)' }}
          >
            You are THE HANDLER
          </p>
        </motion.div>

        {/* Code Input Form */}
        <motion.form
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div
            className="p-6 border-2"
            style={{ borderColor: 'var(--terminal-trust)' }}
          >
            <div
              className="text-xs font-mono mb-4"
              style={{ color: 'var(--terminal-dim)' }}
            >
              ENTER ROOM CODE
            </div>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="____"
              autoFocus
              autoComplete="off"
              className="w-full text-center text-5xl font-mono font-bold tracking-[0.5em] bg-transparent border-none outline-none"
              style={{ color: 'var(--terminal-trust)' }}
            />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-sm"
              style={{ color: 'var(--terminal-tension)' }}
            >
              [ {error} ]
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={code.length !== 4 || loading || !deviceId}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 font-mono text-lg border-2 transition-opacity disabled:opacity-30"
            style={{
              borderColor: 'var(--terminal-trust)',
              color: 'var(--terminal-trust)',
              backgroundColor: 'transparent',
            }}
          >
            {loading ? '[ CONNECTING... ]' : '[ JOIN MISSION ]'}
          </motion.button>
        </motion.form>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 font-mono text-xs"
          style={{ color: 'var(--terminal-dim)' }}
        >
          Get the 4-letter code from your friend.
          <br />
          They are the Dater, you are the Handler.
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Link
            href="/wingman"
            className="font-mono text-xs px-4 py-2 border hover:opacity-70 transition-opacity inline-block"
            style={{
              borderColor: 'var(--terminal-dim)',
              color: 'var(--terminal-dim)',
            }}
          >
            [ BACK ]
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
