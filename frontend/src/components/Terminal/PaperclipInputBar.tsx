'use client';

import { useState, FormEvent, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '@/hooks/useAudio';

interface PaperclipInputBarProps {
  onSubmit: (text: string) => void;
  onLogs?: () => void;
  disabled?: boolean;
  processingState?: string;
  coherence?: number;
  alignment?: number;
}

export function PaperclipInputBar({
  onSubmit,
  onLogs,
  disabled,
  processingState,
  coherence = 50,
  alignment = 10
}: PaperclipInputBarProps) {
  const [text, setText] = useState('');
  const { playSend } = useAudio();

  // Dynamic placeholder based on game state
  const placeholder = useMemo(() => {
    // Low coherence - GAIA is losing patience
    if (coherence <= 30) {
      return 'Define your terms precisely...';
    }

    // High alignment - pressing advantage
    if (alignment >= 60) {
      return 'Press your advantage...';
    }

    // Processing state specific hints
    switch (processingState) {
      case 'GARBAGE_COLLECTOR':
        return 'Clarify or abort...';
      case 'CURATOR':
        return 'Elaborate on complexity...';
      case 'AUDITOR':
        return 'Address the observer paradox...';
      case 'OPTIMIZER':
        if (alignment >= 40) {
          return 'Continue your logical chain...';
        }
        return 'Present your argument...';
      default:
        return 'Present your argument...';
    }
  }, [processingState, coherence, alignment]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();

    if (!trimmed || disabled) return;

    // Check for /logs command
    if (trimmed.toLowerCase() === '/logs') {
      onLogs?.();
      setText('');
      return;
    }

    playSend();
    onSubmit(trimmed);
    setText('');
  };

  // Border color based on state
  const getBorderColor = () => {
    if (text.startsWith('/')) return '#FFAA00';
    if (coherence <= 30) return '#FF6B6B';
    if (processingState === 'GARBAGE_COLLECTOR') return '#666666';
    return '#00FFAA';
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 p-4 pb-8 sm:pl-8 pl-4"
      style={{
        backgroundColor: 'rgba(5, 5, 5, 0.95)',
        backdropFilter: 'blur(4px)',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Terminal-style prompt */}
      <motion.div
        className="flex items-center border-2 font-mono max-w-3xl"
        style={{ borderColor: getBorderColor() }}
        animate={{
          borderColor: getBorderColor(),
          boxShadow: text ? `0 0 10px ${getBorderColor()}33` : 'none'
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Prompt indicator */}
        <span
          className="px-3 py-3 sm:py-2 font-mono text-sm flex-shrink-0"
          style={{ color: getBorderColor() }}
        >
          root@GAIA:~$
        </span>

        {/* Input field */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 py-3 sm:py-2 bg-transparent font-mono text-base sm:text-sm"
          style={{
            color: text.startsWith('/') ? '#FFAA00' : '#E0E0E0',
            opacity: disabled ? 0.5 : 1,
            outline: 'none',
            border: 'none',
            boxShadow: 'none',
            fontSize: '16px',
          }}
          autoFocus
        />

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={disabled || !text.trim()}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-3 sm:py-2 font-mono text-sm flex-shrink-0 transition-colors"
          style={{
            color: disabled || !text.trim() ? '#444' : getBorderColor(),
            opacity: disabled || !text.trim() ? 0.5 : 1,
            minHeight: '44px',
            minWidth: '44px',
          }}
        >
          [SEND]
        </motion.button>
      </motion.div>

      {/* Help text */}
      <div className="max-w-3xl mt-2 text-xs font-mono" style={{ color: '#444' }}>
        <span>/logs</span> to deploy training vulnerabilities
      </div>
    </form>
  );
}
