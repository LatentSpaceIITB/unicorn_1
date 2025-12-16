'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '@/hooks/useAudio';

type InputMode = 'dialogue' | 'action';

interface InputBarProps {
  onSubmit: (text: string, mode: InputMode) => void;
  disabled?: boolean;
}

export function InputBar({ onSubmit, disabled }: InputBarProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<InputMode>('dialogue');
  const { playSend } = useAudio();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      playSend(); // Play send sound
      onSubmit(text.trim(), mode);
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Tab to toggle mode
    if (e.key === 'Tab') {
      e.preventDefault();
      setMode(m => m === 'dialogue' ? 'action' : 'dialogue');
    }
  };

  const toggleMode = () => {
    setMode(m => m === 'dialogue' ? 'action' : 'dialogue');
  };

  // Colors based on mode
  const modeColor = mode === 'dialogue' ? 'var(--terminal-vibe)' : 'var(--terminal-tension)';

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 p-4 pb-8 pl-8"
      style={{
        backgroundColor: 'rgba(5, 5, 5, 0.85)',  // Semi-transparent to let particles peek through
        backdropFilter: 'blur(4px)',  // Subtle blur for depth
      }}
    >
      {/* Unified prompt bar */}
      <motion.div
        className="flex items-center border-2 font-mono max-w-3xl"
        style={{ borderColor: modeColor }}
        animate={{ borderColor: mode === 'dialogue' ? '#00D9FF' : '#FF2E63' }}
        transition={{ duration: 0.2 }}
      >
        {/* Mode label - clickable */}
        <button
          type="button"
          onClick={toggleMode}
          className="px-3 py-2 font-mono text-sm flex-shrink-0 transition-colors hover:opacity-80"
          style={{ color: modeColor }}
          title="Press Tab to toggle"
        >
          [ {mode === 'dialogue' ? 'SAY' : 'ACT'} ]
        </button>

        {/* Chevron prompt */}
        <span
          className="pr-2 flex-shrink-0"
          style={{ color: modeColor }}
        >
          {'>'}
        </span>

        {/* Input field */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={mode === 'dialogue' ? 'Say something...' : 'Do something...'}
          className="flex-1 py-2 bg-transparent font-mono"
          style={{
            color: mode === 'dialogue' ? 'var(--terminal-text)' : 'var(--terminal-tension)',
            fontStyle: mode === 'action' ? 'italic' : 'normal',
            opacity: disabled ? 0.5 : 1,
            outline: 'none',
            border: 'none',
            boxShadow: 'none'
          }}
          autoFocus
        />

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={disabled || !text.trim()}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-2 font-mono text-sm flex-shrink-0 transition-colors"
          style={{
            color: disabled || !text.trim() ? 'var(--terminal-dim)' : modeColor,
            opacity: disabled || !text.trim() ? 0.5 : 1
          }}
        >
          [↵]
        </motion.button>
      </motion.div>
    </form>
  );
}
