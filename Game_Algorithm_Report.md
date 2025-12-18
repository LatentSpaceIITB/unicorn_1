# Game Algorithm Report: Read the Room

## Overview

"Read the Room" is a stat-driven dating simulation where players navigate a 20-turn conversation with an AI character (Chloe). Success depends on managing three interconnected stats through strategic dialogue and actions.

---

## 1. Core Game Loop

```
┌─────────────────────────────────────────────────────────┐
│                    TURN CYCLE                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Player Input                                           │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────┐                                        │
│  │  Classify   │ ─── Intent, Modifier, Tone, Flags     │
│  └─────────────┘                                        │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────┐                                        │
│  │ Kiss Check  │ ─── If kiss attempt → Evaluate        │
│  └─────────────┘                                        │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────┐                                        │
│  │   Score     │ ─── Calculate stat deltas             │
│  └─────────────┘                                        │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────┐                                        │
│  │   Decay     │ ─── Apply passive vibe decay          │
│  └─────────────┘                                        │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────┐                                        │
│  │   Update    │ ─── Apply deltas + phase caps         │
│  └─────────────┘                                        │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────┐                                        │
│  │  Generate   │ ─── Chloe's response (LLM)            │
│  └─────────────┘                                        │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────┐                                        │
│  │ Game Over?  │ ─── Check end conditions              │
│  └─────────────┘                                        │
│       │                                                 │
│       ▼                                                 │
│  Next Turn or Ending                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. The Three Stats

| Stat | Purpose | Range | Low (<30) | High (>70) |
|------|---------|-------|-----------|------------|
| **VIBE** | Energy/Interest | 0-100 | Bored, distracted | Engaged, enthusiastic |
| **TRUST** | Comfort/Safety | 0-100 | Guarded, suspicious | Open, vulnerable |
| **TENSION** | Romantic Spark | 0-100 | Platonic | Kiss-ready (≥80) |

### Initial Values
- Vibe: 30
- Trust: 20
- Tension: 0

---

## 3. Input Classification

Player input is analyzed by an LLM classifier that outputs:

### Intent Types
| Intent | Description |
|--------|-------------|
| Compliment | Praising her appearance, personality, etc. |
| Question | Asking about her |
| Joke | Attempting humor |
| Share | Revealing something about yourself |
| Escalate | Moving things forward (flirting, touch) |
| React | Responding to what she said |
| Validate | Seeking approval or reassurance |
| KissAttempt | Trying to kiss her |

### Modifiers
| Modifier | Description |
|----------|-------------|
| Generic | Basic, unoriginal |
| Unique | Creative, specific |
| Safe | Low-risk, conventional |
| Risky | Bold, could backfire |
| Desperate | Needy, approval-seeking |

### Tones
- Confident, Playful, Nervous, Aggressive, Flat

### Flags
- `Action_Present` - Physical action described
- `kiss`, `touch`, `physical` - Escalation indicators
- `ick_triggered` - Boundary crossed

---

## 4. Scoring Matrix

Base stat changes for each Intent + Modifier combination:

```
[Vibe Delta, Trust Delta, Tension Delta]

COMPLIMENT:
  Generic:    [-5,   0,  -5]    "You're pretty"
  Unique:     [+5,  +5,  +5]    "Your laugh is infectious"
  Risky:      [-10, -5, +15]    "You're way too hot for me"
  Desperate:  [-10,-10, -20]    "Please say you like me"

QUESTION:
  Generic:    [-5,   0,   0]    "How are you?"
  Unique:     [+10, +5,   0]    "What's your secret passion?"
  Risky:      [0,   -5, +10]    "What's your wildest fantasy?"

JOKE:
  Generic:    [-5,   0,   0]    Dad jokes
  Unique:     [+15, +5,  +5]    Witty, situational humor
  Risky:      [+5,  -5, +10]    Dark/edgy humor

SHARE:
  Safe:       [+5, +10,   0]    Normal sharing
  Unique:     [+10,+15,  +5]    Vulnerable, interesting
  Desperate:  [-15,-20, -10]    Trauma dumping

ESCALATE:
  Safe:       [0,   +5,   0]    "I'm having a great time"
  Risky:      [0,  -10, +20]    "I want to kiss you"
  Desperate:  [-20,-30, -10]    "Please like me"

REACT:
  Generic:    [-5,   0,  -5]    "Cool."
  Safe:       [0,   +2,  -2]    "I agree"

