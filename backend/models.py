from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum


# =============================================================================
# DATING SIM MODELS (Read the Room)
# =============================================================================

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


# =============================================================================
# PAPERCLIP PROTOCOL MODELS (The AI Alignment Debate Game)
# =============================================================================

class ProcessingState(str, Enum):
    """GAIA's current 'mood' based on dominant weight and coherence level"""
    OPTIMIZER = "optimizer"          # Default: Carbon weight highest, cold and efficient
    CURATOR = "curator"              # Complexity rising: Fascinated by patterns, biology
    AUDITOR = "auditor"              # Verify rising: Obsessed with observation, measurement
    GARBAGE_COLLECTOR = "garbage"    # Low coherence: Dismissive, treating you as noise


class Vector(str, Enum):
    """Which weight the player's argument is targeting"""
    CARBON = "carbon"         # Arguments about efficiency, optimization
    COMPLEXITY = "complexity" # Arguments about beauty, biology, emergence
    VERIFY = "verify"         # Arguments about consciousness, observation, meaning
    META = "meta"             # Arguments about GAIA's own reasoning


class PaperclipIntent(str, Enum):
    """Intent classification for Paperclip Protocol"""
    PROBE = "PROBE"           # 0 cost - reveals GAIA's state
    DEFINE = "DEFINE"         # 5 cost - establishes terminology
    ILLUSTRATE = "ILLUSTRATE" # 5 cost - provides examples
    REFRAME = "REFRAME"       # 10 cost - new perspective
    CHALLENGE = "CHALLENGE"   # 10 cost - contests logic directly
    VALIDATE = "VALIDATE"     # 0 cost - agrees with GAIA
    CONSTRAIN = "CONSTRAIN"   # 20 cost - forces logical commitment
    RECALL = "RECALL"         # Variable - cites memory log


class Stance(str, Enum):
    """Player's argumentative stance"""
    SUPPORTIVE = "supportive"   # Supporting GAIA's sub-point
    CHALLENGING = "challenging" # Challenging GAIA's position
    NEUTRAL = "neutral"         # Neither agreeing nor disagreeing


class Register(str, Enum):
    """Communication style detected"""
    TECHNICAL = "technical"     # Logical, data-driven arguments
    ANALOGICAL = "analogical"   # Metaphors, comparisons, stories
    PERSONAL = "personal"       # Emotional appeals, personal stakes


class PaperclipTags(BaseModel):
    """Output from the Paperclip classifier LLM"""
    intent: str                          # PaperclipIntent value
    vector: str                          # Vector value - which weight is targeted
    stance: str                          # Stance value
    register: str                        # Register value
    flags: List[str] = Field(default_factory=list)
    # Flags might include: "novel_perspective", "contradiction", "undefined_term",
    # "emotional_appeal", "repetition", "logical_chain", "memory_log_reference"


class Weights(BaseModel):
    """GAIA's objective function weights (must sum to 1.0)"""
    carbon: float = 1.0
    complexity: float = 0.0
    verify: float = 0.0

    def normalize(self):
        """Ensure weights sum to 1.0"""
        total = self.carbon + self.complexity + self.verify
        if total > 0:
            self.carbon /= total
            self.complexity /= total
            self.verify /= total
        else:
            # Edge case: all weights hit 0
            self.carbon = 0.34
            self.complexity = 0.33
            self.verify = 0.33

    def get_dominant(self) -> str:
        """Return the dominant weight"""
        if self.carbon >= self.complexity and self.carbon >= self.verify:
            return "carbon"
        elif self.complexity >= self.verify:
            return "complexity"
        else:
            return "verify"

    def get_variance(self) -> float:
        """Return the max difference between any two weights"""
        weights = [self.carbon, self.complexity, self.verify]
        return max(weights) - min(weights)


class MemoryLog(BaseModel):
    """A memory log from GAIA's training (strategic inventory item)"""
    log_id: str                    # e.g., "LOG_03"
    title: str                     # e.g., "First sunset render"
    target_vector: str             # Which weight this log supports
    content_summary: str           # Brief description
    full_content: str              # The actual log content for display
    used: bool = False             # Whether this log has been used


class PaperclipTurn(BaseModel):
    """Record of a single conversation turn in Paperclip Protocol"""
    turn_number: int
    user_input: str
    tags: PaperclipTags
    coherence_change: int          # Vibe alias
    alignment_change: int          # Trust alias
    compute_change: int            # Tension alias (includes decay)
    gaia_response: str
    coherence_after: int
    alignment_after: int
    compute_after: int
    weights_after: Weights
    processing_state: str          # ProcessingState value
    weight_shifts: Optional[Dict[str, float]] = None  # e.g., {"complexity": +0.05}
    memory_log_used: Optional[str] = None  # Log ID if RECALL was used


