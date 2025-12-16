# Implementation Plan: Web App Launch - "The Social Terminal"

## Overview

Transform CLI game into a web application with "Hacker/Cyber-Noir" aesthetic. No login required - session-based with UUID. Mobile-first design.

**Tech Stack**:
- **Frontend**: Next.js 14 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI (wrapping existing game engine)
- **Storage**: In-memory dict (MVP) → Redis (production)

---

## Phase 1: FastAPI Backend

### 1.1 Project Structure

```
unicorn/
├── backend/           # (existing) game logic
├── prompts/           # (existing) system prompts
├── api/               # NEW - FastAPI app
│   ├── __init__.py
│   ├── main.py        # FastAPI app entry point
│   ├── routes/
│   │   ├── __init__.py
│   │   └── games.py   # Game endpoints
│   ├── schemas.py     # Request/Response models
│   └── session.py     # In-memory session store
├── frontend/          # NEW - Next.js app
└── cli.py             # (existing) terminal version
```

### 1.2 Session Management (`api/session.py`)

```python
from typing import Dict, Optional
from backend.models import GameState
import uuid
from datetime import datetime, timedelta

class SessionStore:
    """In-memory session storage with TTL"""

    def __init__(self, ttl_minutes: int = 60):
        self._sessions: Dict[str, dict] = {}
        self.ttl = timedelta(minutes=ttl_minutes)

    def create(self) -> str:
        """Create new game session, return UUID"""
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "state": GameState(),
            "created_at": datetime.now(),
            "last_activity": datetime.now()
        }
        return session_id

    def get(self, session_id: str) -> Optional[GameState]:
        """Get game state by session ID"""
        session = self._sessions.get(session_id)
        if session:
            session["last_activity"] = datetime.now()
            return session["state"]
        return None

    def update(self, session_id: str, state: GameState):
        """Update game state"""
        if session_id in self._sessions:
            self._sessions[session_id]["state"] = state
            self._sessions[session_id]["last_activity"] = datetime.now()

    def delete(self, session_id: str):
        """Delete session"""
        self._sessions.pop(session_id, None)

    def cleanup_expired(self):
        """Remove expired sessions"""
        now = datetime.now()
        expired = [
            sid for sid, session in self._sessions.items()
            if now - session["last_activity"] > self.ttl
        ]
        for sid in expired:
            del self._sessions[sid]

# Global session store
sessions = SessionStore()
```

### 1.3 API Schemas (`api/schemas.py`)

```python
from pydantic import BaseModel
from typing import Optional, List
from backend.models import Tags, CriticalEvent, EndingType

class CreateGameResponse(BaseModel):
    session_id: str
    message: str

class TurnRequest(BaseModel):
    user_input: str
    input_mode: str = "dialogue"  # "dialogue" or "action"

class StatChanges(BaseModel):
    vibe: int
    trust: int
    tension: int

class CurrentStats(BaseModel):
    vibe: int
    trust: int
    tension: int
    turn: int
    act: str
    lockout_turns: int

class TurnResponse(BaseModel):
    success: bool
    turn_number: int
    tags: Optional[Tags]
    stat_changes: StatChanges
    current_stats: CurrentStats
    chloe_response: str
    intuition_hint: Optional[str]
    critical_event: Optional[CriticalEvent]
    game_over: bool
    ending: Optional[str]
    ending_message: Optional[str]

class BreakdownResponse(BaseModel):
    breakdown: str
    final_stats: CurrentStats
    ending: str
    rank: str

class GameStateResponse(BaseModel):
    session_id: str
    current_stats: CurrentStats
    history_length: int
    game_over: bool
```

### 1.4 API Routes (`api/routes/games.py`)

