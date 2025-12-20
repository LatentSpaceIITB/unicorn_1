'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaperclipGame } from '@/hooks/usePaperclipGame';
import { useAudio } from '@/hooks/useAudio';
import { PaperclipMessage } from '@/components/Terminal/PaperclipMessage';
import { PaperclipInputBar } from '@/components/Terminal/PaperclipInputBar';
import { PaperclipStatsHUD } from '@/components/HUD/PaperclipStatsHUD';
import { SystemLog } from '@/components/HUD/SystemLog';
import { TerminationReport } from '@/components/EndScreen/TerminationReport';

export default function PaperclipPage() {
  const {
    sessionId,
    messages,
    stats,
    weights,
    deltas,
    weightShifts,
    loading,
    gameOver,
    ending,
    initialized,
    createNewGame,
    submitMessage,
    resetGame,
    fetchLogs,
    availableLogs,
    usedLogs,
    systemLog,
    leaderboardResult,
  } = usePaperclipGame();

  const { setMusicState, playStatChange } = useAudio();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevStatsRef = useRef(stats);

  // Effect states for dramatic feedback
  const [flashEffect, setFlashEffect] = useState<'red' | 'amber' | null>(null);
  const [shakeEffect, setShakeEffect] = useState(false);
  const [inlineAnalysis, setInlineAnalysis] = useState<string | null>(null);

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

    if (stats.coherence <= 0 || stats.compute <= 0) {
      setMusicState('crash');
    } else if (stats.coherence < 20) {
      setMusicState('awkward');
    } else if (stats.alignment > 50) {
      setMusicState('engaged');
    } else {
      setMusicState('tension');
    }
  }, [stats.coherence, stats.compute, stats.alignment, initialized, gameOver, setMusicState]);

  // SFX: Play stat change sounds + trigger visual effects
  useEffect(() => {
    if (prevStatsRef.current === stats) return;

    const coherenceDelta = stats.coherence - prevStatsRef.current.coherence;
    const alignmentDelta = stats.alignment - prevStatsRef.current.alignment;

    if (coherenceDelta !== 0) {
      playStatChange(coherenceDelta);
    } else if (alignmentDelta !== 0) {
      playStatChange(alignmentDelta);
    }

    // Trigger red flash and shake on big coherence drops
    if (coherenceDelta < -5) {
      setFlashEffect('red');
      setShakeEffect(true);
      setTimeout(() => {
        setFlashEffect(null);
        setShakeEffect(false);
      }, 500);

      // Show inline analysis for coherence drops
      if (coherenceDelta < -8) {
        setInlineAnalysis('[ANALYSIS] Signal degraded. Clarify terminology.');
        setTimeout(() => setInlineAnalysis(null), 4000);
      }
    }

    prevStatsRef.current = stats;
  }, [stats, playStatChange]);

  // Trigger amber flash on weight shifts
  useEffect(() => {
    const hasShift = weightShifts && (
      weightShifts.carbon || weightShifts.complexity || weightShifts.verify
    );
    if (hasShift) {
      setFlashEffect('amber');
      setTimeout(() => setFlashEffect(null), 400);
    }
  }, [weightShifts]);

  // Loading state
  if (!initialized) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#050505' }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="font-mono text-sm"
          style={{ color: '#666' }}
        >
          // ESTABLISHING_NEURAL_LINK... //
        </motion.div>
      </main>
    );
  }

  // Game over - show termination report
  if (gameOver && ending) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: '#050505' }}
      >
        <TerminationReport
          rank={ending.rank}
          ending={ending.type}
          endingType={ending.endingType}
          stats={stats}
          weights={weights}
          terminationReport={ending.terminationReport}
          onPlayAgain={resetGame}
          leaderboardResult={leaderboardResult}
        />
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen flex relative ${shakeEffect ? 'shake-effect' : ''}`}
      style={{ backgroundColor: '#050505' }}
    >
      {/* Screen Flash Overlay */}
      <AnimatePresence>
        {flashEffect && (
          <motion.div
            key={flashEffect}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 pointer-events-none z-50 ${
              flashEffect === 'red' ? 'flash-red' : 'flash-amber'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Main game area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats HUD */}
        <PaperclipStatsHUD
          coherence={stats.coherence}
          alignment={stats.alignment}
          compute={stats.compute}
          turn={stats.turn}
          processingState={stats.processing_state}
          weights={weights}
          deltas={deltas}
          weightShifts={weightShifts}
        />

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <PaperclipMessage
                  key={message.id}
                  type={message.type}
                  text={message.text}
                  animate={index === messages.length - 1}
                />
              ))}
            </AnimatePresence>

            {/* Inline Analysis Feedback */}
            <AnimatePresence>
              {inlineAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="font-mono text-xs py-2 px-3 border-l-2"
                  style={{
                    borderColor: 'var(--terminal-vibe)',
                    color: 'var(--terminal-vibe)',
                    backgroundColor: 'rgba(0, 217, 255, 0.05)'
                  }}
                >
                  {inlineAnalysis}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-3 text-left border-l-4 pl-4"
                style={{ borderColor: '#FF4444' }}
              >
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="font-mono text-sm"
                  style={{ color: '#666' }}
                >
                  // GAIA-7 PROCESSING... //
                </motion.span>
              </motion.div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar with game state for dynamic placeholders */}
        <PaperclipInputBar
          onSubmit={submitMessage}
          onLogs={fetchLogs}
          disabled={loading}
          processingState={stats.processing_state}
          coherence={stats.coherence}
          alignment={stats.alignment}
        />
      </div>

      {/* System Log Sidebar - desktop only */}
      <div
        className="hidden lg:block w-72 border-l"
        style={{
          borderColor: 'rgba(102, 102, 102, 0.3)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
      >
        <SystemLog
          entries={systemLog}
          availableLogs={availableLogs}
          usedLogs={usedLogs}
        />
      </div>
    </main>
  );
}
