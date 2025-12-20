"""
Pydantic schemas for API request/response models
"""

from pydantic import BaseModel
from typing import Optional, List, Any


class CreateGameRequest(BaseModel):
    """Request for game creation (optional)"""
    device_id: Optional[str] = None


class CreateGameResponse(BaseModel):
    """Response for game creation"""
    session_id: str
    message: str


class TurnRequest(BaseModel):
    """Request for processing a turn"""
    user_input: str
    input_mode: str = "dialogue"  # "dialogue" or "action"
    device_id: Optional[str] = None  # For funnel tracking


class StatChanges(BaseModel):
    """Stat changes from a turn"""
    vibe: int
    trust: int
    tension: int


class CurrentStats(BaseModel):
    """Current game stats"""
    vibe: int
    trust: int
    tension: int
    turn: int
    act: str
    lockout_turns: int


class TagsResponse(BaseModel):
    """Tags from classifier"""
    intent: str
    modifier: str
    tone: str
    topic: str
    flags: List[str]


class CriticalEventResponse(BaseModel):
    """Critical event data"""
    turn_number: int
    event_type: str
    description: str
    stat_impact: str


class TurnResponse(BaseModel):
    """Response for a processed turn"""
    success: bool
    turn_number: int
    tags: Optional[TagsResponse] = None
    stat_changes: StatChanges
    current_stats: CurrentStats
    chloe_response: str
    intuition_hint: Optional[str] = None
    critical_event: Optional[CriticalEventResponse] = None
    game_over: bool
    ending: Optional[str] = None
    ending_message: Optional[str] = None


class BreakdownResponse(BaseModel):
    """Post-game breakdown"""
    breakdown: str
    final_stats: CurrentStats
    ending: str
    rank: str
    killer_quote: Optional[str] = None


class GameStateResponse(BaseModel):
    """Current game state summary"""
    session_id: str
    current_stats: CurrentStats
    history_length: int
    game_over: bool


class HistoryEntry(BaseModel):
    """Single turn in history"""
    turn_number: int
    user_input: str
    chloe_response: str
    stat_changes: StatChanges
    intuition_hint: Optional[str] = None


class HistoryResponse(BaseModel):
    """Game history"""
    session_id: str
    turns: List[HistoryEntry]


class DetailedHistoryEntry(BaseModel):
    """Detailed turn history with tags and stats for AAR analysis"""
    turn_number: int
    user_input: str
    chloe_response: str
    tags: TagsResponse
    stat_changes: StatChanges
    stats_after: CurrentStats
    intuition_hint: Optional[str] = None
    critical_event: Optional[CriticalEventResponse] = None


class DetailedHistoryResponse(BaseModel):
    """Detailed game history for AAR"""
    session_id: str
    turns: List[DetailedHistoryEntry]


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str


# V2: Silence Timer schemas
class SilenceRequest(BaseModel):
    """Request for silence penalty"""
    level: str  # "awkward", "very_awkward", "critical", "ghost"
    device_id: Optional[str] = None  # For funnel tracking


class SilenceResponse(BaseModel):
    """Response for silence penalty"""
    success: bool
    response: str  # Chloe's reaction to silence
    current_stats: CurrentStats
    game_over: bool
    ending: Optional[str] = None
    ending_message: Optional[str] = None


# =============================================================================
# PAPERCLIP PROTOCOL SCHEMAS
# =============================================================================

class PaperclipCreateRequest(BaseModel):
    """Request for creating a Paperclip Protocol game"""
    device_id: Optional[str] = None


class PaperclipCreateResponse(BaseModel):
    """Response for Paperclip game creation"""
    session_id: str
    message: str
    opening: str  # GAIA's opening statement
    available_logs: List[str]  # Log IDs assigned to this game


class PaperclipWeights(BaseModel):
    """GAIA's objective function weights"""
    carbon: float
    complexity: float
    verify: float


class PaperclipStats(BaseModel):
    """Current Paperclip game stats"""
    coherence: int  # Vibe alias
    alignment: int  # Trust alias
    compute: int    # Tension alias
    turn: int
    processing_state: str


class PaperclipTagsResponse(BaseModel):
    """Tags from Paperclip classifier"""
    intent: str
    vector: str
    stance: str
    tone_register: str  # Renamed to avoid shadowing BaseModel.register
    flags: List[str]


class PaperclipStatChanges(BaseModel):
    """Stat changes from a Paperclip turn"""
    coherence: int
    alignment: int
    compute: int


class PaperclipWeightShifts(BaseModel):
    """Weight shifts from a turn"""
    carbon: Optional[float] = None
    complexity: Optional[float] = None
    verify: Optional[float] = None


class PaperclipTurnRequest(BaseModel):
    """Request for processing a Paperclip turn"""
    user_input: str
    device_id: Optional[str] = None


class PaperclipTurnResponse(BaseModel):
    """Response for a processed Paperclip turn"""
    success: bool
    turn_number: int
    tags: Optional[PaperclipTagsResponse] = None
    stat_changes: PaperclipStatChanges
    weight_shifts: Optional[PaperclipWeightShifts] = None
    current_stats: PaperclipStats
    current_weights: PaperclipWeights
    gaia_response: str
    system_log: Optional[List[str]] = None  # Retroactive feedback
    memory_log_used: Optional[str] = None   # If RECALL was triggered
    game_over: bool
    ending: Optional[str] = None
    ending_message: Optional[str] = None


class PaperclipStateResponse(BaseModel):
    """Current Paperclip game state summary"""
    session_id: str
    current_stats: PaperclipStats
    current_weights: PaperclipWeights
    processing_state: str
    available_logs: List[str]
    used_logs: List[str]
    history_length: int
    game_over: bool


class PaperclipLogsResponse(BaseModel):
    """Response for /logs command"""
    available_logs: List[dict]  # Log info (id, title, summary)
    used_logs: List[str]        # Used log IDs
    formatted_output: str       # Terminal-style formatted output


class PaperclipBreakdownResponse(BaseModel):
    """Post-game breakdown for Paperclip"""
    final_stats: PaperclipStats
    final_weights: PaperclipWeights
    ending: str
    ending_type: str  # S_PARTNER, F_PURGE, etc.
    rank: str
    system_termination_report: str  # The "Fatal Exception Receipt"


class PaperclipHistoryEntry(BaseModel):
    """Single turn in Paperclip history"""
    turn_number: int
    user_input: str
    gaia_response: str
    tags: PaperclipTagsResponse
    stat_changes: PaperclipStatChanges
    stats_after: PaperclipStats
    weights_after: PaperclipWeights
    processing_state: str
    weight_shifts: Optional[PaperclipWeightShifts] = None
    memory_log_used: Optional[str] = None


class PaperclipHistoryResponse(BaseModel):
    """Paperclip game history"""
    session_id: str
    turns: List[PaperclipHistoryEntry]