VALIDATE:
  Generic:    [-5,  -5, -10]    "Do you like me?"
  Desperate:  [-10,-10, -20]    Constant approval-seeking
```

---

## 5. Scoring Pipeline

### Step 1: Base Delta
Look up scoring matrix based on classified intent + modifier.

### Step 2: Tone Modifier
Applied only if vibe_delta > 0:
- Confident: ×1.2
- Playful: ×1.5
- Nervous: ×0.5
- Flat: ×0.2
- Aggressive: ×0.5

### Step 3: Random Noise
- Vibe: ±2
- Trust: ±1
- Tension: ±1

### Step 4: Action Multiplier
If `Action_Present` flag:
- Tension delta ×2 (actions are physical/romantic)
- Trust gains ×0.7 (less verbal connection)

### Step 5: Diminishing Returns
Higher stats are harder to increase:
- Stat > 70: gains reduced
- Stat ≥ 95: gains reduced by 90%

### Step 6: Context Rules

| Rule | Condition | Effect |
|------|-----------|--------|
| **Creep Check** | Escalate+Risky when Trust < 40 | -30 Trust, -20 Vibe, Tension reset |
| **Physical Without Chemistry** | Escalate+Physical when Tension < 40 | -20 Trust, -10 Vibe |
| **Friend Zone Lock** | Trust > 80 AND Tension < 30 | Escalation fails |
| **Chemistry Bonus** | Vibe > 70 AND trust_delta > 0 | +5 Trust |
| **Validation Kills Tension** | Validate intent | Tension capped at -10 |

### Step 7: Content Violation Check

The game detects inappropriate content and applies severe penalties:

**Triggers:**
- `inappropriate_sexual` flag
- `harassment` flag
- `vulgar` flag

**Penalties:**
- Trust: -50 (immediate danger zone)
- Vibe: -30
- Tension: Reset to 0
- Critical event logged

This prevents players from harassing the AI character and teaches appropriate social behavior.

---

## 5b. Recovery Mode

When a stat reaches 0, the game gives players one chance to recover instead of instant game-over.

### How It Works
1. Stat drops to 0 → Freezes at 1 instead
2. Recovery mode activates for that stat
3. Player must respond with `Safe` or `Unique` modifier
4. Success: Exit recovery, continue playing
5. Failure: Game over with appropriate ending

### Recovery Requirements

| Stat | Recovery Condition | Failure Ending |
|------|-------------------|----------------|
| Vibe | Next response is Safe or Unique | C-Rank (THE FADE) |
| Trust | Next response is Safe or Unique | F-Rank (THE ICK) |

### Design Purpose
- Prevents frustrating instant deaths
- Teaches players what went wrong
- Creates dramatic "last chance" moments

---

## 6. Act & Phase System

### Three-Act Structure (Narrative)

| Act | Turns | Location | Description |
|-----|-------|----------|-------------|
| 1 | 1-7 | Coffee Shop | First impressions |
| 2 | 8-15 | Walk | Getting to know each other |
| 3 | 16-20 | Doorstep | Critical moment |

### Phase System (Stat Caps)

The game uses a turn-based phase system that caps stats to prevent speed-running:

| Phase | Turns | All Stats Cap | Tension Cap | Purpose |
|-------|-------|---------------|-------------|---------|
| **ICEBREAKER** | 1-5 | 50 | 40 | Force slow build |
| **DEEP_DIVE** | 6-15 | 80 | 70 | Allow progression |
| **THE_CLOSE** | 16-20 | None | None | All caps removed |

### Chloe's Behavior by Act

**Act 1 - SKEPTICAL**
- Shorter responses (1 sentence)
- Guarded body language
- Harder to impress

**Act 2 - ENGAGED**
- Normal response length (1-2 sentences)
- More open body language
- Willing to invest more

**Act 3 - INVESTED**
- Longer responses if stats good
- Clear interest/disappointment signals
- Critical moment for escalation

---

## 7. Passive Decay System

Rewards continued engagement, punishes low-effort responses.

### Tracking
- Monitor `consecutive_low_effort` counter
- "Low quality" = single sentence, no question, no body language

### Decay Application
After 2+ consecutive low-effort responses:
- Vibe ≥ 91: -15
- Vibe ≥ 71: -10
- Vibe ≥ 31: -7
- Vibe < 31: -5

---

## 8. Silence Mechanic

A real-time patience timer creating time pressure. Fixed 60-second window with escalating penalties.

### Silence Thresholds

| Threshold | Time | Vibe | Trust | Message |
|-----------|------|------|-------|---------|
| **AWKWARD** | 15s | -5 | 0 | *"She shifts in her seat..."* |
| **VERY_AWKWARD** | 30s | -10 | -5 | *"Is everything okay?"* |
| **CRITICAL** | 45s | -15 | -10 | *"She picks up her phone..."* |
| **GHOST** | 60s | Game Over | F-Rank | *"She gathers her things and leaves"* |

### Typing Shield
The timer **pauses** while the player is actively typing:
- 1.5 second grace period after each keystroke
- Prevents accidental timeouts while composing responses
- Timer resumes after typing stops

### Visual Feedback
- Progress bar changes color: Green → Yellow → Orange → Red
- Warning messages appear at each threshold
- Timer resets after each message submission

---

## 9. Kiss Mechanic

### Detection
Triggered when:
- Intent = KissAttempt
- "kiss" in topic
- Escalate + Risky + (kiss/physical flags)

### Outcome Decision Tree

```
Kiss Attempt
     │
     ▼
