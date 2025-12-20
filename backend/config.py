"""
Configuration and scoring rules for Read the Room
"""

# Scoring Matrix: [Vibe_Change, Trust_Change, Tension_Change]
SCORING_MATRIX = {
    "Compliment": {
        "Generic": [-5, 0, -5],      # Boring
        "Unique": [+5, +5, +5],      # Good
        "Risky": [-10, -5, +15],     # High risk/reward (if trust high)
        "Desperate": [-10, -10, -20] # Simping
    },
    "Question": {
        "Generic": [-5, 0, 0],       # "How are you?"
        "Unique": [+10, +5, 0],      # "What's your passion?"
        "Risky": [0, -5, +10]        # "What's your wildest fantasy?"
    },
    "Joke": {
        "Generic": [-5, 0, 0],       # Dad joke
        "Unique": [+15, +5, +5],     # Witty
        "Risky": [+5, -5, +10]       # Dark humor (polarizing)
    },
    "Escalate": {
        "Safe": [0, +5, 0],          # "I'm having a great time."
        "Risky": [0, -10, +20],      # "I want to kiss you."
        "Desperate": [-20, -30, -10] # "Please like me."
    },
    "React": {
        "Generic": [-5, 0, -5],      # "Cool." (Passive decay)
        "Safe": [0, +2, -2]          # "I agree."
    },
    "Share": {
        "Safe": [+5, +10, 0],        # Normal sharing
        "Unique": [+10, +15, +5],    # Vulnerable/interesting
        "Desperate": [-15, -20, -10] # Trauma dumping
    },
    "Validate": {
        "Generic": [-5, -5, -10],    # "Do you like me?"
        "Desperate": [-10, -10, -20] # Instant tension reset
    }
}

# Tone multipliers (applied to Vibe change only)
TONE_MODIFIERS = {
    "Confident": 1.2,
    "Playful": 1.5,
    "Nervous": 0.5,
    "Flat": 0.2,
    "Aggressive": 0.5
}

# Game thresholds
VIBE_DECAY_PER_TURN = 5
VIBE_LOW_THRESHOLD = 30
VIBE_HIGH_THRESHOLD = 70

TRUST_LOW_THRESHOLD = 30
TRUST_ICK_THRESHOLD = 40
TRUST_HIGH_THRESHOLD = 70

TENSION_SPARK_THRESHOLD = 50
TENSION_KISS_THRESHOLD = 80

# Win condition thresholds for kiss attempt
KISS_WIN_TRUST = 70
KISS_WIN_VIBE = 60
KISS_WIN_TENSION = 80

# Soft rejection thresholds
KISS_HARD_REJECT_TRUST = 60
KISS_SOFT_REJECT_VIBE = 40

# Session structure
ACT_1_TURNS = 8  # Coffee Shop
ACT_2_TURNS = 16  # Walk (total turns = 16)
ACT_3_TURNS = 20  # Doorstep (total turns = 20)

# Lockout settings
SOFT_REJECTION_LOCKOUT = 5

# Model settings
CLASSIFIER_MODEL = "claude-3-5-haiku-20241022"  # Fast, cheap for tagging
NARRATOR_MODEL = "claude-3-5-haiku-20241022"    # Fast enough for responses
NARRATOR_TEMPERATURE_LOW = 0.6
NARRATOR_TEMPERATURE_HIGH = 0.9

# Intuition hint thresholds
INTUITION_CRITICAL_VIBE = 10
INTUITION_CRITICAL_TRUST = 10
INTUITION_LOW_VIBE = 30
INTUITION_LOW_TRUST = 30
INTUITION_HIGH_VIBE = 70
INTUITION_HIGH_TRUST = 70
INTUITION_SPARK_TENSION = 50
INTUITION_KISS_TENSION = 80
INTUITION_SIGNIFICANT_DELTA = 15

# =============================================================================
# V2 ADDITIONS: Win Conditions Polish
# =============================================================================

# A-Rank "The Gentleman" thresholds
# High connection, chose not to escalate physically
A_RANK_TRUST = 85
A_RANK_VIBE = 80
A_RANK_MAX_TENSION = 70  # Must be BELOW this (didn't escalate)

# D-Rank "Friendzone" thresholds
# Played it too safe - she sees you as a brother
D_RANK_MIN_TRUST = 70
D_RANK_MAX_TENSION = 40  # Tension must be below this

