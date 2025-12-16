# UI/UX Design Report: Read the Room

## Overview

"Read the Room" is a first-date simulation game featuring a terminal-inspired cyberpunk aesthetic with immersive, stat-responsive visual feedback systems.

---

## 1. Visual Concepts

### Color Palette

| Category | Color | Hex Code | Usage |
|----------|-------|----------|-------|
| Background | Near-black | `#050505` | Primary backdrop |
| Text | Off-white | `#EAEAEA` | Main content |
| Dim | Grey | `#666666` | Secondary info |
| Vibe | Cyan | `#00D9FF` | Engagement stat |
| Trust | Gold | `#FFB300` | Safety stat |
| Tension | Hot Pink | `#FF2E63` | Chemistry/urgency stat |
| Success | Neon Green | `#00FF88` | Positive outcomes |
| Danger | Red | `#FF4444` | Negative outcomes |

### Typography

- **JetBrains Mono** (Monospace): UI controls, player dialogue, stats HUD - creates "hacker terminal" aesthetic
- **Playfair Display** (Serif): Chloe's dialogue responses - humanizes the AI character

### Visual Effects

1. **Dynamic Background**: Full-screen mood ring responding to all 3 stats
   - Vibe controls color temperature (cold blue to warm orange)
   - Tension controls pulse speed (4s calm to 1.5s anxious)
   - Trust controls visual stability (shake effect when low)

2. **Vignette Effect**: "The Silence" - creeping darkness representing time pressure
   - Normal: Black edge fade
   - Warning: Red/pink tinted with pulsing overlay

3. **Scanline Overlay**: Subtle CRT-style effect for retro terminal feel

---

## 2. Layout Structure

### Page Hierarchy

```
App
├── Landing Page (/)
│   └── Centered card with sequential reveal animation
│
├── Game Page (/game)
│   └── Full-viewport immersive layout with layered components
│
└── End Screen
    └── Receipt card with performance metrics
```

### Game Page Layout

```
┌─────────────────────────────────────────────────────┐
│  [DYNAMIC BACKGROUND]          fixed, z-index: -10  │
├─────────────────────────────────────────────────────┤
│  [VIGNETTE EFFECT]             fixed, z-index: 50   │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │  STATS HUD                    sticky, z-10  │    │
│  │  ├─ TURN X/20        [ACT NAME]             │    │
│  │  ├─ VIBE    [████████░░░░]  65  +5          │    │
│  │  ├─ TRUST   [██████░░░░░░]  50  -3          │    │
│  │  └─ TENSION [████░░░░░░░░]  35              │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  MESSAGE FEED               flex-1, scroll  │    │
│  │  ├─ [chloe] "Hey! Nice to meet you..."      │    │
│  │  ├─ [player] "Hi, thanks for coming"        │    │
│  │  ├─ [system] --- Act 2: The Walk ---        │    │
│  │  └─ [typing indicator] ...                  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  INPUT BAR                    sticky, z-10  │    │
│  │  [SAY] [____________________] [>]           │    │
│  │        "The silence grows..."               │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [AUDIO TOGGLE]                fixed top-right      │
└─────────────────────────────────────────────────────┘
```

### Responsive Strategy

- **Mobile-first**: Base padding of 16px (`p-4`)
- **Max-width container**: `max-w-3xl` (~65 characters) for readability
- **Flexbox layouts**: Adaptive sizing for all major sections
- **Breakpoint scaling**: Font sizes adjust with `md:` Tailwind prefixes

---

## 3. Wireframe & Component Structure

### Component Hierarchy

```
RootLayout
└── Body (CSS variables)
    │
    ├── Landing Page
    │   ├── Title (TypeWriter: "Can you survive a first date?")
    │   ├── Subtitle (TypeWriter: "20 Turns. 3 Stats...")
    │   ├── Start Button ([ START ENCOUNTER ])
    │   ├── Stat Preview (VIBE | TRUST | TENSION)
    │   └── Footer Hint (mode toggle instructions)
    │
    ├── Game Page
    │   ├── DynamicBackground (mood-responsive gradient)
    │   ├── Vignette (silence timer visualization)
    │   ├── AudioToggle (ambient sound control)
    │   ├── StatsHUD
    │   │   └── StatBar x3 (animated fill bars)
    │   ├── MessageFeed
    │   │   ├── Message (chloe/player/system/intuition)
    │   │   │   └── TypeWriter (for Chloe messages)
    │   │   └── TypingIndicator (stat-responsive dots)
    │   └── InputBar
    │       ├── Mode Indicator (SAY/ACT toggle)
    │       ├── Text Input (color-animated)
    │       ├── Submit Button (mode-aware icon)
    │       └── Silence Warning Text
    │
    └── End Screen
        └── Receipt
            ├── Header ("DATE PERFORMANCE REPORT")
            ├── Rank (S/A/B/C/D/F with color)
            ├── Ending Name
            ├── Final Stats Table
            ├── Killer Quote (optional)
            ├── Survival Counter
            └── Action Buttons
```

### Message Types & Styling

| Type | Border | Color | Font | Effect |
|------|--------|-------|------|--------|
| chloe | Cyan left | White | Serif | TypeWriter animation |
| player | Gold left | White | Mono | Fade in + slide |
| player-action | Gold left | Pink + italic | Mono | Fade in + slide |
| system | None | Grey | Mono | Fade in, centered |
| intuition | None | Cyan 80% | Mono | Fade in, `>` prefix |

### Input Modes

| Mode | Trigger | Label Color | Input Style | Button |
|------|---------|-------------|-------------|--------|
| SAY | Default | White | Normal | `>` |
| ACT | `*` or `(` prefix | Red | Italic | `!` |

---

## 4. Interaction & Feedback Systems

### Visual Feedback

- **Stat bars**: Spring-animated fills with delta indicators (+/- in green/red)
- **Mode switch**: Instant color/style change on input detection
- **Message reveal**: Fade + slide-up animation (200ms)
- **Button states**: Scale on hover (1.02) and tap (0.98)

### Haptic Feedback Patterns

| Event | Pattern | Duration |
|-------|---------|----------|
| Heartbeat | [100, 100, 100] | High tension |
| Damage | [300] | Trust loss |
| Reward | [50, 50, 50] | Vibe spike |
| Warning | [150, 50, 150] | Silence approaching |
| Light | [30] | Mode switch |

### Audio System

- Ambient coffee shop soundscape
- Tension-responsive low-pass filter (20kHz to 500Hz)
- Volume attenuation at high tension (0.3 to 0.15)
- User-controlled toggle with persistence

---

## 5. Technical Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Full-stack framework |
| React 19 | Component library |
| Tailwind CSS v4 | Utility-first styling |
| Framer Motion | Animations |
| html2canvas | Receipt screenshot |
| Web Vibration API | Haptic feedback |
| Web Audio API | Ambient sound |

---

## 6. Accessibility

- **Contrast**: WCAG AA compliant (off-white on near-black)
- **Focus states**: Cyan outline (2px) on all interactive elements
- **Touch targets**: Minimum 8px padding on buttons
- **Auto-scroll**: Smooth scroll to newest messages
- **Selection**: Custom pink background for text selection

---

*Document generated for Read the Room v2 - Immersive UI*
