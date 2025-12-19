'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AbilityType, ABILITY_COSTS } from '@/lib/wingman';

interface AbilityPanelProps {
  cpu: number;
  maxCpu?: number;
  onUseAbility: (ability: AbilityType, hintText?: string) => Promise<void>;
  disabled?: boolean;
  lastResult?: { ability: string; result: string } | null;
}

interface AbilityConfig {
  id: AbilityType;
  name: string;
  cost: number;
  description: string;
  color: string;
  requiresInput?: boolean;
}

const ABILITIES: AbilityConfig[] = [
  {
    id: 'scan_emotion',
    name: 'SCAN EMOTION',
    cost: ABILITY_COSTS.scan_emotion,
    description: "Reveal Chloe's hidden mood",
    color: 'var(--terminal-vibe)',
  },
  {
    id: 'intel_drop',
    name: 'INTEL DROP',
    cost: ABILITY_COSTS.intel_drop,
    description: 'Send a hint to the Dater',
    color: 'var(--terminal-trust)',
    requiresInput: true,
  },
  {
    id: 'emergency_vibe',
    name: 'EMERGENCY VIBE',
    cost: ABILITY_COSTS.emergency_vibe,
    description: 'Instantly boost +15 Vibe',
    color: 'var(--terminal-tension)',
  },
];

export function AbilityPanel({
  cpu,
  maxCpu = 100,
  onUseAbility,
  disabled,
  lastResult,
}: AbilityPanelProps) {
  const [loading, setLoading] = useState<AbilityType | null>(null);
  const [showIntelInput, setShowIntelInput] = useState(false);
  const [intelText, setIntelText] = useState('');

  const handleAbilityClick = async (ability: AbilityConfig) => {
    if (disabled || loading || cpu < ability.cost) return;

    // If intel drop, show input first
    if (ability.requiresInput && !showIntelInput) {
      setShowIntelInput(true);
      return;
    }

    setLoading(ability.id);
    try {
      await onUseAbility(ability.id, ability.requiresInput ? intelText : undefined);
      if (ability.requiresInput) {
        setShowIntelInput(false);
        setIntelText('');
      }
    } finally {
      setLoading(null);
    }
  };

  const cancelIntel = () => {
    setShowIntelInput(false);
    setIntelText('');
  };

  const cpuPercentage = (cpu / maxCpu) * 100;

  return (
    <div
      className="p-4 border-t"
      style={{ borderColor: 'var(--terminal-dim)' }}
    >
      {/* CPU Meter */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2 font-mono text-xs">
          <span style={{ color: 'var(--terminal-dim)' }}>[ CPU ]</span>
          <span style={{ color: 'var(--terminal-vibe)' }}>{cpu} / {maxCpu}</span>
        </div>
        <div
          className="h-3 relative overflow-hidden"
          style={{ backgroundColor: 'rgba(102, 102, 102, 0.3)' }}
        >
          <motion.div
            className="h-full"
            style={{ backgroundColor: 'var(--terminal-vibe)' }}
            initial={{ width: 0 }}
            animate={{ width: `${cpuPercentage}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
        <div
          className="mt-1 font-mono text-xs text-center"
          style={{ color: 'var(--terminal-dim)' }}
        >
          +10 CPU per turn
        </div>
      </div>

      {/* Last Result Display */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-4 p-3 border-2 font-mono text-sm"
            style={{
              borderColor: 'var(--terminal-vibe)',
              backgroundColor: 'rgba(255, 111, 97, 0.1)',
            }}
          >
            <div
              className="text-xs mb-1"
              style={{ color: 'var(--terminal-dim)' }}
            >
              [ {lastResult.ability.toUpperCase().replace('_', ' ')} RESULT ]
            </div>
            <div style={{ color: 'var(--terminal-text)' }}>
              {lastResult.result}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intel Input (when active) */}
      <AnimatePresence>
        {showIntelInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div
              className="p-3 border-2"
              style={{
                borderColor: 'var(--terminal-trust)',
                backgroundColor: 'rgba(0, 255, 157, 0.05)',
              }}
            >
              <label
                className="block font-mono text-xs mb-2"
                style={{ color: 'var(--terminal-trust)' }}
              >
                [ COMPOSE INTEL ]
              </label>
              <input
                type="text"
                value={intelText}
                onChange={(e) => setIntelText(e.target.value)}
                placeholder="Type your hint for the Dater..."
                className="w-full px-3 py-2 font-mono text-sm bg-transparent border focus:outline-none"
                style={{
                  borderColor: 'var(--terminal-dim)',
                  color: 'var(--terminal-text)',
                }}
                autoFocus
                maxLength={100}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAbilityClick(ABILITIES[1])}
                  disabled={!intelText.trim() || loading === 'intel_drop'}
                  className="flex-1 py-2 font-mono text-xs border-2 disabled:opacity-30 transition-opacity"
                  style={{
                    borderColor: 'var(--terminal-trust)',
                    color: 'var(--terminal-trust)',
                  }}
                >
                  {loading === 'intel_drop' ? '[ SENDING... ]' : '[ SEND INTEL ]'}
                </button>
                <button
                  onClick={cancelIntel}
                  className="px-4 py-2 font-mono text-xs border transition-opacity hover:opacity-70"
                  style={{
                    borderColor: 'var(--terminal-dim)',
                    color: 'var(--terminal-dim)',
                  }}
                >
                  [ X ]
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ability Buttons */}
      {!showIntelInput && (
        <div className="space-y-2">
          <div
            className="font-mono text-xs mb-2"
            style={{ color: 'var(--terminal-dim)' }}
          >
            [ ABILITIES ]
          </div>
          {ABILITIES.map((ability) => {
            const canAfford = cpu >= ability.cost;
            const isLoading = loading === ability.id;

            return (
              <motion.button
                key={ability.id}
                onClick={() => handleAbilityClick(ability)}
                disabled={disabled || isLoading || !canAfford}
                whileHover={canAfford && !disabled ? { scale: 1.01 } : {}}
                whileTap={canAfford && !disabled ? { scale: 0.99 } : {}}
                className="w-full p-3 border-2 font-mono text-left transition-opacity disabled:opacity-30"
                style={{
                  borderColor: ability.color,
                  backgroundColor: canAfford ? `${ability.color}10` : 'transparent',
                }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ color: ability.color }}>
                    {isLoading ? '[ USING... ]' : `[ ${ability.name} ]`}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: canAfford ? ability.color : 'var(--terminal-dim)' }}
                  >
                    {ability.cost} CPU
                  </span>
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: 'var(--terminal-dim)' }}
                >
                  {ability.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
