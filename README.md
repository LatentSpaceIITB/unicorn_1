# Read the Room

A social dynamics RPG where players navigate a first date through conversation. Success depends on reading social cues and building genuine connection.

## Phase 1: Text Prototype

This is the text-based prototype to validate the core game loop before adding voice.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file with your Anthropic API key:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

3. Run the game:
```bash
python cli.py
```

## How to Play

- Type your responses naturally
- Pay attention to Chloe's body language descriptions
- The game tracks hidden Vibe, Trust, and Tension stats
- Goal: Build all three stats high enough to succeed

## Debug Mode

The CLI shows hidden stats for testing. In production, these will be invisible.
