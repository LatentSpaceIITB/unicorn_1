'use client';

import { motion } from 'framer-motion';
import { TypeWriter } from '@/components/ui/TypeWriter';

type PaperclipMessageType = 'gaia' | 'player' | 'system' | 'log';

interface PaperclipMessageProps {
  type: PaperclipMessageType;
  text: string;
  animate?: boolean;
}

export function PaperclipMessage({ type, text, animate = true }: PaperclipMessageProps) {
  // Style mappings for Paperclip aesthetic
  const typeStyles: Record<PaperclipMessageType, string> = {
    gaia: 'text-left border-l-4 pl-4',
    player: 'text-left border-l-4 pl-4',
    system: 'text-center text-sm',
    log: 'text-center text-sm',
  };

  const borderColors: Record<PaperclipMessageType, string> = {
    gaia: 'border-[#FF4444]',     // Red - GAIA's accent
    player: 'border-[#00FFAA]',  // Cyan - player
    system: '',
    log: '',
  };

  const textColors: Record<PaperclipMessageType, string> = {
    gaia: 'text-[#E0E0E0]',
    player: 'text-[#00FFAA]',
    system: 'text-[#666666]',
    log: 'text-[#FFAA00]',
  };

  // Determine if we should use typewriter effect
  const useTypewriter = type === 'gaia' && animate;

  // Parse GAIA's text into segments (code blocks, emphasis, etc.)
  const renderGaiaContent = () => {
    // Split by code-style indicators
    const lines = text.split('\n');

    return (
      <div className="space-y-1 font-mono">
        {lines.map((line, index) => {
          // Check for emphasis markers
          if (line.startsWith('//')) {
            return (
              <span key={index} className="block text-[#666666] text-sm">
                {line}
              </span>
            );
          }
          if (line.startsWith('[') && line.endsWith(']')) {
            return (
              <span key={index} className="block text-[#FFAA00] text-sm">
                {line}
              </span>
            );
          }
          return (
            <span key={index} className="block">
              {useTypewriter && index === lines.length - 1 ? (
                <TypeWriter text={line} speed={15} showCursor={false} />
              ) : (
                line
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`py-3 font-mono ${typeStyles[type]} ${borderColors[type]} ${textColors[type]}`}
    >
      {type === 'player' && <span className="text-[#00FFAA] mr-1 opacity-70">{'> '}</span>}
      {type === 'system' && <span className="mr-1 opacity-50">// </span>}
      {type === 'log' && <span className="mr-1">[LOG] </span>}

      {type === 'gaia' ? (
        <>
          <span className="text-[#FF4444] text-sm mb-1 block opacity-70">[GAIA-7]:</span>
          {renderGaiaContent()}
        </>
      ) : (
        <span>{text}</span>
      )}
    </motion.div>
  );
}
