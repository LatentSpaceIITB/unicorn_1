'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DiagnosticItem, DetailedTurn } from '@/lib/diagnostics';
import { analyzeDiagnostics } from '@/lib/diagnostics';
import { DiagnosticLine } from './DiagnosticLine';
import { TerminalLogs } from './TerminalLogs';

interface AfterActionReportProps {
  history: DetailedTurn[];
  rank: string;
  finalStats: { vibe: number; trust: number; tension: number };
  turnCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function AfterActionReport({
  history,
  rank,
  finalStats,
  turnCount,
  isOpen,
  onToggle,
}: AfterActionReportProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);

  // Analyze diagnostics when history changes
  useEffect(() => {
    if (history.length > 0) {
      const results = analyzeDiagnostics(history, rank, finalStats);
      setDiagnostics(results);
    }
  }, [history, rank, finalStats]);

  // Check for desktop viewport
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Mobile: Accordion toggle button
  const ToggleButton = () => (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full px-6 py-3 font-mono border-2 transition-all"
      style={{
        borderColor: isOpen ? 'var(--terminal-vibe)' : 'var(--terminal-dim)',
        color: isOpen ? 'var(--terminal-vibe)' : 'var(--terminal-dim)',
        backgroundColor: 'transparent',
        animation: !isOpen ? 'diagnostic-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {isOpen ? '[ HIDE DIAGNOSTICS ]' : '[ RUN_SYSTEM_DIAGNOSTICS ]'}
    </motion.button>
  );

  // Mobile: Accordion content
  const MobileAccordion = () => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div
            className="mt-4 p-4 border-2 border-t-0"
            style={{
              borderColor: 'var(--terminal-dim)',
              backgroundColor: 'var(--terminal-bg)',
            }}
          >
            {/* Header */}
            <div
              className="text-xs mb-4 pb-2 border-b font-mono"
              style={{
                color: 'var(--terminal-vibe)',
                borderColor: 'var(--terminal-dim)',
              }}
            >
              &gt; DIAGNOSTIC_LOG_RESULT
            </div>

            {/* Diagnostics list */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {diagnostics.length === 0 ? (
                <div
                  className="p-3 text-sm font-mono"
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
                </div>
              ) : (
                diagnostics.map((diag, idx) => (
                  <DiagnosticLine key={diag.code} item={diag} index={idx} />
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="mt-4 pt-3 border-t text-xs font-mono"
              style={{
                borderColor: 'var(--terminal-dim)',
                color: 'var(--terminal-dim)',
              }}
            >
              {diagnostics.length} pattern{diagnostics.length !== 1 ? 's' : ''} detected
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Desktop: Side panel with terminal logs
  const DesktopPanel = () => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 400, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="border-l-2 overflow-hidden flex-shrink-0"
          style={{
            borderColor: 'var(--terminal-dim)',
            backgroundColor: 'var(--terminal-bg)',
          }}
        >
          <TerminalLogs diagnostics={diagnostics} turnCount={turnCount} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return {
    ToggleButton,
    MobileAccordion,
    DesktopPanel,
    diagnostics,
    isDesktop,
  };
}

// Export a simpler wrapper component for the Receipt to use
export function AfterActionReportSection({
  history,
  rank,
  finalStats,
  turnCount,
}: Omit<AfterActionReportProps, 'isOpen' | 'onToggle'>) {
  const [isOpen, setIsOpen] = useState(false);
  const { ToggleButton, MobileAccordion, DesktopPanel, isDesktop } = AfterActionReport({
    history,
    rank,
    finalStats,
    turnCount,
    isOpen,
    onToggle: () => setIsOpen(!isOpen),
  });

  // For desktop, we return components for a split layout
  // For mobile, we return an accordion
  if (isDesktop) {
    return {
      toggleButton: <ToggleButton />,
      sidePanel: <DesktopPanel />,
      isOpen,
      setIsOpen,
    };
  }

  return {
    toggleButton: <ToggleButton />,
    accordion: <MobileAccordion />,
    isOpen,
    setIsOpen,
  };
}
