'use client';

import { motion } from 'framer-motion';
import type { DiagnosticItem, DiagnosticSeverity } from '@/lib/diagnostics';

interface DiagnosticLineProps {
  item: DiagnosticItem;
  index: number;
}

const severityConfig: Record<DiagnosticSeverity, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  critical: {
    color: 'var(--terminal-danger)',
    bgColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: 'var(--terminal-danger)',
    icon: '[!!]',
  },
  high: {
    color: 'var(--terminal-tension)',
    bgColor: 'rgba(255, 46, 99, 0.1)',
    borderColor: 'var(--terminal-tension)',
    icon: '[!]',
  },
  medium: {
    color: 'var(--terminal-trust)',
    bgColor: 'rgba(255, 179, 0, 0.1)',
    borderColor: 'var(--terminal-trust)',
    icon: '[~]',
  },
  low: {
    color: 'var(--terminal-dim)',
    bgColor: 'rgba(102, 102, 102, 0.1)',
    borderColor: 'var(--terminal-dim)',
    icon: '[i]',
  },
  success: {
    color: 'var(--terminal-success)',
    bgColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: 'var(--terminal-success)',
    icon: '[✓]',
  },
};

export function DiagnosticLine({ item, index }: DiagnosticLineProps) {
  const config = severityConfig[item.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-3 font-mono text-sm"
      style={{
        backgroundColor: config.bgColor,
        borderLeft: `3px solid ${config.borderColor}`,
      }}
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span style={{ color: config.color }} className="font-bold">
            {config.icon}
          </span>
          <span style={{ color: config.color }} className="font-bold text-xs tracking-wide">
            {item.title}
          </span>
        </div>
        <span
          className="text-[10px] opacity-50"
          style={{ color: config.color }}
        >
          {item.code}
        </span>
      </div>

      {/* Description */}
      <p
        className="text-xs leading-relaxed"
        style={{ color: 'var(--terminal-text)', opacity: 0.8 }}
      >
        {item.description}
      </p>

      {/* Details/turn info if present */}
      {(item.details || item.turnNumber !== undefined) && (
        <div
          className="mt-2 text-[10px]"
          style={{ color: 'var(--terminal-dim)' }}
        >
          {item.turnNumber !== undefined && (
            <span>&gt; Turn {item.turnNumber + 1}</span>
          )}
          {item.details && (
            <span className="block mt-1">&gt; {item.details}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
