'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWingmanRoom } from '@/hooks/useWingmanRoom';
import { useDeviceId } from '@/hooks/useDeviceId';
import { useAbility, AbilityType } from '@/lib/wingman';
import { StatBar } from '@/components/HUD/StatBar';
import { AbilityPanel } from '@/components/Wingman/AbilityPanel';
import { Receipt } from '@/components/EndScreen/Receipt';
import { AtmosphereLayer } from '@/components/Effects';

export default function HandlerDashboardPage() {
  const params = useParams();
  const roomCode = params.code as string;
  const { deviceId } = useDeviceId();

  // Wingman room hook (for realtime sync)
  const {
    connected,
    roomStatus,
    wingmanOnline,
    stats,
    cpu,
    messages,
    gameOver,
    ending,
  } = useWingmanRoom({ roomCode, role: 'handler' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastResult, setLastResult] = useState<{ ability: string; result: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear last result after 10 seconds
  useEffect(() => {
    if (lastResult) {
      const timer = setTimeout(() => setLastResult(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [lastResult]);

  // Handle ability usage
  const handleUseAbility = useCallback(async (ability: AbilityType, hintText?: string) => {
    if (!deviceId) return;

    try {
      const result = await useAbility(roomCode, ability, deviceId, hintText);
      if (result.success) {
        setLastResult({
          ability: result.ability,
          result: result.result,
        });
      }
    } catch (err) {
      console.error('Failed to use ability:', err);
      setLastResult({
        ability,
        result: err instanceof Error ? err.message : 'Failed to use ability',
      });
    }
  }, [deviceId, roomCode]);

  // Calculate turn urgency color
  const getTurnColor = (currentTurn: number) => {
    const remaining = 21 - currentTurn;
    if (remaining > 10) return 'var(--terminal-success)';
    if (remaining > 5) return 'var(--terminal-trust)';
    if (remaining > 2) return '#FF8C00';
    return 'var(--terminal-tension)';
  };

  // Loading state
  if (!connected) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--terminal-bg)' }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="font-mono"
          style={{ color: 'var(--terminal-dim)' }}
        >
          [ CONNECTING TO MISSION... ]
        </motion.div>
      </main>
    );
  }

  // Game over - show receipt
  if (gameOver && ending && stats) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--terminal-bg)' }}
      >
        <Receipt
          rank={ending.split('_')[0] || 'C'}
          ending={ending}
          stats={{
            vibe: stats.vibe,
            trust: stats.trust,
            tension: stats.tension,
          }}
          turnCount={stats.turn}
          onPlayAgain={() => window.location.href = '/wingman'}
          coopMode={true}
        />
      </main>
    );
  }

  const turn = stats?.turn || 1;
  const turnsLeft = 21 - turn;
  const turnDisplay = turnsLeft <= 5 ? `${turnsLeft} LEFT` : `TURN ${turn}/20`;
  const turnColor = getTurnColor(turn);
  const isUrgent = turnsLeft <= 3;
  const actDisplay = stats?.act?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Coffee Shop';

  return (
    <>
      <AtmosphereLayer intensity="normal" />

      <main
        className="min-h-screen flex flex-col lg:flex-row"
        style={{
          backgroundColor: 'transparent',
          position: 'relative',
          zIndex: 5,
        }}
      >
        {/* Left Panel: Stats + Abilities */}
        <div
          className="lg:w-80 lg:min-h-screen border-b lg:border-b-0 lg:border-r flex flex-col"
          style={{
            backgroundColor: 'var(--terminal-bg)',
            borderColor: 'var(--terminal-dim)',
          }}
        >
          {/* Header */}
          <div
            className="p-4 border-b"
            style={{ borderColor: 'var(--terminal-dim)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="font-mono text-xs"
                style={{ color: 'var(--terminal-trust)' }}
              >
                [ HANDLER VIEW ]
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--terminal-trust)' }}
              />
            </div>
            <div
              className="font-mono text-xs"
              style={{ color: 'var(--terminal-dim)' }}
            >
              ROOM: {roomCode}
            </div>
          </div>

          {/* Stats Dashboard */}
          <div
            className="p-4 border-b"
            style={{ borderColor: 'var(--terminal-dim)' }}
          >
            {/* Turn Counter */}
            <div className="flex justify-between items-center font-mono mb-4">
              <motion.span
                className="text-sm font-bold"
                style={{ color: turnColor }}
                animate={isUrgent ? {
                  scale: [1, 1.05, 1],
                  opacity: [1, 0.8, 1],
                } : {}}
                transition={isUrgent ? {
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
              >
                {turnDisplay}
              </motion.span>
              <span className="text-xs" style={{ color: 'var(--terminal-vibe)' }}>
                {actDisplay}
              </span>
            </div>

            {/* Stat Bars */}
            <div className="space-y-2">
              <StatBar
                label="VIBE"
                value={stats?.vibe || 50}
                color="var(--terminal-vibe)"
              />
              <StatBar
                label="TRUST"
                value={stats?.trust || 25}
                color="var(--terminal-trust)"
              />
              <StatBar
                label="TENSION"
                value={stats?.tension || 10}
                color="var(--terminal-tension)"
              />
            </div>
          </div>

          {/* Ability Panel */}
          <div className="flex-1 overflow-y-auto">
            <AbilityPanel
              cpu={cpu}
              onUseAbility={handleUseAbility}
              disabled={gameOver}
              lastResult={lastResult}
            />
          </div>
        </div>

        {/* Right Panel: Chat Log */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Header */}
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{
              backgroundColor: 'var(--terminal-bg)',
              borderColor: 'var(--terminal-dim)',
            }}
          >
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--terminal-dim)' }}
            >
              [ LIVE FEED - READ ONLY ]
            </span>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--terminal-tension)' }}
              />
              <span
                className="font-mono text-xs"
                style={{ color: 'var(--terminal-dim)' }}
              >
                AGENT {wingmanOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Initial message */}
              {messages.length === 0 && (
                <div
                  className="font-mono text-sm text-center py-8"
                  style={{ color: 'var(--terminal-dim)' }}
                >
                  [ WAITING FOR CONVERSATION TO BEGIN... ]
                </div>
              )}

              {/* Messages */}
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`py-3 ${
                      message.type === 'player'
                        ? 'text-right'
                        : 'text-left border-l-4 pl-4'
                    }`}
                    style={{
                      borderColor: message.type === 'chloe' ? 'var(--terminal-vibe)' : undefined,
                    }}
                  >
                    {/* Label */}
                    <div
                      className="font-mono text-xs mb-1"
                      style={{
                        color: message.type === 'player'
                          ? 'var(--terminal-trust)'
                          : 'var(--terminal-vibe)',
                      }}
                    >
                      {message.type === 'player' ? '[ AGENT ]' : '[ CHLOE ]'}
                    </div>
                    {/* Message Text */}
                    <div
                      className={`font-serif text-sm ${
                        message.type === 'player' ? 'inline-block text-left' : ''
                      }`}
                      style={{
                        color: 'var(--terminal-text)',
                        maxWidth: message.type === 'player' ? '80%' : '100%',
                      }}
                    >
                      {message.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-3 text-right"
                >
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="font-mono text-xs"
                    style={{ color: 'var(--terminal-dim)' }}
                  >
                    Agent is typing...
                  </motion.span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div
            className="p-3 border-t font-mono text-xs flex items-center justify-center gap-4"
            style={{
              backgroundColor: 'var(--terminal-bg)',
              borderColor: 'var(--terminal-dim)',
              color: 'var(--terminal-dim)',
            }}
          >
            <span>You are the HANDLER</span>
            <span>•</span>
            <span>Watch the stats, use abilities wisely</span>
          </div>
        </div>
      </main>
    </>
  );
}
