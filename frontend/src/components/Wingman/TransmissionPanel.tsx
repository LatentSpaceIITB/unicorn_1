'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface TransmissionPanelProps {
  intel: string | null;
  handlerOnline: boolean;
  onDismiss?: () => void;
}

export function TransmissionPanel({
  intel,
  handlerOnline,
  onDismiss,
}: TransmissionPanelProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-20">
      {/* Handler Status */}
      <div
        className="px-4 py-2 font-mono text-xs flex items-center justify-between"
        style={{ backgroundColor: 'var(--terminal-bg)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: handlerOnline
                ? 'var(--terminal-trust)'
                : 'var(--terminal-dim)',
            }}
          />
          <span style={{ color: 'var(--terminal-dim)' }}>
            HANDLER: {handlerOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <span style={{ color: 'var(--terminal-dim)' }}>[ CO-OP MODE ]</span>
      </div>

      {/* Intel Transmission */}
      <AnimatePresence>
        {intel && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="mx-4 mb-2"
          >
            <div
              className="p-3 border-2 font-mono"
              style={{
                borderColor: 'var(--terminal-trust)',
                backgroundColor: 'rgba(0, 255, 157, 0.1)',
              }}
            >
              <div
                className="text-xs mb-1 flex items-center justify-between"
                style={{ color: 'var(--terminal-trust)' }}
              >
                <span>[ INCOMING TRANSMISSION ]</span>
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="hover:opacity-70"
                    style={{ color: 'var(--terminal-dim)' }}
                  >
                    [X]
                  </button>
                )}
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm"
                style={{ color: 'var(--terminal-text)' }}
              >
                &gt; &quot;{intel}&quot;
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
