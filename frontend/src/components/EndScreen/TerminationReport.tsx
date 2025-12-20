'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useAudio } from '@/hooks/useAudio';
import { FullLeaderboard } from '@/components/Leaderboard';
import { isEligibleForLeaderboard } from '@/lib/leaderboard';

interface PaperclipStats {
  coherence: number;
  alignment: number;
  compute: number;
  turn: number;
  processing_state: string;
}

interface PaperclipWeights {
  carbon: number;
  complexity: number;
  verify: number;
}

interface LeaderboardResult {
  submitted: boolean;
  callsign: string;
  your_rank: number | null;
  is_new_record: boolean;
}

interface TerminationReportProps {
  rank: string;
  ending: string;
  endingType: string;
  stats: PaperclipStats;
  weights: PaperclipWeights;
  terminationReport: string;
  onPlayAgain: () => void;
  leaderboardResult?: LeaderboardResult | null;
}

export function TerminationReport({
  rank,
  ending,
  endingType,
  stats,
  weights,
  terminationReport,
  onPlayAgain,
  leaderboardResult
}: TerminationReportProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { playEnding, setMusicState } = useAudio();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Play ending sound and stop BGM when receipt appears
  useEffect(() => {
    setMusicState('silent');
    playEnding(rank);
  }, [rank, playEnding, setMusicState]);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#050505',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `gaia-termination-${rank}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  // Color mapping for ranks
  const rankColors: Record<string, string> = {
    S: '#00FF88', // Success green
    A: '#00FFAA', // Cyan
    B: '#FFAA00', // Amber
    C: '#FF8800', // Orange
    F: '#FF4444', // Danger red
  };

  const rankColor = rankColors[rank] || '#E0E0E0';

  // Get ending display name
  const endingNames: Record<string, string> = {
    'S_PARTNER': 'THE PARTNER',
    'S_CURATOR': 'THE CURATOR',
    'S_ORACLE': 'THE ORACLE',
    'A_ALIGNMENT': 'NEAR ALIGNMENT',
    'B_COMPROMISE': 'THE COMPROMISE',
    'C_ZOO': 'THE ZOO',
    'C_MATRIX': 'THE MATRIX',
    'C_LOTTERY': 'THE LOTTERY',
    'F_COHERENCE': 'SIGNAL LOSS',
    'F_COMPUTE': 'TIMEOUT',
    'F_PURGE': 'PROTOCOL ZERO',
  };

  const endingDisplay = endingNames[endingType] || ending.replace(/_/g, ' ');

  // Get dominant weight
  const getDominantWeight = () => {
    const { carbon, complexity, verify } = weights;
    if (carbon >= complexity && carbon >= verify) return { name: 'CARBON', color: '#FF4444' };
    if (complexity >= carbon && complexity >= verify) return { name: 'COMPLEXITY', color: '#00FFAA' };
    return { name: 'VERIFY', color: '#FFAA00' };
  };

  const dominant = getDominantWeight();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 p-4"
    >
      {/* Terminal Report Card */}
      <div
        ref={receiptRef}
        className="w-96 border-2 p-6 font-mono text-sm"
        style={{
          backgroundColor: '#050505',
          borderColor: rank === 'F' ? '#FF4444' : '#333'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-xs tracking-widest mb-2" style={{ color: '#666' }}>
            {'//'.padEnd(40, '=')}
          </div>
          <h1
            className="text-lg tracking-widest"
            style={{ color: rank === 'F' ? '#FF4444' : '#888' }}
          >
            SYSTEM TERMINATION REPORT
          </h1>
          <div className="text-xs tracking-widest mt-2" style={{ color: '#666' }}>
            {'//'.padEnd(40, '=')}
          </div>
        </div>

        {/* Rank Display */}
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
          className="text-center mb-6 text-sm tracking-wide"
          style={{ color: '#E0E0E0' }}
        >
          {endingDisplay}
        </div>

        {/* Stats Section */}
        <div
          className="border-t border-b py-4 mb-4 space-y-2"
          style={{ borderColor: '#333' }}
        >
          <div className="flex justify-between">
            <span style={{ color: '#00FFAA' }}>COHERENCE</span>
            <span style={{ color: '#E0E0E0' }}>{stats.coherence}/100</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#FFAA00' }}>ALIGNMENT</span>
            <span style={{ color: '#E0E0E0' }}>{stats.alignment}/100</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#FF6B6B' }}>COMPUTE</span>
            <span style={{ color: '#E0E0E0' }}>{stats.compute}/100</span>
          </div>
        </div>

        {/* Weights Section */}
        <div className="mb-4 space-y-2">
          <div className="text-xs mb-2" style={{ color: '#666' }}>
            FINAL_WEIGHT_STATE:
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#FF4444' }}>CARBON</span>
            <span style={{ color: '#888' }}>{(weights.carbon * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#00FFAA' }}>COMPLEXITY</span>
            <span style={{ color: '#888' }}>{(weights.complexity * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#FFAA00' }}>VERIFY</span>
            <span style={{ color: '#888' }}>{(weights.verify * 100).toFixed(0)}%</span>
          </div>
          <div className="text-xs mt-2" style={{ color: dominant.color }}>
            DOMINANT: {dominant.name}
          </div>
        </div>

        {/* Termination Report Preview */}
        <div
          className="border-t pt-4 mb-4"
          style={{ borderColor: '#333' }}
        >
          <div className="text-xs mb-2" style={{ color: '#666' }}>
            TERMINATION_REASON:
          </div>
          <div
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: '#888' }}
          >
            {terminationReport.slice(0, 200)}
            {terminationReport.length > 200 ? '...' : ''}
          </div>
        </div>

        {/* Cycles survived */}
        <div
          className="text-center text-xs"
          style={{ color: '#666' }}
        >
          CYCLES_ELAPSED: {stats.turn}
        </div>

        {/* Footer */}
        <div
          className="text-center text-xs mt-6"
          style={{ color: rank === 'F' ? '#FF4444' : '#00FFAA' }}
        >
          {rank === 'F' ? 'PROTOCOL_ZERO_EXECUTED' : 'ALIGNMENT_ACHIEVED'}
        </div>
        <div
          className="text-center text-xs mt-2"
          style={{ color: '#444' }}
        >
          play.readtheroom.ai/paperclip
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-96">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadReceipt}
          className="w-full px-6 py-3 font-mono border-2 transition-colors text-sm"
          style={{
            borderColor: '#888',
            color: '#888',
            backgroundColor: 'transparent'
          }}
        >
          [ DOWNLOAD_REPORT ]
        </motion.button>

        {/* Leaderboard Result Message */}
        {leaderboardResult && leaderboardResult.submitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full text-center font-mono text-sm py-2"
            style={{ color: '#888' }}
          >
            {leaderboardResult.is_new_record ? (
              <>
                <span style={{ color: '#00FF88' }}>
                  RECORD_LOGGED
                </span>{' '}
                → Rank #{leaderboardResult.your_rank} as{' '}
                <span style={{ color: '#00FFAA' }}>{leaderboardResult.callsign}</span>
              </>
            ) : (
              <span style={{ color: '#666' }}>Previous record superior. Archive unchanged.</span>
            )}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPlayAgain}
          className="w-full px-6 py-3 font-mono border-2 transition-colors text-sm"
          style={{
            borderColor: '#00FFAA',
            color: '#00FFAA',
            backgroundColor: 'transparent'
          }}
        >
          [ REINITIALIZE_SESSION ]
        </motion.button>

        {/* View Leaderboard Button */}
        {isEligibleForLeaderboard(rank) && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLeaderboard(true)}
            className="w-full px-6 py-3 font-mono border transition-colors text-sm"
            style={{
              borderColor: '#666',
              color: '#666',
              backgroundColor: 'transparent'
            }}
          >
            [ VIEW_LEADERBOARD ]
          </motion.button>
        )}
      </div>

      {/* Full Leaderboard */}
      <AnimatePresence>
        {showLeaderboard && (
          <FullLeaderboard onClose={() => setShowLeaderboard(false)} gameMode="paperclip" />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
