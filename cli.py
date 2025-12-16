#!/usr/bin/env python3
"""
Read the Room - CLI Game Interface
A social dynamics dating simulator
"""

import os
import sys
from dotenv import load_dotenv
from backend.models import GameState, Turn, GameResult
from backend.classifier import Classifier
from backend.engine import GameEngine
from backend.narrator import Narrator


# Terminal colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header():
    """Print game header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}╔════════════════════════════════════════╗")
    print("║        READ THE ROOM                 ║")
    print("║    A Social Survival Simulator       ║")
    print(f"╚════════════════════════════════════════╝{Colors.END}\n")


def print_intro():
    """Print game introduction"""
    print(f"{Colors.YELLOW}You're at a coffee shop, about to meet Chloe for a first date.")
    print("Pay attention to her body language and responses.")
    print("Your goal: Build connection and read the room.\n")
    print(f"{Colors.CYAN}[DEBUG MODE: You can see the hidden stats]{Colors.END}\n")


def print_stats(state: GameState, show_changes: bool = False,
                vibe_delta: int = 0, trust_delta: int = 0, tension_delta: int = 0):
    """Print current game stats"""

    # Stat bar helper
    def stat_bar(value: int, max_val: int = 100) -> str:
        filled = int(value / max_val * 20)
        bar = "█" * filled + "░" * (20 - filled)

        # Color based on value
        if value < 30:
            color = Colors.RED
        elif value < 70:
            color = Colors.YELLOW
        else:
            color = Colors.GREEN

        return f"{color}{bar}{Colors.END}"

    # Show changes if provided
    change_str = ""
    if show_changes:
        if vibe_delta != 0:
            change_str += f" Vibe: {vibe_delta:+d}"
        if trust_delta != 0:
            change_str += f" Trust: {trust_delta:+d}"
        if tension_delta != 0:
            change_str += f" Tension: {tension_delta:+d}"

        if change_str:
            print(f"{Colors.CYAN}[Changes:{change_str}]{Colors.END}")

    print(f"\n{Colors.BOLD}═══ STATS (Turn {state.turn}/20) ═══{Colors.END}")
    print(f"Vibe:    {stat_bar(state.vibe)}  {state.vibe}/100")
    print(f"Trust:   {stat_bar(state.trust)}  {state.trust}/100")
    print(f"Tension: {stat_bar(state.tension)}  {state.tension}/100")

    if state.lockout_turns > 0:
        print(f"\n{Colors.RED}[RECOVERY MODE: {state.lockout_turns} turns remaining]{Colors.END}")

    print(f"Location: {Colors.CYAN}{state.act.value.replace('_', ' ').title()}{Colors.END}\n")


def print_chloe_response(response: str):
    """Print Chloe's response with formatting"""
    print(f"\n{Colors.BOLD}Chloe:{Colors.END} {response}\n")


def print_intuition(hint: str):
    """Print internal monologue hint"""
    print(f"{Colors.CYAN}💭 {hint}{Colors.END}\n")


def print_ending(ending_type: str, message: str):
    """Print game ending"""
    print(f"\n{Colors.BOLD}{'='*50}{Colors.END}")

    if ending_type.startswith("S"):
        print(f"{Colors.GREEN}{Colors.BOLD}★ S RANK - THE KISS ★{Colors.END}")
    elif ending_type.startswith("A"):
        print(f"{Colors.GREEN}{Colors.BOLD}A RANK - THE GENTLEMAN{Colors.END}")
    elif ending_type.startswith("B"):
        print(f"{Colors.CYAN}{Colors.BOLD}B RANK - THE NUMBER{Colors.END}")
    elif ending_type.startswith("C"):
        print(f"{Colors.YELLOW}C RANK - THE FADE{Colors.END}")
    elif ending_type.startswith("D"):
        print(f"{Colors.YELLOW}D RANK - FRIEND ZONE{Colors.END}")
    else:
        print(f"{Colors.RED}{Colors.BOLD}F RANK - THE ICK{Colors.END}")

    print(f"\n{message}")
    print(f"\n{Colors.BOLD}{'='*50}{Colors.END}\n")