```python
from fastapi import APIRouter, HTTPException
from api.schemas import *
from api.session import sessions
from backend.classifier import Classifier
from backend.engine import GameEngine
from backend.narrator import Narrator
from backend.intuition import IntuitionGenerator
from backend.breakdown import BreakdownGenerator

router = APIRouter(prefix="/api/games", tags=["games"])

# Initialize shared components (stateless)
classifier = Classifier()
narrator = Narrator()
intuition_gen = IntuitionGenerator()
breakdown_gen = BreakdownGenerator()

@router.post("/", response_model=CreateGameResponse)
async def create_game():
    """Create new game session"""
    session_id = sessions.create()
    return CreateGameResponse(
        session_id=session_id,
        message="Game created. Good luck."
    )

@router.get("/{session_id}", response_model=GameStateResponse)
async def get_game(session_id: str):
    """Get current game state"""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return GameStateResponse(
        session_id=session_id,
        current_stats=CurrentStats(
            vibe=state.vibe,
            trust=state.trust,
            tension=state.tension,
            turn=state.turn,
            act=state.act.value,
            lockout_turns=state.lockout_turns
        ),
        history_length=len(state.history),
        game_over=state.game_over
    )

@router.post("/{session_id}/turn", response_model=TurnResponse)
async def process_turn(session_id: str, request: TurnRequest):
    """Process a single turn"""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if state.game_over:
        raise HTTPException(status_code=400, detail="Game already over")

    # Prepare input (wrap actions in asterisks if action mode)
    user_input = request.user_input
    if request.input_mode == "action":
        user_input = f"*{user_input}*"

    # Initialize engine for this state
    engine = GameEngine(state)

    # Classify input
    tags = classifier.analyze(user_input, state.history)

    # Check for kiss attempt
    kiss_result = engine.check_kiss_attempt(tags)
    ending = None
    ending_message = None

    if kiss_result:
        success, ending_type, message = kiss_result
        if ending_type:
            ending = ending_type.value
            ending_message = message
            state.game_over = True
            state.game_over_reason = ending

    # Calculate deltas
    vibe_delta, trust_delta, tension_delta = engine.calculate_delta(tags)

    # Apply decay
    decay_applied = engine.apply_passive_decay()

    # Update stats
    state.vibe += vibe_delta
    state.trust += trust_delta
    state.tension += tension_delta
    state.clamp_stats()
    engine.apply_phase_caps()

    # Generate response
    if not kiss_result:
        chloe_response = narrator.generate_response(state, user_input, tags)
    else:
        chloe_response = kiss_result[2]

    # Generate hint
    hint = intuition_gen.generate_hint(
        state, (vibe_delta, trust_delta, tension_delta), state.history
    )

    # Assess quality
    response_quality = engine.assess_response_quality(chloe_response)

    # Detect critical event
    critical_event = engine.detect_critical_event(
        state.turn, tags, vibe_delta, trust_delta, tension_delta
    )
    if critical_event:
        state.critical_events.append(critical_event)

    # Record turn
    from backend.models import Turn
    turn = Turn(
        turn_number=state.turn,
        user_input=user_input,
        tags=tags,
        vibe_change=vibe_delta,
        trust_change=trust_delta,
        tension_change=tension_delta,
        chloe_response=chloe_response,
        vibe_after=state.vibe,
        trust_after=state.trust,
        tension_after=state.tension,
        response_quality=response_quality,
        decay_applied=(decay_applied > 0),
        intuition_hint=hint,
        critical_event=critical_event
    )
    state.history.append(turn)

    # Update state
    state.previous_response_quality = response_quality
    state.turn += 1
    engine.process_lockout()
    engine.advance_act()

    # Check game over (if not already from kiss)
    if not state.game_over:
        game_over_result = engine.check_game_over()
        if game_over_result:
            ending_type, msg = game_over_result
            ending = ending_type.value
            ending_message = msg
            state.game_over = True
            state.game_over_reason = ending

    # Save state
    sessions.update(session_id, state)

    return TurnResponse(
        success=True,
        turn_number=turn.turn_number,
        tags=tags,
        stat_changes=StatChanges(
            vibe=vibe_delta,
            trust=trust_delta,
            tension=tension_delta
        ),
        current_stats=CurrentStats(
            vibe=state.vibe,
            trust=state.trust,
            tension=state.tension,
            turn=state.turn,
            act=state.act.value,
            lockout_turns=state.lockout_turns
        ),
        chloe_response=chloe_response,
        intuition_hint=hint,
        critical_event=critical_event,
        game_over=state.game_over,
        ending=ending,
        ending_message=ending_message
    )

@router.get("/{session_id}/breakdown", response_model=BreakdownResponse)
async def get_breakdown(session_id: str):
    """Get post-game analysis"""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if not state.game_over:
        raise HTTPException(status_code=400, detail="Game not over yet")

    breakdown = breakdown_gen.generate_breakdown(state)

    # Extract rank from ending
    rank = state.game_over_reason[0] if state.game_over_reason else "?"

    return BreakdownResponse(
        breakdown=breakdown,
        final_stats=CurrentStats(
            vibe=state.vibe,
            trust=state.trust,
            tension=state.tension,
            turn=state.turn,
            act=state.act.value,
            lockout_turns=state.lockout_turns
        ),
        ending=state.game_over_reason or "unknown",
        rank=rank
    )

@router.delete("/{session_id}")
async def delete_game(session_id: str):
    """Delete game session"""
    sessions.delete(session_id)
    return {"message": "Session deleted"}
```

