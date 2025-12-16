'use client';

import { motion } from 'framer-motion';
import { TypeWriter } from '@/components/ui/TypeWriter';

type MessageType = 'chloe' | 'player' | 'system' | 'intuition';

interface MessageProps {
  type: MessageType;
  text: string;
  isAction?: boolean;
  animate?: boolean;
}

// Parse roleplay text: splits "*action*" and dialogue into separate segments
function parseRoleplayText(text: string): Array<{ type: 'action' | 'dialogue'; text: string }> {
  const segments: Array<{ type: 'action' | 'dialogue'; text: string }> = [];
  const regex = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add dialogue before this action (if any)
    if (match.index > lastIndex) {
      const dialogue = text.slice(lastIndex, match.index).trim();
      if (dialogue) {
        segments.push({ type: 'dialogue', text: dialogue });
      }
    }
    // Add the action
    segments.push({ type: 'action', text: match[1].trim() });
    lastIndex = regex.lastIndex;
  }

  // Add remaining dialogue after last action
  if (lastIndex < text.length) {
    const dialogue = text.slice(lastIndex).trim();
    if (dialogue) {
      segments.push({ type: 'dialogue', text: dialogue });
    }
  }

  // If no segments found, treat entire text as dialogue
  if (segments.length === 0) {
    segments.push({ type: 'dialogue', text: text });
  }

  return segments;
}

export function Message({ type, text, isAction, animate = true }: MessageProps) {
  // Style mappings
  const typeStyles: Record<MessageType, string> = {
    chloe: 'text-left border-l-4 pl-4',
    player: 'text-left border-l-4 pl-4',
    system: 'text-center text-sm',
    intuition: 'text-center text-sm',
  };

  const borderColors: Record<MessageType, string> = {
    chloe: 'border-[var(--terminal-vibe)]',
    player: 'border-[var(--terminal-vibe)]',
    system: '',
    intuition: '',
  };

  const textColors: Record<MessageType, string> = {
    chloe: 'text-[var(--terminal-text)]',
    player: isAction ? 'text-[var(--terminal-tension)] italic' : 'text-[var(--terminal-text)]',
    system: 'text-[var(--terminal-dim)]',
    intuition: 'text-[var(--terminal-vibe)] opacity-80',
  };

  const fontFamily: Record<MessageType, string> = {
    chloe: 'font-serif',
    player: 'font-mono',
    system: 'font-mono',
    intuition: 'font-mono',
  };

  // Determine if we should use typewriter effect
  const useTypewriter = type === 'chloe' && animate;

  // Parse Chloe's text into action/dialogue segments
  const segments = type === 'chloe' ? parseRoleplayText(text) : null;

  // Render parsed segments for Chloe
  const renderChloeContent = () => {
    if (!segments) return null;

    return (
      <div className="space-y-1">
        {segments.map((segment, index) => (
          <div key={index}>
            {segment.type === 'action' ? (
              <span className="block text-[var(--terminal-dim)] italic font-mono text-sm">
                // {segment.text}
              </span>
            ) : (
              <span className="block font-serif">
                {useTypewriter ? (
                  <TypeWriter text={segment.text} speed={25} showCursor={false} />
                ) : (
                  segment.text
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`py-3 ${typeStyles[type]} ${borderColors[type]} ${textColors[type]} ${fontFamily[type]}`}
    >
      {type === 'player' && <span className="text-[var(--terminal-vibe)] mr-1">{'> '}</span>}
      {type === 'intuition' && <span className="mr-1">{'> '}</span>}
      {type === 'system' && <span className="mr-1">[SYS] </span>}

      {type === 'chloe' ? (
        renderChloeContent()
      ) : useTypewriter ? (
        <TypeWriter text={text} speed={25} showCursor={false} />
      ) : (
        <span>{text}</span>
      )}
    </motion.div>
  );
}