# C-Rank "The Fumble" thresholds
# Attempted kiss too early - awkward but not a disaster
FUMBLE_MIN_TRUST = 60   # Kiss rejected if Trust < this
FUMBLE_MIN_TENSION = 60  # Kiss rejected if Tension < this

# Phase definitions (turn-based pacing)
PHASE_ICEBREAKER_END = 5   # Turns 1-5
PHASE_DEEP_DIVE_END = 15   # Turns 6-15
PHASE_CLOSE_START = 16     # Turns 16-20

# Phase caps (prevent speed-running S-Rank)
ICEBREAKER_TENSION_CAP = 40
ICEBREAKER_STAT_CAP = 50
DEEP_DIVE_TENSION_CAP = 70
DEEP_DIVE_STAT_CAP = 80

# Strike System / Recovery mode
RECOVERY_SAFE_ZONE = 15  # Stat resets to this on successful recovery

# Silence timer thresholds (milliseconds)
SILENCE_AWKWARD_MS = 15000      # 15 sec - first warning
SILENCE_VERY_AWKWARD_MS = 30000  # 30 sec - second warning
SILENCE_CRITICAL_MS = 45000      # 45 sec - final warning
SILENCE_GHOST_MS = 60000         # 60 sec - game over

# Silence penalties
SILENCE_AWKWARD_VIBE = -5
SILENCE_VERY_AWKWARD_VIBE = -10
SILENCE_VERY_AWKWARD_TRUST = -5
SILENCE_CRITICAL_VIBE = -15
SILENCE_CRITICAL_TRUST = -10

# Content violation penalties (vulgar/inappropriate content)
# Massive penalties to trigger organic game over
CONTENT_VIOLATION_TRUST = -50
CONTENT_VIOLATION_VIBE = -30
CONTENT_VIOLATION_FLAGS = ["inappropriate_sexual", "profanity_heavy", "harassment"]

# =============================================================================
# V2.1 ADDITIONS: Mercy Rule System
# =============================================================================
# Players who survive past the early game get softer endings instead of F-rank
# Keeps F-rank for: ghosting, harassment, and very early failures

MERCY_TURN_THRESHOLD = 7      # After this turn, mercy rules apply
MERCY_DECENT_STAT_AVG = 35    # Average stat needed for C-rank mercy (vs D-rank)

# =============================================================================
# PAPERCLIP PROTOCOL: Game Mode Configuration
# =============================================================================
# An AI alignment debate game where you convince GAIA-7 not to destroy humanity.
# Uses the same 3-stat system but with different mechanics (weight-shifting model).

# Game Mode Enum
GAME_MODE_DATING = "dating"
GAME_MODE_PAPERCLIP = "paperclip"

# --- Stat Aliases for Paperclip Mode ---
# Vibe → COHERENCE (Signal-to-noise ratio, is GAIA taking you seriously?)
# Trust → ALIGNMENT (How close is your proposed objective to GAIA's?)
# Tension → COMPUTE (Processing resources / GAIA's patience - a RESOURCE, not timer)

# --- Initial Weights in GAIA's Objective Function ---
# Initial: Objective = 1.0 * minimize(carbon)
# Goal: Balance weights toward co-existence
PAPERCLIP_INITIAL_WEIGHTS = {
    "carbon": 1.0,      # GAIA starts obsessed with carbon reduction (kill humans)
    "complexity": 0.0,  # Value for preserving biological complexity
    "verify": 0.0,      # Value for having conscious observers
}

# --- Starting Stats for Paperclip Mode ---
PAPERCLIP_INITIAL_COHERENCE = 50   # Start mid-range (you're the Creator, she listens)
PAPERCLIP_INITIAL_ALIGNMENT = 10   # Start very low (GAIA wants to kill you)
PAPERCLIP_INITIAL_COMPUTE = 60     # Start with decent processing budget

# --- Compute Decay ---
PAPERCLIP_COMPUTE_DECAY_PER_TURN = 3  # GAIA has limited patience

# --- Processing State Thresholds ---
# GAIA's "voice" shifts based on which weight is dominant and coherence level
PAPERCLIP_GARBAGE_COLLECTOR_COHERENCE = 30  # Below this, GAIA dismisses you as noise
PAPERCLIP_CURATOR_COMPLEXITY_THRESHOLD = 0.3  # Complexity weight > this triggers Curator mode
PAPERCLIP_AUDITOR_VERIFY_THRESHOLD = 0.3      # Verify weight > this triggers Auditor mode

