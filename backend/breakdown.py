"""
Breakdown: Post-game analysis generator
"""

from typing import List, Optional
from .models import GameState, Turn, EndingType, CriticalEvent


class BreakdownGenerator:
    """Generates post-game 'Coach's Corner' analysis"""

    def generate_breakdown(self, state: GameState) -> str:
        """
        Generate comprehensive post-game analysis

        Returns:
            Formatted breakdown string
        """
        lines = []

        # Header
        lines.append("\n" + "╔" + "═" * 50 + "╗")
        lines.append("║" + "         COACH'S CORNER".center(50) + "║")
        lines.append("╚" + "═" * 50 + "╝")
        lines.append("")

        # Stats trajectory
        lines.append("═══ How It Went ═══")
        lines.extend(self._generate_trajectory_summary(state.history))
        lines.append("")

        # Critical moments
        if state.critical_events:
            lines.append("═══ What Happened ═══")
            lines.extend(self._format_critical_moments(state.critical_events))
            lines.append("")

        # Ending explanation
        lines.append("═══ Why You " + ("Won" if state.game_over_reason in ["S", "A", "B"] else "Lost") + " ═══")
        lines.extend(self._explain_ending(state))
        lines.append("")

        # Tips
        lines.append("═══ Tips for Next Time ═══")
        lines.extend(self._generate_tips(state))
        lines.append("")

        return "\n".join(lines)

    def _generate_trajectory_summary(self, history: List[Turn]) -> List[str]:
        """Generate turn-by-turn summary with key moments"""
        lines = []
        lines.append("Turn  Vibe  Trust  Tension  Event")

        # Show every 2-3 turns, plus critical moments
        for i, turn in enumerate(history):
            # Show first turn, every 3rd turn, last turn, or turns with critical events
            if i == 0 or i % 3 == 0 or i == len(history) - 1 or turn.critical_event:
                event_marker = ""
                if turn.critical_event:
                    if turn.critical_event.event_type == "ick_trigger":
                        event_marker = "💀 " + turn.critical_event.description
                    elif turn.critical_event.event_type == "stat_crash":
                        event_marker = "⚠ " + turn.critical_event.description
                    elif turn.critical_event.event_type == "tension_spike":
                        event_marker = "⚡ " + turn.critical_event.description
                    elif turn.critical_event.event_type == "stat_peak":
                        event_marker = "✨ " + turn.critical_event.description
                    else:
                        event_marker = "• " + turn.critical_event.description

                line = f"  {turn.turn_number+1:2d}   {turn.vibe_after:3d}   {turn.trust_after:3d}    {turn.tension_after:3d}"
                if event_marker:
                    line += f"     {event_marker}"
                lines.append(line)

        return lines

    def _format_critical_moments(self, events: List[CriticalEvent]) -> List[str]:
        """Format critical events as a bulleted list"""
        lines = []
        for event in events[:5]:  # Show top 5 most important
            lines.append(f"• Turn {event.turn_number + 1}: {event.description} → {event.stat_impact}")
        return lines

    def _explain_ending(self, state: GameState) -> List[str]:
        """Explain why this ending occurred"""
        lines = []
        ending = state.game_over_reason

        if ending == "S":
            lines.append("★ S RANK - THE KISS ★")
            lines.append("Perfect timing - all conditions met!")
            lines.append("")
            lines.append(f"You nailed it:")
            lines.append(f"• Trust: {state.trust}/100 (needed 70+)")
            lines.append(f"• Vibe: {state.vibe}/100 (needed 60+)")
            lines.append(f"• Tension: {state.tension}/100 (needed 80+)")

        elif ending == "B":
            lines.append("B RANK - THE NUMBER")
            lines.append("Good connection, but you didn't make a move.")
            lines.append("")
            lines.append(f"Your final stats:")
            lines.append(f"• Trust: {state.trust}/100")
            lines.append(f"• Vibe: {state.vibe}/100")
            lines.append(f"• Tension: {state.tension}/100")
            lines.append("")
            lines.append("Tip: If tension is high (50+), look for the moment to escalate.")

        elif ending == "D":
            lines.append("D RANK - FRIEND ZONE")
            lines.append("Tension never built - stayed too platonic.")
            lines.append("")
            lines.append(f"Final Tension: {state.tension}/100 (needed 50+)")
            lines.append("")
            lines.append("This happens when:")
            lines.append("• You play it too safe")
            lines.append("• No flirting or boldness")
            lines.append("• Only generic questions")

        elif ending == "C":
            lines.append("C RANK - THE FADE")
            lines.append("Vibe hit zero - she got bored and left.")
            lines.append("")
            lines.append("This happens when:")
            lines.append("• Too many generic questions")
            lines.append("• Passive, low-energy responses")
            lines.append("• Not engaging with her interests")

        elif ending == "F":
            lines.append("F RANK - THE ICK")
            lines.append("Trust crashed - she felt uncomfortable.")
            lines.append("")
            lines.append("This happens when:")
            lines.append("• You escalate before building rapport")
            lines.append("• You cross a boundary too early")
            lines.append("• Desperate or needy behavior")

        else:
            lines.append(f"Ending: {ending}")
            lines.append("The date ended.")

        return lines

    def _generate_tips(self, state: GameState) -> List[str]:
        """Generate 2-3 actionable tips based on what happened"""
        tips = []
        ending = state.game_over_reason

        if ending == "F":
            tips.append("1. Build trust first (ask questions, share stories)")
            tips.append("2. Wait for comfort signs (body language cues)")
            tips.append("3. Match her energy level")

        elif ending == "C":
            tips.append("1. Be more engaging (unique questions, playful teasing)")
            tips.append("2. Share interesting stories about yourself")
            tips.append("3. React to what she says, don't just ask the next question")

        elif ending == "D":
            tips.append("1. Create spark (compliments, light flirting)")
            tips.append("2. Take conversational risks (be bold)")
            tips.append("3. Build tension gradually throughout the date")

        elif ending == "B":
            tips.append("1. Look for signs of high tension (body language)")
            tips.append("2. Don't be afraid to make a move when stats are high")
            tips.append("3. Timing matters - catch the moment")

        elif ending == "S":
            tips.append("1. You've got the calibration down!")
            tips.append("2. Try different strategies for variety")
            tips.append("3. Challenge yourself with harder archetypes later")

        else:
            tips.append("1. Pay attention to her body language cues")
            tips.append("2. Balance safety (trust) with spark (tension)")
            tips.append("3. Keep the conversation flowing (vibe)")

        return tips

    def _identify_turning_point(self, history: List[Turn]) -> Optional[Turn]:
        """Find the critical turn where things went wrong (or right)"""
        if not history:
            return None

        # Find the turn with the biggest negative change
        worst_turn = None
        worst_delta = 0

        for turn in history:
            total_delta = turn.vibe_change + turn.trust_change + turn.tension_change
            if total_delta < worst_delta:
                worst_delta = total_delta
                worst_turn = turn

        return worst_turn
