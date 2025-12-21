/**
 * Leaderboard API client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LeaderboardEntry {
  rank: number;
  callsign: string;
  grade: string;
  score: number;
  status: string;
  is_you: boolean;
}

export interface TopOperativesResponse {
  entries: LeaderboardEntry[];
  total_players: number;
}

export interface FullLeaderboardResponse {
  entries: LeaderboardEntry[];
  total_count: number;
  your_rank: number | null;
}

export interface SubmitScoreRequest {
  device_id: string;
  callsign?: string;
  grade: string;
  vibe: number;
  trust: number;
  tension: number;
  ending_type: string;
  turns: number;
  game_mode?: 'dating' | 'paperclip';
}

export interface SubmitScoreResponse {
  success: boolean;
  message: string;
  callsign: string;
  your_rank: number | null;
  is_new_record: boolean;
}

export interface UpdateCallsignRequest {
  device_id: string;
  new_callsign: string;
}

export interface UpdateCallsignResponse {
  success: boolean;
  message: string;
  callsign: string;
}

/**
 * Get top 5 operatives for landing page
 * @param gameMode - Optional filter by game mode ('dating' or 'paperclip')
 */
export async function getTopOperatives(gameMode?: 'dating' | 'paperclip'): Promise<TopOperativesResponse> {
  try {
    const params = new URLSearchParams();
    if (gameMode) params.set('game_mode', gameMode);
    const url = `${API_BASE}/api/leaderboard/top${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch top operatives');
    }
    return res.json();
  } catch (error) {
    console.error('Leaderboard error:', error);
    return { entries: [], total_players: 0 };
  }
}

/**
 * Get full leaderboard with optional player highlighting
 * @param deviceId - Optional device ID to highlight current player
 * @param limit - Maximum entries to return (default 100)
 * @param gameMode - Optional filter by game mode ('dating' or 'paperclip')
 */
export async function getFullLeaderboard(
  deviceId?: string,
  limit: number = 100,
  gameMode?: 'dating' | 'paperclip'
): Promise<FullLeaderboardResponse> {
  const params = new URLSearchParams();
  if (deviceId) params.set('device_id', deviceId);
  params.set('limit', limit.toString());
  if (gameMode) params.set('game_mode', gameMode);

  const res = await fetch(`${API_BASE}/api/leaderboard/full?${params}`);
  if (!res.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return res.json();
}

/**
 * Submit a score to the leaderboard
 */
export async function submitScore(
  request: SubmitScoreRequest
): Promise<SubmitScoreResponse> {
  const res = await fetch(`${API_BASE}/api/leaderboard/submit/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error('Failed to submit score');
  }
  return res.json();
}

/**
 * Update a player's callsign
 */
export async function updateCallsign(
  request: UpdateCallsignRequest
): Promise<UpdateCallsignResponse> {
  const res = await fetch(`${API_BASE}/api/leaderboard/callsign/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error('Failed to update callsign');
  }
  return res.json();
}

/**
 * Check if a grade is eligible for leaderboard (F excluded)
 */
export function isEligibleForLeaderboard(grade: string): boolean {
  return ['S', 'A', 'B', 'C', 'D'].includes(grade[0]);
}

/**
 * Check if a grade should prompt for callsign (C rank and above)
 */
export function shouldPromptCallsign(grade: string): boolean {
  return ['S', 'A', 'B', 'C'].includes(grade[0]);
}
