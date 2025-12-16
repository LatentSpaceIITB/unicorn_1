'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { audioManager, MusicState } from '@/lib/audioManager';

interface AudioContextType {
  // Initialization
  isInitialized: boolean;
  initAudio: () => void;

  // SFX
  playBlip: () => void;
  playSend: () => void;
  playStatChange: (delta: number) => void;
  playTensionPing: () => void;
  playWarning: () => void;
  playEnding: (rank: string) => void;

  // BGM
  setMusicState: (state: MusicState) => void;

  // Control
  isMuted: boolean;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const initAttempted = useRef(false);

  // Initialize audio on first user interaction
  const initAudio = useCallback(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    audioManager.init();
    setIsInitialized(audioManager.isInitialized());
  }, []);

  // Auto-initialize on first click/touch/keypress
  useEffect(() => {
    const handleInteraction = () => {
      if (!isInitialized) {
        initAudio();
      }
    };

    // Listen for user interaction to unlock audio
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [isInitialized, initAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioManager.destroy();
    };
  }, []);

  // SFX methods
  const playBlip = useCallback(() => {
    audioManager.playBlip();
  }, []);

  const playSend = useCallback(() => {
    audioManager.playSend();
  }, []);

  const playStatChange = useCallback((delta: number) => {
    audioManager.playStatChange(delta);
  }, []);

  const playTensionPing = useCallback(() => {
    audioManager.playTensionPing();
  }, []);

  const playWarning = useCallback(() => {
    audioManager.playWarning();
  }, []);

  const playEnding = useCallback((rank: string) => {
    audioManager.playEnding(rank);
  }, []);

  // BGM methods
  const setMusicState = useCallback((state: MusicState) => {
    audioManager.setMusicState(state);
  }, []);

  // Control methods
  const toggleMute = useCallback(() => {
    const newMuted = audioManager.toggleMute();
    setIsMuted(newMuted);
  }, []);

  const value: AudioContextType = {
    isInitialized,
    initAudio,
    playBlip,
    playSend,
    playStatChange,
    playTensionPing,
    playWarning,
    playEnding,
    setMusicState,
    isMuted,
    toggleMute,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
