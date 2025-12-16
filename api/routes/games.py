"""
Game API routes
"""

from fastapi import APIRouter, HTTPException
import sys
import os

# Add parent directories to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from api.schemas import (
    CreateGameResponse,
    TurnRequest,
    TurnResponse,
    StatChanges,
    CurrentStats,
    TagsResponse,
    CriticalEventResponse,
    BreakdownResponse,
    GameStateResponse,
    HistoryResponse,
    HistoryEntry,
    SilenceRequest,
    SilenceResponse,
)
from api.session import sessions
from backend.classifier import Classifier
from backend.engine import GameEngine
from backend.narrator import Narrator
from backend.intuition import IntuitionGenerator
from backend.breakdown import BreakdownGenerator
from backend.models import Turn

router = APIRouter(prefix="/api/games", tags=["games"])

# Initialize shared components (stateless - they don't hold game state)
classifier = Classifier()
narrator = Narrator()
intuition_gen = IntuitionGenerator()
breakdown_gen = BreakdownGenerator()


@router.post("/", response_model=CreateGameResponse)
async def create_game():
    """Create a new game session"""
    session_id = sessions.create()
    return CreateGameResponse(
        session_id=session_id,
        message="Game created. Good luck."
    )


@router.get("/{session_id}", response_model=GameStateResponse)
async def get_game(session_id: str):
    """Get current game state"""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return GameStateResponse(
        session_id=session_id,
        current_stats=CurrentStats(
            vibe=state.vibe,
            trust=state.trust,
            tension=state.tension,
            turn=state.turn,
            act=state.act.value,
            lockout_turns=state.lockout_turns
        ),
        history_length=len(state.history),
        game_over=state.game_over
    )


@router.post("/{session_id}/turn", response_model=TurnResponse)
async def process_turn(session_id: str, request: TurnRequest):
    """Process a single turn"""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if state.game_over:
        raise HTTPException(status_code=400, detail="Game already over")

    # Prepare input (wrap actions in asterisks if action mode)
    user_input = request.user_input
    if request.input_mode == "action":
        user_input = f"*{user_input}*"

    # Initialize engine for this state
    engine = GameEngine(state)

    # Classify input
    tags = classifier.analyze(user_input, state.history)

    # Check for kiss attempt
    kiss_result = engine.check_kiss_attempt(tags)
    ending = None
    ending_message = None

    if kiss_result:
        success, ending_type, message = kiss_result
        if ending_type:
            ending = ending_type.value
            ending_message = message
            state.game_over = True
            state.game_over_reason = ending

    # Calculate deltas
    vibe_delta, trust_delta, tension_delta = engine.calculate_delta(tags)

    # Apply decay
    decay_applied = engine.apply_passive_decay()

    # Update stats
    state.vibe += vibe_delta
    state.trust += trust_delta
    state.tension += tension_delta
    state.clamp_stats()
    engine.apply_phase_caps()

    # Generate response
    if not kiss_result:
        chloe_response = narrator.generate_response(state, user_input, tags)
    else:
        chloe_response = kiss_result[2]

    # Generate hint
    hint = intuition_gen.generate_hint(
        state, (vibe_delta, trust_delta, tension_delta), state.history
    )

    # Assess quality
    response_quality = engine.assess_response_quality(chloe_response)

    # Detect critical event
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

    # Update state
    state.previous_response_quality = response_quality
    state.turn += 1
    engine.process_lockout()
    engine.advance_act()

    # Check game over (if not already from kiss)
    if not state.game_over:
        game_over_result = engine.check_game_over()
        if game_over_result:
            ending_type, msg = game_over_result
            ending = ending_type.value
            ending_message = msg
            state.game_over = True
            state.game_over_reason = ending

    # Save state
    sessions.update(session_id, state)

    # Build response
    tags_response = TagsResponse(
        intent=tags.intent,
        modifier=tags.modifier,
        tone=tags.tone,
        topic=tags.topic,
        flags=tags.flags
    )

    critical_event_response = None
    if critical_event:
        critical_event_response = CriticalEventResponse(
            turn_number=critical_event.turn_number,
            event_type=critical_event.event_type,
            description=critical_event.description,
            stat_impact=critical_event.stat_impact
        )

    return TurnResponse(
        success=True,
        turn_number=turn.turn_number,
        tags=tags_response,
        stat_changes=StatChanges(
            vibe=vibe_delta,
            trust=trust_delta,
            tension=tension_delta
        ),
        current_stats=CurrentStats(
            vibe=state.vibe,
            trust=state.trust,
            tension=state.tension,
            turn=state.turn,
            act=state.act.value,
            lockout_turns=state.lockout_turns
        ),
        chloe_response=chloe_response,
        intuition_hint=hint,
        critical_event=critical_event_response,
        game_over=state.game_over,
        ending=ending,
        ending_message=ending_message
    )


