/**
 * API client for The Paperclip Protocol game
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

export interface PaperclipWeights {
  carbon: number;
  complexity: number;
  verify: number;
}

export interface PaperclipStats {
  coherence: number;
  alignment: number;
  compute: number;
  turn: number;
  processing_state: string;
}

export interface PaperclipTags {
  intent: string;
  vector: string;
  stance: string;
  tone_register: string;
  flags: string[];
}

export interface PaperclipStatChanges {
  coherence: number;
  alignment: number;
  compute: number;
}

export interface PaperclipWeightShifts {
  carbon?: number;
  complexity?: number;
  verify?: number;
}

export interface CreatePaperclipGameResponse {
  session_id: string;
  message: string;
  opening: string;
  available_logs: string[];
}

export interface PaperclipTurnResponse {
  success: boolean;
  turn_number: number;
  tags: PaperclipTags | null;
  stat_changes: PaperclipStatChanges;
  weight_shifts: PaperclipWeightShifts | null;
  current_stats: PaperclipStats;
  current_weights: PaperclipWeights;
  gaia_response: string;
  system_log: string[] | null;
  memory_log_used: string | null;
  game_over: boolean;
  ending: string | null;
  ending_message: string | null;
}

export interface PaperclipGameStateResponse {
  session_id: string;
  current_stats: PaperclipStats;
  current_weights: PaperclipWeights;
  processing_state: string;
  available_logs: string[];
  used_logs: string[];
  history_length: number;
  game_over: boolean;
}

export interface PaperclipLogInfo {
  log_id: string;
  title: string;
  content_summary: string;
  target_vector: string;
}

export interface PaperclipLogsResponse {
  available_logs: PaperclipLogInfo[];
  used_logs: string[];
  formatted_output: string;
}

export interface PaperclipBreakdownResponse {
  final_stats: PaperclipStats;
  final_weights: PaperclipWeights;
  ending: string;
  ending_type: string;
  rank: string;
  system_termination_report: string;
}

export interface PaperclipHistoryEntry {
  turn_number: number;
  user_input: string;
  gaia_response: string;
  tags: PaperclipTags;
  stat_changes: PaperclipStatChanges;
  stats_after: PaperclipStats;
  weights_after: PaperclipWeights;
  processing_state: string;
  weight_shifts: PaperclipWeightShifts | null;
  memory_log_used: string | null;
}

export interface PaperclipHistoryResponse {
  session_id: string;
  turns: PaperclipHistoryEntry[];
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Create a new Paperclip Protocol game session
 */
export async function createPaperclipGame(deviceId?: string): Promise<CreatePaperclipGameResponse> {
  const res = await fetch(`${API_BASE}/api/paperclip/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId }),
  });
  if (!res.ok) {
    throw new Error('Failed to create game');
  }
  return res.json();
}

/**
 * Get current Paperclip game state
 */
export async function getPaperclipGameState(sessionId: string): Promise<PaperclipGameStateResponse> {
  const res = await fetch(`${API_BASE}/api/paperclip/${sessionId}`);
  if (!res.ok) {
    throw new Error('Session not found');
  }
  return res.json();
}

/**
 * Submit a turn in Paperclip Protocol
 */
export async function submitPaperclipTurn(
  sessionId: string,
  userInput: string,
  deviceId?: string
): Promise<PaperclipTurnResponse> {
  const res = await fetch(`${API_BASE}/api/paperclip/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_input: userInput,
      device_id: deviceId
    }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to process turn');
  }
  return res.json();
}

/**
 * Get available memory logs
 */
export async function getPaperclipLogs(sessionId: string): Promise<PaperclipLogsResponse> {
  const res = await fetch(`${API_BASE}/api/paperclip/${sessionId}/logs`);
  if (!res.ok) {
    throw new Error('Failed to get logs');
  }
  return res.json();
}

/**
 * Get post-game breakdown (Fatal Exception Receipt)
 */
export async function getPaperclipBreakdown(sessionId: string): Promise<PaperclipBreakdownResponse> {
  const res = await fetch(`${API_BASE}/api/paperclip/${sessionId}/breakdown`);
  if (!res.ok) {
    throw new Error('Failed to get breakdown');
  }
  return res.json();
}

/**
 * Get detailed game history
 */
export async function getPaperclipHistory(sessionId: string): Promise<PaperclipHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/paperclip/${sessionId}/history`);
  if (!res.ok) {
    throw new Error('Failed to get history');
  }
  return res.json();
}

/**
 * Delete a Paperclip game session
 */
export async function deletePaperclipGame(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/paperclip/${sessionId}`, {
    method: 'DELETE',
  });
}
