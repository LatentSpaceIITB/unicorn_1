# Read the Room - Product Overview

**Document for**: Senior Game Product Manager
**Date**: December 2025
**Status**: Phase 1 Complete (Text Prototype)

---

## Executive Summary

We're building a social dynamics RPG where players navigate a first date through natural conversation. Unlike traditional dating sims with branching dialogue trees, we use AI to analyze *how* players communicate, not just *what* they say. The goal isn't to "win the girl" - it's to teach social calibration through genuine challenge.

**Core Innovation**: We've gamified the invisible rules of social interaction using a three-stat system (Vibe, Trust, Tension) that responds to conversational tactics the same way real people do.

---

## The Vision

### What We're Making

A voice-based "Dark Souls of dating sims" where:
- Failure is the teacher
- Generic behavior is punished
- Reading social cues is the core skill
- Consent is respected, not "unlocked"

### The Fantasy

Players aren't "conquering" someone. They're **mastering social calibration** - learning to read a room, adapt their strategy, and build genuine connection under pressure.

### The Target Player

- Interested in social dynamics and self-improvement
- Enjoys high-difficulty games with fair rules
- Wants replayability through skill mastery
- Appreciates emergent gameplay over scripted paths

---

## What We've Built (Phase 1)

### Current State: Text Prototype

A fully playable terminal game that proves the core loop works:
1. Player types a message
2. AI analyzes it for intent, tone, and social awareness
3. Three hidden stats update based on scoring rules
4. AI generates a contextually appropriate response
5. Player must read body language cues to infer state
6. Win/loss conditions check if player is ready for next level

**Playthrough Length**: 12 minutes (20 turns)
**Archetype Implemented**: "The Romantic" (Normal Mode)

---

## Core Systems & Algorithms

### 1. The Three-Stat Engine

The game tracks three invisible bars that represent different dimensions of connection:

#### **Vibe (Entertainment Value)**
- **What it measures**: How engaged/bored she is
- **Starting value**: 30/100
- **Key mechanic**: **Passive Decay** (-5 per turn)
- **Why this matters**: Players can't "wait for the right moment" - they must actively maintain interest

**Design Insight**: This is the "stamina bar." If it hits 0, the date ends (she leaves bored). It forces players to keep the conversation dynamic.

#### **Trust (Safety)**
- **What it measures**: Comfort level and emotional safety
- **Starting value**: 20/100
- **Key mechanic**: **Hard to gain (+5 cap per turn), easy to lose (-30+ for mistakes)**
- **Why this matters**: Trust is the "health bar" - one creepy comment can crash it

**Design Insight**: This asymmetry teaches players that building rapport takes patience, but one boundary violation can destroy everything.

#### **Tension (Desire)**
- **What it measures**: Romantic/sexual chemistry
- **Starting value**: 0/100
- **Key mechanic**: **Resets to 0 if too much platonic talk**
- **Why this matters**: Players must oscillate between "safe" and "bold"

**Design Insight**: High Trust + Zero Tension = Friend Zone. Players must balance building safety with creating spark.

---

### 2. The Classifier Algorithm

**Purpose**: Convert natural language input into actionable game data

**How It Works**:

```
User Input: "Honestly, that dress is amazing, but you look freezing"
                          ↓
            [AI Classifier Analysis]
                          ↓
Output Tags:
- Intent: Compliment
- Modifier: Unique
- Tone: Playful
- Flags: [Negging_Risk]
```

**The Tag System**:

| Dimension | Options | Impact |
|-----------|---------|--------|
| **Intent** | Compliment, Question, Joke, Share, Escalate, React, Validate | What are they trying to do? |
| **Modifier** | Generic, Unique, Safe, Risky, Desperate | How well are they doing it? |
| **Tone** | Confident, Nervous, Playful, Aggressive, Flat | What's the delivery? |

**Why This Works**:
- Same words can have different effects based on timing (context-aware)
- "You're beautiful" early = creepy, late = romantic
- System detects *quality* of engagement, not just keywords

---

### 3. The Scoring Matrix

**Purpose**: Convert tags into stat changes

**The Formula**:
```
Base Delta = SCORING_MATRIX[Intent][Modifier]
Tone Multiplier = Applied to Vibe only
Random Noise = ±2 to prevent perfect optimization
Context Rules = Situational modifiers based on current state
```

**Example Scoring**:

| Input Type | Vibe | Trust | Tension |
|------------|------|-------|---------|
| Generic Compliment | -5 | 0 | -5 |
| Unique Compliment | +5 | +5 | +5 |
| Deep Question | +10 | +5 | 0 |
| Generic Question | -5 | 0 | 0 |
| Playful Tease | +15 | +5 | +5 |
| Validation Seeking | -5 | -5 | -10 |

