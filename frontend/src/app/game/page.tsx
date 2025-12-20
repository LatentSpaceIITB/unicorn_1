'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import { useAudio } from '@/hooks/useAudio';
import { Message } from '@/components/Terminal/Message';
import { InputBar } from '@/components/Terminal/InputBar';
import { StatsHUD } from '@/components/HUD/StatBar';
import { Receipt } from '@/components/EndScreen/Receipt';
import { SilenceTimer } from '@/components/Terminal/SilenceTimer';
import { AtmosphereLayer } from '@/components/Effects';

export default function GamePage() {
  const {
    sessionId,
    messages,
    stats,
    deltas,
    loading,
    gameOver,
    ending,
    initialized,
    createNewGame,
    submitMessage,
    resetGame,
    notifyTyping,
    timer,
    detailedHistory,
  } = useGame();

  const { setMusicState, playStatChange, playTensionPing, playWarning } = useAudio();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevStatsRef = useRef(stats);

  // Scroll to bottom - used for new messages and input focus (mobile keyboard)
  const scrollToBottom = useCallback(() => {
    // Small delay to let mobile keyboard animation start
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create new game if no session exists
  useEffect(() => {
    if (initialized && !sessionId && !gameOver) {
      createNewGame();
    }
  }, [initialized, sessionId, gameOver, createNewGame]);

  // BGM: Set music state based on game stats
  useEffect(() => {
    if (!initialized || gameOver) return;

    if (stats.vibe <= 0) {
      setMusicState('crash');
    } else if (stats.vibe < 20) {
      setMusicState('awkward');
    } else if (stats.tension > 60) {
      setMusicState('tension');
    } else if (stats.turn <= 5) {
      setMusicState('icebreaker');
    } else {
      setMusicState('engaged');
    }
  }, [stats.vibe, stats.tension, stats.turn, initialized, gameOver, setMusicState]);

  // SFX: Play stat change sounds
  useEffect(() => {
    // Skip initial render
    if (prevStatsRef.current === stats) return;

    // Calculate actual deltas
    const vibeDelta = stats.vibe - prevStatsRef.current.vibe;
    const trustDelta = stats.trust - prevStatsRef.current.trust;

    // Play sounds based on changes
    if (vibeDelta !== 0) {
      playStatChange(vibeDelta);
    } else if (trustDelta !== 0) {
      playStatChange(trustDelta);
    }

    // Play tension ping when crossing threshold
    if (stats.tension >= 60 && prevStatsRef.current.tension < 60) {
      playTensionPing();
    }

    prevStatsRef.current = stats;
  }, [stats, playStatChange, playTensionPing]);

  // SFX: Play warning sound on silence threshold
  useEffect(() => {
    if (timer.currentLevel) {
      playWarning();
    }
  }, [timer.currentLevel, playWarning]);

  // Loading state
  if (!initialized) {
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
          [ INITIALIZING... ]
        </motion.div>
      </main>
    );
  }

  // Game over - show receipt
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
          detailedHistory={detailedHistory}
        />
      </main>
    );
  }

  return (
    <>
      {/* Visual Effects Layer */}
      <AtmosphereLayer intensity="normal" />

      <main
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: 'transparent',  // Let particles show through
          position: 'relative',
          zIndex: 5,  // Above atmosphere layers (z-0 to z-3)
        }}
      >
        {/* Stats HUD */}
        <StatsHUD
        vibe={stats.vibe}
        trust={stats.trust}
        tension={stats.tension}
        turn={stats.turn}
        act={stats.act}
        deltas={deltas}
      />

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

          {/* Scroll anchor */}
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
      <InputBar onSubmit={submitMessage} onTyping={notifyTyping} onFocus={scrollToBottom} disabled={loading} />
    </main>
    </>
  );
}
