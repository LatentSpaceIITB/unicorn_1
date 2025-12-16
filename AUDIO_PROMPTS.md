# Audio Generation Prompts

Use these prompts with AI audio tools like **Suno**, **ElevenLabs**, or **Udio** to generate lo-fi/chill sounds for the game.

---

## SFX (Sound Effects)

Place generated files in: `frontend/public/audio/sfx/`

### Typewriter Blips (3 variations)

**File:** `blip-1.mp3` | **Duration:** 50-100ms
```
Soft, warm lo-fi blip sound, like a muted keyboard tap in a cozy cafe. Very short, subtle, gentle.
```

**File:** `blip-2.mp3` | **Duration:** 50-100ms
```
Soft lo-fi blip sound, slightly higher pitch than blip-1, warm texture, muted keyboard tap feel.
```

**File:** `blip-3.mp3` | **Duration:** 50-100ms
```
Soft lo-fi blip sound, slightly lower pitch, warm and cozy, subtle keyboard tap in coffee shop.
```

---

### Message Send

**File:** `send.mp3` | **Duration:** 200-300ms
```
Satisfying whoosh/send sound, lo-fi style, like a message floating away. Warm, soft confirmation sound with slight reverb.
```

---

### Stat Changes

**File:** `vibe-up.mp3` | **Duration:** 300-500ms
```
Warm ascending chime, lo-fi texture, hopeful and positive feeling. Like good news in a cozy cafe. Gentle upward melody.
```

**File:** `vibe-down.mp3` | **Duration:** 300-500ms
```
Soft descending tone, slightly muted, disappointed but not harsh. Lo-fi texture, like a small setback. Gentle downward notes.
```

---

### Alerts

**File:** `tension-ping.mp3` | **Duration:** 100-200ms
```
Subtle alert ping, lo-fi style, like a gentle warning bell in a jazz cafe. Not alarming, just attention-getting. Warm tone.
```

**File:** `warning.mp3` | **Duration:** 200-400ms
```
Soft escalating beep, cozy but urgent, like a friendly reminder that time is passing. Lo-fi texture, warm but insistent.
```

---

### Game Endings

**File:** `success.mp3` | **Duration:** 800-1200ms
```
Warm triumphant lo-fi chord progression, romantic success achieved, dreamy and satisfying. Like getting the kiss in a coffee shop romance. Vinyl warmth, gentle celebration.
```

**File:** `game-over.mp3` | **Duration:** 800-1200ms
```
Melancholy lo-fi ending, bittersweet feeling, vinyl crackle fade out. Like being friendzoned at a cafe. Sad but gentle, not dramatic.
```

---

## BGM (Background Music)

Place generated files in: `frontend/public/audio/bgm/`

**Important:** These should loop seamlessly!

---

### Cafe Ambient

**File:** `cafe-ambient.mp3` | **Duration:** 60-120 seconds | **Loop:** Yes
```
Coffee shop ambient soundscape. Quiet background chatter, occasional espresso machine sounds, soft clinking of cups, gentle cafe atmosphere. No music, just ambiance. Warm and cozy.
```

---

### Normal Gameplay Music

**File:** `chill-lofi.mp3` | **Duration:** 60-120 seconds | **Loop:** Yes
```
Lo-fi hip hop beat, relaxed coffee shop study vibes, 70-80 BPM. Warm vinyl crackle, mellow piano or guitar samples, soft drums. Perfect for a first date at a cafe. Chill and romantic.
```

---

### High Tension Music

**File:** `tension-jazz.mp3` | **Duration:** 60-120 seconds | **Loop:** Yes
```
Tense jazz piano, slight dissonance, romantic uncertainty, noir cafe atmosphere. Like an awkward moment on a date. Suspenseful but still warm, lo-fi texture. Minor keys, uncertain feeling.
```

---

### Awkward/Low Vibe Music

**File:** `awkward-silence.mp3` | **Duration:** 60-120 seconds | **Loop:** Yes
```
Sparse lo-fi track with uncomfortable pauses, heavy vinyl crackle, minimal melody. Like sitting in awkward silence on a bad date. Sparse piano notes, lots of empty space, melancholy.
```

---

## Recommended Tools

### For SFX:
- **ElevenLabs Sound Effects** - elevenlabs.io/sound-effects
- **Suno AI** - suno.com (can do short clips)
- **sfxr.me** - online retro sound generator

### For BGM:
- **Suno AI** - suno.com (excellent for lo-fi beats)
- **Udio** - udio.com
- **AIVA** - aiva.ai

---

## File Checklist

### SFX (`frontend/public/audio/sfx/`)
- [ ] blip-1.mp3
- [ ] blip-2.mp3
- [ ] blip-3.mp3
- [ ] send.mp3
- [ ] vibe-up.mp3
- [ ] vibe-down.mp3
- [ ] tension-ping.mp3
- [ ] warning.mp3
- [ ] success.mp3
- [ ] game-over.mp3

### BGM (`frontend/public/audio/bgm/`)
- [ ] cafe-ambient.mp3
- [ ] chill-lofi.mp3
- [ ] tension-jazz.mp3
- [ ] awkward-silence.mp3

---

## Testing

Once files are added:
1. Visit `http://localhost:3000/game`
2. Click anywhere to initialize audio (browser requirement)
3. Play the game - sounds will trigger automatically!

**Sound triggers:**
- Send a message → `send.mp3`
- Chloe types → `blip-1/2/3.mp3` (random)
- Stat goes up → `vibe-up.mp3`
- Stat goes down → `vibe-down.mp3`
- Tension hits 60+ → `tension-ping.mp3`
- Silence too long → `warning.mp3`
- Good ending (S/A/B) → `success.mp3`
- Bad ending (C/D/F) → `game-over.mp3`
