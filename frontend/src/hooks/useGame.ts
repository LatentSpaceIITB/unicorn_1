'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '@/lib/api';
import { useTimer, SilenceLevel } from './useTimer';
import { useDeviceId } from './useDeviceId';
import type { DetailedTurn } from '@/lib/diagnostics';

export interface Message {
  id: string;
  type: 'chloe' | 'player' | 'system' | 'intuition';
  text: string;
  isAction?: boolean;
}

export interface Stats {
  vibe: number;
  trust: number;
  tension: number;
  turn: number;
  act: string;
  lockout_turns: number;
}

export interface Deltas {
  vibe: number;
  trust: number;
  tension: number;
}

export interface Ending {
  type: string;
  message: string;
  rank: string;
  killerQuote: string | null;
}

// Re-export DetailedTurn for consumers
export type { DetailedTurn };

const TYPING_SHIELD_MS = 1500;  // Pause timer if user typed within this window

export function useGame() {
  // Device ID for funnel analytics tracking
  const { deviceId } = useDeviceId();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats>({
    vibe: 30,
    trust: 20,
    tension: 0,
    turn: 0,
    act: 'coffee_shop',
    lockout_turns: 0
  });
  const [deltas, setDeltas] = useState<Deltas>({ vibe: 0, trust: 0, tension: 0 });
  const [loading, setLoading] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [detailedHistory, setDetailedHistory] = useState<DetailedTurn[]>([]);

  // Typing Shield: Track when user last typed to pause timer
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(0);
  const isTyping = Date.now() - lastKeystrokeTime < TYPING_SHIELD_MS;

  // Track if we're processing a silence penalty to avoid double-triggers
  const processingPenaltyRef = useRef(false);

  // Handle silence threshold events
  const handleSilenceThreshold = useCallback(async (level: SilenceLevel) => {
    if (!sessionId || gameOver || processingPenaltyRef.current) return;

    processingPenaltyRef.current = true;

    try {
      const result = await api.applySilencePenalty(sessionId, level, deviceId || undefined);

      // Add Chloe's silence response as a message
      setMessages(prev => [...prev, {
        id: `silence-${Date.now()}`,
        type: 'chloe',
        text: result.response
      }]);

      // Update stats
      setStats(result.current_stats);

      // Check for game over
      if (result.game_over && result.ending) {
        setGameOver(true);
        setEnding({
          type: result.ending,
          message: result.ending_message || '',
          rank: result.ending[0] || 'F',
          killerQuote: result.response
        });
        // Fetch detailed history for AAR
        if (sessionId) {
          try {
            const historyResponse = await api.getDetailedHistory(sessionId);
            setDetailedHistory(historyResponse.turns.map(t => ({
              turn_number: t.turn_number,
              user_input: t.user_input,
              chloe_response: t.chloe_response,
              tags: t.tags,
              stat_changes: t.stat_changes,
              stats_after: {
                vibe: t.stats_after.vibe,
                trust: t.stats_after.trust,
                tension: t.stats_after.tension,
              },
              intuition_hint: t.intuition_hint,
              critical_event: t.critical_event,
            })));
          } catch {
            setDetailedHistory([]);
          }
        }
      }
    } catch (error) {
      console.error('Silence penalty error:', error);
    } finally {
      processingPenaltyRef.current = false;
    }
  }, [sessionId, gameOver, deviceId]);

  // Notify that user is typing (resets the typing shield timer)
  const notifyTyping = useCallback(() => {
    setLastKeystrokeTime(Date.now());
  }, []);

  // Initialize the timer with typing shield
  const timer = useTimer({
    onThresholdHit: handleSilenceThreshold,
    enabled: initialized && !!sessionId && !gameOver && !loading,
    isTyping,  // Pause timer while user is actively typing
  });

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('session_id');
    if (stored) {
      setSessionId(stored);
      // Try to load existing game state
      api.getGameState(stored)
        .then(state => {
          setStats(state.current_stats);
          setGameOver(state.game_over);
          setInitialized(true);
        })
        .catch(() => {
          // Session expired or invalid, clear it
          localStorage.removeItem('session_id');
          setSessionId(null);
          setInitialized(true);
        });
    } else {
      setInitialized(true);
    }
  }, []);

  // Add opening message when session is ready
  useEffect(() => {
    if (sessionId && messages.length === 0 && initialized && !gameOver) {
      setMessages([
        {
          id: '0',
          type: 'system',
          text: 'You see Chloe sitting at a corner table, checking her phone.'
        }
      ]);
    }
  }, [sessionId, messages.length, initialized, gameOver]);

  // Create a new game
  const createNewGame = useCallback(async () => {
    try {
      setLoading(true);
      const { session_id } = await api.createGame(deviceId || undefined);
      localStorage.setItem('session_id', session_id);
      setSessionId(session_id);
      setMessages([]);
      setStats({ vibe: 30, trust: 20, tension: 0, turn: 0, act: 'coffee_shop', lockout_turns: 0 });
      setDeltas({ vibe: 0, trust: 0, tension: 0 });
      setGameOver(false);
      setEnding(null);
      return session_id;
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Submit a message
  const submitMessage = useCallback(async (text: string, mode: 'dialogue' | 'action') => {
    if (!sessionId || loading || gameOver) return;

    setLoading(true);
    timer.pause(); // Pause timer while processing

    // Add player message immediately (optimistic update)
    const playerId = Date.now().toString();
    const playerText = mode === 'action' ? `*${text}*` : text;
    setMessages(prev => [...prev, {
      id: playerId,
      type: 'player',
      text: playerText,
      isAction: mode === 'action'
    }]);

    try {
      const result = await api.submitTurn(sessionId, text, mode, deviceId || undefined);

      // Add Chloe's response
      setMessages(prev => [...prev, {
        id: `chloe-${Date.now()}`,
        type: 'chloe',
        text: result.chloe_response
      }]);

      // Add intuition hint if present
      if (result.intuition_hint) {
        const hint = result.intuition_hint; // Capture for type narrowing
        setMessages(prev => [...prev, {
          id: `hint-${Date.now()}`,
          type: 'intuition',
          text: hint
        }]);
      }

      // Update stats and deltas
      setStats(result.current_stats);
      setDeltas(result.stat_changes);

      // Check game over
      if (result.game_over && result.ending) {
        setGameOver(true);
        // Get the full breakdown and detailed history for AAR
        try {
          const [breakdown, historyResponse] = await Promise.all([
            api.getBreakdown(sessionId),
            api.getDetailedHistory(sessionId),
          ]);
          setEnding({
            type: result.ending,
            message: result.ending_message || '',
            rank: breakdown.rank,
            killerQuote: breakdown.killer_quote
          });
          // Convert API response to DetailedTurn format
          setDetailedHistory(historyResponse.turns.map(t => ({
            turn_number: t.turn_number,
            user_input: t.user_input,
            chloe_response: t.chloe_response,
            tags: t.tags,
            stat_changes: t.stat_changes,
            stats_after: {
              vibe: t.stats_after.vibe,
              trust: t.stats_after.trust,
              tension: t.stats_after.tension,
            },
            intuition_hint: t.intuition_hint,
            critical_event: t.critical_event,
          })));
        } catch {
          setEnding({
            type: result.ending,
            message: result.ending_message || '',
            rank: result.ending[0] || '?',
            killerQuote: result.chloe_response
          });
          setDetailedHistory([]);
        }
      }

    } catch (error) {
      console.error('Turn error:', error);
      // Remove optimistic player message on error
      setMessages(prev => prev.filter(m => m.id !== playerId));
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'system',
        text: 'Connection error. Try again.'
      }]);
    } finally {
      setLoading(false);
      // Reset timer after message is processed (gives player fresh time)
      if (!gameOver) {
        timer.reset();
      }
    }
  }, [sessionId, loading, gameOver, timer, deviceId]);

  // Reset game
  const resetGame = useCallback(async () => {
    if (sessionId) {
      try {
        await api.deleteGame(sessionId);
      } catch {
        // Ignore errors when deleting
      }
    }
    localStorage.removeItem('session_id');
    setSessionId(null);
    setMessages([]);
    setStats({ vibe: 30, trust: 20, tension: 0, turn: 0, act: 'coffee_shop', lockout_turns: 0 });
    setDeltas({ vibe: 0, trust: 0, tension: 0 });
    setGameOver(false);
    setEnding(null);
    setDetailedHistory([]);
  }, [sessionId]);

  return {
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
    notifyTyping,  // Call when user types to activate typing shield
    // V2: Timer state for UI
    timer: {
      elapsed: timer.elapsed,
      currentLevel: timer.currentLevel,
      isRunning: timer.isRunning,
      isTyping,  // True when typing shield is active
    },
    // V3: AAR detailed history
    detailedHistory,
  };
}
