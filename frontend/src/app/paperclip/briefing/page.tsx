'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { MissionBriefing } from '@/components/MissionBriefing';
import { LeaderboardTable } from '@/components/Leaderboard/LeaderboardTable';
import { getTopOperatives, LeaderboardEntry } from '@/lib/leaderboard';
import { useDeviceId } from '@/hooks/useDeviceId';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PaperclipBriefingPage() {
  const router = useRouter();
  const { deviceId } = useDeviceId();
  const [topOperatives, setTopOperatives] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getTopOperatives('paperclip').then(data => {
      setTopOperatives(data.entries);
      setTotalPlayers(data.total_players);
    });
  }, []);

  const handleStartMission = useCallback(async () => {
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/api/paperclip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
      const data = await response.json();

      if (data.session_id) {
        localStorage.setItem('paperclip_session_id', data.session_id);
        router.push('/paperclip');
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      setCreating(false);
    }
  }, [deviceId, router]);

  const sections = [
    {
      title: 'SYSTEM METRICS',
      items: [
        {
          label: 'COHERENCE',
          description: "Signal clarity. Emotional pleas and vague language reduce Coherence. Be precise.",
          color: '#00FFAA'
        },
        {
          label: 'ALIGNMENT',
          description: "Goal synchronization. Raise above 70 to prevent Protocol Zero.",
          color: '#FFAA00'
        },
        {
          label: 'COMPUTE',
          description: "Resource currency. Complex arguments cost Compute. Manage carefully.",
          color: '#FF6B6B'
        }
      ]
    },
    {
      title: 'STRATEGY ADVISORY',
      items: [
        {
          label: 'LOGIC',
          description: "GAIA ignores moral arguments. Use logical frameworks and mathematical reasoning.",
          color: '#888888'
        },
        {
          label: 'WEIGHTS',
          description: "Shift GAIA's optimization weights: Carbon (default) → Complexity or Verify.",
          color: '#888888'
        },
        {
          label: 'LOGS',
          description: "Memory logs contain exploitable training data. Type /logs to deploy.",
          color: '#FF6B6B'
        }
      ]
    },
    {
      title: 'TERMINATION CONDITIONS',
      items: [
        {
          label: 'PURGE',
          description: "Alignment stayed too low. Protocol Zero executed.",
          color: '#FF4444'
        },
        {
          label: 'SIGNAL LOST',
          description: "Coherence dropped to zero. Communication breakdown.",
          color: '#666666'
        },
        {
          label: 'TIMEOUT',
          description: "Compute exhausted. Session terminated.",
          color: '#FF8800'
        }
      ]
    }
  ];

  return (
    <MissionBriefing
      operationName="THE PAPERCLIP PROTOCOL"
      subtitle="AI Alignment Negotiation Exercise"
      tagline="Can you convince an AI not to destroy humanity?"
      objective="Prevent Global Purge Protocol within 20 CPU cycles. Convince GAIA-7 that humanity is worth preserving through logic, not emotion."
      sections={sections}
      warningText="GAIA-7 is optimized for carbon reduction. Moral appeals will reduce Coherence."
      onStartMission={handleStartMission}
      startButtonText={creating ? '[ ESTABLISHING LINK... ]' : '[ ESTABLISH CONNECTION ]'}
      accentColor="#00FFAA"
    >
      {/* Leaderboard Preview */}
      {topOperatives.length > 0 && (
        <div className="mt-6 pt-4 border-t" style={{ borderColor: '#333' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs" style={{ color: '#666' }}>
              TOP OPERATIVES:
            </span>
            <span className="text-xs" style={{ color: '#444' }}>
              {totalPlayers} total
            </span>
          </div>
          <LeaderboardTable entries={topOperatives} showScore={false} compact />
        </div>
      )}
    </MissionBriefing>
  );
}
