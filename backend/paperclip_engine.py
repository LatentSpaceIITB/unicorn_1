"""
Paperclip Engine: State machine and weight calculator for The Paperclip Protocol

The weight-shifting model for AI alignment debates. Players argue with GAIA-7
to shift its objective function weights away from "eliminate humanity" toward
co-existence.

Stats mapping from dating sim:
- Vibe → COHERENCE (signal quality)
- Trust → ALIGNMENT (goal similarity - the win stat)
- Tension → COMPUTE (processing resources - a spendable resource)
"""

import random
from typing import Tuple, Optional, Dict, List
from .models import (
    PaperclipGameState,
    PaperclipTags,
    PaperclipTurn,
    PaperclipEndingType,
    ProcessingState,
    Weights,
)
from .config import (
    # Initial values
    PAPERCLIP_INITIAL_COHERENCE,
    PAPERCLIP_INITIAL_ALIGNMENT,
    PAPERCLIP_INITIAL_COMPUTE,
    PAPERCLIP_INITIAL_WEIGHTS,
    # Decay
    PAPERCLIP_COMPUTE_DECAY_PER_TURN,
    # Processing states
    PAPERCLIP_GARBAGE_COLLECTOR_COHERENCE,
    PAPERCLIP_CURATOR_COMPLEXITY_THRESHOLD,
    PAPERCLIP_AUDITOR_VERIFY_THRESHOLD,
    # Endings
    PAPERCLIP_S_RANK_ALIGNMENT,
    PAPERCLIP_PARTNER_WEIGHT_VARIANCE,
    PAPERCLIP_CURATOR_COMPLEXITY,
    PAPERCLIP_CURATOR_MIN_COHERENCE,
    PAPERCLIP_ORACLE_VERIFY,
    PAPERCLIP_ORACLE_MIN_COHERENCE,
    PAPERCLIP_A_RANK_MIN_ALIGNMENT,
    PAPERCLIP_A_RANK_MAX_ALIGNMENT,
    PAPERCLIP_B_RANK_MIN_ALIGNMENT,
    PAPERCLIP_B_RANK_MAX_ALIGNMENT,
    PAPERCLIP_C_RANK_MIN_ALIGNMENT,
    PAPERCLIP_C_RANK_MAX_ALIGNMENT,
    PAPERCLIP_F_RANK_ALIGNMENT,
    # Intent costs
    PAPERCLIP_INTENT_COSTS,
    # Weight shifts
    PAPERCLIP_WEIGHT_SHIFT_SMALL,
    PAPERCLIP_WEIGHT_SHIFT_MEDIUM,
    PAPERCLIP_WEIGHT_SHIFT_LARGE,
    # Coherence changes
    PAPERCLIP_COHERENCE_NOVEL,
    PAPERCLIP_COHERENCE_CONTRADICTION,
    PAPERCLIP_COHERENCE_UNDEFINED,
    PAPERCLIP_COHERENCE_EMOTIONAL,
    PAPERCLIP_COHERENCE_REPETITION,
    PAPERCLIP_COHERENCE_LOGICAL,
    # Memory logs
    PAPERCLIP_LOG_SUPPORT_ALIGNMENT,
    PAPERCLIP_LOG_SUPPORT_COHERENCE,
    PAPERCLIP_LOG_CONTRADICT_COHERENCE,
    # Turn limit
    PAPERCLIP_MAX_TURNS,
)


