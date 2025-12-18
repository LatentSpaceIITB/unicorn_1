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