def main():
    """Main game loop"""
    # Load environment variables
    load_dotenv()

    if not os.getenv("ANTHROPIC_API_KEY"):
        print(f"{Colors.RED}Error: ANTHROPIC_API_KEY not found in environment{Colors.END}")
        print("Please create a .env file with your API key")
        sys.exit(1)

    # Initialize game
    print_header()
    print_intro()

    state = GameState()
    classifier = Classifier()
    engine = GameEngine(state)
    narrator = Narrator()

    # Opening scene
    print(f"{Colors.CYAN}*You see Chloe sitting at a corner table, checking her phone.*{Colors.END}\n")
    print_stats(state)

    # Game loop
    while not state.game_over:
        # Get user input
        try:
            user_input = input(f"{Colors.BOLD}You:{Colors.END} ").strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n\n{Colors.YELLOW}Game interrupted.{Colors.END}")
            sys.exit(0)

        if not user_input:
            continue

        # Special commands
        if user_input.lower() in ['quit', 'exit', 'q']:
            print(f"\n{Colors.YELLOW}Thanks for playing!{Colors.END}\n")
            break

        if user_input.lower() == 'kiss':
            user_input = "I lean in to kiss you"

        # Classify input
        print(f"{Colors.CYAN}[Analyzing...]{Colors.END}")
        tags = classifier.analyze(user_input, state.history)
        print(f"{Colors.CYAN}[Tags: {tags.intent}/{tags.modifier}/{tags.tone}]{Colors.END}")

        # Check for kiss attempt first
        kiss_result = engine.check_kiss_attempt(tags)
        if kiss_result:
            success, ending, message = kiss_result
            print_chloe_response(message)

            # ALWAYS end game on kiss attempt (whether success or hard rejection)
            if ending:
                print_ending(ending.value, message)

                # Generate and show breakdown
                from backend.breakdown import BreakdownGenerator
                breakdown_gen = BreakdownGenerator()
                breakdown = breakdown_gen.generate_breakdown(state)
                print(breakdown)

                state.game_over = True
                state.game_over_reason = ending.value
                break
            else:
                # Soft rejection, continue game but show warning
                print(f"{Colors.YELLOW}[Awkward moment... recover carefully]{Colors.END}")
                print_intuition("I need to back off and reset the vibe...")

        # Calculate score changes
        vibe_delta, trust_delta, tension_delta = engine.calculate_delta(tags)

        # Apply changes (decay returns amount applied)
        decay_applied = engine.apply_passive_decay()
        state.vibe += vibe_delta
        state.trust += trust_delta
        state.tension += tension_delta
        state.clamp_stats()
        engine.apply_phase_caps()  # Apply act-based stat caps

        # Generate Chloe's response (if not already from kiss attempt)
        if not kiss_result:
            chloe_response = narrator.generate_response(state, user_input, tags)
            print_chloe_response(chloe_response)
        else:
            chloe_response = kiss_result[2]

        # Generate intuition hint
        from backend.intuition import IntuitionGenerator
        intuition_gen = IntuitionGenerator()
        hint = intuition_gen.generate_hint(state, (vibe_delta, trust_delta, tension_delta), state.history)
        if hint:
            print_intuition(hint)

        # Assess response quality for next turn's decay logic
        response_quality = engine.assess_response_quality(chloe_response)

        # Detect critical events
        critical_event = engine.detect_critical_event(
            state.turn, tags, vibe_delta, trust_delta, tension_delta
        )
        if critical_event:
            state.critical_events.append(critical_event)

        # Record turn
        turn = Turn(
            turn_number=state.turn,
            user_input=user_input,
            tags=tags,
            vibe_change=vibe_delta,
            trust_change=trust_delta,
            tension_change=tension_delta,
            chloe_response=chloe_response,
            vibe_after=state.vibe,
            trust_after=state.trust,
            tension_after=state.tension,
            response_quality=response_quality,
            decay_applied=(decay_applied > 0),
            intuition_hint=hint,
            critical_event=critical_event
        )
        state.history.append(turn)

        # Update state for next turn
        state.previous_response_quality = response_quality
        state.turn += 1

        # Process lockout
        engine.process_lockout()

        # Advance act
        engine.advance_act()

        # Check for game over
        game_over_result = engine.check_game_over()
        if game_over_result:
            ending_type, ending_message = game_over_result
            print_ending(ending_type.value, ending_message)

            # Generate and show breakdown
            from backend.breakdown import BreakdownGenerator
            breakdown_gen = BreakdownGenerator()
            breakdown = breakdown_gen.generate_breakdown(state)
            print(breakdown)

            state.game_over = True
            state.game_over_reason = ending_type.value
            break

        # Show updated stats
        print_stats(state, show_changes=True,
                   vibe_delta=vibe_delta,
                   trust_delta=trust_delta,
                   tension_delta=tension_delta)

    print(f"\n{Colors.GREEN}Game Over. Thanks for playing!{Colors.END}\n")


if __name__ == "__main__":
    main()
