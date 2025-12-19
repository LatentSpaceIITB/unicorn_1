'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TypeWriter } from '@/components/ui/TypeWriter';
import { createGame } from '@/lib/api';
import { TopOperatives } from '@/components/Leaderboard';
import { useDeviceId } from '@/hooks/useDeviceId';

export default function LandingPage() {
  const router = useRouter();
  const { deviceId } = useDeviceId();
  const [loading, setLoading] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const { session_id } = await createGame(deviceId || undefined);
      localStorage.setItem('session_id', session_id);
      router.push('/game');
    } catch (error) {
      console.error('Failed to create game:', error);
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'var(--terminal-bg)' }}
    >
      <div className="max-w-md text-center">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl md:text-4xl font-mono mb-6"
          style={{ color: 'var(--terminal-text)' }}
        >
          <TypeWriter
            text="Can you get her to kiss you?"
            speed={40}
            onComplete={() => setShowSubtitle(true)}
          />
        </motion.h1>

        {/* Subtitle */}
        {showSubtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-mono mb-8"
            style={{ color: 'var(--terminal-dim)' }}
          >
            <TypeWriter
              text="20 turns. One chance. Don't blow it."
              speed={30}
              onComplete={() => setShowButton(true)}
            />
          </motion.p>
        )}

        {/* Marketing Copy */}
        {showButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 font-mono text-sm space-y-1"
            style={{ color: 'var(--terminal-dim)' }}
          >
            <p>Practice before your actual date</p>
            <p>Share on Bumble to flex your skills</p>
            <p style={{ color: 'var(--terminal-trust)' }}>Get a certificate to prove it</p>
          </motion.div>
        )}

        {/* Start Button */}
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              disabled={loading}
              className="px-8 py-4 font-mono text-lg border-2 transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--terminal-tension)',
                color: 'var(--terminal-tension)',
                backgroundColor: 'transparent'
              }}
            >
              {loading ? '[ INITIALIZING... ]' : '[ START ENCOUNTER ]'}
            </motion.button>

            <Link
              href="/wingman"
              className="px-8 py-3 font-mono text-sm border-2 transition-opacity hover:opacity-80 text-center"
              style={{
                borderColor: 'var(--terminal-trust)',
                color: 'var(--terminal-trust)',
                backgroundColor: 'rgba(0, 255, 157, 0.1)'
              }}
            >
              [ CO-OP MODE ] Play with a friend
            </Link>
          </motion.div>
        )}

        {/* Stat Preview */}
        {showButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex justify-center gap-8 font-mono text-sm"
          >
            <span style={{ color: 'var(--terminal-vibe)' }}>VIBE</span>
            <span style={{ color: 'var(--terminal-trust)' }}>TRUST</span>
            <span style={{ color: 'var(--terminal-tension)' }}>TENSION</span>
          </motion.div>
        )}

        {/* Footer hint */}
        {showButton && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="mt-8 font-mono text-xs"
            style={{ color: 'var(--terminal-dim)' }}
          >
            Toggle between SAY and ACT modes to navigate your date
          </motion.p>
        )}

        {/* Top Operatives Leaderboard */}
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="mt-12 w-full max-w-sm"
          >
            <TopOperatives />
          </motion.div>
        )}

        {/* View Full Leaderboard Button */}
        {showButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="mt-6"
          >
            <Link
              href="/leaderboard"
              className="font-mono text-xs px-4 py-2 border hover:opacity-70 transition-opacity inline-block"
              style={{
                borderColor: 'var(--terminal-dim)',
                color: 'var(--terminal-dim)',
                backgroundColor: 'transparent',
              }}
            >
              [ VIEW FULL LOG ]
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
