'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DiagnosticItem } from '@/lib/diagnostics';
import { DiagnosticLine } from './DiagnosticLine';

interface TerminalLogsProps {
  diagnostics: DiagnosticItem[];
  turnCount: number;
}

type LogPhase = 'init' | 'scanning' | 'results' | 'complete';

interface LogLine {
  text: string;
  delay: number;
}

export function TerminalLogs({ diagnostics, turnCount }: TerminalLogsProps) {
  const [phase, setPhase] = useState<LogPhase>('init');
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [currentDiagIndex, setCurrentDiagIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const initLines: LogLine[] = [
    { text: '> SYSTEM_DIAGNOSTICS v2.1', delay: 0 },
    { text: '> ANALYZING CONVERSATION...', delay: 300 },
    { text: `> ${turnCount} TURNS PROCESSED`, delay: 600 },
    { text: '> SCANNING FOR PATTERNS...', delay: 900 },
    { text: '> ANALYSIS COMPLETE', delay: 1500 },
    { text: '', delay: 1800 },
  ];

  // Typewriter effect for init lines
  useEffect(() => {
    setPhase('init');
    setVisibleLines([]);
    setShowDiagnostics(false);
    setCurrentDiagIndex(0);

    const timeouts: NodeJS.Timeout[] = [];

    initLines.forEach((line, index) => {
      const timeout = setTimeout(() => {
        setVisibleLines(prev => [...prev, line.text]);

        // After last init line, start showing diagnostics
        if (index === initLines.length - 1) {
          setTimeout(() => {
            setPhase('results');
            setShowDiagnostics(true);
          }, 300);
        }
      }, line.delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [turnCount]);

  // Stagger diagnostic reveals
  useEffect(() => {
    if (!showDiagnostics || diagnostics.length === 0) return;

    const interval = setInterval(() => {
      setCurrentDiagIndex(prev => {
        if (prev >= diagnostics.length - 1) {
          clearInterval(interval);
          setTimeout(() => setPhase('complete'), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [showDiagnostics, diagnostics.length]);

  // Auto-scroll as content appears
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines, currentDiagIndex]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto font-mono text-sm p-4"
      style={{
        backgroundColor: 'var(--terminal-bg)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--terminal-dim) transparent',
      }}
    >
      {/* Terminal header */}
      <div
        className="text-xs mb-4 pb-2 border-b"
        style={{
          color: 'var(--terminal-dim)',
          borderColor: 'var(--terminal-dim)',
        }}
      >
        DIAGNOSTIC_LOG_RESULT
      </div>

      {/* Init lines with typewriter cursor */}
      <div className="space-y-1 mb-4">
        {visibleLines.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: 'var(--terminal-vibe)' }}
          >
            {line}
            {index === visibleLines.length - 1 && phase === 'init' && (
              <span className="animate-pulse">█</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Diagnostic results */}
      <AnimatePresence>
        {showDiagnostics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {diagnostics.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 text-sm"
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
              </motion.div>
            ) : (
              diagnostics.slice(0, currentDiagIndex + 1).map((diag, idx) => (
                <DiagnosticLine key={diag.code} item={diag} index={idx} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion footer */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 pt-4 border-t"
            style={{
              borderColor: 'var(--terminal-dim)',
              color: 'var(--terminal-dim)',
            }}
          >
            <div className="text-xs">
              &gt; {diagnostics.length} PATTERN{diagnostics.length !== 1 ? 'S' : ''} DETECTED
            </div>
            <div className="text-xs mt-1">
              &gt; RECOMMENDATIONS GENERATED
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--terminal-vibe)' }}>
              &gt; END_DIAGNOSTIC_LOG
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
