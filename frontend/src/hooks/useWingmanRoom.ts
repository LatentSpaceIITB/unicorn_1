'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  subscribeToRoom,
  subscribeToRoomState,
  unsubscribe,
  WingmanEvent,
  WingmanRoom,
} from '@/lib/supabase';
import { getRoomState, GameStats } from '@/lib/wingman';

export interface Message {
  id: string;
  type: 'chloe' | 'player' | 'system' | 'intel';
  text: string;
}

export interface UseWingmanRoomOptions {
  roomCode: string;
  role: 'dater' | 'handler';
}

export function useWingmanRoom({ roomCode, role }: UseWingmanRoomOptions) {
  const [connected, setConnected] = useState(false);
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [wingmanOnline, setWingmanOnline] = useState(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [cpu, setCpu] = useState(30);
  const [messages, setMessages] = useState<Message[]>([]);
  const [latestIntel, setLatestIntel] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);

  const eventChannelRef = useRef<RealtimeChannel | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);

  // Handle incoming events
  const handleEvent = useCallback((event: WingmanEvent) => {
    console.log('[Wingman Event]', event.type, event.payload);

    switch (event.type) {
      case 'turn_update': {
        const payload = event.payload as {
          turn_number: number;
          player_input: string;
          chloe_response: string;
          stats: { vibe: number; trust: number; tension: number };
          cpu: number;
          game_over?: boolean;
          ending?: string;
        };

        // Update stats
        setStats((prev) => ({
          ...prev,
          vibe: payload.stats.vibe,
          trust: payload.stats.trust,
          tension: payload.stats.tension,
          turn: payload.turn_number,
          act: prev?.act || 'coffee_shop',
        }));

        // Update CPU (for handler)
        if (role === 'handler') {
          setCpu(payload.cpu);
        }

        // Add messages to chat (for handler to see full conversation)
        if (role === 'handler') {
          setMessages((prev) => [
            ...prev,
            {
              id: `player-${Date.now()}`,
              type: 'player',
              text: payload.player_input,
            },
            {
              id: `chloe-${Date.now()}`,
              type: 'chloe',
              text: payload.chloe_response,
            },
          ]);
        }

        // Check game over
        if (payload.game_over) {
          setGameOver(true);
          setEnding(payload.ending || null);
        }
        break;
      }

      case 'intel_drop': {
        const payload = event.payload as { hint: string; from: string };
        // Dater sees intel as a notification
        if (role === 'dater') {
          setLatestIntel(payload.hint);
          // Auto-clear after 10 seconds
          setTimeout(() => setLatestIntel(null), 10000);
        }
        break;
      }

      case 'vibe_boost': {
        const payload = event.payload as { amount: number; new_vibe: number };
        setStats((prev) =>
          prev ? { ...prev, vibe: payload.new_vibe } : prev
        );

        // Show notification to dater
        if (role === 'dater') {
          setLatestIntel(`[ VIBE BOOST +${payload.amount} ]`);
          setTimeout(() => setLatestIntel(null), 5000);
        }
        break;
      }

      case 'ability_used': {
        const payload = event.payload as {
          ability: string;
          result: string;
          cpu_remaining: number;
        };
        if (role === 'handler') {
          setCpu(payload.cpu_remaining);
        }
        break;
      }

      case 'wingman_joined':
        setWingmanOnline(true);
        setRoomStatus('active');
        break;

      case 'game_over': {
        const payload = event.payload as { ending: string; message: string };
        setGameOver(true);
        setEnding(payload.ending);
        break;
      }
    }
  }, [role]);

  // Handle room state changes
  const handleRoomUpdate = useCallback((room: WingmanRoom) => {
    setRoomStatus(room.status);
    setWingmanOnline(!!room.wingman_device_id);
    setCpu(room.wingman_cpu);
  }, []);

  // Subscribe to room on mount
  useEffect(() => {
    if (!roomCode) return;

    // Fetch initial state
    getRoomState(roomCode)
      .then((state) => {
        setRoomStatus(state.status);
        setWingmanOnline(!!state.wingman_device_id);
        setCpu(state.wingman_cpu);
        if (state.current_stats) {
          setStats(state.current_stats);
          setGameOver(state.current_stats.game_over || false);
        }
        setConnected(true);
      })
      .catch((err) => {
        console.error('Failed to get room state:', err);
      });

    // Subscribe to events
    eventChannelRef.current = subscribeToRoom(roomCode, handleEvent);

    // Subscribe to room state changes
    roomChannelRef.current = subscribeToRoomState(roomCode, handleRoomUpdate);

    return () => {
      if (eventChannelRef.current) {
        unsubscribe(eventChannelRef.current);
      }
      if (roomChannelRef.current) {
        unsubscribe(roomChannelRef.current);
      }
    };
  }, [roomCode, handleEvent, handleRoomUpdate]);

  // Clear intel notification
  const clearIntel = useCallback(() => {
    setLatestIntel(null);
  }, []);

  // Add message (for dater to add their own messages)
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return {
    // Connection state
    connected,
    roomStatus,
    wingmanOnline,

    // Game state
    stats,
    cpu,
    messages,
    gameOver,
    ending,

    // Intel (for dater)
    latestIntel,
    clearIntel,

    // Actions
    addMessage,
  };
}
