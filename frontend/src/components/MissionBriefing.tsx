'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { TypeWriter } from '@/components/ui/TypeWriter';

interface BriefingSection {
  title: string;
  items: { label: string; description: string; color?: string }[];
}

interface MissionBriefingProps {
  operationName: string;
  subtitle: string;
  tagline?: string;
  objective: string;
  sections: BriefingSection[];
  warningText?: string;
  onStartMission: () => void;
  startButtonText: string;
  accentColor: string;
  children?: ReactNode;
}

export function MissionBriefing({
  operationName,
  subtitle,
  tagline,
  objective,
  sections,
  warningText,
  onStartMission,
  startButtonText,
  accentColor,
  children
}: MissionBriefingProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#050505' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl border-2 font-mono"
        style={{ borderColor: '#333', backgroundColor: '#0a0a0a' }}
      >
        {/* Header */}
        <div
          className="p-4 border-b"
          style={{ borderColor: '#333', backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs" style={{ color: '#666' }}>//</span>
            <span className="text-xs tracking-widest" style={{ color: accentColor }}>
              MISSION BRIEFING
            </span>
          </div>
          <h1 className="text-xl tracking-wider" style={{ color: '#E0E0E0' }}>
            {operationName}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            {subtitle}
          </p>
          {tagline && (
            <p className="text-sm mt-2" style={{ color: accentColor }}>
              &gt; <TypeWriter text={tagline} speed={30} delay={500} />
            </p>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Objective */}
          <div>
            <div className="text-xs mb-2" style={{ color: '#666' }}>
              OBJECTIVE:
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#E0E0E0' }}>
              {objective}
            </p>
          </div>

          {/* Sections */}
          {sections.map((section, idx) => (
            <div key={idx}>
              <div
                className="text-xs mb-3 pb-1 border-b"
                style={{ color: '#666', borderColor: '#333' }}
              >
                {section.title}:
              </div>
              <div className="space-y-3">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex gap-3 text-sm">
                    <span
                      className="font-bold flex-shrink-0 w-24"
                      style={{ color: item.color || accentColor }}
                    >
                      {item.label}
                    </span>
                    <span style={{ color: '#888' }}>
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Warning */}
          {warningText && (
            <div
              className="p-3 border-l-2 text-xs"
              style={{
                borderColor: '#FF4444',
                backgroundColor: 'rgba(255, 68, 68, 0.05)',
                color: '#FF6B6B'
              }}
            >
              WARNING: {warningText}
            </div>
          )}

          {/* Children slot for leaderboard preview */}
          {children}
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 border-t flex flex-col sm:flex-row gap-3"
          style={{ borderColor: '#333' }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartMission}
            className="flex-1 px-6 py-3 border-2 text-sm tracking-wider transition-colors"
            style={{
              borderColor: accentColor,
              color: accentColor,
              backgroundColor: 'transparent'
            }}
          >
            {startButtonText}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
