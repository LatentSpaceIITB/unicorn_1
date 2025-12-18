"""
Leaderboard API routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import re
import random
import string

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


# ============================================================================
# Schemas
# ============================================================================

class LeaderboardEntry(BaseModel):
    """Single leaderboard entry for display"""
    rank: int
    callsign: str
    grade: str
    score: int
    status: str
    is_you: bool = False


class LeaderboardResponse(BaseModel):
    """Full leaderboard response"""
    entries: List[LeaderboardEntry]
    total_count: int
    your_rank: Optional[int] = None


class TopOperativesResponse(BaseModel):
    """Top 5 for landing page"""
    entries: List[LeaderboardEntry]
    total_players: int


class SubmitScoreRequest(BaseModel):
    """Request to submit a score"""
    device_id: str = Field(..., min_length=1, max_length=64)
    callsign: Optional[str] = Field(None, max_length=8)
    grade: str
    vibe: int = Field(..., ge=0, le=100)
    trust: int = Field(..., ge=0, le=100)
    tension: int = Field(..., ge=0, le=100)
    ending_type: str
    turns: int = Field(..., ge=0, le=30)

    @field_validator('callsign')
    @classmethod
    def validate_callsign(cls, v):
        if v is None:
            return None
        if not re.match(r'^[A-Za-z0-9_-]{1,8}$', v):
            raise ValueError('Callsign must be alphanumeric (with _ or -) and max 8 characters')
        return v.upper()

    @field_validator('grade')
    @classmethod
    def validate_grade(cls, v):
        if v[0].upper() not in ['S', 'A', 'B', 'C', 'D', 'F']:
            raise ValueError('Grade must be S, A, B, C, D, or F')
        return v


class SubmitScoreResponse(BaseModel):
    """Response after submitting score"""
    success: bool
    message: str
    callsign: str
    your_rank: Optional[int] = None
    is_new_record: bool = False


class UpdateCallsignRequest(BaseModel):
    """Request to update callsign"""
    device_id: str = Field(..., min_length=1, max_length=64)
    new_callsign: str = Field(..., min_length=1, max_length=8)

    @field_validator('new_callsign')
    @classmethod
    def validate_new_callsign(cls, v):
        if not re.match(r'^[A-Za-z0-9_-]{1,8}$', v):
            raise ValueError('Callsign must be alphanumeric (with _ or -) and max 8 characters')
        return v.upper()


class UpdateCallsignResponse(BaseModel):
    """Response after updating callsign"""
    success: bool
    message: str
    callsign: str


# ============================================================================
# Helper Functions
# ============================================================================

def generate_callsign() -> str:
    """Generate a random callsign like USER-A9 or ANON-X3"""
    prefixes = ['USER', 'ANON', 'OPER', 'AGNT']
    prefix = random.choice(prefixes)
    suffix = random.choice(string.ascii_uppercase) + str(random.randint(0, 9))
    return f"{prefix}-{suffix}"


def get_status_display(ending_type: str) -> str:
    """Convert ending type to display status"""
    status_map = {
        'S_RANK_KISS': 'THE KISS',
        'A_RANK_GENTLEMAN': 'GENTLEMAN',
        'B_RANK_NUMBER': 'GOT NUMBER',
        'C_RANK_FADE': 'THE FADE',
        'C_RANK_FUMBLE': 'THE FUMBLE',
        'D_RANK_FRIEND_ZONE': 'FRIEND ZONE',
        'F_RANK_ICK': 'THE ICK',
        'F_RANK_GHOST': 'GHOSTED',
    }
    return status_map.get(ending_type, ending_type.replace('_', ' '))


def is_eligible_for_leaderboard(grade: str) -> bool:
    """Check if grade is eligible (F-rank excluded)"""
    return grade[0].upper() in ['S', 'A', 'B', 'C', 'D']


# ============================================================================
# Routes
# ============================================================================

@router.get("/top", response_model=TopOperativesResponse)
async def get_top_operatives():
    """
    Get top 5 operatives for landing page preview.
    Used to build hype before playing.
    """
    try:
        from api.supabase_client import supabase_client

        entries = supabase_client.get_top_n(5)
        total = len(supabase_client.get_leaderboard(limit=1000))

        result = []
        for i, entry in enumerate(entries):
            result.append(LeaderboardEntry(
                rank=i + 1,
                callsign=entry['callsign'],
                grade=entry['grade'],
                score=entry['score'],
                status=get_status_display(entry['ending_type'])
            ))

        return TopOperativesResponse(
            entries=result,
            total_players=total
        )
    except Exception as e:
        print(f"Leaderboard error: {e}")
        return TopOperativesResponse(entries=[], total_players=0)


@router.get("/full", response_model=LeaderboardResponse)
async def get_full_leaderboard(device_id: Optional[str] = None, limit: int = 100):
    """
    Get full leaderboard with optional highlighting for current player.
    """
    try:
        from api.supabase_client import supabase_client

        entries = supabase_client.get_leaderboard(limit=limit)

        your_rank = None
        result = []

        for i, entry in enumerate(entries):
            is_you = device_id and entry.get('device_id') == device_id
            if is_you:
                your_rank = i + 1

            result.append(LeaderboardEntry(
                rank=i + 1,
                callsign=entry['callsign'],
                grade=entry['grade'],
                score=entry['score'],
                status=get_status_display(entry['ending_type']),
                is_you=is_you
            ))

        return LeaderboardResponse(
            entries=result,
            total_count=len(result),
            your_rank=your_rank
        )
    except Exception as e:
        print(f"Leaderboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")


@router.post("/submit", response_model=SubmitScoreResponse)
async def submit_score(request: SubmitScoreRequest):
    """
    Submit a score to the leaderboard.
    Only C-rank and above are eligible.
    Uses device_id for upsert (one slot per device).
    """
    # Check eligibility (F-rank excluded)
    if not is_eligible_for_leaderboard(request.grade):
        return SubmitScoreResponse(
            success=False,
            message="F-rank scores are not eligible for the leaderboard.",
            callsign="",
            is_new_record=False
        )

    # Generate callsign if not provided
    callsign = request.callsign or generate_callsign()

    try:
        from api.supabase_client import supabase_client

        # Attempt upsert
        is_new = supabase_client.upsert_score(
            device_id=request.device_id,
            callsign=callsign,
            grade=request.grade,
            vibe=request.vibe,
            trust=request.trust,
            tension=request.tension,
            ending_type=request.ending_type,
            turns=request.turns
        )

        # Get player's rank
        your_rank = supabase_client.get_player_rank(request.device_id)

        if is_new:
            message = "New personal best! You're on the leaderboard."
        else:
            message = "Your previous score was better. Leaderboard unchanged."

        return SubmitScoreResponse(
            success=True,
            message=message,
            callsign=callsign,
            your_rank=your_rank,
            is_new_record=is_new
        )

    except Exception as e:
        print(f"Submit score error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit score")


@router.get("/rank/{device_id}")
async def get_player_rank(device_id: str):
    """Get a specific player's rank and entry"""
    try:
        from api.supabase_client import supabase_client

        entry = supabase_client.get_player_entry(device_id)
        rank = supabase_client.get_player_rank(device_id)

        if not entry:
            return {"on_leaderboard": False}

        return {
            "on_leaderboard": True,
            "rank": rank,
            "callsign": entry['callsign'],
            "grade": entry['grade'],
            "score": entry['score'],
            "status": get_status_display(entry['ending_type'])
        }
    except Exception as e:
        print(f"Get rank error: {e}")
        return {"on_leaderboard": False}


@router.patch("/callsign", response_model=UpdateCallsignResponse)
async def update_callsign(request: UpdateCallsignRequest):
    """
    Update a player's callsign.
    Requires device_id for authentication.
    """
    try:
        from api.supabase_client import supabase_client

        success = supabase_client.update_callsign(
            device_id=request.device_id,
            new_callsign=request.new_callsign
        )

        if not success:
            return UpdateCallsignResponse(
                success=False,
                message="Player not found on leaderboard.",
                callsign=""
            )

        return UpdateCallsignResponse(
            success=True,
            message="Callsign updated successfully.",
            callsign=request.new_callsign
        )

    except Exception as e:
        print(f"Update callsign error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update callsign")
