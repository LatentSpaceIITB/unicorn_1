-- Wingman Mode Tables
-- Run this in Supabase SQL Editor

-- Table: wingman_rooms
-- Stores active co-op game rooms
CREATE TABLE IF NOT EXISTS wingman_rooms (
  room_code VARCHAR(4) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  dater_device_id VARCHAR(36) NOT NULL,
  wingman_device_id VARCHAR(36),
  wingman_cpu INT DEFAULT 30,
  status VARCHAR(20) DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: wingman_events
-- Stores real-time events for multiplayer sync
CREATE TABLE IF NOT EXISTS wingman_events (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(4) REFERENCES wingman_rooms(room_code) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wingman_rooms_status ON wingman_rooms(status);
CREATE INDEX IF NOT EXISTS idx_wingman_rooms_session ON wingman_rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_wingman_events_room ON wingman_events(room_code);
CREATE INDEX IF NOT EXISTS idx_wingman_events_created ON wingman_events(created_at DESC);

-- Enable Realtime for wingman tables
ALTER PUBLICATION supabase_realtime ADD TABLE wingman_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE wingman_events;

-- Row Level Security (RLS)
ALTER TABLE wingman_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_events ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (we authenticate via service key on backend)
CREATE POLICY "Allow all wingman_rooms" ON wingman_rooms FOR ALL USING (true);
CREATE POLICY "Allow all wingman_events" ON wingman_events FOR ALL USING (true);

-- Auto-cleanup old rooms (optional - run periodically)
-- DELETE FROM wingman_rooms WHERE created_at < NOW() - INTERVAL '24 hours';
