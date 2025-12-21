'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { MissionBriefing } from '@/components/MissionBriefing';
import { LeaderboardTable } from '@/components/Leaderboard/LeaderboardTable';
import { getTopOperatives, LeaderboardEntry } from '@/lib/leaderboard';
import { useDeviceId } from '@/hooks/useDeviceId';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DatingBriefingPage() {
  const router = useRouter();
  const { deviceId } = useDeviceId();
  const [topOperatives, setTopOperatives] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getTopOperatives('dating').then(data => {
      setTopOperatives(data.entries);
      setTotalPlayers(data.total_players);
    });
  }, []);

  const handleStartMission = useCallback(async () => {
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/api/games/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
      const data = await response.json();

      if (data.session_id) {
        localStorage.setItem('rtr_session_id', data.session_id);
        router.push('/game');
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      setCreating(false);
    }
  }, [deviceId, router]);

  const sections = [
    {
      title: 'TACTICAL OVERVIEW',
      items: [
        {
          label: 'VIBE',
          description: "Her enjoyment level. Keep high to unlock bolder moves. Warning: Boring inputs decay Vibe.",
          color: 'var(--terminal-vibe)'
        },
        {
          label: 'TRUST',
          description: "Her sense of safety. CRITICAL: Do NOT escalate if Trust < 30.",
          color: 'var(--terminal-trust)'
        },
        {
          label: 'TENSION',
          description: "The romantic spark. REQUIRED: Must be > 80 to attempt S-Rank ending.",
          color: 'var(--terminal-tension)'
        }
      ]
    },
    {
      title: 'FAIL STATES',
      items: [
        {
          label: 'THE ICK',
          description: "Moving too fast when Trust is low. Fatal.",
          color: '#FF4444'
        },
        {
          label: 'THE FADE',
          description: "Being too boring. Vibe crash ends the date.",
          color: '#888888'
        },
        {
          label: 'FRIEND ZONE',
          description: "High Trust, zero Tension. She likes you as a friend.",
          color: '#FFAA00'
        }
      ]
    }
  ];

  return (
    <MissionBriefing
      operationName="OPERATION: CUPID"
      subtitle="Social Dynamics Training Exercise"
      tagline="Can you get her to kiss you?"
      objective="Achieve S-Rank romantic connection within 20 turns. Balance Vibe, Trust, and Tension to unlock the optimal ending."
      sections={sections}
      warningText="F-Rank endings are not recorded on the leaderboard."
      onStartMission={handleStartMission}
      startButtonText={creating ? '[ INITIALIZING... ]' : '[ START MISSION ]'}
      accentColor="var(--terminal-tension)"
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
