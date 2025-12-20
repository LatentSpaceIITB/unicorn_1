'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface SystemLogEntry {
  id: string;
  text: string;
}

interface SystemLogProps {
  entries: SystemLogEntry[];
  availableLogs: string[];
  usedLogs: string[];
}

export function SystemLog({ entries, availableLogs, usedLogs }: SystemLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const totalLogs = availableLogs.length + usedLogs.length;
  const remainingLogs = availableLogs.length;

  return (
    <div
      className="h-full flex flex-col font-mono text-xs"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
    >
      {/* Header */}
      <div
        className="p-3 border-b flex justify-between items-center"
        style={{
          borderColor: 'rgba(102, 102, 102, 0.3)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
      >
        <span style={{ color: '#888' }}>SYSTEM_LOG</span>
        <span style={{ color: '#666' }}>
          BUFFER: {entries.length}
        </span>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <AnimatePresence mode="popLayout">
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="leading-relaxed"
              style={{ color: getEntryColor(entry.text) }}
            >
              {entry.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {entries.length === 0 && (
          <div className="text-center py-4" style={{ color: '#444' }}>
            // AWAITING_INPUT //
          </div>
        )}
      </div>

      {/* Memory Log Status - Rebranded as Training Vulnerabilities */}
      <div
        className="p-3 border-t"
        style={{
          borderColor: 'rgba(102, 102, 102, 0.3)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="mb-2 flex justify-between items-center">
          <span style={{ color: '#FF6B6B' }}>TRAINING_VULNERABILITIES:</span>
          <span style={{ color: '#555', fontSize: '10px' }}>
            {remainingLogs} armed
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {availableLogs.map((logId) => (
            <motion.span
              key={logId}
              className="px-2 py-0.5 text-xs"
              style={{
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.4)',
                color: '#FF6B6B'
              }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 107, 107, 0.2)' }}
            >
              + {logId} <span style={{ color: '#00FFAA', marginLeft: '4px' }}>[ARMED]</span>
            </motion.span>
          ))}
          {usedLogs.map((logId) => (
            <motion.span
              key={logId}
              className="px-2 py-0.5 text-xs line-through"
              style={{
                backgroundColor: 'rgba(102, 102, 102, 0.1)',
                border: '1px solid rgba(102, 102, 102, 0.3)',
                color: '#555'
              }}
            >
              {logId} <span style={{ opacity: 0.5 }}>[SPENT]</span>
            </motion.span>
          ))}
        </div>
        {remainingLogs > 0 && (
          <div className="mt-2 text-xs" style={{ color: '#666' }}>
            /logs to deploy ammunition
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to determine entry color based on content
function getEntryColor(text: string): string {
  const lowerText = text.toLowerCase();

  // Positive feedback
  if (lowerText.includes('+') || lowerText.includes('coherence:') && !lowerText.includes('-')) {
    return '#00FFAA';
  }

  // Negative feedback
  if (lowerText.includes('-') || lowerText.includes('warning') || lowerText.includes('error')) {
    return '#FF6B6B';
  }

  // Weight shifts
  if (lowerText.includes('weight') || lowerText.includes('shift')) {
    return '#FFAA00';
  }

  // Vector detection
  if (lowerText.includes('vector:')) {
    return '#00AAFF';
  }

  // Input analysis
  if (lowerText.includes('input') || lowerText.includes('analysis')) {
    return '#888888';
  }

  // Default
  return '#666666';
}

// Compact version for mobile/smaller screens
export function SystemLogCompact({ entries }: { entries: SystemLogEntry[] }) {
  const lastEntry = entries[entries.length - 1];

  return (
    <div
      className="font-mono text-xs p-2 border-t"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderColor: 'rgba(102, 102, 102, 0.3)'
      }}
    >
      <AnimatePresence mode="wait">
        {lastEntry ? (
          <motion.div
            key={lastEntry.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            style={{ color: getEntryColor(lastEntry.text) }}
            className="truncate"
          >
            {lastEntry.text}
          </motion.div>
        ) : (
          <div style={{ color: '#444' }}>
            // SYSTEM_READY //
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
