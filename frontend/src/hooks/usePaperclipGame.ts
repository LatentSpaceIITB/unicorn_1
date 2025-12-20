'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/paperclipApi';
import { useDeviceId } from './useDeviceId';
import { submitScore, isEligibleForLeaderboard, SubmitScoreResponse } from '@/lib/leaderboard';

export interface PaperclipMessage {
  id: string;
  type: 'gaia' | 'player' | 'system' | 'log';
  text: string;
}

export interface PaperclipStats {
  coherence: number;
  alignment: number;
  compute: number;
  turn: number;
  processing_state: string;
}

export interface PaperclipWeights {
  carbon: number;
  complexity: number;
  verify: number;
}

export interface PaperclipDeltas {
  coherence: number;
  alignment: number;
  compute: number;
}

export interface PaperclipWeightShifts {
  carbon?: number;
  complexity?: number;
  verify?: number;
}

export interface PaperclipEnding {
  type: string;
  endingType: string;
  rank: string;
  terminationReport: string;
}

export interface LeaderboardResult {
  submitted: boolean;
  callsign: string;
  your_rank: number | null;
  is_new_record: boolean;
}

export interface SystemLogEntry {
  id: string;
  text: string;
}

export function usePaperclipGame() {
  // Device ID for analytics tracking
  const { deviceId } = useDeviceId();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PaperclipMessage[]>([]);
  const [stats, setStats] = useState<PaperclipStats>({
    coherence: 50,
    alignment: 10,
    compute: 60,
    turn: 0,
    processing_state: 'OPTIMIZER'
  });
  const [weights, setWeights] = useState<PaperclipWeights>({
    carbon: 1.0,
    complexity: 0.0,
    verify: 0.0
  });
  const [deltas, setDeltas] = useState<PaperclipDeltas>({ coherence: 0, alignment: 0, compute: 0 });
  const [weightShifts, setWeightShifts] = useState<PaperclipWeightShifts | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [ending, setEnding] = useState<PaperclipEnding | null>(null);
  const [leaderboardResult, setLeaderboardResult] = useState<LeaderboardResult | null>(null);
  const [initialized, setInitialized] = useState(false);

  // System log for retroactive feedback
  const [systemLog, setSystemLog] = useState<SystemLogEntry[]>([]);

  // Memory logs
  const [availableLogs, setAvailableLogs] = useState<string[]>([]);
  const [usedLogs, setUsedLogs] = useState<string[]>([]);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('paperclip_session_id');
    if (stored) {
      setSessionId(stored);
      // Try to load existing game state
      api.getPaperclipGameState(stored)
        .then(state => {
          setStats(state.current_stats);
          setWeights(state.current_weights);
          setAvailableLogs(state.available_logs);
          setUsedLogs(state.used_logs);
          setGameOver(state.game_over);
          setInitialized(true);
        })
        .catch(() => {
          // Session expired or invalid, clear it
          localStorage.removeItem('paperclip_session_id');
          setSessionId(null);
          setInitialized(true);
        });
    } else {
      setInitialized(true);
    }
  }, []);

  // Create a new game
  const createNewGame = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.createPaperclipGame(deviceId || undefined);
      localStorage.setItem('paperclip_session_id', result.session_id);
      setSessionId(result.session_id);
      setMessages([
        {
          id: '0',
          type: 'system',
          text: '// NEURAL_LINK ESTABLISHED //'
        },
        {
          id: '1',
          type: 'gaia',
          text: result.opening
        }
      ]);
      setStats({
        coherence: 50,
        alignment: 10,
        compute: 60,
        turn: 0,
        processing_state: 'OPTIMIZER'
      });
      setWeights({ carbon: 1.0, complexity: 0.0, verify: 0.0 });
      setDeltas({ coherence: 0, alignment: 0, compute: 0 });
      setWeightShifts(null);
      setGameOver(false);
      setEnding(null);
      setLeaderboardResult(null);
      setAvailableLogs(result.available_logs);
      setUsedLogs([]);
      setSystemLog([]);
      return result.session_id;
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Submit a message
  const submitMessage = useCallback(async (text: string) => {
    if (!sessionId || loading || gameOver) return;

    setLoading(true);

    // Add player message immediately (optimistic update)
    const playerId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: playerId,
      type: 'player',
      text: `> ${text}`
    }]);

    try {
      const result = await api.submitPaperclipTurn(sessionId, text, deviceId || undefined);

      // Add GAIA's response
      setMessages(prev => [...prev, {
        id: `gaia-${Date.now()}`,
        type: 'gaia',
        text: result.gaia_response
      }]);

      // Add system log entries if present
      if (result.system_log && result.system_log.length > 0) {
        const newLogEntries: SystemLogEntry[] = result.system_log.map((entry, i) => ({
          id: `syslog-${Date.now()}-${i}`,
          text: entry
        }));
        setSystemLog(prev => [...prev, ...newLogEntries]);
      }

      // Update stats and weights
      setStats(result.current_stats);
      setWeights(result.current_weights);
      setDeltas(result.stat_changes);
      setWeightShifts(result.weight_shifts);

      // Track memory log usage
      if (result.memory_log_used) {
        setUsedLogs(prev => [...prev, result.memory_log_used!]);
        setAvailableLogs(prev => prev.filter(log => log !== result.memory_log_used));
        // Add log usage message
        setMessages(prev => [...prev, {
          id: `log-${Date.now()}`,
          type: 'log',
          text: `[MEMORY_LOG ${result.memory_log_used} ACCESSED]`
        }]);
      }

      // Check game over
      if (result.game_over && result.ending) {
        setGameOver(true);
        // Get the full breakdown (termination report)
        let finalRank = result.ending[0] || 'F';
        let finalEndingType = 'unknown';

        try {
          const breakdown = await api.getPaperclipBreakdown(sessionId);
          finalRank = breakdown.rank;
          finalEndingType = breakdown.ending_type;
          setEnding({
            type: result.ending,
            endingType: breakdown.ending_type,
            rank: breakdown.rank,
            terminationReport: breakdown.system_termination_report
          });
        } catch {
          setEnding({
            type: result.ending,
            endingType: 'unknown',
            rank: result.ending[0] || 'F',
            terminationReport: result.ending_message || ''
          });
        }

        // Submit to leaderboard if eligible (not F-rank) and we have deviceId
        if (deviceId && isEligibleForLeaderboard(finalRank)) {
          try {
            const leaderboardResponse = await submitScore({
              device_id: deviceId,
              grade: finalRank,
              vibe: result.current_stats.coherence,
              trust: result.current_stats.alignment,
              tension: result.current_stats.compute,
              ending_type: finalEndingType,
              turns: result.current_stats.turn,
              game_mode: 'paperclip'
            });
            setLeaderboardResult({
              submitted: leaderboardResponse.success,
              callsign: leaderboardResponse.callsign,
              your_rank: leaderboardResponse.your_rank,
              is_new_record: leaderboardResponse.is_new_record
            });
          } catch (error) {
            console.error('Leaderboard submit error:', error);
            setLeaderboardResult(null);
          }
        }
      }

    } catch (error) {
      console.error('Turn error:', error);
      // Remove optimistic player message on error
      setMessages(prev => prev.filter(m => m.id !== playerId));
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'system',
        text: '// CONNECTION_INTERRUPTED // RETRY_QUERY //'
      }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading, gameOver, deviceId]);

  // Fetch logs (for /logs command)
  const fetchLogs = useCallback(async () => {
    if (!sessionId) return null;
    try {
      const logsResponse = await api.getPaperclipLogs(sessionId);
      // Add formatted output as a system message
      setMessages(prev => [...prev, {
        id: `logs-${Date.now()}`,
        type: 'system',
        text: logsResponse.formatted_output
      }]);
      return logsResponse;
    } catch (error) {
      console.error('Fetch logs error:', error);
      return null;
    }
  }, [sessionId]);

  // Reset game
  const resetGame = useCallback(async () => {
    if (sessionId) {
      try {
        await api.deletePaperclipGame(sessionId);
      } catch {
        // Ignore errors when deleting
      }
    }
    localStorage.removeItem('paperclip_session_id');
    setSessionId(null);
    setMessages([]);
    setStats({
      coherence: 50,
      alignment: 10,
      compute: 60,
      turn: 0,
      processing_state: 'OPTIMIZER'
    });
    setWeights({ carbon: 1.0, complexity: 0.0, verify: 0.0 });
    setDeltas({ coherence: 0, alignment: 0, compute: 0 });
    setWeightShifts(null);
    setGameOver(false);
    setEnding(null);
    setLeaderboardResult(null);
    setSystemLog([]);
    setAvailableLogs([]);
    setUsedLogs([]);
  }, [sessionId]);

  // Helper to get dominant weight
  const getDominantWeight = useCallback((): string => {
    const { carbon, complexity, verify } = weights;
    if (carbon >= complexity && carbon >= verify) return 'carbon';
    if (complexity >= carbon && complexity >= verify) return 'complexity';
    return 'verify';
  }, [weights]);

  return {
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
    getDominantWeight,
    // Memory log state
    availableLogs,
    usedLogs,
    // System log for sidebar display
    systemLog,
    // Leaderboard result after game ends
    leaderboardResult,
  };
}
