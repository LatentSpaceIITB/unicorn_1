/**
 * API client for Read the Room game
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CreateGameResponse {
  session_id: string;
  message: string;
}

export interface StatChanges {
  vibe: number;
  trust: number;
  tension: number;
}

export interface CurrentStats {
  vibe: number;
  trust: number;
  tension: number;
  turn: number;
  act: string;
  lockout_turns: number;
}

export interface Tags {
  intent: string;
  modifier: string;
  tone: string;
  topic: string;
  flags: string[];
}

export interface CriticalEvent {
  turn_number: number;
  event_type: string;
  description: string;
  stat_impact: string;
}

export interface TurnResponse {
  success: boolean;
  turn_number: number;
  tags: Tags | null;
  stat_changes: StatChanges;
  current_stats: CurrentStats;
  chloe_response: string;
  intuition_hint: string | null;
  critical_event: CriticalEvent | null;
  game_over: boolean;
  ending: string | null;
  ending_message: string | null;
}

export interface BreakdownResponse {
  breakdown: string;
  final_stats: CurrentStats;
  ending: string;
  rank: string;
  killer_quote: string | null;
}

export interface GameStateResponse {
  session_id: string;
  current_stats: CurrentStats;
  history_length: number;
  game_over: boolean;
}

/**
 * Create a new game session
 */
export async function createGame(): Promise<CreateGameResponse> {
  const res = await fetch(`${API_BASE}/api/games/`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to create game');
  }
  return res.json();
}

/**
 * Get current game state
 */
export async function getGameState(sessionId: string): Promise<GameStateResponse> {
  const res = await fetch(`${API_BASE}/api/games/${sessionId}`);
  if (!res.ok) {
    throw new Error('Session not found');
  }
  return res.json();
}

/**
 * Submit a turn
 */
export async function submitTurn(
  sessionId: string,
  userInput: string,
  inputMode: 'dialogue' | 'action'
): Promise<TurnResponse> {
  const res = await fetch(`${API_BASE}/api/games/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_input: userInput,
      input_mode: inputMode
    }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to process turn');
  }
  return res.json();
}

/**
 * Get post-game breakdown
 */
export async function getBreakdown(sessionId: string): Promise<BreakdownResponse> {
  const res = await fetch(`${API_BASE}/api/games/${sessionId}/breakdown`);
  if (!res.ok) {
    throw new Error('Failed to get breakdown');
  }
  return res.json();
}

/**
 * Delete a game session
 */
export async function deleteGame(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/games/${sessionId}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// V2: Silence Timer API
// =============================================================================

export interface SilenceResponse {
  success: boolean;
  response: string;
  current_stats: CurrentStats;
  game_over: boolean;
  ending: string | null;
  ending_message: string | null;
}

/**
 * Apply silence penalty when player takes too long to respond
 */
export async function applySilencePenalty(
  sessionId: string,
  level: 'awkward' | 'very_awkward' | 'critical' | 'ghost'
): Promise<SilenceResponse> {
  const res = await fetch(`${API_BASE}/api/games/${sessionId}/silence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to apply silence penalty');
  }
  return res.json();
}