**Tone Multipliers** (Vibe only):
- Confident: 1.2x
- Playful: 1.5x
- Nervous: 0.5x
- Flat: 0.2x

---

### 4. Context-Aware Rules

The scoring isn't static - it adapts based on game state:

#### **The Creep Check**
```
IF Intent = Escalate AND Modifier = Risky
AND Trust < 40
THEN: Trust ÷ 2 (Ick triggered)
```

**Design Lesson**: Premature escalation isn't just bad - it's catastrophic. This teaches timing.

#### **The Friend Zone Trap**
```
IF Tension = 0 AND Generic Question
THEN: Tension -= 5 (goes negative)
```

**Design Lesson**: Playing it too safe for too long makes it harder to create spark later.

#### **The Chemistry Bonus**
```
IF Vibe > 80 AND Trust gain > 0
THEN: Trust += 5 (bonus)
```

**Design Lesson**: When someone is having fun, they're more willing to open up.

---

### 5. The Narrator System

**Purpose**: Generate contextually appropriate responses that telegraph game state

**How It Works**:
- AI receives current stats, conversation history, and tags
- Dynamically adjusts response style based on Vibe level
- Includes body language descriptions to "telegraph" hidden state

**Response Modes**:

| Vibe Level | Behavior | Example |
|------------|----------|---------|
| **< 30 (Bored)** | Short, distracted, checks phone | "Mm-hmm." *glances at phone* |
| **30-70 (Neutral)** | Engaged, matches user energy | "Oh really? What got you into that?" |
| **> 70 (Engaged)** | Asks questions, shares stories | "Wait, that's hilarious. Tell me more!" |

**Tension Telegraphs** (if Tension > 50):
- Holds eye contact longer
- Bites lip, plays with hair
- Leans in closer

**Trust Telegraphs**:
- Low: Angles body away, checks exit
- High: Open posture, genuine laughs

**Design Insight**: Players must learn to "read the room" through text descriptions, simulating real-world social awareness.

---

### 6. Win/Loss Conditions

#### **The Kiss Attempt** (Player-Initiated)

Players can attempt a kiss at any time, but success depends on stat thresholds:

```
IF Trust < 60:
    → HARD REJECTION (Game Over - "I don't know you like that")

IF Vibe < 40:
    → SOFT REJECTION ("You're sweet, but...") + 5-turn lockout

IF Tension < 80:
    → SOFT REJECTION ("Not here...") + Tension -20

IF Trust ≥ 70 AND Vibe ≥ 60 AND Tension ≥ 80:
    → VICTORY (The Kiss)
```

**Design Lesson**: This teaches players that timing matters. You can't force a moment.

#### **The Lockout Mechanic**

After a soft rejection, the "kiss" button locks for 5 turns. Players must:
- Land 3 "safe" interactions (jokes, observations, listening)
- Rebuild the vibe before trying again
- Flirting during lockout = instant Hard Rejection

**Design Lesson**: This prevents toxic "just keep trying" behavior. Respect the boundary or lose.

#### **Automatic Game Over States**

| Ending | Condition | Rank |
|--------|-----------|------|
| **The Ick** | Trust ≤ 0 (boundary violation) | F |
| **The Fade** | Vibe ≤ 0 (too boring) | C |
| **Friend Zone** | End of session, Tension < 50 | D |
| **The Number** | High trust/vibe, no kiss attempt | B |
| **The Kiss** | Successful kiss attempt | S |

---

## The Session Structure

The date progresses through three acts with natural transition points:

### **Act 1: Coffee Shop (8 turns, ~4 minutes)**
- **Goal**: Identify her personality type (future: archetypes)
- **Challenge**: High "flake" risk - she might leave early if Vibe crashes
- **Mechanic**: Face-to-face pressure, Vibe decay at normal rate

### **Act 2: The Walk (8 turns, ~4 minutes)**
- **Goal**: Build deep Trust through vulnerability, start building Tension
- **Challenge**: Must maintain momentum from Act 1
- **Mechanic**: Vibe decay slows (walking reduces face-to-face pressure)

### **Act 3: The Doorstep (4 turns, ~2 minutes)**
- **Goal**: Make your move or part ways gracefully
- **Challenge**: Time pressure - she's going inside in 4 turns
- **Mechanic**: "Do or die" - must decide if stats are high enough

---

## The Archetype System (Planned)

Different personality types require different strategies:

| Archetype | Difficulty | Win Condition | Trap |
|-----------|------------|---------------|------|
| **The Romantic** | Normal | Kiss with balanced stats | Playing too aloof |
| **The Skeptic** | Hard | Maximum Trust, Medium Tension | Any "lines" or "game" |
| **Just Friends** | Trick | High Vibe, Low Tension, NO kiss | Trying to escalate |