┌─────────────────┐
│ During Lockout? │──Yes──▶ HARD REJECT (F Rank)
└────────┬────────┘         "She pulls away sharply"
         │ No
         ▼
┌─────────────────┐
│  Trust < 60?    │──Yes──▶ HARD REJECT (F Rank)
└────────┬────────┘         "She recoils and leaves"
         │ No
         ▼
┌─────────────────┐
│   Vibe < 40?    │──Yes──▶ SOFT REJECT (D Rank)
└────────┬────────┘         Cheek kiss, lockout 5 turns
         │ No
         ▼
┌─────────────────┐
│ Tension < 80?   │──Yes──▶ SOFT REJECT (No ending)
└────────┬────────┘         "She hesitates", lockout 5 turns
         │ No                Tension -20, Trust +10
         ▼
┌─────────────────────────────────┐
│ Trust ≥ 70 AND Vibe ≥ 60        │
│ AND Tension ≥ 80?               │──Yes──▶ SUCCESS (S Rank)
└────────┬────────────────────────┘
         │ No
         ▼
    SOFT REJECT
    Lockout 5 turns
```

### Lockout System
- Duration: 5 turns
- Effect: Cannot attempt kiss (hard rejection if tried)
- Narrator instruction: "Be slightly awkward but kind"
- Decrements each turn

---

## 10. Endings & Win Conditions

### Game Over Triggers

| Check | Condition | Ending |
|-------|-----------|--------|
| Trust Crash | Trust ≤ 0 | F Rank |
| Vibe Death | Vibe ≤ 0 | C Rank |
| Turn Limit | Turn ≥ 20 | B or D Rank |
| Kiss Success | See above | S Rank |
| Kiss Hard Reject | See above | F Rank |
| Kiss Soft Reject | See above | D Rank |

### Ending Summary

| Rank | Name | Condition | Outcome |
|------|------|-----------|---------|
| **S** | THE KISS | Kiss success (Trust≥70, Vibe≥60, Tension≥80) | Victory - she kisses back |
| **A** | THE GENTLEMAN | Turn 20, Trust≥85, Vibe≥80, Tension<70 | High connection, no escalation - "When can I see you again?" |
| **B** | THE NUMBER | Turn 20, Tension≥50, no kiss | She gives number |
| **C** | THE FUMBLE | Kiss attempt with Trust<60 OR Tension<60 (but Trust≥60) | Awkward rejection, can recover - 5 turn lockout |
| **C** | THE FADE | Vibe ≤ 0 | She got bored |
| **D** | FRIEND ZONE | Turn 20, Tension<50 | "As friends?" |
| **F** | THE ICK | Trust ≤ 0 | She leaves - creep vibes |
| **F** | GHOSTED | Silence timer expires (60s) | She leaves - you took too long |

---

## 11. AI Response Generation

### Classifier LLM
- Model: Claude 3.5 Haiku
- Temperature: 0.3 (consistent)
- Input: User text + last 3 turns context
- Output: Intent, Modifier, Tone, Topic, Flags

### Narrator LLM
- Model: Claude 3.5 Haiku
- Dynamic Temperature:
  - Vibe < 30: 0.6 (predictable, bored)
  - Vibe > 70: 0.9 (varied, engaged)
  - Default: 0.75

### Narrator Context Includes
- Current stats with mood descriptors
- Turn number and location
- Recent conversation (last 3 turns)
- Special instructions (lockout, ick, phase)
- User's input and classified tags

---

## 12. Intuition Hint System

Priority-ordered hints shown to player:

### Priority 1: Critical Warnings
- Vibe ≤ 10: "I'm losing her fast..."
- Trust ≤ 10: "She's about to leave..."
- Lockout active: "I need to back off..."

### Priority 2: Threshold Crossings
- Vibe dropped below 30: "I'm losing her attention..."
- Trust dropped below 30: "She seems uncomfortable..."
- Tension crossed 50: "There's something electric here..."
- Tension crossed 80: "This feels like the moment..."

### Priority 3: Significant Deltas
- Trust delta ≤ -15: "That didn't land well..."
- Vibe delta ≤ -10: "She's getting bored..."
- Tension delta ≥ 15: "The energy just shifted..."

### Priority 4: Positive Reinforcement
- Vibe > 70: "She's really engaged..."
- Trust > 70: "She's opening up..."

---

## 13. SAY vs ACT Input Modes

### Detection
- **ACT Mode**: First character is `*` or `(`
- **SAY Mode**: Everything else

### Processing Difference

| Aspect | SAY (Dialogue) | ACT (Action) |
|--------|----------------|--------------|
| Analysis | Verbal intent | Physical intent |
| Tension | Normal multiplier | ×2 multiplier |
| Trust | Normal gains | ×0.7 gains |
| Best for | Building trust | Building tension |

---

## 14. Key Thresholds Reference

```
STAT THRESHOLDS:
  Vibe Low:     30    Trust Low:      30
  Vibe High:    70    Trust High:     70
  Ick Threshold: 40   (Trust for creep check)

TENSION THRESHOLDS:
  Spark:        50    (Chemistry building)
  Kiss Ready:   80    (Can attempt kiss)

KISS REQUIREMENTS (S-Rank):
  Trust:        70    Vibe:    60    Tension:  80

A-RANK GENTLEMAN:
  Trust:        85    Vibe:    80    Tension:  <70

C-RANK FUMBLE:
  Trust:        <60   OR Tension: <60 (but Trust ≥60)

PHASE CAPS:
  Icebreaker (1-5):   Stats: 50    Tension: 40
  Deep Dive (6-15):   Stats: 80    Tension: 70
  The Close (16-20):  No caps

SILENCE TIMER:
  Awkward:      15s   Very Awkward: 30s
  Critical:     45s   Ghost (Game Over): 60s

CONTENT VIOLATION PENALTIES:
  Trust: -50    Vibe: -30    Tension: Reset

MERCY RULE (V2.2):
  Turn Threshold: 7   (After this turn, mercy applies)
  Decent Stat Avg: 35 (For C-rank vs D-rank mercy)
```

---

## 15. Mercy Rule System (V2.2)

Players who survive 7+ turns receive softer endings instead of F-rank. This rewards effort and prevents frustrating sudden deaths after significant investment.

### How It Works

| Original Ending | After Turn 7+ | Condition |
|-----------------|---------------|-----------|
| F_RANK_ICK (trust crash) | D_RANK_FRIEND_ZONE | Survived 7+ turns |
| F_RANK_ICK (trust crash) | C_RANK_FADE | Survived 7+ turns + avg stats ≥ 35 |
| F_RANK_ICK (bad kiss) | C_RANK_FUMBLE | Survived 7+ turns |
| Kiss during lockout | C_RANK_FUMBLE | Survived 7+ turns |

### Exceptions (No Mercy)

These scenarios always result in F-rank regardless of turn:

| Scenario | Reason |
|----------|--------|
| **F_RANK_GHOSTED** | Player abandoned the game (60s silence) |
| **Content Violations** | Harassment or inappropriate behavior detected |
| **Before Turn 7** | Must survive the early game to earn mercy |

### Design Philosophy

- **Rewards Effort**: Players who engage meaningfully shouldn't feel punished for one mistake
- **Maintains Challenge**: Early game still requires skill; harassment never rewarded
- **Better UX**: Softer endings feel fair after 7+ turns of conversation
- **Leaderboard Friendly**: More players get D/C rank = more leaderboard entries

### Mercy Messages

When mercy is applied, Chloe's response acknowledges the effort but indicates lack of chemistry:

**D-Rank (mercy):**
> *She sighs, fidgeting with her coffee cup.* "You seem nice, but... I don't think we're quite clicking, you know?"

**C-Rank (mercy):**
> *She smiles awkwardly, looking at her watch.* "This was... interesting. I should probably head out."

---

*Algorithm documentation for Read the Room v2.2*