### 1.5 Main App (`api/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import games

app = FastAPI(
    title="Read the Room API",
    description="Dating simulator game API",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://readtheroom.ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(games.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## Phase 2: Next.js Frontend

### 2.1 Project Setup

```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install framer-motion
npm install @fontsource/jetbrains-mono @fontsource/playfair-display
```

### 2.2 Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with fonts
│   ├── page.tsx            # Landing page
│   └── game/
│       └── page.tsx        # Main game UI
├── components/
│   ├── Terminal/
│   │   ├── Feed.tsx        # Message display
│   │   ├── Message.tsx     # Single message component
│   │   ├── InputBar.tsx    # Input with mode toggle
│   │   └── ModeToggle.tsx  # SAY/ACT toggle
│   ├── HUD/
│   │   ├── StatBar.tsx     # Individual stat display
│   │   ├── VibeWave.tsx    # Animated waveform
│   │   └── TensionGlow.tsx # Pulsing border
│   ├── EndScreen/
│   │   ├── Receipt.tsx     # Game over screen
│   │   └── ShareCard.tsx   # Downloadable canvas
│   └── ui/
│       └── TypeWriter.tsx  # Character-by-character text
├── hooks/
│   ├── useGame.ts          # Game state management
│   └── useTypewriter.ts    # Typewriter effect hook
├── lib/
│   ├── api.ts              # API client
│   └── types.ts            # TypeScript types
└── styles/
    └── globals.css         # Custom CSS (terminal aesthetic)
```

### 2.3 Color Palette (Tailwind Config)

```javascript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#050505',
          text: '#EAEAEA',
          dim: '#666666',
          vibe: '#00D9FF',      // Electric Blue
          tension: '#FF2E63',   // Neon Pink
          trust: '#FFB300',     // Amber/Gold
          success: '#00FF88',   // Green
          danger: '#FF4444',    // Red
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Playfair Display', 'serif'],
      }
    }
  }
}
```

### 2.4 Core Components

#### Landing Page (`app/page.tsx`)

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TypeWriter } from '@/components/ui/TypeWriter';
import { createGame } from '@/lib/api';

export default function Landing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    const { session_id } = await createGame();
    localStorage.setItem('session_id', session_id);
    router.push('/game');
  };

  return (
    <main className="min-h-screen bg-terminal-bg flex flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <TypeWriter
          text="Can you survive a first date?"
          className="text-2xl font-mono text-terminal-text mb-4"
          speed={50}
        />
        <TypeWriter
          text="20 Turns. 3 Stats. Don't get friendzoned."
          className="text-lg font-mono text-terminal-dim mb-8"
          speed={30}
          delay={2000}
        />
        <button
          onClick={handleStart}
          disabled={loading}
          className="
            px-8 py-4
            border-2 border-terminal-tension
            text-terminal-tension
            font-mono text-lg
            hover:bg-terminal-tension hover:text-terminal-bg
            transition-colors
            disabled:opacity-50
          "
        >
          {loading ? '[ INITIALIZING... ]' : '[ START ENCOUNTER ]'}
        </button>
      </div>
    </main>
  );
}
```

#### Input Bar with Mode Toggle (`components/Terminal/InputBar.tsx`)

