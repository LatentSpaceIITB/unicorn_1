"""
Wingman Mode API routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from api.wingman_manager import wingman_manager
from api.session import sessions

router = APIRouter(prefix="/api/wingman", tags=["wingman"])


# =============================================================================
# Request/Response Schemas
# =============================================================================

class CreateRoomRequest(BaseModel):
    device_id: str
    session_id: str


class CreateRoomResponse(BaseModel):
    room_code: str
    session_id: str
    status: str


class JoinRoomRequest(BaseModel):
    device_id: str


class JoinRoomResponse(BaseModel):
    success: bool
    room_code: str
    session_id: str
    status: str
    current_stats: Optional[Dict[str, Any]] = None


class RoomStateResponse(BaseModel):
    room_code: str
    session_id: str
    dater_device_id: str
    wingman_device_id: Optional[str]
    wingman_cpu: int
    status: str
    current_stats: Optional[Dict[str, Any]] = None


class AbilityRequest(BaseModel):
    ability: str  # "scan_emotion", "intel_drop", "emergency_vibe"
    device_id: str
    hint_text: Optional[str] = None  # For intel_drop


class AbilityResponse(BaseModel):
    success: bool
    ability: str
    result: str
    cpu_remaining: int
    effect_data: Optional[Dict[str, Any]] = None


# =============================================================================
# Ability Costs
# =============================================================================

ABILITY_COSTS = {
    'scan_emotion': 10,
    'intel_drop': 20,
    'emergency_vibe': 40
}


# =============================================================================
# Room Management Endpoints
# =============================================================================

@router.post("/create", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest):
    """
    Create a new wingman room.
    Called by the Dater to start a co-op session.
    """
    # Verify session exists
    state = sessions.get(request.session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game session not found")

    if state.game_over:
        raise HTTPException(status_code=400, detail="Cannot create room for finished game")

    try:
        result = wingman_manager.create_room(
            device_id=request.device_id,
            session_id=request.session_id
        )
        return CreateRoomResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create room: {str(e)}")


@router.post("/join/{room_code}", response_model=JoinRoomResponse)
async def join_room(room_code: str, request: JoinRoomRequest):
    """
    Join a room as the Wingman.
    Called when player enters a room code.
    """
    result = wingman_manager.join_room(room_code, request.device_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Room not found, already started, or already has a wingman"
        )

    # Get current game state for the wingman
    state = sessions.get(result['session_id'])
    current_stats = None
    if state:
        current_stats = {
            'vibe': state.vibe,
            'trust': state.trust,
            'tension': state.tension,
            'turn': state.turn,
            'act': state.act.value
        }

    return JoinRoomResponse(
        success=True,
        room_code=result['room_code'],
        session_id=result['session_id'],
        status=result['status'],
        current_stats=current_stats
    )


@router.get("/{room_code}/state", response_model=RoomStateResponse)
async def get_room_state(room_code: str):
    """
    Get current room state.
    Used by both Dater and Wingman to poll status.
    """
    room = wingman_manager.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Get current game stats
    state = sessions.get(room['session_id'])
    current_stats = None
    if state:
        current_stats = {
            'vibe': state.vibe,
            'trust': state.trust,
            'tension': state.tension,
            'turn': state.turn,
            'act': state.act.value,
            'game_over': state.game_over
        }

    return RoomStateResponse(
        room_code=room['room_code'],
        session_id=room['session_id'],
        dater_device_id=room['dater_device_id'],
        wingman_device_id=room['wingman_device_id'],
        wingman_cpu=room['wingman_cpu'],
        status=room['status'],
        current_stats=current_stats
    )


@router.delete("/{room_code}")
async def end_room(room_code: str):
    """
    End/delete a wingman room.
    Called when game ends or players disconnect.
    """
    success = wingman_manager.delete_room(room_code)
    if not success:
        raise HTTPException(status_code=404, detail="Room not found")

    return {"success": True, "message": "Room deleted"}


# =============================================================================
# Ability Endpoints
# =============================================================================

@router.post("/{room_code}/ability", response_model=AbilityResponse)
async def use_ability(room_code: str, request: AbilityRequest):
    """
    Use a wingman ability.
    Only the wingman can call this.
    """
    room = wingman_manager.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room['status'] != 'active':
        raise HTTPException(status_code=400, detail="Room is not active")

    # Verify caller is the wingman
    if room['wingman_device_id'] != request.device_id:
        raise HTTPException(status_code=403, detail="Only the wingman can use abilities")

    ability = request.ability.lower()
    if ability not in ABILITY_COSTS:
        raise HTTPException(status_code=400, detail=f"Unknown ability: {ability}")

    cost = ABILITY_COSTS[ability]
    current_cpu = room['wingman_cpu']

    if current_cpu < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient CPU. Need {cost}, have {current_cpu}"
        )

    # Spend CPU
    remaining_cpu = wingman_manager.spend_cpu(room_code, cost)
    if remaining_cpu is None:
        raise HTTPException(status_code=500, detail="Failed to spend CPU")

    # Execute ability
    result_text = ""
    effect_data = {}

    if ability == 'scan_emotion':
        # Get game state and generate mood hint
        state = sessions.get(room['session_id'])
        if state:
            mood = _analyze_mood(state)
            result_text = f"Chloe seems {mood}"
            effect_data = {'mood': mood}

            # Broadcast to dater
            wingman_manager.broadcast_ability_result(
                room_code, ability, result_text, remaining_cpu, effect_data
            )
        else:
            result_text = "Unable to analyze mood"

    elif ability == 'intel_drop':
        if not request.hint_text:
            raise HTTPException(status_code=400, detail="hint_text required for intel_drop")

        hint = request.hint_text[:100]  # Limit hint length
        result_text = f"Intel sent: {hint}"
        effect_data = {'hint': hint}

        # Send hint to dater
        wingman_manager.send_intel_to_dater(room_code, hint)

    elif ability == 'emergency_vibe':
        # Add +15 vibe to game state
        state = sessions.get(room['session_id'])
        if state:
            old_vibe = state.vibe
            state.vibe = min(100, state.vibe + 15)
            sessions.update(room['session_id'], state)

            result_text = f"Vibe boosted! {old_vibe} → {state.vibe}"
            effect_data = {
                'vibe_added': 15,
                'new_vibe': state.vibe
            }

            # Broadcast vibe boost
            wingman_manager.broadcast_event(room_code, 'vibe_boost', {
                'amount': 15,
                'new_vibe': state.vibe
            })
        else:
            result_text = "Unable to boost vibe - session not found"

    return AbilityResponse(
        success=True,
        ability=ability,
        result=result_text,
        cpu_remaining=remaining_cpu,
        effect_data=effect_data
    )


# =============================================================================
# Helper Functions
# =============================================================================

def _analyze_mood(state) -> str:
    """
    Analyze Chloe's mood based on current stats.
    Returns a mood descriptor for SCAN_EMOTION ability.
    """
    vibe = state.vibe
    trust = state.trust
    tension = state.tension

    # Determine primary mood
    if vibe < 20:
        if trust < 20:
            return "uncomfortable and suspicious"
        return "bored and disengaged"

    if vibe >= 70 and tension >= 50:
        return "intrigued and excited"

    if vibe >= 60 and trust >= 50:
        return "comfortable and enjoying herself"

    if tension > 60 and trust < 30:
        return "nervous and uncertain"

    if trust >= 60 and vibe >= 40:
        return "relaxed and trusting"

    if vibe >= 40:
        return "mildly interested"

    if trust < 30:
        return "guarded and skeptical"

    return "neutral, waiting for something interesting"