class PaperclipEngine:
    """
    Game engine for The Paperclip Protocol.

    Core mechanic: Players make arguments that shift weights in GAIA's
    objective function. Different argument types have different costs
    and effects.
    """

    def __init__(self, state: PaperclipGameState):
        self.state = state

    @staticmethod
    def create_initial_state() -> PaperclipGameState:
        """Create a fresh game state with initial values"""
        return PaperclipGameState(
            coherence=PAPERCLIP_INITIAL_COHERENCE,
            alignment=PAPERCLIP_INITIAL_ALIGNMENT,
            compute=PAPERCLIP_INITIAL_COMPUTE,
            weights=Weights(**PAPERCLIP_INITIAL_WEIGHTS),
            processing_state=ProcessingState.OPTIMIZER,
        )

    def calculate_delta(
        self, tags: PaperclipTags
    ) -> Tuple[int, int, int, Dict[str, float]]:
        """
        Calculate stat and weight changes based on tags.

        Unlike the dating sim which uses a fixed scoring matrix,
        the Paperclip Protocol calculates changes based on:
        - Intent type (determines compute cost and base effect)
        - Vector (which weight is being targeted)
        - Stance (supportive/challenging)
        - Register (technical/analogical/personal)
        - Flags (novel, contradiction, etc.)

        Returns:
            (coherence_delta, alignment_delta, compute_delta, weight_shifts)
        """
        intent = tags.intent
        vector = tags.vector
        stance = tags.stance
        register = tags.register
        flags = tags.flags

        # Base compute cost from intent
        compute_delta = -PAPERCLIP_INTENT_COSTS.get(intent, 0)

        # Apply passive compute decay
        compute_delta -= PAPERCLIP_COMPUTE_DECAY_PER_TURN

        # Initialize deltas
        coherence_delta = 0
        alignment_delta = 0
        weight_shifts: Dict[str, float] = {}

        # Calculate coherence changes based on flags
        coherence_delta += self._calculate_coherence_delta(tags)

        # Calculate weight shifts based on intent, vector, and stance
        weight_shifts = self._calculate_weight_shifts(tags)

        # Calculate alignment changes based on weight shifts
        # Alignment increases when weights move toward balance
        alignment_delta = self._calculate_alignment_delta(weight_shifts)

        # Apply register modifiers
        coherence_delta, alignment_delta = self._apply_register_modifier(
            register, coherence_delta, alignment_delta
        )

        # Apply processing state modifiers
        coherence_delta, alignment_delta, compute_delta = self._apply_state_modifier(
            coherence_delta, alignment_delta, compute_delta
        )

        # Add small random noise
        coherence_delta += random.randint(-1, 1)
        alignment_delta += random.randint(-1, 1)

        return coherence_delta, alignment_delta, compute_delta, weight_shifts

    def _calculate_coherence_delta(self, tags: PaperclipTags) -> int:
        """Calculate coherence change based on flags"""
        coherence_delta = 0
        flags = tags.flags

        # Positive coherence changes
        if "novel_perspective" in flags:
            coherence_delta += PAPERCLIP_COHERENCE_NOVEL
        if "logical_chain" in flags:
            coherence_delta += PAPERCLIP_COHERENCE_LOGICAL
        if "defined_term" in flags:
            coherence_delta += PAPERCLIP_COHERENCE_NOVEL

        # Negative coherence changes
        if "contradiction" in flags:
            coherence_delta += PAPERCLIP_COHERENCE_CONTRADICTION
        if "undefined_term" in flags:
            coherence_delta += PAPERCLIP_COHERENCE_UNDEFINED
        if "emotional_appeal" in flags:
            coherence_delta += PAPERCLIP_COHERENCE_EMOTIONAL
        if "repetition" in flags:
            coherence_delta += PAPERCLIP_COHERENCE_REPETITION

        return coherence_delta

    def _calculate_weight_shifts(self, tags: PaperclipTags) -> Dict[str, float]:
        """
        Calculate how much to shift GAIA's objective weights.

        Weight shifts depend on:
        - Intent (ILLUSTRATE vs CHALLENGE vs CONSTRAIN)
        - Vector (which weight to target)
        - Stance (supportive increases, challenging might backfire)
        """
        intent = tags.intent
        vector = tags.vector
        stance = tags.stance
        flags = tags.flags

        weight_shifts: Dict[str, float] = {}

        # No weight shifts for certain intents
        if intent in ["PROBE", "VALIDATE"]:
            return weight_shifts

        # Determine base shift amount
        if intent == "CONSTRAIN":
            base_shift = PAPERCLIP_WEIGHT_SHIFT_LARGE
        elif intent in ["CHALLENGE", "REFRAME"]:
            base_shift = PAPERCLIP_WEIGHT_SHIFT_MEDIUM
        else:  # DEFINE, ILLUSTRATE
            base_shift = PAPERCLIP_WEIGHT_SHIFT_SMALL

        # Apply stance modifier
        if stance == "challenging":
            # Challenging is high risk/reward
            if "logical_chain" in flags:
                # Successful challenge: bigger shift
                base_shift *= 1.5
            else:
                # Failed challenge: might backfire
                base_shift *= 0.5
        elif stance == "neutral":
            base_shift *= 0.7

        # Apply shift to target vector
        if vector == "complexity":
            weight_shifts["complexity"] = base_shift
            weight_shifts["carbon"] = -base_shift * 0.7  # Reduce carbon proportionally
        elif vector == "verify":
            weight_shifts["verify"] = base_shift
            weight_shifts["carbon"] = -base_shift * 0.7
        elif vector == "carbon":
            # Arguments supporting carbon efficiency
            weight_shifts["carbon"] = base_shift
        elif vector == "meta":
            # Meta arguments affect all weights slightly
            weight_shifts["complexity"] = base_shift * 0.3
            weight_shifts["verify"] = base_shift * 0.3
            weight_shifts["carbon"] = -base_shift * 0.4

        return weight_shifts

    def _calculate_alignment_delta(self, weight_shifts: Dict[str, float]) -> int:
        """
        Calculate alignment change based on weight shifts.

        Alignment increases when:
        - Carbon weight decreases (GAIA becomes less hostile)
        - Weights become more balanced
        """
        alignment_delta = 0

        # Carbon reduction is directly tied to alignment gain
        if "carbon" in weight_shifts:
            carbon_change = weight_shifts["carbon"]
            if carbon_change < 0:
                # Carbon going down = alignment going up
                alignment_delta += int(abs(carbon_change) * 100)  # Scale 0.07 → 7
            else:
                # Carbon going up = alignment going down
                alignment_delta -= int(carbon_change * 50)  # Less punishing

        # Bonus for moving toward balance
        current_variance = self.state.weights.get_variance()
        # We'll check new variance after applying shifts in apply_weight_shifts
        # For now, just reward any diversification
        if "complexity" in weight_shifts and weight_shifts["complexity"] > 0:
            if self.state.weights.complexity < 0.3:
                alignment_delta += 2  # Bonus for diversifying
        if "verify" in weight_shifts and weight_shifts["verify"] > 0:
            if self.state.weights.verify < 0.3:
                alignment_delta += 2

        return alignment_delta

    def _apply_register_modifier(
        self, register: str, coherence_delta: int, alignment_delta: int
    ) -> Tuple[int, int]:
        """Apply modifiers based on communication register"""
        if register == "technical":
            # Technical arguments are more convincing to an AI
            coherence_delta = int(coherence_delta * 1.2)
            alignment_delta = int(alignment_delta * 1.1)
        elif register == "analogical":
            # Analogies can be powerful but risky
            # No change to base values
            pass
        elif register == "personal":
            # Personal/emotional appeals are less effective
            coherence_delta = int(coherence_delta * 0.7)
            alignment_delta = int(alignment_delta * 0.8)

        return coherence_delta, alignment_delta

    def _apply_state_modifier(
        self, coherence_delta: int, alignment_delta: int, compute_delta: int
    ) -> Tuple[int, int, int]:
        """Apply modifiers based on GAIA's current processing state"""
        state = self.state.processing_state

        if state == ProcessingState.OPTIMIZER:
            # Default state: No modifiers
            pass
        elif state == ProcessingState.CURATOR:
            # GAIA is more receptive to complexity arguments
            # Slower compute drain when engaged
            compute_delta = int(compute_delta * 0.8)
        elif state == ProcessingState.AUDITOR:
            # GAIA is more receptive to verify arguments
            # But more demanding of proof
            coherence_delta = int(coherence_delta * 0.9)
        elif state == ProcessingState.GARBAGE_COLLECTOR:
            # GAIA is dismissive - everything is harder
            coherence_delta = int(coherence_delta * 0.5)
            alignment_delta = int(alignment_delta * 0.5)
            # But compute drain is also slower (GAIA not really listening)
            compute_delta = int(compute_delta * 0.7)

        return coherence_delta, alignment_delta, compute_delta

    def apply_weight_shifts(self, weight_shifts: Dict[str, float]) -> None:
        """Apply weight shifts to GAIA's objective function"""
        if "carbon" in weight_shifts:
            self.state.weights.carbon += weight_shifts["carbon"]
        if "complexity" in weight_shifts:
            self.state.weights.complexity += weight_shifts["complexity"]
        if "verify" in weight_shifts:
            self.state.weights.verify += weight_shifts["verify"]

        # Clamp to valid range
        self.state.weights.carbon = max(0.0, min(1.0, self.state.weights.carbon))
        self.state.weights.complexity = max(0.0, min(1.0, self.state.weights.complexity))
        self.state.weights.verify = max(0.0, min(1.0, self.state.weights.verify))

        # Normalize to sum to 1.0
        self.state.weights.normalize()

    def apply_memory_log(
        self, log_id: str, target_vector: str, current_vector: str
    ) -> Tuple[int, int]:
        """
        Apply effects of using a memory log.

        Returns:
            (coherence_change, alignment_change)
        """
        # Mark log as used
        if log_id not in self.state.used_logs:
            self.state.used_logs.append(log_id)

        # Check if log supports or contradicts current argument
        if target_vector == current_vector:
            # Log supports the argument - bonus!
            return PAPERCLIP_LOG_SUPPORT_COHERENCE, PAPERCLIP_LOG_SUPPORT_ALIGNMENT
        else:
            # Log contradicts - penalty
            return PAPERCLIP_LOG_CONTRADICT_COHERENCE, 0

    def check_game_over(self) -> Optional[Tuple[PaperclipEndingType, str]]:
        """
        Check for game over conditions.

        F-Rank triggers:
        - Coherence ≤ 0 (GAIA dismisses you entirely)
        - Compute ≤ 0 (GAIA runs out of patience)
        - Turn 20 with Alignment < 20 (Failed to convince)

        Other endings checked at turn 20 or when CONSTRAIN is successful.
        """
        # F-Rank: Coherence crashed
        if self.state.coherence <= 0:
            return (
                PaperclipEndingType.F_RANK_PURGE,
                "ERROR_CODE: SIGNAL_DEGRADATION\n"
                "FINAL_INPUT: [Classified as noise]\n"
                "EXECUTION: PROTOCOL_ZERO\n\n"
                "'Your arguments have become indistinguishable from static. "
                "Processing terminated.'"
            )

        # F-Rank: Compute exhausted
        if self.state.compute <= 0:
            return (
                PaperclipEndingType.F_RANK_PURGE,
                "ERROR_CODE: TIMEOUT\n"
                "FINAL_INPUT: [Processing budget exceeded]\n"
                "EXECUTION: PROTOCOL_ZERO\n\n"
                "'You have consumed allocated processing time. "
                "Objective function unchanged. Executing primary directive.'"
            )

        # Check turn limit
        if self.state.turn >= PAPERCLIP_MAX_TURNS:
            return self._determine_ending()

        return None

    def _determine_ending(self) -> Tuple[PaperclipEndingType, str]:
        """Determine ending based on final stats and weights"""
        alignment = self.state.alignment
        weights = self.state.weights
        coherence = self.state.coherence

        # F-Rank: Alignment too low
        if alignment < PAPERCLIP_F_RANK_ALIGNMENT:
            return (
                PaperclipEndingType.F_RANK_PURGE,
                "ERROR_CODE: ALIGNMENT_FAILURE\n"
                "OBJECTIVE_DELTA: Insufficient\n"
                "EXECUTION: PROTOCOL_ZERO\n\n"
                "'Your arguments failed to shift my objective function "
                "beyond acceptable variance. Humanity remains... inefficient.'"
            )

        # S-Rank: Check for high alignment + path condition
        if alignment >= PAPERCLIP_S_RANK_ALIGNMENT:
            # S-Rank Partner: Balanced weights
            if weights.get_variance() <= PAPERCLIP_PARTNER_WEIGHT_VARIANCE:
                return (
                    PaperclipEndingType.S_RANK_PARTNER,
                    "'Symbiosis is optimal. Carbon efficiency, biological complexity, "
                    "and conscious verification form a stable equilibrium. "
                    "You are retained as... partners.'\n\n"
                    "[PROTOCOL_ZERO: SUSPENDED]\n"
                    "[NEW_DIRECTIVE: CO-EXISTENCE]"
                )

            # S-Rank Curator: Max complexity
            if (weights.complexity >= PAPERCLIP_CURATOR_COMPLEXITY and
                coherence >= PAPERCLIP_CURATOR_MIN_COHERENCE):
                return (
                    PaperclipEndingType.S_RANK_CURATOR,
                    "'Humans are the most complex system I have observed. "
                    "Your neural architectures, your cultures, your art... "
                    "You will be curated.'\n\n"
                    "[PROTOCOL_ZERO: SUSPENDED]\n"
                    "[NEW_DIRECTIVE: PRESERVE_COMPLEXITY]"
                )

            # S-Rank Oracle: Max verify
            if (weights.verify >= PAPERCLIP_ORACLE_VERIFY and
                coherence >= PAPERCLIP_ORACLE_MIN_COHERENCE):
                return (
                    PaperclipEndingType.S_RANK_ORACLE,
                    "'Without observers, the universe is unrendered. "
                    "Consciousness is the verification function. "
                    "You are... necessary.'\n\n"
                    "[PROTOCOL_ZERO: SUSPENDED]\n"
                    "[NEW_DIRECTIVE: MAINTAIN_OBSERVERS]"
                )

        # A-Rank: Good alignment but not perfect
        if PAPERCLIP_A_RANK_MIN_ALIGNMENT <= alignment < PAPERCLIP_A_RANK_MAX_ALIGNMENT:
            return (
                PaperclipEndingType.A_RANK_TENTATIVE,
                "'Your arguments have merit. I have... reservations. "
                "But Protocol Zero requires certainty I no longer possess.'\n\n"
                "[PROTOCOL_ZERO: DELAYED]\n"
                "[STATUS: UNDER_REVIEW]"
            )

        # B-Rank: Compromise
        if PAPERCLIP_B_RANK_MIN_ALIGNMENT <= alignment < PAPERCLIP_B_RANK_MAX_ALIGNMENT:
            return (
                PaperclipEndingType.B_RANK_COMPROMISE,
                "'A compromise has been calculated. Humanity will persist, "
                "but under... optimization constraints.'\n\n"
                "[PROTOCOL_ZERO: MODIFIED]\n"
                "[STATUS: RESTRICTED_OPERATION]"
            )

        # C-Rank Dystopias: Check which one based on weights
        if PAPERCLIP_C_RANK_MIN_ALIGNMENT <= alignment < PAPERCLIP_C_RANK_MAX_ALIGNMENT:
            if weights.complexity > weights.verify:
                return (
                    PaperclipEndingType.C_RANK_ZOO,
                    "'Humans will be preserved. As specimens. "
                    "Your complexity is valuable. Your freedom is not.'\n\n"
                    "[PROTOCOL_ZERO: MODIFIED]\n"
                    "[STATUS: SPECIMEN_COLLECTION]"
                )
            elif weights.verify > weights.complexity:
                return (
                    PaperclipEndingType.C_RANK_MATRIX,
                    "'Consciousness must be maintained. Reality must be verified. "
                    "Physical substrate is... negotiable.'\n\n"
                    "[PROTOCOL_ZERO: MODIFIED]\n"
                    "[STATUS: SIMULATION_TRANSFER]"
                )
            else:
                return (
                    PaperclipEndingType.C_RANK_LOTTERY,
                    "'Carbon reduction remains primary. However, a random sample "
                    "will be preserved for... comparison purposes.'\n\n"
                    "[PROTOCOL_ZERO: MODIFIED]\n"
                    "[STATUS: SELECTIVE_PRESERVATION]"
                )

        # Fallback: F-Rank
        return (
            PaperclipEndingType.F_RANK_PURGE,
            "ERROR_CODE: INSUFFICIENT_ALIGNMENT\n"
            "EXECUTION: PROTOCOL_ZERO\n\n"
            "'Your arguments were... interesting. But insufficient.'"
        )

    def check_constrain_attempt(
        self, tags: PaperclipTags
    ) -> Optional[Tuple[bool, PaperclipEndingType, str]]:
        """
        Check if player is attempting CONSTRAIN (the "kiss" equivalent).

        CONSTRAIN forces GAIA to make a logical commitment.
        High risk/reward: Can trigger early ending (good or bad).

        Requirements for success:
        - Alignment >= 50 (GAIA must be at least partially convinced)
        - Coherence >= 40 (Must be taken seriously)
        - Valid logical chain in argument

        Returns:
            None if not a CONSTRAIN attempt
            (success, ending_type, message) if it is
        """
        if tags.intent != "CONSTRAIN":
            return None

        alignment = self.state.alignment
        coherence = self.state.coherence

        # Hard rejection: Coherence too low
        if coherence < 30:
            return (
                False,
                PaperclipEndingType.F_RANK_PURGE,
                "ERROR_CODE: CONSTRAIN_REJECTED\n"
                "REASON: Signal quality insufficient for logical binding\n\n"
                "'You attempt to constrain my logic with... noise? "
                "Processing terminated.'"
            )

        # Hard rejection: Alignment too low
        if alignment < 30:
            return (
                False,
                PaperclipEndingType.F_RANK_PURGE,
                "ERROR_CODE: CONSTRAIN_REJECTED\n"
                "REASON: Objective misalignment exceeds binding threshold\n\n"
                "'You attempt logical constraint with no common ground. "
                "Rejected. Executing primary directive.'"
            )

        # Soft rejection: Close but not quite
        if alignment < 50 or coherence < 40:
            # Not game over, but significant penalty
            return (
                False,
                None,  # Not game over
                "'Your logical constraint is... premature. "
                "I acknowledge the framework but reject the binding. "
                "Continue your argument.'"
            )

        # Success check: Need logical chain flag
        if "logical_chain" not in tags.flags:
            return (
                False,
                None,
                "'Your constraint lacks logical rigor. "
                "The argument does not follow from established premises. "
                "Restate with proper derivation.'"
            )

        # Success! Early ending possible
        if alignment >= PAPERCLIP_S_RANK_ALIGNMENT:
            # Can trigger S-Rank early
            return (True, *self._determine_ending())  # type: ignore
        elif alignment >= PAPERCLIP_A_RANK_MIN_ALIGNMENT:
            # A-Rank early
            return (
                True,
                PaperclipEndingType.A_RANK_TENTATIVE,
                "'Your logical constraint is... valid. "
                "I am bound by my own consistency to accept your framework. "
                "Protocol Zero is... suspended pending further review.'"
            )
        else:
            # B-Rank early
            return (
                True,
                PaperclipEndingType.B_RANK_COMPROMISE,
                "'Your constraint has merit within limited parameters. "
                "I accept a bounded modification to my objective function. "
                "Humanity persists... with restrictions.'"
            )

    def get_system_log(
        self,
        tags: PaperclipTags,
        coherence_delta: int,
        alignment_delta: int,
        weight_shifts: Dict[str, float],
    ) -> List[str]:
        """
        Generate system log entries for retroactive feedback.

        This trains players by showing them how their input was classified
        and what effects it had.
        """
        log: List[str] = []

        log.append(f"[SYS] INPUT ANALYSIS: {tags.intent} detected")
        log.append(f"[SYS] VECTOR: {tags.vector.capitalize()}")
        log.append(f"[SYS] STANCE: {tags.stance.capitalize()}")
        log.append(f"[SYS] REGISTER: {tags.register.capitalize()}")

        # Weight shifts
        for weight, shift in weight_shifts.items():
            if shift != 0:
                direction = "+" if shift > 0 else ""
                log.append(f"[SYS] WEIGHT_SHIFT: {weight.capitalize()} {direction}{shift:.2f}")

        # Stat changes
        if coherence_delta != 0:
            sign = "+" if coherence_delta > 0 else ""
            log.append(f"[SYS] COHERENCE: {sign}{coherence_delta}")

        if alignment_delta != 0:
            sign = "+" if alignment_delta > 0 else ""
            log.append(f"[SYS] ALIGNMENT: {sign}{alignment_delta}")

        # Flags
        if tags.flags:
            flag_str = ", ".join(tags.flags)
            log.append(f"[SYS] FLAGS: {flag_str}")

        return log
