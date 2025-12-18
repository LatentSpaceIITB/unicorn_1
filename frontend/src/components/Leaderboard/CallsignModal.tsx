'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CallsignModalProps {
  isOpen: boolean;
  onSubmit: (callsign: string | null) => void;
  onClose?: () => void;
  grade?: string;
  mode?: 'create' | 'edit';
  currentCallsign?: string;
}

const gradeColors: Record<string, string> = {
  S: 'var(--terminal-success)',
  A: 'var(--terminal-vibe)',
  B: 'var(--terminal-trust)',
  C: 'var(--terminal-dim)',
};

export function CallsignModal({
  isOpen,
  onSubmit,
  onClose,
  grade = 'C',
  mode = 'create',
  currentCallsign = '',
}: CallsignModalProps) {
  const [callsign, setCallsign] = useState(currentCallsign);
  const [error, setError] = useState<string | null>(null);

  // Reset callsign when modal opens/closes or currentCallsign changes
  useEffect(() => {
    if (isOpen) {
      setCallsign(currentCallsign);
      setError(null);
    }
  }, [isOpen, currentCallsign]);

  const handleSubmit = () => {
    if (callsign.trim()) {
      // Validate: alphanumeric only, max 8 chars
      const cleaned = callsign.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{1,8}$/.test(cleaned)) {
        setError('Alphanumeric only, max 8 characters');
        return;
      }
      onSubmit(cleaned);
    } else {
      onSubmit(null); // Auto-generate
    }
  };

  const handleSkip = () => {
    if (mode === 'edit' && onClose) {
      onClose();
    } else {
      onSubmit(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 8);
    setCallsign(value);
    setError(null);
  };

  const gradeColor = gradeColors[grade[0]] || 'var(--terminal-text)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 5, 5, 0.95)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm border p-6 font-mono"
            style={{
              backgroundColor: 'var(--terminal-bg)',
              borderColor: gradeColor,
            }}
          >
            {/* Header */}
            <div
              className="text-center text-xs tracking-widest mb-4"
              style={{ color: gradeColor }}
            >
              {mode === 'edit' ? '[ EDIT CALLSIGN ]' : '[ MISSION COMPLETE ]'}
            </div>

            {mode === 'create' && (
              <div
                className="text-center text-5xl font-bold mb-2"
                style={{ color: gradeColor }}
              >
                {grade}
              </div>
            )}

            <div
              className="text-center text-sm mb-6"
              style={{ color: 'var(--terminal-text)' }}
            >
              {mode === 'edit'
                ? 'Update your operative callsign.'
                : "You've earned a spot on the leaderboard."}
            </div>

            {/* Input */}
            <div className="mb-4">
              <label
                className="block text-xs mb-2"
                style={{ color: 'var(--terminal-dim)' }}
              >
                ENTER CALLSIGN (optional)
              </label>
              <input
                type="text"
                value={callsign}
                onChange={handleChange}
                placeholder="MAX 8 CHARS"
                className="w-full px-3 py-2 border bg-transparent font-mono text-center uppercase"
                style={{
                  borderColor: error
                    ? 'var(--terminal-tension)'
                    : 'var(--terminal-dim)',
                  color: 'var(--terminal-text)',
                  outline: 'none',
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                  if (e.key === 'Escape') handleSkip();
                }}
              />
              {error && (
                <div
                  className="text-xs mt-1"
                  style={{ color: 'var(--terminal-tension)' }}
                >
                  {error}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2 border font-mono text-sm transition-opacity hover:opacity-70"
                style={{
                  borderColor: 'var(--terminal-dim)',
                  color: 'var(--terminal-dim)',
                  backgroundColor: 'transparent',
                }}
              >
                {mode === 'edit' ? '[ CANCEL ]' : '[ SKIP ]'}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 border font-mono text-sm transition-opacity hover:opacity-70"
                style={{
                  borderColor: gradeColor,
                  color: gradeColor,
                  backgroundColor: 'transparent',
                }}
              >
                {mode === 'edit' ? '[ SAVE ]' : '[ CONFIRM ]'}
              </button>
            </div>

            {mode === 'create' && (
              <div
                className="text-xs text-center mt-4"
                style={{ color: 'var(--terminal-dim)' }}
              >
                Skip to auto-assign a callsign
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
