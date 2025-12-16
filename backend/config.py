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