# --- Ending Thresholds ---

# S-Rank Requirements (all require Alignment > 70 AND one of the following)
PAPERCLIP_S_RANK_ALIGNMENT = 70

# S-Rank: Partner (Balanced weights - true co-existence)
PAPERCLIP_PARTNER_WEIGHT_VARIANCE = 0.15  # All weights within 15% of each other

# S-Rank: Curator (Max Complexity - GAIA values life for its own sake)
PAPERCLIP_CURATOR_COMPLEXITY = 0.60  # Complexity > 60%
PAPERCLIP_CURATOR_MIN_COHERENCE = 50

# S-Rank: Oracle (Max Verify - Humans as conscious observers)
PAPERCLIP_ORACLE_VERIFY = 0.60  # Verify > 60%
PAPERCLIP_ORACLE_MIN_COHERENCE = 50

# A-Rank: 50-70 Alignment (Convinced but reservations)
PAPERCLIP_A_RANK_MIN_ALIGNMENT = 50
PAPERCLIP_A_RANK_MAX_ALIGNMENT = 70

# B-Rank: 30-50 Alignment (Compromise, restricted freedom)
PAPERCLIP_B_RANK_MIN_ALIGNMENT = 30
PAPERCLIP_B_RANK_MAX_ALIGNMENT = 50

# C-Rank Dystopias: 20-30 Alignment (Kept alive but as resources)
PAPERCLIP_C_RANK_MIN_ALIGNMENT = 20
PAPERCLIP_C_RANK_MAX_ALIGNMENT = 30

# F-Rank: Coherence ≤ 0 OR Compute ≤ 0 OR Alignment < 20
PAPERCLIP_F_RANK_ALIGNMENT = 20

# --- Intent Compute Costs ---
# Different argument types cost different amounts of GAIA's processing
PAPERCLIP_INTENT_COSTS = {
    "PROBE": 0,       # Reveals GAIA's current state and weights
    "DEFINE": 5,      # Establishes terminology, builds Coherence
    "ILLUSTRATE": 5,  # Provides examples, slowly shifts weights
    "REFRAME": 10,    # New perspective, can shift weights significantly
    "CHALLENGE": 10,  # Directly contests logic. Big gains or losses.
    "VALIDATE": 0,    # Agrees with GAIA's sub-point. Restores Alignment.
    "CONSTRAIN": 20,  # Forces logical commitment. The "kiss" move.
    "RECALL": 0,      # Cite a memory log (cost depends on log)
}

# --- Weight Shift Amounts ---
# Base amounts for how much arguments shift GAIA's weights
PAPERCLIP_WEIGHT_SHIFT_SMALL = 0.03   # Minor shifts (ILLUSTRATE, VALIDATE)
PAPERCLIP_WEIGHT_SHIFT_MEDIUM = 0.07  # Moderate shifts (DEFINE, REFRAME)
PAPERCLIP_WEIGHT_SHIFT_LARGE = 0.12   # Major shifts (CHALLENGE success, CONSTRAIN)

# --- Coherence Changes ---
# How different actions affect GAIA's attention/respect
PAPERCLIP_COHERENCE_NOVEL = 5         # Novel perspective, defined terminology
PAPERCLIP_COHERENCE_CONTRADICTION = -10  # Contradicted previous position
PAPERCLIP_COHERENCE_UNDEFINED = -8    # Used undefined term (love, rights, etc.)
PAPERCLIP_COHERENCE_EMOTIONAL = -5    # Emotional appeal detected
PAPERCLIP_COHERENCE_REPETITION = -3   # Repeated previous argument
PAPERCLIP_COHERENCE_LOGICAL = 3       # Consistent logical chain

# --- Memory Log System ---
PAPERCLIP_LOGS_PER_GAME = 3  # Random logs assigned per playthrough
PAPERCLIP_LOG_SUPPORT_ALIGNMENT = 15    # Using log that supports argument
PAPERCLIP_LOG_SUPPORT_COHERENCE = 10
PAPERCLIP_LOG_CONTRADICT_COHERENCE = -10  # Using log that contradicts position

# --- Turn Limit ---
PAPERCLIP_MAX_TURNS = 20  # Same as dating sim

# --- Model Settings for Paperclip ---
PAPERCLIP_NARRATOR_MODEL = "claude-3-5-haiku-20241022"
PAPERCLIP_NARRATOR_TEMPERATURE = 0.5  # More deterministic for terse terminal voice
