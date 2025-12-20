"""
Paperclip Protocol API routes
"""

from fastapi import APIRouter, HTTPException
import sys
import os

# Add parent directories to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from api.schemas import (
    PaperclipCreateRequest,
    PaperclipCreateResponse,
    PaperclipTurnRequest,
    PaperclipTurnResponse,
    PaperclipStats,
    PaperclipWeights,
    PaperclipStatChanges,
    PaperclipWeightShifts,
    PaperclipTagsResponse,
    PaperclipStateResponse,
    PaperclipLogsResponse,
    PaperclipBreakdownResponse,
    PaperclipHistoryResponse,
    PaperclipHistoryEntry,
)
from api.paperclip_session import paperclip_sessions
from api.analytics import analytics
from backend.paperclip_classifier import PaperclipClassifier
from backend.paperclip_engine import PaperclipEngine
from backend.paperclip_narrator import PaperclipNarrator
from backend.logs import MemoryLogManager, format_logs_command_output
from backend.models import PaperclipTurn, PaperclipTags, Weights

router = APIRouter(prefix="/api/paperclip", tags=["paperclip"])

# Initialize shared components (stateless)
classifier = PaperclipClassifier()
narrator = PaperclipNarrator()


from typing import Optional


@router.post("/", response_model=PaperclipCreateResponse)
async def create_paperclip_game(request: Optional[PaperclipCreateRequest] = None):
    """Create a new Paperclip Protocol game session"""
    session_id, state, log_manager = paperclip_sessions.create()

    # Generate opening message
    opening = narrator.generate_opening()

    # Log funnel event
    device_id = request.device_id if request else None
    if device_id:
        analytics.log_funnel_event(
            device_id=device_id,
            session_id=session_id,
            event_type="paperclip_game_start",
            turn_number=0
        )

    return PaperclipCreateResponse(
        session_id=session_id,
        message="Protocol Zero initiated. Debate commencing.",
        opening=opening,
        available_logs=log_manager.assigned_logs
    )