@router.get("/{session_id}/breakdown", response_model=BreakdownResponse)
async def get_breakdown(session_id: str):
    """Get post-game analysis"""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if not state.game_over:
        raise HTTPException(status_code=400, detail="Game not over yet")

    breakdown = breakdown_gen.generate_breakdown(state)

    # Extract rank from ending
    rank = state.game_over_reason[0] if state.game_over_reason else "?"

    # Get killer quote (last response before game over)
    killer_quote = None
    if state.history:
        killer_quote = state.history[-1].chloe_response

    return BreakdownResponse(
        breakdown=breakdown,
        final_stats=CurrentStats(
            vibe=state.vibe,
            trust=state.trust,
            tension=state.tension,
            turn=state.turn,
            act=state.act.value,
            lockout_turns=state.lockout_turns
        ),
        ending=state.game_over_reason or "unknown",
        rank=rank,
        killer_quote=killer_quote
    )


@router.get("/{session_id}/history", response_model=HistoryResponse)
async def get_history(session_id: str):
    """Get game history"""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    turns = []
    for turn in state.history:
        turns.append(HistoryEntry(
            turn_number=turn.turn_number,
            user_input=turn.user_input,
            chloe_response=turn.chloe_response,
            stat_changes=StatChanges(
                vibe=turn.vibe_change,
                trust=turn.trust_change,
                tension=turn.tension_change
            ),
            intuition_hint=turn.intuition_hint
        ))

    return HistoryResponse(
        session_id=session_id,
        turns=turns
    )


@router.delete("/{session_id}")
async def delete_game(session_id: str):
    """Delete game session"""
    sessions.delete(session_id)
    return {"message": "Session deleted"}


# =============================================================================
# V2: Silence Timer Endpoint
# =============================================================================

@router.post("/{session_id}/silence", response_model=SilenceResponse)
async def apply_silence_penalty(session_id: str, request: SilenceRequest):
    """
    Apply penalty for prolonged silence.

    Called by the frontend when silence timer hits a threshold.
    Escalating penalties based on how long the player has been silent.
    """
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if state.game_over:
        raise HTTPException(status_code=400, detail="Game already over")

    engine = GameEngine(state)
    ending = None
    ending_message = None

    # Apply penalties based on silence level
    if request.level == "awkward":
        # First warning: 15 seconds
        state.vibe -= 5
        response = "*She shifts in her seat, glancing around.* '...'"

    elif request.level == "very_awkward":
        # Second warning: 30 seconds
        state.vibe -= 10
        state.trust -= 5
        response = "*She tilts her head.* 'Is everything okay? You've been quiet.'"

    elif request.level == "critical":
        # Final warning: 45 seconds
        state.vibe -= 15
        state.trust -= 10
        response = "*She picks up her phone, scrolling absently.* 'So... are you going to say something, or...?'"

    elif request.level == "ghost":
        # Game over: 60 seconds
        state.game_over = True
        state.game_over_reason = "F-"  # F_RANK_GHOSTED
        ending = "F-"
        ending_message = (
            "*She sighs and gathers her things.* 'Well... this has been... something. "
            "I should probably go.' *She doesn't look back.*"
        )
        response = ending_message

    else:
        raise HTTPException(status_code=400, detail=f"Invalid silence level: {request.level}")

    # Clamp stats
    state.clamp_stats()

    # Check for game over from stat drop (if not already from ghost)
    if not state.game_over:
        game_over_result = engine.check_game_over()
        if game_over_result:
            ending_type, msg = game_over_result
            ending = ending_type.value
            ending_message = msg
            state.game_over = True
            state.game_over_reason = ending

    # Save state
    sessions.update(session_id, state)

    return SilenceResponse(
        success=True,
        response=response,
        current_stats=CurrentStats(
            vibe=state.vibe,
            trust=state.trust,
            tension=state.tension,
            turn=state.turn,
            act=state.act.value,
            lockout_turns=state.lockout_turns
        ),
        game_over=state.game_over,
        ending=ending,
        ending_message=ending_message
    )