**Current Status**: Only "Romantic" is implemented (Phase 1)

**Key Design Element**: "Just Friends" has NO romantic win condition. This teaches players that sometimes the answer is no, and that's okay. Trying to kiss her = Bad Ending.

---

## The "Dark Souls" Difficulty Philosophy

### What Makes This Hard (But Fair)

1. **Hidden Information**: Stats are invisible (players read body language)
2. **Passive Decay**: Doing nothing is failure (Vibe drops every turn)
3. **Harsh Penalties**: One mistake can cascade (Trust crashes fast)
4. **No Optimal Script**: Same line works differently based on context
5. **Delayed Feedback**: You might not realize a mistake until 3 turns later

### What Makes This Fair

1. **Telegraphing**: Body language hints at state ("checks phone" = low Vibe)
2. **Consistent Rules**: Same inputs produce similar outputs
3. **Learnable Patterns**: Players improve through practice
4. **Multiple Win States**: Kiss isn't the only success
5. **Respect Mechanic**: Soft rejections increase difficulty, not "convince her"

---

## Key Product Decisions & Rationale

### 1. **No Romance = Win State**

**Decision**: The "Just Friends" archetype has an A-Rank ending with zero romance.

**Why**: This prevents the game from teaching "persistence = success." Sometimes reading the room means recognizing when someone isn't interested.

**Impact**: Controversial but ethically sound. Positions us as a social skills trainer, not a PUA simulator.

### 2. **Consent Is Result, Not Obstacle**

**Decision**: Soft rejections make the game *harder* (higher thresholds), not easier (more attempts).

**Why**: Real consent isn't about convincing someone. It's the outcome of mutual connection.

**Impact**: The kiss isn't a lock to pick. It's proof you've built genuine rapport.

### 3. **Generic = Bad**

**Decision**: Boring conversation is actively punished (Vibe -5, Tension -5).

**Why**: Forces players to be present and creative, not autopilot through scripts.

**Impact**: High difficulty on first run, but teaches players to engage authentically.

### 4. **Vibe Decay**

**Decision**: Engagement drops automatically every turn.

**Why**: You can't "wait for the right moment" - you must create it.

**Impact**: Creates time pressure without literal countdowns. Feels organic.

### 5. **Asymmetric Scoring**

**Decision**: Trust is hard to gain (+5 cap) but easy to lose (-30 for mistakes).

**Why**: Mirrors real-world social dynamics. Trust is fragile.

**Impact**: Teaches players to be careful with boundaries, not just maximize numbers.

---

## What's Next

### Phase 2: Voice Integration
- Real-time speech-to-text
- Voice response with emotion
- 7-second silence timer (pressure mechanic)
- Audio latency optimization (<2 seconds total)

### Phase 3: The Polish
- Visual feedback (desaturation, blur, vignette)
- Reputation system across runs
- Tutorial sequence
- "Wingwoman" perk unlock

### Phase 4: Content Expansion
- "Skeptic" archetype (Hard Mode)
- "Just Friends" archetype (Trick Mode)
- Additional date scenarios
- Leaderboards and social features

---

## Metrics to Track

### Engagement Metrics
- Average playthrough time
- Completion rate vs. rage quit rate
- Replays per user
- Time to first win

### Learning Metrics
- Turn count to first win (skill proxy)
- Most common failure states
- Stat distributions at game over
- Tag distribution over time (are players improving?)

### Social Metrics
- Share rate (streaming potential)
- "Just Friends" recognition rate (ethical test)
- Recovery rate after soft rejection

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| "This is PUA software" | PR crisis | "Just Friends" archetype, respect mechanics |
| Too difficult, not fun | Low retention | Telegraphing, tutorial, difficulty modes |
| AI inconsistency | Broken game feel | Hybrid system (deterministic scoring) |
| Voice latency >2s | Breaks immersion | Phase 2 optimization, pipelining |
| Toxic player behavior | Moderation load | Abuse detection, timeout system |

---

## Why This Could Work

1. **No competitor does this**: Dating sims are visual novels, not skill-based games
2. **Viral potential**: Streamers will fail hilariously at first
3. **Replayability**: Archetypes + skill mastery = high replay value
4. **Educational angle**: Positions as social skills training, not just entertainment
5. **Short sessions**: 12 minutes = "one more try" loop

---

## Questions for Discussion

1. Should we add a "practice mode" with visible stats for onboarding?
2. Is the ethical framing strong enough to avoid controversy?
3. What's the monetization strategy? (Premium archetypes? Voice customization?)
4. Should we pursue educational partnerships (social skills training)?
5. What's the target platform priority? (Web first vs. mobile vs. PC)

---

**Document Version**: 1.0
**Last Updated**: December 2025
**For Questions**: Contact the product team
