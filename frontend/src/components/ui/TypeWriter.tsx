'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '@/hooks/useAudio';

interface TypeWriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
}

export function TypeWriter({
  text,
  speed = 30,
  delay = 0,
  className = '',
  onComplete,
  showCursor = true
}: TypeWriterProps) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { playBlip } = useAudio();

  // Handle delay before starting
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timer);
    } else {
      setStarted(true);
    }
  }, [delay]);

  // Handle typing effect
  useEffect(() => {
    if (!started) return;

    // If speed is 0, show all text immediately
    if (speed === 0) {
      setDisplayText(text);
      setCompleted(true);
      onComplete?.();
      return;
    }

    let index = 0;
    setDisplayText('');
    setCompleted(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        // Play blip sound every 3 characters for natural variation
        if (index % 3 === 0) {
          playBlip();
        }
        index++;
      } else {
        clearInterval(interval);
        setCompleted(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, started, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {showCursor && !completed && started && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="inline-block w-2 h-4 ml-0.5 align-middle"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
    </span>
  );
}
