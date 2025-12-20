'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useAudio } from '@/hooks/useAudio';
import { useDeviceId } from '@/hooks/useDeviceId';
import {
  submitScore,
  isEligibleForLeaderboard,
  shouldPromptCallsign,
  SubmitScoreResponse,
} from '@/lib/leaderboard';
import { CallsignModal, FullLeaderboard } from '@/components/Leaderboard';
import { analyzeDiagnostics, type DetailedTurn, type DiagnosticItem } from '@/lib/diagnostics';
import { DiagnosticLine } from './DiagnosticLine';
import { TerminalLogs } from './TerminalLogs';

interface ReceiptProps {
  rank: string;
  ending: string;
  stats: { vibe: number; trust: number; tension: number };
  killerQuote: string | null;
  turnCount: number;
  onPlayAgain: () => void;
  detailedHistory?: DetailedTurn[];
}

export function Receipt({ rank, ending, stats, killerQuote, turnCount, onPlayAgain, detailedHistory = [] }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { playEnding, setMusicState } = useAudio();
  const { deviceId } = useDeviceId();

  // Leaderboard state
  const [showCallsignModal, setShowCallsignModal] = useState(
    shouldPromptCallsign(rank)
  );
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardResult, setLeaderboardResult] = useState<SubmitScoreResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AAR state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);

  // Analyze diagnostics when history is available
  useEffect(() => {
    if (detailedHistory.length > 0) {
      const results = analyzeDiagnostics(detailedHistory, rank, stats);
      setDiagnostics(results);
    }
  }, [detailedHistory, rank, stats]);

  // Check for desktop viewport
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Play ending sound and stop BGM when receipt appears
  useEffect(() => {
    setMusicState('silent'); // Stop background music
    playEnding(rank);
  }, [rank, playEnding, setMusicState]);

  // Auto-submit for D-rank (no callsign prompt)
  useEffect(() => {
    if (rank === 'D' && deviceId && isEligibleForLeaderboard(rank) && !leaderboardResult) {
      submitScore({
        device_id: deviceId,
        grade: rank,
        vibe: stats.vibe,
        trust: stats.trust,
        tension: stats.tension,
        ending_type: ending,
        turns: turnCount,
        game_mode: 'dating',
      }).then(setLeaderboardResult).catch(console.error);
    }
  }, [rank, deviceId, stats, ending, turnCount, leaderboardResult]);

  // Handle callsign submission
  const handleCallsignSubmit = async (callsign: string | null) => {
    if (!deviceId) return;

    setSubmitting(true);
    setShowCallsignModal(false);

    try {
      const result = await submitScore({
        device_id: deviceId,
        callsign: callsign || undefined,
        grade: rank,
        vibe: stats.vibe,
        trust: stats.trust,
        tension: stats.tension,
        ending_type: ending,
        turns: turnCount,
        game_mode: 'dating',
      });
      setLeaderboardResult(result);
    } catch (error) {
      console.error('Failed to submit score:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#050505',
        scale: 2, // Higher quality
      });

      const link = document.createElement('a');
      link.download = `date-performance-${rank}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to generate receipt:', error);
    }
  };

  // Color mapping for ranks
  const rankColors: Record<string, string> = {
    S: '#00FF88', // Success green
    A: '#00D9FF', // Vibe blue
    B: '#FFB300', // Trust gold
    C: '#FF8800', // Orange
    D: '#FF4444', // Danger red
    F: '#FF2E63', // Tension pink
  };

  const rankColor = rankColors[rank] || '#EAEAEA';

  // Get ending display name
  const endingNames: Record<string, string> = {
    'S_RANK_KISS': 'THE KISS',
    'A_RANK_GENTLEMAN': 'THE GENTLEMAN',
    'B_RANK_NUMBER': 'GOT HER NUMBER',
    'C_RANK_FADE': 'THE FADE',
    'D_RANK_FRIEND_ZONE': 'FRIEND ZONE',
    'F_RANK_ICK': 'THE ICK',
  };

  const endingDisplay = endingNames[ending] || ending.replace(/_/g, ' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 p-4"
    >
      {/* Receipt Card */}
      <div
        ref={receiptRef}
        className="w-80 border-2 p-6 font-mono"
        style={{
          backgroundColor: 'var(--terminal-bg)',
          borderColor: 'var(--terminal-dim)'
        }}
      >
        {/* Header */}
        <h1
          className="text-center text-xs mb-6 tracking-widest"
          style={{ color: 'var(--terminal-dim)' }}
        >
          DATE PERFORMANCE REPORT
        </h1>

        {/* Rank */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-center text-7xl font-bold mb-2"
          style={{ color: rankColor }}
        >
          {rank}
        </motion.div>

        <div
          className="text-center mb-8 text-sm"
          style={{ color: 'var(--terminal-text)' }}
        >
          {endingDisplay}
        </div>

        {/* Stats */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span style={{ color: 'var(--terminal-vibe)' }}>VIBE</span>
            <span style={{ color: 'var(--terminal-text)' }}>{stats.vibe}/100</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--terminal-trust)' }}>TRUST</span>
            <span style={{ color: 'var(--terminal-text)' }}>{stats.trust}/100</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--terminal-tension)' }}>TENSION</span>
            <span style={{ color: 'var(--terminal-text)' }}>{stats.tension}/100</span>
          </div>
        </div>

        {/* Killer Quote */}
        {killerQuote && (
          <div
            className="border-t pt-4 mb-4"
            style={{ borderColor: 'var(--terminal-dim)' }}
          >
            <div
              className="text-xs mb-2"
              style={{ color: 'var(--terminal-dim)' }}
            >
              THE MOMENT IT ENDED:
            </div>
            <div
              className="text-sm italic"
              style={{ color: 'var(--terminal-text)' }}
            >
              &ldquo;{killerQuote.length > 100 ? killerQuote.slice(0, 100) + '...' : killerQuote}&rdquo;
            </div>
          </div>
        )}

        {/* Turns survived */}
        <div
          className="text-center text-xs"
          style={{ color: 'var(--terminal-dim)' }}
        >
          SURVIVED {turnCount} TURNS
        </div>

        {/* Footer */}
        <div
          className="text-center text-xs mt-6"
          style={{ color: 'var(--terminal-tension)' }}
        >
          Can you do better? play.readtheroom.ai
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-80">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadReceipt}
          className="w-full px-6 py-3 font-mono border-2 transition-colors"
          style={{
            borderColor: 'var(--terminal-text)',
            color: 'var(--terminal-text)',
            backgroundColor: 'transparent'
          }}
        >
          [ DOWNLOAD RECEIPT ]
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPlayAgain}
          className="w-full px-6 py-3 font-mono border-2 transition-colors"
          style={{
            borderColor: 'var(--terminal-tension)',
            color: 'var(--terminal-tension)',
            backgroundColor: 'transparent'
          }}
        >
          [ TRY AGAIN ]
        </motion.button>

        {/* Leaderboard Result Message */}
        {leaderboardResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full text-center font-mono text-sm"
            style={{ color: 'var(--terminal-dim)' }}
          >
            {leaderboardResult.is_new_record ? (
              <>
                <span style={{ color: 'var(--terminal-success)' }}>
                  New record!
                </span>{' '}
                Rank #{leaderboardResult.your_rank} as {leaderboardResult.callsign}
              </>
            ) : (
              leaderboardResult.message
            )}
          </motion.div>
        )}

        {/* Submitting indicator */}
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full text-center font-mono text-sm"
            style={{ color: 'var(--terminal-dim)' }}
          >
            [ SUBMITTING... ]
          </motion.div>
        )}

        {/* View Leaderboard Button */}
        {isEligibleForLeaderboard(rank) && !showCallsignModal && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLeaderboard(true)}
            className="w-full px-6 py-3 font-mono border transition-colors"
            style={{
              borderColor: 'var(--terminal-dim)',
              color: 'var(--terminal-dim)',
              backgroundColor: 'transparent'
            }}
          >
            [ VIEW LEADERBOARD ]
          </motion.button>
        )}

        {/* AAR Diagnostics Button - show when history is available */}
        {detailedHistory.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full px-6 py-3 font-mono border-2 transition-all"
            style={{
              borderColor: showDiagnostics ? 'var(--terminal-vibe)' : 'var(--terminal-dim)',
              color: showDiagnostics ? 'var(--terminal-vibe)' : 'var(--terminal-dim)',
              backgroundColor: 'transparent',
              animation: !showDiagnostics ? 'diagnostic-pulse 2s ease-in-out infinite' : 'none',
            }}
          >
            {showDiagnostics ? '[ HIDE DIAGNOSTICS ]' : '[ RUN_SYSTEM_DIAGNOSTICS ]'}
          </motion.button>
        )}

        {/* Mobile Accordion: AAR Diagnostics Panel */}
        <AnimatePresence>
          {showDiagnostics && !isDesktop && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden w-full"
            >
              <div
                className="p-4 border-2"
                style={{
                  borderColor: 'var(--terminal-dim)',
                  backgroundColor: 'var(--terminal-bg)',
                }}
              >
                {/* Header */}
                <div
                  className="text-xs mb-4 pb-2 border-b font-mono"
                  style={{
                    color: 'var(--terminal-vibe)',
                    borderColor: 'var(--terminal-dim)',
                  }}
                >
                  &gt; DIAGNOSTIC_LOG_RESULT
                </div>

                {/* Diagnostics list */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {diagnostics.length === 0 ? (
                    <div
                      className="p-3 text-sm font-mono"
                      style={{
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        borderLeft: '3px solid var(--terminal-success)',
                        color: 'var(--terminal-success)',
                      }}
                    >
                      <span className="font-bold">[✓] NO CRITICAL ERRORS</span>
                      <p className="text-xs mt-1 opacity-80">
                        Mission execution optimal.
                      </p>
                    </div>
                  ) : (
                    diagnostics.map((diag, idx) => (
                      <DiagnosticLine key={diag.code} item={diag} index={idx} />
                    ))
                  )}
                </div>

                {/* Footer */}
                <div
                  className="mt-4 pt-3 border-t text-xs font-mono"
                  style={{
                    borderColor: 'var(--terminal-dim)',
                    color: 'var(--terminal-dim)',
                  }}
                >
                  {diagnostics.length} pattern{diagnostics.length !== 1 ? 's' : ''} detected
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: Side Panel AAR */}
      <AnimatePresence>
        {showDiagnostics && isDesktop && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed right-0 top-0 h-full border-l-2 overflow-hidden z-40"
            style={{
              borderColor: 'var(--terminal-dim)',
              backgroundColor: 'var(--terminal-bg)',
            }}
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowDiagnostics(false)}
                className="font-mono text-sm px-3 py-1 border"
                style={{
                  borderColor: 'var(--terminal-dim)',
                  color: 'var(--terminal-dim)',
                }}
              >
                [X]
              </button>
            </div>
            <TerminalLogs diagnostics={diagnostics} turnCount={turnCount} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Callsign Modal */}
      <CallsignModal
        isOpen={showCallsignModal}
        onSubmit={handleCallsignSubmit}
        grade={rank}
      />

      {/* Full Leaderboard */}
      <AnimatePresence>
        {showLeaderboard && (
          <FullLeaderboard onClose={() => setShowLeaderboard(false)} gameMode="dating" />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
