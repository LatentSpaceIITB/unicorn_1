from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class Act(str, Enum):
    COFFEE_SHOP = "coffee_shop"
    WALK = "walk"
    DOORSTEP = "doorstep"


class Archetype(str, Enum):
    ROMANTIC = "romantic"
    SKEPTIC = "skeptic"
    JUST_FRIENDS = "just_friends"


class Intent(str, Enum):
    COMPLIMENT = "Compliment"
    QUESTION = "Question"
    JOKE = "Joke"
    SHARE = "Share"
    ESCALATE = "Escalate"
    REACT = "React"
    VALIDATE = "Validate"
    KISS_ATTEMPT = "KissAttempt"


class Modifier(str, Enum):
    GENERIC = "Generic"
    UNIQUE = "Unique"
    SAFE = "Safe"
    RISKY = "Risky"
    DESPERATE = "Desperate"


class Tone(str, Enum):
    CONFIDENT = "Confident"
    NERVOUS = "Nervous"
    PLAYFUL = "Playful"
    AGGRESSIVE = "Aggressive"
    FLAT = "Flat"


class Tags(BaseModel):
    """Output from the classifier LLM"""
    intent: str
    modifier: str
    tone: str
    topic: str
    flags: List[str] = Field(default_factory=list)


class CriticalEvent(BaseModel):
    """Record of a significant game event"""
    turn_number: int
    event_type: str  # "ick_trigger", "chemistry_bonus", "stat_crash", etc.
    description: str
    stat_impact: str  # "Trust -30", "Vibe +15", etc.


class Turn(BaseModel):
    """Record of a single conversation turn"""
    turn_number: int
    user_input: str
    tags: Tags
    vibe_change: int
    trust_change: int
    tension_change: int
    chloe_response: str
    vibe_after: int
    trust_after: int
    tension_after: int
    response_quality: str = "high"  # "high" or "low" - for volley system
    decay_applied: bool = False     # Track if decay was applied this turn
    intuition_hint: Optional[str] = None  # Internal monologue hint for this turn
    critical_event: Optional["CriticalEvent"] = None  # Significant event this turn


class GameState(BaseModel):
    """The complete game state"""
    vibe: int = 30
    trust: int = 20
    tension: int = 0
    archetype: Archetype = Archetype.ROMANTIC
    act: Act = Act.COFFEE_SHOP
    turn: int = 0
    lockout_turns: int = 0
    history: List[Turn] = Field(default_factory=list)
    game_over: bool = False
    game_over_reason: Optional[str] = None
    previous_response_quality: str = "high"  # For volley system decay logic
    consecutive_low_effort: int = 0          # Counter for decay trigger
    critical_events: List["CriticalEvent"] = Field(default_factory=list)  # Significant moments

    # V2: Strike System / Recovery mode
    recovery_mode: bool = False              # True if player is in recovery turn
    recovery_stat: Optional[str] = None      # "vibe" or "trust" - which stat triggered recovery

    def clamp_stats(self):
        """Ensure stats stay within 0-100 bounds"""
        self.vibe = max(0, min(100, self.vibe))
        self.trust = max(0, min(100, self.trust))
        self.tension = max(0, min(100, self.tension))


class EndingType(str, Enum):
    S_RANK_KISS = "S"
    A_RANK_GENTLEMAN = "A"
    B_RANK_NUMBER = "B"
    C_RANK_FADE = "C"           # Vibe dropped to 0 - she lost interest
    C_RANK_FUMBLE = "C-"        # Attempted kiss too early - awkward rejection
    D_RANK_FRIEND_ZONE = "D"    # High trust, low tension - you're like a brother
    F_RANK_ICK = "F"            # Trust crashed - creepy behavior
    F_RANK_GHOSTED = "F-"       # Silence timer ran out - you ghosted her


class GameResult(BaseModel):
    """Result of processing a turn"""
    success: bool
    chloe_response: str
    game_over: bool = False
    ending: Optional[EndingType] = None
    ending_message: Optional[str] = None
    tags: Optional[Tags] = None
    vibe_change: Optional[int] = None
    trust_change: Optional[int] = None
    tension_change: Optional[int] = None
