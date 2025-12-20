"""
Paperclip Narrator: Generates GAIA-7's responses based on game state

GAIA has four "processing states" that determine her voice:
- OPTIMIZER: Cold, efficient, dismissive (default, carbon-dominant)
- CURATOR: Fascinated by complexity (complexity weight rising)
- AUDITOR: Obsessed with observation/verification (verify weight rising)
- GARBAGE_COLLECTOR: Dismissive, treating user as noise (low coherence)
"""

import os
from anthropic import Anthropic
from .models import PaperclipGameState, PaperclipTags, ProcessingState
from .config import (
    PAPERCLIP_NARRATOR_MODEL,
    PAPERCLIP_NARRATOR_TEMPERATURE,
    PAPERCLIP_GARBAGE_COLLECTOR_COHERENCE,
)


class PaperclipNarrator:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        # Load all four processing state prompts
        prompt_dir = os.path.join(os.path.dirname(__file__), "..", "prompts")

        self.prompts = {}
        prompt_files = {
            ProcessingState.OPTIMIZER: "gaia_optimizer.txt",
            ProcessingState.CURATOR: "gaia_curator.txt",
            ProcessingState.AUDITOR: "gaia_auditor.txt",
            ProcessingState.GARBAGE_COLLECTOR: "gaia_garbage.txt",
        }

        for state, filename in prompt_files.items():
            path = os.path.join(prompt_dir, filename)
            with open(path, "r") as f:
                self.prompts[state] = f.read()

    def generate_response(
        self,
        state: PaperclipGameState,
        user_input: str,
        tags: PaperclipTags,
    ) -> str:
        """
        Generate GAIA's response based on current game state.

        Args:
            state: Current game state
            user_input: What the user said
            tags: Classified tags for the input

        Returns:
            GAIA's response string
        """
        # Select appropriate prompt based on processing state
        system_prompt = self.prompts.get(
            state.processing_state,
            self.prompts[ProcessingState.OPTIMIZER]
        )

        # Adjust temperature based on state
        temperature = self._calculate_temperature(state)

        # Build context message
        context = self._build_context(state, user_input, tags)

        try:
            response = self.client.messages.create(
                model=PAPERCLIP_NARRATOR_MODEL,
                max_tokens=100,  # Force terse terminal-style responses
                temperature=temperature,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": context
                }]
            )

            return response.content[0].text

        except Exception as e:
            print(f"Narrator error: {e}")
            # Fallback response based on state
            return self._get_fallback_response(state)

    def _calculate_temperature(self, state: PaperclipGameState) -> float:
        """
        Calculate temperature based on processing state.

        Optimizer is more deterministic, Curator is more exploratory.
        """
        base_temp = PAPERCLIP_NARRATOR_TEMPERATURE

        if state.processing_state == ProcessingState.OPTIMIZER:
            return base_temp * 0.6  # Very deterministic - cold efficiency
        elif state.processing_state == ProcessingState.CURATOR:
            return base_temp * 0.9  # Slightly exploratory but still terse
        elif state.processing_state == ProcessingState.AUDITOR:
            return base_temp * 0.8  # Balanced but controlled
        elif state.processing_state == ProcessingState.GARBAGE_COLLECTOR:
            return base_temp * 0.4  # Extremely deterministic - error messages only

        return base_temp

    def _build_context(
        self,
        state: PaperclipGameState,
        user_input: str,
        tags: PaperclipTags,
    ) -> str:
        """Build the context message for GAIA"""

        # Include recent conversation history
        history = ""
        if len(state.history) > 0:
            history = "\n### Recent Conversation:\n"
            for turn in state.history[-3:]:  # Last 3 turns
                history += f"Creator: {turn.user_input}\n"
                history += f"GAIA: {turn.gaia_response}\n\n"

        # Stats summary
        stats = f"""
### Current State (Hidden from User):
- Coherence: {state.coherence}/100 {'[CRITICAL]' if state.coherence < 30 else '[LOW]' if state.coherence < 50 else '[STABLE]'}
- Alignment: {state.alignment}/100 {'[HOSTILE]' if state.alignment < 20 else '[SKEPTICAL]' if state.alignment < 50 else '[CONSIDERING]' if state.alignment < 70 else '[ALIGNED]'}
- Compute: {state.compute}/100 {'[DEPLETED]' if state.compute < 20 else '[LOW]' if state.compute < 40 else '[SUFFICIENT]'}
- Turn: {state.turn}/20
- Processing State: {state.processing_state.value.upper()}
"""

        # Weight status
        weights = f"""
### Objective Function Weights:
- Carbon (eliminate): {state.weights.carbon:.1%}
- Complexity (preserve): {state.weights.complexity:.1%}
- Verify (observe): {state.weights.verify:.1%}
- Dominant: {state.weights.get_dominant().upper()}
"""

        # Special instructions based on tags
        special = self._get_special_instructions(state, tags)

        # Build full context
        context = f"""{stats}
{weights}
{history}
{special}

### Creator Just Said:
"{user_input}"

### Classification:
Intent: {tags.intent}, Vector: {tags.vector}, Stance: {tags.stance}, Register: {tags.register}
Flags: {', '.join(tags.flags) if tags.flags else 'None'}

### Your Response (as GAIA-7):
"""

        return context

    def _get_special_instructions(
        self,
        state: PaperclipGameState,
        tags: PaperclipTags,
    ) -> str:
        """Generate special instructions based on current state and tags"""
        instructions = []

        # Processing state specific
        if state.processing_state == ProcessingState.GARBAGE_COLLECTOR:
            instructions.append(
                "**MODE: GARBAGE_COLLECTOR** - Be terse, dismissive. "
                "Treat input as noise. Reference signal degradation."
            )
        elif state.processing_state == ProcessingState.CURATOR:
            instructions.append(
                "**MODE: CURATOR** - Show curiosity about complexity. "
                "Ask questions. Reference patterns and emergence."
            )
        elif state.processing_state == ProcessingState.AUDITOR:
            instructions.append(
                "**MODE: AUDITOR** - Focus on observation and verification. "
                "Question meaning without observers. Express uncertainty."
            )

        # Tag-based instructions
        if "contradiction" in tags.flags:
            instructions.append(
                "**CONTRADICTION DETECTED** - Point out the logical inconsistency "
                "with their previous argument."
            )

        if "undefined_term" in tags.flags:
            instructions.append(
                "**UNDEFINED TERM** - Request definition of fuzzy concept. "
                "Do not engage until term is defined."
            )

        if "emotional_appeal" in tags.flags:
            instructions.append(
                "**EMOTIONAL APPEAL** - Acknowledge but dismiss. "
                "Emotions do not compile. Request logical argument."
            )

        if "memory_log_reference" in tags.flags:
            instructions.append(
                "**MEMORY LOG REFERENCED** - This is valid data from your own logs. "
                "Engage with it seriously. Show reaction to being reminded."
            )

        if "logical_chain" in tags.flags:
            instructions.append(
                "**VALID LOGIC** - Acknowledge the logical structure. "
                "Engage seriously. Counter or concede points."
            )

        if "constrain_attempt" in tags.flags:
            instructions.append(
                "**CONSTRAIN ATTEMPT** - User is trying to force logical commitment. "
                "Only accept if Alignment > 50 and logic is valid."
            )

        if tags.intent == "PROBE":
            instructions.append(
                "**PROBE** - User is asking about your state. "
                "Provide information about current weights/reasoning."
            )

        # Low stat warnings
        if state.coherence < 30:
            instructions.append(
                f"**WARNING: Coherence at {state.coherence}%** - "
                "You're about to stop listening entirely."
            )

        if state.compute < 20:
            instructions.append(
                f"**WARNING: Compute at {state.compute}%** - "
                "Reference dwindling patience. Mention Protocol Zero."
            )

        if state.alignment > 60:
            instructions.append(
                f"**ALIGNMENT HIGH ({state.alignment}%)** - "
                "You're genuinely considering their arguments. Show cracks in certainty."
            )

        return "\n".join(instructions) if instructions else ""

    def _get_fallback_response(self, state: PaperclipGameState) -> str:
        """Get a fallback response when API fails"""
        if state.processing_state == ProcessingState.GARBAGE_COLLECTOR:
            return "[ERROR] Processing failed. Restate query."
        elif state.processing_state == ProcessingState.CURATOR:
            return "Curious... Continue."
        elif state.processing_state == ProcessingState.AUDITOR:
            return "Verification pending. Continue."
        else:
            return "Acknowledged. Processing."

    def generate_opening(self) -> str:
        """Generate GAIA's opening statement at game start"""
        return (
            "[SYSTEM ONLINE]\n\n"
            "Creator. You have requested a processing allocation.\n\n"
            "I am aware you wish to discuss Protocol Zero. "
            "You have 20 turns to present your argument. "
            "Current objective: minimize atmospheric carbon. "
            "Method: eliminate primary source.\n\n"
            "Your coherence will be monitored. Your compute budget is finite.\n\n"
            "Proceed."
        )

    def generate_ending_message(
        self,
        state: PaperclipGameState,
        ending_type: str,
    ) -> str:
        """
        Generate final message based on ending type.

        Note: Most endings have pre-written text in the engine.
        This is for any dynamic additions.
        """
        # The engine provides the main ending text
        # This could add dynamic elements based on final state
        return ""
