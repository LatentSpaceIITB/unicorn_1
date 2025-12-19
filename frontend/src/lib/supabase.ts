/**
 * Supabase client for frontend (Realtime subscriptions)
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Subscribe to wingman room events
 */
export function subscribeToRoom(
  roomCode: string,
  onEvent: (event: WingmanEvent) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomCode}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'wingman_events',
        filter: `room_code=eq.${roomCode}`,
      },
      (payload) => {
        const event = payload.new as WingmanEventRow;
        onEvent({
          type: event.event_type,
          payload: event.payload,
          created_at: event.created_at,
        });
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to room state changes (wingman joining, status updates)
 */
export function subscribeToRoomState(
  roomCode: string,
  onUpdate: (room: WingmanRoom) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`room_state:${roomCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wingman_rooms',
        filter: `room_code=eq.${roomCode}`,
      },
      (payload) => {
        onUpdate(payload.new as WingmanRoom);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

// Types
export interface WingmanEvent {
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface WingmanEventRow {
  id: number;
  room_code: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface WingmanRoom {
  room_code: string;
  session_id: string;
  dater_device_id: string;
  wingman_device_id: string | null;
  wingman_cpu: number;
  status: 'waiting' | 'active' | 'ended';
  created_at: string;
  updated_at: string;
}
