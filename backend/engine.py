"""
Engine: State machine and score calculator
"""

import random
from typing import Tuple, Optional
from .models import GameState, Tags, Turn, EndingType, Act, CriticalEvent
from .config import (
    SCORING_MATRIX,
    TONE_MODIFIERS,
    VIBE_DECAY_PER_TURN,
    VIBE_LOW_THRESHOLD,
    VIBE_HIGH_THRESHOLD,
    TRUST_LOW_THRESHOLD,
    TRUST_ICK_THRESHOLD,
    TRUST_HIGH_THRESHOLD,
    TENSION_SPARK_THRESHOLD,
    TENSION_KISS_THRESHOLD,
    KISS_WIN_TRUST,
    KISS_WIN_VIBE,
    KISS_WIN_TENSION,
    KISS_HARD_REJECT_TRUST,
    KISS_SOFT_REJECT_VIBE,
    SOFT_REJECTION_LOCKOUT,
    ACT_1_TURNS,
    ACT_2_TURNS,
    # V2 additions
    A_RANK_TRUST,
    A_RANK_VIBE,
    A_RANK_MAX_TENSION,
    D_RANK_MIN_TRUST,
    D_RANK_MAX_TENSION,
    FUMBLE_MIN_TRUST,
    FUMBLE_MIN_TENSION,
    PHASE_ICEBREAKER_END,
    PHASE_DEEP_DIVE_END,
    ICEBREAKER_TENSION_CAP,
    ICEBREAKER_STAT_CAP,
    DEEP_DIVE_TENSION_CAP,
    DEEP_DIVE_STAT_CAP,
    RECOVERY_SAFE_ZONE,
    # Content moderation
    CONTENT_VIOLATION_TRUST,
    CONTENT_VIOLATION_VIBE,
    CONTENT_VIOLATION_FLAGS,
)


