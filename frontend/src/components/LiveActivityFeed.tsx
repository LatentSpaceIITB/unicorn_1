'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ActivityEvent {
  event_type: string;
  game_mode: string;
  rank: string | null;
  ending: string | null;
  timestamp: string;
  display_text: string;
}

interface LiveActivityFeedProps {
  maxItems?: number;
  pollInterval?: number;
}

export function LiveActivityFeed({ maxItems = 5, pollInterval = 8000 }: LiveActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/activity/recent?limit=${maxItems}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, pollInterval);
    return () => clearInterval(interval);
  }, [maxItems, pollInterval]);

  const getEventColor = (event: ActivityEvent): string => {
    if (event.event_type === 'game_start') return '#666666';

    // Color by rank for game_end events
    switch (event.rank) {
      case 'S': return '#00FF88';
      case 'A': return '#00FFAA';
      case 'B': return '#FFAA00';
      case 'C': return '#FF8800';
      case 'D': return '#FF6B6B';
      case 'F': return '#FF4444';
      default: return '#888888';
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="font-mono text-xs" style={{ color: '#444' }}>
        // SCANNING_NETWORK... //
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="font-mono text-xs" style={{ color: '#444' }}>
        // NO_RECENT_ACTIVITY //
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AnimatePresence mode="popLayout">
        {events.map((event, index) => (
          <motion.div
            key={`${event.timestamp}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: index * 0.05 }}
            className="font-mono text-xs truncate"
            style={{ color: getEventColor(event) }}
          >
            {event.display_text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
