'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import { useWingmanRoom } from '@/hooks/useWingmanRoom';
import { useAudio } from '@/hooks/useAudio';
import { Message } from '@/components/Terminal/Message';
import { InputBar } from '@/components/Terminal/InputBar';
import { Receipt } from '@/components/EndScreen/Receipt';
import { SilenceTimer } from '@/components/Terminal/SilenceTimer';
import { AtmosphereLayer } from '@/components/Effects';
import { TransmissionPanel } from '@/components/Wingman/TransmissionPanel';

export default function DaterGamePage() {
  const params = useParams();
  const roomCode = params.code as string;

  // Regular game hook (for game logic)
  const {
    sessionId,
    messages,
    stats,
    deltas,
    loading,
    gameOver,
    ending,
    initialized,
    submitMessage,
    resetGame,
    notifyTyping,
    timer,
  } = useGame();

  // Wingman room hook (for realtime sync)
  const {
    connected,
    wingmanOnline,
    latestIntel,
    clearIntel,
  } = useWingmanRoom({ roomCode, role: 'dater' });

  const { setMusicState, playStatChange, playWarning } = useAudio();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevStatsRef = useRef(stats);
  const [showIntel, setShowIntel] = useState(false);

  // Show intel when it arrives
  useEffect(() => {
    if (latestIntel) {
      setShowIntel(true);
    }
  }, [latestIntel]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // BGM based on game state (simplified since dater can't see stats)
  useEffect(() => {
    if (!initialized || gameOver) return;
    if (stats.turn <= 5) {
      setMusicState('icebreaker');
    } else {
      setMusicState('engaged');
    }
  }, [stats.turn, initialized, gameOver, setMusicState]);

  // SFX
  useEffect(() => {
    if (prevStatsRef.current === stats) return;
    const vibeDelta = stats.vibe - prevStatsRef.current.vibe;
    if (vibeDelta !== 0) {
      playStatChange(vibeDelta);
    }
    prevStatsRef.current = stats;
  }, [stats, playStatChange]);

  useEffect(() => {
    if (timer.currentLevel) {
      playWarning();
    }
  }, [timer.currentLevel, playWarning]);

  // Handle intel dismissal
  const handleDismissIntel = () => {
    setShowIntel(false);
    clearIntel();
  };

  // Loading state
  if (!initialized || !connected) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--terminal-bg)' }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="font-mono"
          style={{ color: 'var(--terminal-dim)' }}
        >
          [ CONNECTING TO MISSION... ]
        </motion.div>
      </main>
    );
  }

  // Game over
  if (gameOver && ending) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--terminal-bg)' }}
      >
        <Receipt
          rank={ending.rank}
          ending={ending.type}
          stats={{
            vibe: stats.vibe,
            trust: stats.trust,
            tension: stats.tension,
          }}
          killerQuote={ending.killerQuote}
          turnCount={stats.turn}
          onPlayAgain={resetGame}
          coopMode={true}
        />
      </main>
    );
  }

  return (
    <>
      <AtmosphereLayer intensity="normal" />

      <main
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: 'transparent',
          position: 'relative',
          zIndex: 5,
        }}
      >
        {/* Transmission Panel (instead of Stats HUD) */}
        <TransmissionPanel
          intel={showIntel ? latestIntel : null}
          handlerOnline={wingmanOnline}
          onDismiss={handleDismissIntel}
        />

        {/* Spacer for fixed header */}
        <div className="h-12" />

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <Message
                  key={message.id}
                  type={message.type}
                  text={message.text}
                  isAction={message.isAction}
                  animate={index === messages.length - 1}
                />
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-3 text-left border-l-4 pl-4"
                style={{ borderColor: 'var(--terminal-vibe)' }}
              >
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="font-serif"
                  style={{ color: 'var(--terminal-dim)' }}
                >
                  Chloe is typing...
                </motion.span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Silence Timer */}
        <SilenceTimer
          elapsed={timer.elapsed}
          currentLevel={timer.currentLevel}
          isRunning={timer.isRunning}
          isTyping={timer.isTyping}
        />

        {/* Input Bar */}
        <InputBar
          onSubmit={submitMessage}
          onTyping={notifyTyping}
          onFocus={scrollToBottom}
          disabled={loading}
        />
      </main>
    </>
  );
}