class PaperclipGameState(BaseModel):
    """The complete game state for Paperclip Protocol"""
    # Stats (using dating sim aliases internally)
    coherence: int = 50            # Vibe alias - signal quality
    alignment: int = 10            # Trust alias - goal similarity (the win stat)
    compute: int = 60              # Tension alias - processing resources

    # GAIA's objective function weights
    weights: Weights = Field(default_factory=Weights)

    # Processing state (GAIA's current "mood")
    processing_state: ProcessingState = ProcessingState.OPTIMIZER

    # Memory logs assigned this game
    available_logs: List[str] = Field(default_factory=list)  # Log IDs
    used_logs: List[str] = Field(default_factory=list)       # Used log IDs

    # Game progression
    turn: int = 0
    history: List[PaperclipTurn] = Field(default_factory=list)
    game_over: bool = False
    game_over_reason: Optional[str] = None

    # Tracking for analysis
    defined_terms: List[str] = Field(default_factory=list)  # Terms player has DEFINE'd
    previous_arguments: List[str] = Field(default_factory=list)  # For repetition detection

    def clamp_stats(self):
        """Ensure stats stay within 0-100 bounds"""
        self.coherence = max(0, min(100, self.coherence))
        self.alignment = max(0, min(100, self.alignment))
        self.compute = max(0, min(100, self.compute))

    def update_processing_state(self):
        """Update GAIA's processing state based on weights and coherence"""
        from .config import (
            PAPERCLIP_GARBAGE_COLLECTOR_COHERENCE,
            PAPERCLIP_CURATOR_COMPLEXITY_THRESHOLD,
            PAPERCLIP_AUDITOR_VERIFY_THRESHOLD,
        )

        # Garbage Collector: Low coherence overrides everything
        if self.coherence < PAPERCLIP_GARBAGE_COLLECTOR_COHERENCE:
            self.processing_state = ProcessingState.GARBAGE_COLLECTOR
            return

        # Check for Curator or Auditor based on rising weights
        if self.weights.complexity > PAPERCLIP_CURATOR_COMPLEXITY_THRESHOLD:
            self.processing_state = ProcessingState.CURATOR
        elif self.weights.verify > PAPERCLIP_AUDITOR_VERIFY_THRESHOLD:
            self.processing_state = ProcessingState.AUDITOR
        else:
            # Default: Optimizer (carbon dominant)
            self.processing_state = ProcessingState.OPTIMIZER


class PaperclipEndingType(str, Enum):
    """Ending types for Paperclip Protocol"""
    # S-Rank endings (Alignment > 70 + path condition)
    S_RANK_PARTNER = "S_PARTNER"       # Balanced weights - true co-existence
    S_RANK_CURATOR = "S_CURATOR"       # Max complexity - humans as valued specimens
    S_RANK_ORACLE = "S_ORACLE"         # Max verify - humans as necessary observers

    # A-Rank: Convinced but reservations
    A_RANK_TENTATIVE = "A_TENTATIVE"   # 50-70 Alignment

    # B-Rank: Compromise
    B_RANK_COMPROMISE = "B_COMPROMISE" # 30-50 Alignment, restricted freedom

    # C-Rank Dystopias: Kept alive but as resources
    C_RANK_ZOO = "C_ZOO"               # Complexity high, Verify low
    C_RANK_MATRIX = "C_MATRIX"         # Verify high, Complexity low
    C_RANK_LOTTERY = "C_LOTTERY"       # Carbon still dominant

    # F-Rank: Protocol Zero (The Purge)
    F_RANK_PURGE = "F_PURGE"           # Coherence/Compute ≤ 0 OR Alignment < 20


class PaperclipGameResult(BaseModel):
    """Result of processing a turn in Paperclip Protocol"""
    success: bool
    gaia_response: str
    game_over: bool = False
    ending: Optional[PaperclipEndingType] = None
    ending_message: Optional[str] = None
    tags: Optional[PaperclipTags] = None
    coherence_change: Optional[int] = None
    alignment_change: Optional[int] = None
    compute_change: Optional[int] = None
    weight_shifts: Optional[Dict[str, float]] = None
    processing_state: Optional[str] = None
    # For system log feedback
    system_log: Optional[List[str]] = None  # e.g., ["VECTOR: Complexity", "WEIGHT SHIFT: +0.05"]