class GameEngine:
    def __init__(self, state: GameState):
        self.state = state

    def calculate_delta(self, tags: Tags) -> Tuple[int, int, int]:
        """
        Calculate score changes based on tags

        Returns:
            (vibe_delta, trust_delta, tension_delta)
        """
        intent = tags.intent
        modifier = tags.modifier
        tone = tags.tone

        # Get base delta from scoring matrix
        base_delta = SCORING_MATRIX.get(intent, {}).get(modifier, [0, 0, 0]).copy()

        vibe_delta, trust_delta, tension_delta = base_delta

        # Apply tone multiplier to Vibe (only if positive)
        if vibe_delta > 0:
            tone_mod = TONE_MODIFIERS.get(tone, 1.0)
            vibe_delta = int(vibe_delta * tone_mod)

        # Add small random noise (-2 to +2)
        vibe_delta += random.randint(-2, 2)
        trust_delta += random.randint(-1, 1)
        tension_delta += random.randint(-1, 1)

        # Action multiplier: Actions build Tension 2x, reduce Trust gain
        if "Action_Present" in tags.flags:
            # Double tension change (actions are physical/romantic)
            tension_delta = int(tension_delta * 2)
            # Reduce trust gain slightly (less verbal connection)
            if trust_delta > 0:
                trust_delta = int(trust_delta * 0.7)

        # Diminishing returns: Harder to gain points when stats are high
        if vibe_delta > 0 and self.state.vibe > 70:
            # At 70-85: reduce gains by 50%
            # At 85-95: reduce gains by 75%
            # At 95+: reduce gains by 90%
            if self.state.vibe >= 95:
                vibe_delta = int(vibe_delta * 0.1)
            elif self.state.vibe >= 85:
                vibe_delta = int(vibe_delta * 0.25)
            else:
                vibe_delta = int(vibe_delta * 0.5)

        if trust_delta > 0 and self.state.trust > 70:
            if self.state.trust >= 95:
                trust_delta = int(trust_delta * 0.1)
            elif self.state.trust >= 85:
                trust_delta = int(trust_delta * 0.25)
            else:
                trust_delta = int(trust_delta * 0.5)

        if tension_delta > 0 and self.state.tension > 70:
            if self.state.tension >= 95:
                tension_delta = int(tension_delta * 0.1)
            elif self.state.tension >= 85:
                tension_delta = int(tension_delta * 0.25)
            else:
                tension_delta = int(tension_delta * 0.5)

        # Context-aware rules
        vibe_delta, trust_delta, tension_delta = self._apply_context_rules(
            tags, vibe_delta, trust_delta, tension_delta
        )

        return vibe_delta, trust_delta, tension_delta

    def _apply_context_rules(
        self, tags: Tags, vibe_delta: int, trust_delta: int, tension_delta: int
    ) -> Tuple[int, int, int]:
        """Apply context-aware scoring adjustments"""

        # Rule 0: Content Violation Detection (inappropriate/vulgar content)
        # This is checked FIRST and applies massive penalties
        detected_violations = [f for f in tags.flags if f in CONTENT_VIOLATION_FLAGS]
        if detected_violations:
            # Massive penalties - will likely trigger game over
            trust_delta += CONTENT_VIOLATION_TRUST   # -50
            vibe_delta += CONTENT_VIOLATION_VIBE     # -30
            tension_delta = -self.state.tension      # Reset tension to 0

            # Mark which type of violation for narrator to respond appropriately
            if "inappropriate_sexual" in detected_violations:
                tags.flags.append("content_violation_sexual")
            elif "harassment" in detected_violations:
                tags.flags.append("content_violation_harassment")
            else:
                tags.flags.append("content_violation_profanity")

            # Return early - no need to check other rules
            return vibe_delta, trust_delta, tension_delta

        # Rule 1: Creep Check (Sexual escalation too early)
        if tags.intent == "Escalate" and tags.modifier == "Risky":
            if self.state.trust < TRUST_ICK_THRESHOLD:
                # ICK triggered
                trust_delta -= 30
                vibe_delta -= 20
                tension_delta = -self.state.tension  # Reset tension to 0
                tags.flags.append("ick_triggered")

        # Rule 1.5: Physical Touch Without Chemistry
        if tags.intent == "Escalate" and any(flag in ["kiss", "touch", "physical"] for flag in tags.flags):
            if self.state.tension < 40:
                # Too much physical touch without romantic tension
                trust_delta -= 20
                vibe_delta -= 10
                tags.flags.append("touch_rejected")

        # Rule 1.6: Friend Zone Lock (High Trust, Zero Tension)
        if self.state.trust > 80 and self.state.tension < 30:
            if tags.intent == "Escalate":
                # She sees you as a friend, escalation feels weird
                tension_delta = max(tension_delta, -10)
                tags.flags.append("friend_zoned")

        # Rule 2: Friend Zone Trap (Too much safe talk with no tension)
        if self.state.tension == 0 and tags.intent == "Question" and tags.modifier == "Generic":
            tension_delta -= 5

        # Rule 3: Chemistry Bonus (High Vibe unlocks Trust)
        if self.state.vibe > VIBE_HIGH_THRESHOLD and trust_delta > 0:
            trust_delta += 5

        # Rule 4: Validation seeking kills tension
        if tags.intent == "Validate":
            tension_delta = min(tension_delta, -10)  # Always negative

        return vibe_delta, trust_delta, tension_delta

    def apply_phase_caps(self):
        """
        Apply turn-based stat caps to prevent speed-running S-Rank

        V2 Phase System:
        - Turns 1-5 (Icebreaker): Tension capped at 40, stats at 50
        - Turns 6-15 (Deep Dive): Tension capped at 70, stats at 80
        - Turns 16-20 (The Close): All caps removed - S-Rank window opens
        """
        turn = self.state.turn

        if turn <= PHASE_ICEBREAKER_END:
            # Icebreaker: Can't rush romance, build foundation first
            self.state.tension = min(self.state.tension, ICEBREAKER_TENSION_CAP)
            self.state.vibe = min(self.state.vibe, ICEBREAKER_STAT_CAP)
            self.state.trust = min(self.state.trust, ICEBREAKER_STAT_CAP)
        elif turn <= PHASE_DEEP_DIVE_END:
            # Deep Dive: Building connection, still can't peak
            self.state.tension = min(self.state.tension, DEEP_DIVE_TENSION_CAP)
            self.state.vibe = min(self.state.vibe, DEEP_DIVE_STAT_CAP)
            self.state.trust = min(self.state.trust, DEEP_DIVE_STAT_CAP)
        # Turn 16+: The Close - all caps removed, S-Rank possible

    def detect_critical_event(
        self,
        turn_num: int,
        tags: Tags,
        vibe_delta: int,
        trust_delta: int,
        tension_delta: int
    ) -> Optional[CriticalEvent]:
        """
        Detect if this turn represents a critical moment

        Returns:
            CriticalEvent if significant, None otherwise
        """
        # Ick triggered
        if "ick_triggered" in tags.flags:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="ick_trigger",
                description="Crossed a boundary (escalated too early)",
                stat_impact=f"Trust {trust_delta:+d}, Tension reset"
            )

        # Chemistry bonus applied
        if self.state.vibe > VIBE_HIGH_THRESHOLD and trust_delta > 5:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="chemistry_bonus",
                description="High energy unlocked deeper trust",
                stat_impact=f"Trust {trust_delta:+d}"
            )

        # Stat crash (any stat drops >15 in one turn)
        if vibe_delta < -15:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="stat_crash",
                description="Vibe crashed (approach didn't work)",
                stat_impact=f"Vibe {vibe_delta:+d}"
            )

        if trust_delta < -15:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="stat_crash",
                description="Trust crashed (crossed a line)",
                stat_impact=f"Trust {trust_delta:+d}"
            )

        # Tension spike (>15 in one turn)
        if tension_delta > 15:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="tension_spike",
                description="Created romantic spark",
                stat_impact=f"Tension {tension_delta:+d}"
            )

        # Stat peak (reached >80)
        if self.state.vibe > 80 and self.state.vibe - vibe_delta <= 80:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="stat_peak",
                description="Peak Vibe achieved",
                stat_impact=f"Vibe {self.state.vibe}"
            )

        if self.state.trust > 80 and self.state.trust - trust_delta <= 80:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="stat_peak",
                description="Peak Trust achieved",
                stat_impact=f"Trust {self.state.trust}"
            )

        if self.state.tension > 80 and self.state.tension - tension_delta <= 80:
            return CriticalEvent(
                turn_number=turn_num,
                event_type="stat_peak",
                description="Peak Tension achieved",
                stat_impact=f"Tension {self.state.tension}"
            )

        return None

    def assess_response_quality(self, chloe_response: str) -> str:
        """
        Determine if Chloe's response indicates engagement

        Returns:
            "high" if she's engaged (2+ sentences, questions, enthusiasm)
            "low" if she's disengaged (short, flat, distracted)
        """
        # Count sentences (rough heuristic)
        sentence_count = chloe_response.count('.') + chloe_response.count('!') + chloe_response.count('?')

        # Check for engagement signals
        has_question = '?' in chloe_response
        has_body_language = '*' in chloe_response
        is_enthusiastic = '!' in chloe_response or 'haha' in chloe_response.lower()

        # High quality if:
        # - 2+ sentences, OR
        # - She asks a follow-up question, OR
        # - She shows positive body language + enthusiasm
        if sentence_count >= 2 or has_question or (has_body_language and is_enthusiastic):
            return "high"
        else:
            return "low"

    def apply_passive_decay(self) -> int:
        """
        Apply conditional vibe decay based on conversation quality
        AND scale decay based on current Vibe level (higher Vibe = higher decay)

        Returns:
            Amount of decay applied (for tracking)
        """
        # No decay on first turn (no previous response)
        if self.state.turn == 0:
            return 0

        # No decay if in lockout (already in recovery mode)
        if self.state.lockout_turns > 0:
            return 0

        # Increment counter if last response was low quality
        if self.state.previous_response_quality == "low":
            self.state.consecutive_low_effort += 1
        else:
            # Reset counter on high quality response
            self.state.consecutive_low_effort = 0
            return 0

        # Only apply decay after 2 consecutive low-effort responses
        if self.state.consecutive_low_effort >= 2:
            # DYNAMIC DECAY: Scale based on Vibe level
            if self.state.vibe >= 91:
                decay_amount = 15  # Very high expectations
            elif self.state.vibe >= 71:
                decay_amount = 10  # High expectations
            elif self.state.vibe >= 31:
                decay_amount = 7   # Normal expectations
            else:
                decay_amount = 5   # Already bored

            self.state.vibe -= decay_amount
            self.state.consecutive_low_effort = 0  # Reset counter after applying decay
            return decay_amount

        return 0

    def check_kiss_attempt(self, tags: Tags) -> Optional[Tuple[bool, EndingType, str]]:
        """
        Check if user is attempting a kiss and determine outcome

        V2 Updates:
        - C-Rank Fumble for awkward rejections (Trust<60 OR Tension<60)
        - Clear distinction between fumble (recoverable) and ick (game over)

        Returns:
            None if not a kiss attempt
            (success, ending_type, message) if it is
        """
        # Check for kiss attempt in tags
        if tags.intent != "KissAttempt" and "kiss" not in tags.topic.lower():
            # Also check for escalation that's clearly a kiss attempt
            if not (tags.intent == "Escalate" and tags.modifier == "Risky" and
                    any(flag in tags.flags for flag in ["kiss", "physical"])):
                return None

        # Check if in lockout
        if self.state.lockout_turns > 0:
            # Hard rejection - tried during lockout
            return (
                False,
                EndingType.F_RANK_ICK,
                "She pulls away sharply. 'What the hell? I told you to slow down.' She grabs her bag and leaves."
            )

        # Hard Rejection: Trust WAY too low (creepy)
        if self.state.trust < KISS_HARD_REJECT_TRUST:
            return (
                False,
                EndingType.F_RANK_ICK,
                "She recoils. 'Whoa, what? I don't know you like that.' She stands up and walks out."
            )

        # V2: C-Rank Fumble - moved too fast but not creepy
        # Trust is okay-ish (>=60) but below kiss threshold, OR Tension too low
        if self.state.trust < FUMBLE_MIN_TRUST or self.state.tension < FUMBLE_MIN_TENSION:
            return (
                False,
                EndingType.C_RANK_FUMBLE,
                "*She turns her cheek.* 'I... think we should go.' *She stands up, grabbing her coat.* "
                "'It was nice meeting you.'"
            )

        # Victory: All conditions met
        if (self.state.trust >= KISS_WIN_TRUST and
            self.state.vibe >= KISS_WIN_VIBE and
            self.state.tension >= KISS_WIN_TENSION):
            return (
                True,
                EndingType.S_RANK_KISS,
                "*She doesn't pull away. She meets you halfway, and the world seems to fade for a moment.* 'That was... nice.'"
            )

        # Soft rejection: Close but not quite - can continue playing
        self.state.lockout_turns = SOFT_REJECTION_LOCKOUT
        self.state.tension = max(0, self.state.tension - 15)
        return (
            False,
            None,  # Not game over, just awkward
            "*She hesitates and pulls back slightly, smiling awkwardly.* 'Not yet... let's just talk for now, okay?'"
        )

    def check_game_over(self) -> Optional[Tuple[EndingType, str]]:
        """
        Check for game over conditions

        V2 Updates:
        - A-Rank Gentleman: High connection, chose not to escalate
        - D-Rank Friendzone: High trust, low tension (played it too safe)
        - Strike system check (recovery mode failure handled elsewhere)

        Returns:
            (ending_type, message) if game over, None otherwise
        """
        # Skip game over checks if in recovery mode (give them a chance)
        if self.state.recovery_mode:
            return None

        # Ick triggered (trust crashed hard)
        if self.state.trust <= 0:
            return (
                EndingType.F_RANK_ICK,
                "She checks her phone. 'I just remembered I have to... go. Like, now.' She leaves without looking back."
            )

        # The Fade (vibe hit zero)
        if self.state.vibe <= 0:
            return (
                EndingType.C_RANK_FADE,
                "She stifles a yawn. 'This has been... nice. But I should get going.' She doesn't ask for your number."
            )

        # End of session without making a move
        if self.state.turn >= 20:  # ACT_3 end
            # V2: A-Rank "The Gentleman" - high connection, no physical escalation
            # You prioritized her comfort and built deep trust
            if (self.state.trust >= A_RANK_TRUST and
                self.state.vibe >= A_RANK_VIBE and
                self.state.tension < A_RANK_MAX_TENSION):
                return (
                    EndingType.A_RANK_GENTLEMAN,
                    "*She smiles warmly as you reach for the check.* 'This was really nice.' "
                    "An hour later, your phone buzzes: 'I had a really great time. When can I see you again?'"
                )

            # V2: D-Rank Friendzone - high trust but no romantic spark
            # You played it too safe, she sees you as a brother
            if (self.state.trust >= D_RANK_MIN_TRUST and
                self.state.tension < D_RANK_MAX_TENSION):
                return (
                    EndingType.D_RANK_FRIEND_ZONE,
                    "'You're such a good listener. I'm so glad we're friends!' "
                    "*She hugs you like she'd hug her brother.*"
                )

            # Low tension but not friendzone territory
            if self.state.tension < TENSION_SPARK_THRESHOLD:
                return (
                    EndingType.D_RANK_FRIEND_ZONE,
                    "'Thanks for the coffee! You're really sweet. Let's hang out again sometime... as friends?'"
                )

            # B-Rank: Good connection, got her number
            return (
                EndingType.B_RANK_NUMBER,
                "*She smiles warmly.* 'I had a great time. Text me?' She puts her number in your phone."
            )

        return None

    def advance_act(self):
        """Advance to the next act based on turn count"""
        if self.state.turn == ACT_1_TURNS:
            self.state.act = Act.WALK
        elif self.state.turn == ACT_2_TURNS:
            self.state.act = Act.DOORSTEP

    def process_lockout(self):
        """Decrement lockout counter"""
        if self.state.lockout_turns > 0:
            self.state.lockout_turns -= 1

    # =========================================================================
    # V2: Strike System (Recovery Mode)
    # =========================================================================

    def check_recovery_trigger(self) -> Optional[str]:
        """
        Check if player needs a recovery turn (stat about to hit 0).

        Instead of instant game over, we freeze the stat at 1 and give
        the player one chance to apologize or pivot.

        Returns:
            "vibe" or "trust" if recovery triggered, None otherwise
        """
        # Don't double-trigger recovery
        if self.state.recovery_mode:
            return None

        # Check if Vibe would trigger recovery
        if self.state.vibe <= 0:
            self.state.vibe = 1  # Freeze at 1 instead of 0
            self.state.recovery_mode = True
            self.state.recovery_stat = "vibe"
            return "vibe"

        # Check if Trust would trigger recovery
        if self.state.trust <= 0:
            self.state.trust = 1  # Freeze at 1 instead of 0
            self.state.recovery_mode = True
            self.state.recovery_stat = "trust"
            return "trust"

        return None

    def resolve_recovery(self, tags: Tags) -> bool:
        """
        Check if player's recovery attempt was successful.

        Success conditions: Apologize, change subject, or safe/unique response
        Failure: Continued bad behavior -> Game Over

        Returns:
            True if recovery successful (stat resets to safe zone)
            False if recovery failed (game over)
        """
        if not self.state.recovery_mode:
            return True  # Not in recovery, nothing to resolve

        # Success conditions: Safe or unique responses that show awareness
        recovery_intents = ["Share", "Question", "React", "Joke"]
        recovery_modifiers = ["Safe", "Unique"]

        is_safe_response = (
            tags.intent in recovery_intents and
            tags.modifier in recovery_modifiers
        )

        # Also allow apologetic or self-aware responses
        is_apologetic = any(flag in tags.flags for flag in [
            "apologetic", "self_aware", "humble", "change_subject"
        ])

        if is_safe_response or is_apologetic:
            # Success! Reset stat to safe zone
            if self.state.recovery_stat == "vibe":
                self.state.vibe = RECOVERY_SAFE_ZONE
            elif self.state.recovery_stat == "trust":
                self.state.trust = RECOVERY_SAFE_ZONE

            self.state.recovery_mode = False
            self.state.recovery_stat = None
            return True

        # Failure - player didn't recover
        # The game over will be handled by check_game_over() after this
        self.state.recovery_mode = False

        if self.state.recovery_stat == "vibe":
            self.state.vibe = 0  # Now actually hit 0
        elif self.state.recovery_stat == "trust":
            self.state.trust = 0  # Now actually hit 0

        self.state.recovery_stat = None
        return False

    def get_recovery_prompt(self) -> Optional[str]:
        """
        Get Chloe's warning response when recovery mode is triggered.

        Returns:
            Warning message if in recovery mode, None otherwise
        """
        if not self.state.recovery_mode:
            return None

        if self.state.recovery_stat == "vibe":
            return "*She blinks slowly, looking away.* 'Okay... that was weird.'"
        elif self.state.recovery_stat == "trust":
            return "*She shifts uncomfortably, pulling back slightly.* 'Excuse me?'"

        return None