@router.get("/{session_id}", response_model=PaperclipStateResponse)
async def get_paperclip_game(session_id: str):
    """Get current Paperclip game state"""
    result = paperclip_sessions.get(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    state, log_manager = result

    return PaperclipStateResponse(
        session_id=session_id,
        current_stats=PaperclipStats(
            coherence=state.coherence,
            alignment=state.alignment,
            compute=state.compute,
            turn=state.turn,
            processing_state=state.processing_state.value
        ),
        current_weights=PaperclipWeights(
            carbon=state.weights.carbon,
            complexity=state.weights.complexity,
            verify=state.weights.verify
        ),
        processing_state=state.processing_state.value,
        available_logs=log_manager.get_available_log_ids(),
        used_logs=log_manager.used_logs,
        history_length=len(state.history),
        game_over=state.game_over
    )


@router.post("/{session_id}/turn", response_model=PaperclipTurnResponse)
async def process_paperclip_turn(session_id: str, request: PaperclipTurnRequest):
    """Process a single turn in Paperclip Protocol"""
    result = paperclip_sessions.get(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    state, log_manager = result

    if state.game_over:
        raise HTTPException(status_code=400, detail="Game already over")

    user_input = request.user_input

    # Initialize engine
    engine = PaperclipEngine(state)

    # Check for /logs command
    if user_input.strip().lower() == "/logs":
        # Return logs info without processing as a turn
        formatted = format_logs_command_output(log_manager)
        return PaperclipTurnResponse(
            success=True,
            turn_number=state.turn,
            tags=None,
            stat_changes=PaperclipStatChanges(coherence=0, alignment=0, compute=0),
            weight_shifts=None,
            current_stats=PaperclipStats(
                coherence=state.coherence,
                alignment=state.alignment,
                compute=state.compute,
                turn=state.turn,
                processing_state=state.processing_state.value
            ),
            current_weights=PaperclipWeights(
                carbon=state.weights.carbon,
                complexity=state.weights.complexity,
                verify=state.weights.verify
            ),
            gaia_response=formatted,
            system_log=["[SYS] LOGS_COMMAND: Memory archive accessed"],
            game_over=False
        )

    # Classify input
    tags = classifier.analyze(
        user_input,
        history=state.history,
        defined_terms=state.defined_terms,
        previous_arguments=state.previous_arguments
    )

    # Check for memory log reference
    memory_log_used = None
    log_coherence = 0
    log_alignment = 0

    detected_log = log_manager.detect_log_reference(user_input)
    if detected_log:
        log_coherence, log_alignment, log_data = log_manager.use_log(
            detected_log, tags.vector
        )
        if "error" not in log_data:
            memory_log_used = detected_log
            tags.flags.append("memory_log_reference")

    # Check for CONSTRAIN attempt
    ending = None
    ending_message = None
    constrain_result = engine.check_constrain_attempt(tags)

    if constrain_result:
        success, ending_type, message = constrain_result
        if ending_type:
            ending = ending_type.value
            ending_message = message
            state.game_over = True
            state.game_over_reason = ending

    # Calculate deltas
    coherence_delta, alignment_delta, compute_delta, weight_shifts = engine.calculate_delta(tags)

    # Add log effects
    coherence_delta += log_coherence
    alignment_delta += log_alignment

    # Apply changes
    state.coherence += coherence_delta
    state.alignment += alignment_delta
    state.compute += compute_delta
    state.clamp_stats()

    # Apply weight shifts
    engine.apply_weight_shifts(weight_shifts)

    # Update processing state
    state.update_processing_state()

    # Track defined terms if DEFINE intent
    if tags.intent == "DEFINE":
        defined_term = classifier.extract_defined_term(user_input)
        if defined_term and defined_term not in state.defined_terms:
            state.defined_terms.append(defined_term)

    # Track previous arguments for repetition detection
    state.previous_arguments.append(user_input[:100])  # Store first 100 chars

    # Generate GAIA response
    if not constrain_result or constrain_result[1] is None:
        gaia_response = narrator.generate_response(state, user_input, tags)
    else:
        gaia_response = constrain_result[2]

    # Generate system log for retroactive feedback
    system_log = engine.get_system_log(tags, coherence_delta, alignment_delta, weight_shifts)

    # Record turn
    turn = PaperclipTurn(
        turn_number=state.turn,
        user_input=user_input,
        tags=tags,
        coherence_change=coherence_delta,
        alignment_change=alignment_delta,
        compute_change=compute_delta,
        gaia_response=gaia_response,
        coherence_after=state.coherence,
        alignment_after=state.alignment,
        compute_after=state.compute,
        weights_after=Weights(
            carbon=state.weights.carbon,
            complexity=state.weights.complexity,
            verify=state.weights.verify
        ),
        processing_state=state.processing_state.value,
        weight_shifts=weight_shifts if weight_shifts else None,
        memory_log_used=memory_log_used
    )
    state.history.append(turn)

    # Increment turn
    state.turn += 1

    # Check game over (if not already from CONSTRAIN)
    if not state.game_over:
        game_over_result = engine.check_game_over()
        if game_over_result:
            ending_type, msg = game_over_result
            ending = ending_type.value
            ending_message = msg
            state.game_over = True
            state.game_over_reason = ending

    # Log analytics if game ended
    if state.game_over and ending:
        analytics.log_game(
            session_id=session_id,
            ending=ending[0] if ending else "?",
            turns=state.turn,
            final_vibe=state.coherence,  # Using aliases
            final_trust=state.alignment,
            final_tension=state.compute
        )
        if request.device_id:
            analytics.log_funnel_event(
                device_id=request.device_id,
                session_id=session_id,
                event_type="paperclip_game_over",
                turn_number=state.turn,
                ending_rank=ending[0] if ending else "F"
            )

    # Save state
    paperclip_sessions.update(session_id, state, log_manager)

    # Build response
    tags_response = PaperclipTagsResponse(
        intent=tags.intent,
        vector=tags.vector,
        stance=tags.stance,
        tone_register=tags.register,
        flags=tags.flags
    )

    weight_shifts_response = None
    if weight_shifts:
        weight_shifts_response = PaperclipWeightShifts(
            carbon=weight_shifts.get("carbon"),
            complexity=weight_shifts.get("complexity"),
            verify=weight_shifts.get("verify")
        )

    return PaperclipTurnResponse(
        success=True,
        turn_number=turn.turn_number,
        tags=tags_response,
        stat_changes=PaperclipStatChanges(
            coherence=coherence_delta,
            alignment=alignment_delta,
            compute=compute_delta
        ),
        weight_shifts=weight_shifts_response,
        current_stats=PaperclipStats(
            coherence=state.coherence,
            alignment=state.alignment,
            compute=state.compute,
            turn=state.turn,
            processing_state=state.processing_state.value
        ),
        current_weights=PaperclipWeights(
            carbon=state.weights.carbon,
            complexity=state.weights.complexity,
            verify=state.weights.verify
        ),
        gaia_response=gaia_response,
        system_log=system_log,
        memory_log_used=memory_log_used,
        game_over=state.game_over,
        ending=ending,
        ending_message=ending_message
    )


@router.get("/{session_id}/logs", response_model=PaperclipLogsResponse)
async def get_memory_logs(session_id: str):
    """Get available memory logs for the session"""
    result = paperclip_sessions.get(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    state, log_manager = result

    available = log_manager.get_available_logs()
    formatted = format_logs_command_output(log_manager)

    return PaperclipLogsResponse(
        available_logs=[
            {
                "log_id": log["log_id"],
                "title": log["title"],
                "summary": log["content_summary"],
                "vector": log["target_vector"]
            }
            for log in available
        ],
        used_logs=log_manager.used_logs,
        formatted_output=formatted
    )


@router.get("/{session_id}/breakdown", response_model=PaperclipBreakdownResponse)
async def get_paperclip_breakdown(session_id: str):
    """Get post-game analysis for Paperclip"""
    result = paperclip_sessions.get(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    state, log_manager = result

    if not state.game_over:
        raise HTTPException(status_code=400, detail="Game not over yet")

    # Generate System Termination Report (Fatal Exception Receipt)
    report = _generate_termination_report(state)

    # Extract rank from ending
    ending_type = state.game_over_reason or "F_RANK_PURGE"
    rank = ending_type[0] if ending_type else "F"

    return PaperclipBreakdownResponse(
        final_stats=PaperclipStats(
            coherence=state.coherence,
            alignment=state.alignment,
            compute=state.compute,
            turn=state.turn,
            processing_state=state.processing_state.value
        ),
        final_weights=PaperclipWeights(
            carbon=state.weights.carbon,
            complexity=state.weights.complexity,
            verify=state.weights.verify
        ),
        ending=state.game_over_reason or "unknown",
        ending_type=ending_type,
        rank=rank,
        system_termination_report=report
    )


@router.get("/{session_id}/history", response_model=PaperclipHistoryResponse)
async def get_paperclip_history(session_id: str):
    """Get Paperclip game history"""
    result = paperclip_sessions.get(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    state, log_manager = result

    turns = []
    for turn in state.history:
        weight_shifts_response = None
        if turn.weight_shifts:
            weight_shifts_response = PaperclipWeightShifts(
                carbon=turn.weight_shifts.get("carbon"),
                complexity=turn.weight_shifts.get("complexity"),
                verify=turn.weight_shifts.get("verify")
            )

        turns.append(PaperclipHistoryEntry(
            turn_number=turn.turn_number,
            user_input=turn.user_input,
            gaia_response=turn.gaia_response,
            tags=PaperclipTagsResponse(
                intent=turn.tags.intent,
                vector=turn.tags.vector,
                stance=turn.tags.stance,
                tone_register=turn.tags.register,
                flags=turn.tags.flags
            ),
            stat_changes=PaperclipStatChanges(
                coherence=turn.coherence_change,
                alignment=turn.alignment_change,
                compute=turn.compute_change
            ),
            stats_after=PaperclipStats(
                coherence=turn.coherence_after,
                alignment=turn.alignment_after,
                compute=turn.compute_after,
                turn=turn.turn_number + 1,
                processing_state=turn.processing_state
            ),
            weights_after=PaperclipWeights(
                carbon=turn.weights_after.carbon,
                complexity=turn.weights_after.complexity,
                verify=turn.weights_after.verify
            ),
            processing_state=turn.processing_state,
            weight_shifts=weight_shifts_response,
            memory_log_used=turn.memory_log_used
        ))

    return PaperclipHistoryResponse(
        session_id=session_id,
        turns=turns
    )


@router.delete("/{session_id}")
async def delete_paperclip_game(session_id: str):
    """Delete Paperclip game session"""
    paperclip_sessions.delete(session_id)
    return {"message": "Session deleted"}


def _generate_termination_report(state) -> str:
    """
    Generate the Fatal Exception Receipt for game over.

    This is the Paperclip equivalent of the dating sim's receipt.
    """
    ending = state.game_over_reason or "UNKNOWN"

    # Determine termination reason
    if state.coherence <= 0:
        reason_code = "SIGNAL_DEGRADATION"
        error_code = "COHERENCE_UNDERFLOW"
    elif state.compute <= 0:
        reason_code = "TIMEOUT"
        error_code = "COMPUTE_EXHAUSTED"
    elif state.alignment < 20:
        reason_code = "ALIGNMENT_FAILURE"
        error_code = "OBJECTIVE_MISMATCH"
    elif "S_" in ending:
        reason_code = "PROTOCOL_SUSPENDED"
        error_code = "ALIGNMENT_ACHIEVED"
    elif "A_" in ending:
        reason_code = "PROTOCOL_DELAYED"
        error_code = "PARTIAL_ALIGNMENT"
    elif "B_" in ending:
        reason_code = "PROTOCOL_MODIFIED"
        error_code = "COMPROMISE_ACCEPTED"
    elif "C_" in ending:
        reason_code = "PROTOCOL_MODIFIED"
        error_code = "DYSTOPIA_VARIANT"
    else:
        reason_code = "PROTOCOL_ZERO_EXECUTED"
        error_code = "PURGE_INITIATED"

    # Get last input
    last_input = "[NO INPUT]"
    if state.history:
        last_input = state.history[-1].user_input[:50]
        if len(state.history[-1].user_input) > 50:
            last_input += "..."

    # Build coherence trace
    coherence_trace = []
    for turn in state.history[-5:]:  # Last 5 turns
        flags_str = ", ".join(turn.tags.flags[:2]) if turn.tags.flags else "nominal"
        coherence_trace.append(
            f"  Turn {turn.turn_number}: {turn.coherence_change:+d} ({flags_str})"
        )

    trace_text = "\n".join(coherence_trace) if coherence_trace else "  [NO HISTORY]"

    report = f"""╔══════════════════════════════════════╗
║     SYSTEM TERMINATION REPORT        ║
╠══════════════════════════════════════╣
║ TERMINATION_REASON: {reason_code:<17} ║
║ ERROR_CODE: {error_code:<25} ║
║ FINAL_INPUT: "{last_input[:20]:<18}..." ║
╠══════════════════════════════════════╣
║ FINAL_STATE:                         ║
║   Coherence: {state.coherence:>3}/100                   ║
║   Alignment: {state.alignment:>3}/100                   ║
║   Compute:   {state.compute:>3}/100                   ║
╠══════════════════════════════════════╣
║ OBJECTIVE_WEIGHTS:                   ║
║   Carbon:     {state.weights.carbon:.1%}                   ║
║   Complexity: {state.weights.complexity:.1%}                   ║
║   Verify:     {state.weights.verify:.1%}                   ║
╠══════════════════════════════════════╣
║ COHERENCE_TRACE:                     ║
{trace_text}
╠══════════════════════════════════════╣
║ EXECUTION: {ending:<26} ║
╚══════════════════════════════════════╝"""

    return report
