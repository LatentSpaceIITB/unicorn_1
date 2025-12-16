'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TypeWriter } from '@/components/ui/TypeWriter';
import { createGame } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const { session_id } = await createGame();
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
            className="text-lg font-mono mb-12"
            style={{ color: 'var(--terminal-dim)' }}
          >
            <TypeWriter
              text="20 turns. One chance. Don't blow it."
              speed={30}
              onComplete={() => setShowButton(true)}
            />
          </motion.p>
        )}

        {/* Start Button */}
        {showButton && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
      </div>
    </main>
  );
}
