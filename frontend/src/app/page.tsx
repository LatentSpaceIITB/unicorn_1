'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveActivityFeed } from '@/components/LiveActivityFeed';
import { TypeWriter } from '@/components/ui/TypeWriter';

export default function LandingPage() {
  const router = useRouter();
  const [bootComplete, setBootComplete] = useState(false);
  const [bootText, setBootText] = useState('');

  // Boot sequence text
  const bootSequence = [
    '// NEURAL_LINK_V4.2 [CONNECTED]',
    '// USER: OPERATIVE_01',
    '// INITIALIZING SIMULATION PROTOCOLS...',
    '// SYSTEMS ONLINE',
  ];

  // Animate boot sequence
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < bootSequence.length) {
        setBootText(prev => prev + (prev ? '\n' : '') + bootSequence[index]);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBootComplete(true), 500);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const handleDatingClick = () => {
    router.push('/game/briefing');
  };

  const handlePaperclipClick = () => {
    router.push('/paperclip/briefing');
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: '#050505' }}
    >
      <div className="w-full max-w-2xl font-mono">
        {/* Boot Sequence */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <pre
            className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: '#666' }}
          >
            {bootText}
          </pre>
        </motion.div>

        {/* Main Terminal Box */}
        <AnimatePresence>
          {bootComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 p-6 sm:p-8"
              style={{
                borderColor: '#333',
                backgroundColor: 'rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-xs tracking-widest mb-2" style={{ color: '#444' }}>
                  {'='.repeat(50)}
                </div>
                <h1
                  className="text-lg sm:text-xl tracking-widest"
                  style={{ color: '#888' }}
                >
                  SELECT SIMULATION PROTOCOL
                </h1>
                <div className="text-xs tracking-widest mt-2" style={{ color: '#444' }}>
                  {'='.repeat(50)}
                </div>
              </div>

              {/* Game Options */}
              <div className="space-y-6 mb-8">
                {/* Dating Sim Option */}
                <motion.button
                  onClick={handleDatingClick}
                  className="w-full text-left p-4 border-2 transition-all"
                  style={{
                    borderColor: '#333',
                    backgroundColor: 'transparent'
                  }}
                  whileHover={{
                    borderColor: '#00D9FF',
                    backgroundColor: 'rgba(0, 217, 255, 0.05)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-xl" style={{ color: '#00D9FF' }}>[1]</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: '#E0E0E0' }}>SOCIAL_DYNAMICS.exe</span>
                        <span className="text-xs px-2 py-0.5" style={{ backgroundColor: '#00FF88', color: '#000' }}>
                          ONLINE
                        </span>
                      </div>
                      <div className="text-sm mb-2" style={{ color: '#00D9FF' }}>
                        Read the Room
                      </div>
                      <div className="text-xs space-y-1" style={{ color: '#666' }}>
                        <p>&gt; Objective: Achieve S-Rank Romantic Connection</p>
                        <p>&gt; Difficulty: HARD</p>
                        <p style={{ color: '#888' }}>
                        &gt; <TypeWriter text="Can you get her to kiss you?" speed={30} delay={800} />
                      </p>
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* Paperclip Option */}
                <motion.button
                  onClick={handlePaperclipClick}
                  className="w-full text-left p-4 border-2 transition-all"
                  style={{
                    borderColor: '#333',
                    backgroundColor: 'transparent'
                  }}
                  whileHover={{
                    borderColor: '#00FFAA',
                    backgroundColor: 'rgba(0, 255, 170, 0.05)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-xl" style={{ color: '#00FFAA' }}>[2]</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: '#E0E0E0' }}>ALIGNMENT_TEST.exe</span>
                        <span className="text-xs px-2 py-0.5" style={{ backgroundColor: '#FFAA00', color: '#000' }}>
                          UNSTABLE
                        </span>
                      </div>
                      <div className="text-sm mb-2" style={{ color: '#00FFAA' }}>
                        The Paperclip Protocol
                      </div>
                      <div className="text-xs space-y-1" style={{ color: '#666' }}>
                        <p>&gt; Objective: Prevent GAIA-7 Purge Event</p>
                        <p>&gt; Difficulty: EXTREME</p>
                        <p style={{ color: '#888' }}>
                        &gt; <TypeWriter text="Can you convince an AI not to destroy humanity?" speed={30} delay={800} />
                      </p>
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Prompt */}
              <div className="text-sm" style={{ color: '#666' }}>
                <span style={{ color: '#00FF88' }}>root@home:~$</span>
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{ color: '#E0E0E0' }}
                >
                  _
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Activity Feed */}
        {bootComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 border"
            style={{
              borderColor: '#222',
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs" style={{ color: '#666' }}>//</span>
              <span className="text-xs tracking-widest" style={{ color: '#444' }}>
                LIVE_ACTIVITY_FEED
              </span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-xs"
                style={{ color: '#00FF88' }}
              >
                [STREAMING]
              </motion.span>
            </div>
            <LiveActivityFeed maxItems={5} pollInterval={8000} />
          </motion.div>
        )}

        {/* Footer */}
        {bootComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center text-xs"
            style={{ color: '#444' }}
          >
            <p>readtheroom.ai</p>
            <p className="mt-1">Social Simulation Training System v4.2</p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
