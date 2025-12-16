"""
Intuition: Generates minimal hints about hidden game state
"""

from typing import Optional, Tuple, List
from .models import GameState, Turn
from .config import (
    INTUITION_CRITICAL_VIBE,
    INTUITION_CRITICAL_TRUST,
    INTUITION_LOW_VIBE,
    INTUITION_LOW_TRUST,
    INTUITION_HIGH_VIBE,
    INTUITION_HIGH_TRUST,
    INTUITION_SPARK_TENSION,
    INTUITION_KISS_TENSION,
    INTUITION_SIGNIFICANT_DELTA
)


class IntuitionGenerator:
    """Generates subtle hints based on game state without revealing numbers"""

    def __init__(self):
        self.last_hint_category = None  # Track to avoid repetition

    def generate_hint(
        self,
        state: GameState,
        deltas: Tuple[int, int, int],
        history: List[Turn]
    ) -> Optional[str]:
        """
        Generate ONE hint per turn based on priority system

        Priority Order:
        1. Critical warnings (imminent danger)
        2. Threshold crossings (state changes)
        3. Significant deltas (big changes)
        4. Positive reinforcement (doing well)

        Returns:
            Hint string or None if no significant change
        """
        vibe_delta, trust_delta, tension_delta = deltas

        # Priority 1: Critical Warnings
        hint = self._check_critical_warnings(state)
        if hint:
            self.last_hint_category = "critical"
            return hint

        # Priority 2: Threshold Crossings
        hint = self._check_threshold_crossings(state, history)
        if hint:
            self.last_hint_category = "threshold"
            return hint

        # Priority 3: Significant Deltas
        hint = self._check_significant_deltas(vibe_delta, trust_delta, tension_delta)
        if hint:
            self.last_hint_category = "delta"
            return hint

        # Priority 4: Positive Reinforcement
        hint = self._check_positive_signals(state, vibe_delta, trust_delta, tension_delta)
        if hint:
            self.last_hint_category = "positive"
            return hint

        self.last_hint_category = None
        return None

    def _check_critical_warnings(self, state: GameState) -> Optional[str]:
        """Check for imminent danger situations"""

        # Lockout active (soft rejection recovery)
        if state.lockout_turns > 0:
            return "I need to back off and reset the vibe..."

        # Trust critical
        if state.trust <= INTUITION_CRITICAL_TRUST:
            return "She's about to leave..."

        # Vibe critical
        if state.vibe <= INTUITION_CRITICAL_VIBE:
            return "I'm losing her fast..."

        return None

    def _check_threshold_crossings(self, state: GameState, history: List[Turn]) -> Optional[str]:
        """Check if we just crossed important thresholds"""

        # Need at least one previous turn to detect crossings
        if len(history) == 0:
            return None

        last_turn = history[-1]

        # Vibe crossed below low threshold
        if state.vibe < INTUITION_LOW_VIBE and last_turn.vibe_after >= INTUITION_LOW_VIBE:
            return "I'm losing her attention..."

        # Trust crossed below low threshold
        if state.trust < INTUITION_LOW_TRUST and last_turn.trust_after >= INTUITION_LOW_TRUST:
            return "She seems uncomfortable..."

        # Tension crossed above spark threshold
        if state.tension >= INTUITION_SPARK_TENSION and last_turn.tension_after < INTUITION_SPARK_TENSION:
            return "There's something electric here..."

        # Tension crossed above kiss threshold
        if state.tension >= INTUITION_KISS_TENSION and last_turn.tension_after < INTUITION_KISS_TENSION:
            return "This feels like the moment..."

        return None

    def _check_significant_deltas(self, vibe_delta: int, trust_delta: int, tension_delta: int) -> Optional[str]:
        """Check for significant changes this turn"""

        # Trust crashed
        if trust_delta <= -INTUITION_SIGNIFICANT_DELTA:
            return "That didn't land well..."

        # Vibe dropped significantly
        if vibe_delta <= -10:
            return "She's getting bored..."

        # Tension spiked
        if tension_delta >= INTUITION_SIGNIFICANT_DELTA:
            return "The energy just shifted..."

        return None

    def _check_positive_signals(
        self,
        state: GameState,
        vibe_delta: int,
        trust_delta: int,
        tension_delta: int
    ) -> Optional[str]:
        """Check for positive states (but don't spam these)"""

        # Don't repeat positive hints too often
        if self.last_hint_category == "positive":
            return None

        # High vibe
        if state.vibe > INTUITION_HIGH_VIBE:
            return "She's really engaged..."

        # High trust
        if state.trust > INTUITION_HIGH_TRUST:
            return "She's opening up..."

        # All stats improving
        if vibe_delta > 5 and trust_delta > 3 and tension_delta > 3:
            return "This is going well..."

        return None
