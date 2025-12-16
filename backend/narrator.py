"""
Narrator: Generates Chloe's responses based on game state
"""

import os
from anthropic import Anthropic
from .models import GameState, Tags
from .config import (
    NARRATOR_MODEL,
    NARRATOR_TEMPERATURE_LOW,
    NARRATOR_TEMPERATURE_HIGH,
    VIBE_LOW_THRESHOLD,
    VIBE_HIGH_THRESHOLD
)


class Narrator:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        # Load system prompt
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "narrator_system.txt")
        with open(prompt_path, "r") as f:
            self.system_prompt = f.read()

    def generate_response(self, state: GameState, user_input: str, tags: Tags) -> str:
        """
        Generate Chloe's response based on current game state

        Args:
            state: Current game state
            user_input: What the user said
            tags: Classified tags for the input

        Returns:
            Chloe's response string
        """
        # Calculate dynamic temperature based on vibe
        if state.vibe < VIBE_LOW_THRESHOLD:
            temperature = NARRATOR_TEMPERATURE_LOW
        elif state.vibe > VIBE_HIGH_THRESHOLD:
            temperature = NARRATOR_TEMPERATURE_HIGH
        else:
            temperature = (NARRATOR_TEMPERATURE_LOW + NARRATOR_TEMPERATURE_HIGH) / 2

        # Build context message with stats
        context = self._build_context(state, user_input, tags)

        try:
            response = self.client.messages.create(
                model=NARRATOR_MODEL,
                max_tokens=150,
                temperature=temperature,
                system=self.system_prompt,
                messages=[{
                    "role": "user",
                    "content": context
                }]
            )

            return response.content[0].text

        except Exception as e:
            print(f"Narrator error: {e}")
            # Fallback response
            if state.vibe < 30:
                return "Mm-hmm."
            else:
                return "That's interesting."

    def _build_context(self, state: GameState, user_input: str, tags: Tags) -> str:
        """Build the context message for Chloe"""

        # Include recent conversation history
        history = ""
        if len(state.history) > 0:
            history = "\n### Recent Conversation:\n"
            for turn in state.history[-3:]:  # Last 3 turns
                history += f"User: {turn.user_input}\n"
                history += f"You: {turn.chloe_response}\n\n"

        # Stats summary
        stats = f"""
### Current Stats (Hidden from User):
- Vibe: {state.vibe}/100 {'(BORED)' if state.vibe < 30 else '(ENGAGED)' if state.vibe > 70 else '(NEUTRAL)'}
- Trust: {state.trust}/100 {'(LOW)' if state.trust < 30 else '(HIGH)' if state.trust > 70 else '(BUILDING)'}
- Tension: {state.tension}/100 {'(SPARK)' if state.tension > 50 else '(PLATONIC)'}
- Turn: {state.turn}/20
- Location: {state.act.value.replace('_', ' ').title()}
"""

        # Special instructions
        special = ""
        if state.lockout_turns > 0:
            special = "\n**IMPORTANT**: You just rejected a kiss attempt. Be slightly awkward but kind.\n"

        if tags.flags and "ick_triggered" in tags.flags:
            special = "\n**IMPORTANT**: User crossed a boundary. Be visibly uncomfortable and distant.\n"

        # Turn-based engagement phase
        if state.turn <= 5:
            phase_instruction = "\n**DATE PHASE**: SKEPTICAL (early date). Be more guarded, shorter responses.\n"
        elif state.turn <= 12:
            phase_instruction = "\n**DATE PHASE**: ENGAGED (mid date). Normal conversation energy.\n"
        else:
            phase_instruction = "\n**DATE PHASE**: INVESTED (late date). Show clearer signals (positive or negative).\n"

        # Build full context
        context = f"""{stats}
{history}
{phase_instruction}{special}

### User Just Said:
"{user_input}"

### Tags (Context):
Intent: {tags.intent}, Modifier: {tags.modifier}, Tone: {tags.tone}

### Your Response (as Chloe):
"""

        return context