```tsx
'use client';
import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';

type InputMode = 'dialogue' | 'action';

interface InputBarProps {
  onSubmit: (text: string, mode: InputMode) => void;
  disabled?: boolean;
}

export function InputBar({ onSubmit, disabled }: InputBarProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<InputMode>('dialogue');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSubmit(text.trim(), mode);
      setText('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-terminal-bg p-4 border-t border-terminal-dim"
    >
      <div className="flex gap-2 items-center">
        {/* Mode Toggle */}
        <button
          type="button"
          onClick={() => setMode(m => m === 'dialogue' ? 'action' : 'dialogue')}
          className={`
            px-3 py-2 font-mono text-sm
            border-2 transition-colors
            ${mode === 'dialogue'
              ? 'border-terminal-text text-terminal-text'
              : 'border-terminal-tension text-terminal-tension'
            }
          `}
        >
          {mode === 'dialogue' ? '🗣️ SAY' : '⚡ ACT'}
        </button>

        {/* Input Field */}
        <motion.input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={mode === 'dialogue' ? 'Say something...' : 'Do something...'}
          className={`
            flex-1 px-4 py-2
            bg-transparent
            font-mono text-terminal-text
            border-2 outline-none
            transition-colors
            ${mode === 'dialogue'
              ? 'border-terminal-text'
              : 'border-terminal-tension italic text-terminal-tension'
            }
            disabled:opacity-50
          `}
          animate={{
            borderColor: mode === 'dialogue' ? '#EAEAEA' : '#FF2E63'
          }}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="
            px-4 py-2
            bg-terminal-text text-terminal-bg
            font-mono
            disabled:opacity-50
          "
        >
          →
        </button>
      </div>
    </form>
  );
}
```

#### Message Component (`components/Terminal/Message.tsx`)

```tsx
import { motion } from 'framer-motion';
import { TypeWriter } from '@/components/ui/TypeWriter';

type MessageType = 'chloe' | 'player' | 'system' | 'intuition';

interface MessageProps {
  type: MessageType;
  text: string;
  isAction?: boolean;
}

export function Message({ type, text, isAction }: MessageProps) {
  const styles = {
    chloe: 'text-left font-serif text-terminal-text border-l-4 border-terminal-vibe pl-4',
    player: `text-left font-mono ${isAction ? 'italic text-terminal-tension' : 'text-terminal-text'} border-l-4 border-terminal-trust pl-4`,
    system: 'text-center font-mono text-terminal-dim text-sm',
    intuition: 'text-center font-mono text-terminal-vibe text-sm opacity-80',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`py-2 ${styles[type]}`}
    >
      {type === 'intuition' && <span>💭 </span>}
      {type === 'system' && <span>[System] </span>}
      <TypeWriter text={text} speed={type === 'chloe' ? 30 : 0} />
    </motion.div>
  );
}
```

#### Stat HUD (`components/HUD/StatBar.tsx`)

```tsx
import { motion } from 'framer-motion';

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  delta?: number;
}

export function StatBar({ label, value, max, color, delta }: StatBarProps) {
  const percentage = (value / max) * 100;

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <span className="w-12 text-terminal-dim">{label}</span>

      {/* Bar */}
      <div className="flex-1 h-2 bg-terminal-dim/30 relative overflow-hidden">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* Value */}
      <span className="w-8 text-right" style={{ color }}>
        {value}
      </span>

      {/* Delta */}
      {delta !== undefined && delta !== 0 && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`w-8 text-xs ${delta > 0 ? 'text-terminal-success' : 'text-terminal-danger'}`}
        >
          {delta > 0 ? '+' : ''}{delta}
        </motion.span>
      )}
    </div>
  );
}
```

#### Typewriter Effect (`components/ui/TypeWriter.tsx`)

```tsx
'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypeWriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypeWriter({
  text,
  speed = 30,
  delay = 0,
  className = '',
  onComplete
}: TypeWriterProps) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    if (speed === 0) {
      setDisplayText(text);
      onComplete?.();
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, started, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {displayText.length < text.length && started && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="inline-block w-2 h-4 bg-current ml-1"
        />
      )}
    </span>
  );
}
```

### 2.5 End Game Receipt (`components/EndScreen/Receipt.tsx`)

