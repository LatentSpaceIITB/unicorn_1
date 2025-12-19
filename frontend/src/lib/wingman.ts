/**
 * Wingman Mode API client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

export interface CreateRoomResponse {
  room_code: string;
  session_id: string;
  status: string;
}

export interface JoinRoomResponse {
  success: boolean;
  room_code: string;
  session_id: string;
  status: string;
  current_stats: GameStats | null;
}

export interface RoomState {
  room_code: string;
  session_id: string;
  dater_device_id: string;
  wingman_device_id: string | null;
  wingman_cpu: number;
  status: 'waiting' | 'active' | 'ended';
  current_stats: GameStats | null;
}

export interface GameStats {
  vibe: number;
  trust: number;
  tension: number;
  turn: number;
  act: string;
  game_over?: boolean;
}

export interface AbilityResponse {
  success: boolean;
  ability: string;
  result: string;
  cpu_remaining: number;
  effect_data: Record<string, unknown> | null;
}

export type AbilityType = 'scan_emotion' | 'intel_drop' | 'emergency_vibe';

export const ABILITY_COSTS: Record<AbilityType, number> = {
  scan_emotion: 10,
  intel_drop: 20,
  emergency_vibe: 40,
};

// =============================================================================
// Room Management
// =============================================================================

/**
 * Create a new wingman room
 */
export async function createRoom(
  deviceId: string,
  sessionId: string
): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE}/api/wingman/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id: deviceId,
      session_id: sessionId,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create room');
  }

  return res.json();
}

/**
 * Join an existing room as wingman
 */
export async function joinRoom(
  roomCode: string,
  deviceId: string
): Promise<JoinRoomResponse> {
  const res = await fetch(`${API_BASE}/api/wingman/join/${roomCode.toUpperCase()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to join room');
  }

  return res.json();
}

/**
 * Get current room state
 */
export async function getRoomState(roomCode: string): Promise<RoomState> {
  const res = await fetch(`${API_BASE}/api/wingman/${roomCode.toUpperCase()}/state`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get room state');
  }

  return res.json();
}

/**
 * End/delete a room
 */
export async function endRoom(roomCode: string): Promise<void> {
  await fetch(`${API_BASE}/api/wingman/${roomCode.toUpperCase()}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Abilities
// =============================================================================

/**
 * Use a wingman ability
 */
export async function useAbility(
  roomCode: string,
  ability: AbilityType,
  deviceId: string,
  hintText?: string
): Promise<AbilityResponse> {
  const body: Record<string, string> = {
    ability,
    device_id: deviceId,
  };

  if (ability === 'intel_drop' && hintText) {
    body.hint_text = hintText;
  }

  const res = await fetch(`${API_BASE}/api/wingman/${roomCode.toUpperCase()}/ability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to use ability');
  }

  return res.json();
}
