# Visual Effects Implementation

## Overview
This document explains how the visual "juice" effects were implemented for the terminal game.

---

## 1. CRT Monitor Effects

**File:** `frontend/src/components/Effects/CRTEffect.tsx`

### Implementation
The CRT effect uses 3 overlapping `<div>` elements with CSS, all positioned `fixed` over the entire screen.

```tsx
// Scanlines - horizontal lines using repeating gradient
<div style={{
  background: `repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),      // Dark line (15% opacity)
    rgba(0, 0, 0, 0.15) 1px,  // 1px thick
    transparent 1px,
    transparent 3px           // 3px gap between lines
  )`,
  animation: 'crt-flicker 0.1s infinite',
}} />

// Vignette - darkened edges using radial gradient
<div style={{
  background: `radial-gradient(
    ellipse at center,
    transparent 0%,
    transparent 50%,
    rgba(0, 0, 0, 0.4) 100%   // 40% dark at edges
  )`,
}} />

// Screen glow - cyan inner shadow
<div style={{
  boxShadow: 'inset 0 0 150px rgba(0, 217, 255, 0.08)',
}} />
```

### CSS Animation (in globals.css)
```css
@keyframes crt-flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.98; }
  94% { opacity: 1; }
  97% { opacity: 0.99; }
  98% { opacity: 1; }
}
```

---

## 2. Steam/Smoke Particles

**File:** `frontend/src/components/Effects/SteamParticles.tsx`

### Implementation
Creates 18 particle `<div>` elements that animate upward using CSS keyframes.

```tsx
// Each particle is a blurred circle
<div style={{
  left: `${particle.x}%`,           // Random horizontal position
  bottom: '-60px',                   // Start below screen
  width: particle.size,              // 20-60px
  height: particle.size,
  background: `radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.15) 0%,   // White center
    rgba(255, 255, 255, 0.08) 40%,
    transparent 70%
  )`,
  filter: 'blur(6px)',               // Soft edges
  animation: `steam-rise ${duration}s linear infinite`,
  '--drift': `${drift}px`,           // Horizontal movement
}} />
```

### CSS Animation (in globals.css)
```css
@keyframes steam-rise {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0;
  }
  10% { opacity: 0.2; }              // Fade in
  50% { opacity: 0.15; }             // Peak visibility
  90% { opacity: 0.05; }             // Fade out
  100% {
    transform: translateY(-100vh) translateX(var(--drift, 0)) scale(1.5);
    opacity: 0;
  }
}
```

---

## 3. Chromatic Aberration

**File:** `frontend/src/app/globals.css`

### Implementation
Applied to the main game container via CSS class.

```css
.crt-aberration {
  text-shadow:
    0.5px 0 0 rgba(255, 0, 0, 0.03),    /* Red offset right */
    -0.5px 0 0 rgba(0, 255, 255, 0.03); /* Cyan offset left */
}
```

---

## 4. Integration

**File:** `frontend/src/app/game/page.tsx`

```tsx
return (
  <>
    {/* Effects rendered as fixed overlays */}
    <CRTEffect />
    <SteamParticles />

    <main className="... crt-aberration">
      {/* Game content */}
    </main>
  </>
);
```

---

## Z-Index Hierarchy

| Layer | Z-Index | Content |
|-------|---------|---------|
| CRT Effects | z-50 | Scanlines, vignette, glow |
| UI Elements | z-10 | HUD, InputBar |
| Particles | z-5 | Steam wisps |
| Content | z-0 | Messages |

---

## Current Intensity Values

**Scanlines (White Phosphor Glow):**
- Color: White (`rgba(255, 255, 255, 0.06)`) - NOT black!
- Line thickness: 2px
- Gap between lines: 2px transparent, 2px lit
- NOTE: Using white lines on black background creates visible "glowing" CRT effect

**Vignette:**
- Edge darkness: 70% (`rgba(0, 0, 0, 0.7)`)
- Start fade: 30% from center

**Screen Glow:**
- Cyan inner shadow: `inset 0 0 150px rgba(0, 217, 255, 0.15)`

**Steam Particles:**
- Peak opacity: 50% (in animation keyframe)
- Particle opacity: 35% center, 20% mid
- Particle count: 18
- Size: 20-60px
- Rise duration: 15-25 seconds
- Blur: 8px

---

## Common Problems & Fixes

### 1. "Black on Black" Problem (Scanlines)
**Problem:** Black scanlines on a black background are invisible.
**Fix:** Use WHITE/light colored scanlines with low opacity to simulate glowing phosphor lines.
```css
/* WRONG - invisible */
rgba(0, 0, 0, 0.2)

/* CORRECT - visible glow */
rgba(255, 255, 255, 0.06)
```

### 2. "Ghost Container" Problem (Steam Particles)
**Problem:** Particle container has no dimensions or wrong positioning.
**Fix:** Use explicit fixed positioning with full viewport dimensions:
```tsx
style={{
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 1,
}}
```

### 3. "Z-Index Sandwich" Problem
**Problem:** Main content has solid background that covers particles behind it.
**Fix:**
- Set `<main>` background to `transparent`
- Body has the black background (via CSS)
- Particles render between body and transparent main
- CRT overlay renders on top of everything

**Correct Z-Index Layering:**
| Layer | Z-Index | Background |
|-------|---------|------------|
| CRT Overlay | 100 | transparent |
| Main Content | 2 | transparent |
| Steam Particles | 1 | transparent |
| Body | - | black (#050505) |

### 4. InputBar Coverage
**Problem:** Solid InputBar background covers particles.
**Fix:** Use semi-transparent background with backdrop blur:
```tsx
backgroundColor: 'rgba(5, 5, 5, 0.85)',
backdropFilter: 'blur(4px)',
```

---

## How to Debug

1. **Check DOM**: Open browser DevTools → Elements → Look for the fixed divs from CRTEffect

2. **Inspect Styles**: Click on the CRT overlay divs and check if styles are applied

3. **Temporarily Increase Intensity**: Change scanline opacity to `rgba(0, 0, 0, 0.5)` to make it very obvious

4. **Check Console**: Look for any CSS/JS errors

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/components/Effects/CRTEffect.tsx` | New file - CRT overlay |
| `frontend/src/components/Effects/SteamParticles.tsx` | New file - Particle system |
| `frontend/src/app/globals.css` | Added keyframes + aberration class |
| `frontend/src/app/game/page.tsx` | Import and render effects |