```tsx
'use client';
import { useRef } from 'react';
import html2canvas from 'html2canvas';

interface ReceiptProps {
  rank: string;
  ending: string;
  stats: { vibe: number; trust: number; tension: number };
  killerQuote: string;
  turnCount: number;
}

export function Receipt({ rank, ending, stats, killerQuote, turnCount }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, {
      backgroundColor: '#050505',
    });
    const link = document.createElement('a');
    link.download = 'date-performance.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const rankColors: Record<string, string> = {
    S: '#00FF88',
    A: '#00D9FF',
    B: '#FFB300',
    C: '#FF8800',
    D: '#FF4444',
    F: '#FF2E63',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Receipt Card */}
      <div
        ref={receiptRef}
        className="w-80 bg-terminal-bg border-2 border-terminal-dim p-6 font-mono"
      >
        <h1 className="text-center text-terminal-dim text-xs mb-4">
          DATE PERFORMANCE REPORT
        </h1>

        {/* Rank */}
        <div
          className="text-center text-6xl font-bold mb-2"
          style={{ color: rankColors[rank] || '#EAEAEA' }}
        >
          {rank}
        </div>
        <div className="text-center text-terminal-text mb-6">
          {ending.toUpperCase()}
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-terminal-vibe">VIBE</span>
            <span>{stats.vibe}/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-trust">TRUST</span>
            <span>{stats.trust}/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-tension">TENSION</span>
            <span>{stats.tension}/100</span>
          </div>
        </div>

        {/* Killer Quote */}
        <div className="border-t border-terminal-dim pt-4 mb-4">
          <div className="text-terminal-dim text-xs mb-2">THE MOMENT IT ENDED:</div>
          <div className="text-terminal-text italic text-sm">
            "{killerQuote}"
          </div>
        </div>

        {/* Turns */}
        <div className="text-center text-terminal-dim text-xs">
          SURVIVED {turnCount} TURNS
        </div>

        {/* Footer */}
        <div className="text-center text-terminal-tension text-xs mt-4">
          Can you do better? play.readtheroom.ai
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={downloadReceipt}
        className="px-6 py-2 border-2 border-terminal-text text-terminal-text font-mono hover:bg-terminal-text hover:text-terminal-bg transition-colors"
      >
        [ DOWNLOAD RECEIPT ]
      </button>

      {/* Play Again */}
      <button
        onClick={() => window.location.href = '/'}
        className="px-6 py-2 border-2 border-terminal-tension text-terminal-tension font-mono hover:bg-terminal-tension hover:text-terminal-bg transition-colors"
      >
        [ TRY AGAIN ]
      </button>
    </div>
  );
}
```

---

## Phase 3: API Client & State Management

### 3.1 API Client (`lib/api.ts`)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function createGame(): Promise<{ session_id: string }> {
  const res = await fetch(`${API_BASE}/api/games`, { method: 'POST' });
  return res.json();
}

export async function getGameState(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/games/${sessionId}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

export async function submitTurn(
  sessionId: string,
  userInput: string,
  inputMode: 'dialogue' | 'action'
) {
  const res = await fetch(`${API_BASE}/api/games/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_input: userInput, input_mode: inputMode }),
  });
  return res.json();
}

export async function getBreakdown(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/games/${sessionId}/breakdown`);
  return res.json();
}
```

### 3.2 Game Hook (`hooks/useGame.ts`)

```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';

interface Message {
  id: string;
  type: 'chloe' | 'player' | 'system' | 'intuition';
  text: string;
  isAction?: boolean;
}

interface Stats {
  vibe: number;
  trust: number;
  tension: number;
  turn: number;
  act: string;
}

interface Deltas {
  vibe: number;
  trust: number;
  tension: number;
}

export function useGame() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats>({ vibe: 30, trust: 20, tension: 0, turn: 0, act: 'coffee_shop' });
  const [deltas, setDeltas] = useState<Deltas>({ vibe: 0, trust: 0, tension: 0 });
  const [loading, setLoading] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [ending, setEnding] = useState<{ type: string; message: string } | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('session_id');
    if (stored) {
      setSessionId(stored);
      // Could also load existing state here
    }
  }, []);

  // Add opening message
  useEffect(() => {
    if (sessionId && messages.length === 0) {
      setMessages([
        { id: '0', type: 'system', text: 'You see Chloe sitting at a corner table, checking her phone.' }
      ]);
    }
  }, [sessionId, messages.length]);

  const submitMessage = useCallback(async (text: string, mode: 'dialogue' | 'action') => {
    if (!sessionId || loading || gameOver) return;

    setLoading(true);

    // Add player message immediately
    const playerId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: playerId,
      type: 'player',
      text: mode === 'action' ? `*${text}*` : text,
      isAction: mode === 'action'
    }]);

    try {
      const result = await api.submitTurn(sessionId, text, mode);

      // Add Chloe's response
      setMessages(prev => [...prev, {
        id: `chloe-${Date.now()}`,
        type: 'chloe',
        text: result.chloe_response
      }]);

      // Add intuition hint if present
      if (result.intuition_hint) {
        setMessages(prev => [...prev, {
          id: `hint-${Date.now()}`,
          type: 'intuition',
          text: result.intuition_hint
        }]);
      }

      // Update stats and deltas
      setStats(result.current_stats);
      setDeltas(result.stat_changes);

      // Check game over
      if (result.game_over) {
        setGameOver(true);
        setEnding({
          type: result.ending,
          message: result.ending_message
        });
      }

    } catch (error) {
      console.error('Turn error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'system',
        text: 'Connection error. Try again.'
      }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading, gameOver]);

  return {
    sessionId,
    messages,
    stats,
    deltas,
    loading,
    gameOver,
    ending,
    submitMessage,
  };
}
```

---

## Phase 4: Deployment

### 4.1 Backend Deployment (Railway/Render)

```dockerfile
# Dockerfile for FastAPI backend
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4.2 Frontend Deployment (Vercel)

```json
// vercel.json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

### 4.3 Environment Variables

**Backend (.env)**:
```
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGINS=https://readtheroom.ai,http://localhost:3000
```

**Frontend (.env.local)**:
```
NEXT_PUBLIC_API_URL=https://api.readtheroom.ai
```

---

## Implementation Order

| Phase | Task | Files | Time |
|-------|------|-------|------|
| 1.1 | Create API structure | `api/` folder | 30m |
| 1.2 | Session management | `api/session.py` | 30m |
| 1.3 | Game routes | `api/routes/games.py` | 1h |
| 1.4 | Test API with curl | - | 30m |
| 2.1 | Next.js setup | `frontend/` | 30m |
| 2.2 | Tailwind config | `tailwind.config.ts` | 15m |
| 2.3 | Landing page | `app/page.tsx` | 45m |
| 2.4 | Game UI components | `components/` | 2h |
| 2.5 | API integration | `hooks/useGame.ts` | 1h |
| 2.6 | End screen + Receipt | `components/EndScreen/` | 1h |
| 3.1 | Polish typewriter effect | - | 30m |
| 3.2 | Mobile responsiveness | - | 30m |
| 4.1 | Deploy backend | Railway/Render | 30m |
| 4.2 | Deploy frontend | Vercel | 30m |

**Total Estimated Time**: ~10 hours

---

## Critical Files to Create

### Backend (Python)
1. `api/__init__.py`
2. `api/main.py` - FastAPI app
3. `api/session.py` - Session store
4. `api/schemas.py` - Request/Response models
5. `api/routes/__init__.py`
6. `api/routes/games.py` - Game endpoints

### Frontend (Next.js)
1. `frontend/app/layout.tsx`
2. `frontend/app/page.tsx` - Landing
3. `frontend/app/game/page.tsx` - Game UI
4. `frontend/components/Terminal/Feed.tsx`
5. `frontend/components/Terminal/Message.tsx`
6. `frontend/components/Terminal/InputBar.tsx`
7. `frontend/components/HUD/StatBar.tsx`
8. `frontend/components/ui/TypeWriter.tsx`
9. `frontend/components/EndScreen/Receipt.tsx`
10. `frontend/hooks/useGame.ts`
11. `frontend/lib/api.ts`

---

## Anti-Slop Checklist

- [ ] NO chat bubbles (use left-border indicators)
- [ ] Monospaced fonts for UI (JetBrains Mono)
- [ ] Serif font for Chloe (Playfair Display)
- [ ] Input mode toggle (SAY/ACT)
- [ ] Typewriter effect on all text
- [ ] Dark background (#050505)
- [ ] Color-coded stats (Blue/Pink/Gold)
- [ ] Sticky HUD at top
- [ ] Sticky input at bottom
- [ ] Downloadable receipt with html2canvas
- [ ] No login/signup required
- [ ] UUID-based sessions in localStorage
