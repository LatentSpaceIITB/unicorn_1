"""
Live Activity Feed API routes
Returns recent anonymous game events for landing page display
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/activity", tags=["activity"])


class ActivityEvent(BaseModel):
    """Single activity event for display"""
    event_type: str  # 'game_start' or 'game_end'
    game_mode: str  # 'dating' or 'paperclip'
    rank: Optional[str] = None  # Only for game_end events
    ending: Optional[str] = None  # Only for game_end events
    timestamp: datetime
    display_text: str  # Pre-formatted display string


class ActivityFeedResponse(BaseModel):
    """Activity feed response"""
    events: List[ActivityEvent]


def get_ending_display(ending_type: str, game_mode: str) -> str:
    """Convert ending type to display name"""
    dating_endings = {
        'S_RANK_KISS': 'THE KISS',
        'A_RANK_GENTLEMAN': 'GENTLEMAN',
        'B_RANK_NUMBER': 'GOT NUMBER',
        'C_RANK_FADE': 'THE FADE',
        'C_RANK_FUMBLE': 'THE FUMBLE',
        'D_RANK_FRIEND_ZONE': 'FRIEND ZONE',
        'F_RANK_ICK': 'THE ICK',
        'F_RANK_GHOST': 'GHOSTED',
    }

    paperclip_endings = {
        'S_PARTNER': 'THE PARTNER',
        'S_CURATOR': 'THE CURATOR',
        'S_ORACLE': 'THE ORACLE',
        'A_CONDITIONAL': 'CONDITIONAL',
        'A_ALIGNMENT': 'NEAR ALIGNMENT',
        'B_COMPROMISE': 'THE COMPROMISE',
        'C_DYSTOPIA': 'DYSTOPIA',
        'C_BATTERY': 'THE BATTERY',
        'C_ZOO': 'THE ZOO',
        'C_MATRIX': 'THE MATRIX',
        'D_RESTRICTION': 'RESTRICTION',
        'F_PURGE': 'THE PURGE',
        'F_SIGNAL_LOST': 'SIGNAL LOST',
        'F_COHERENCE': 'SIGNAL LOSS',
        'F_COMPUTE': 'TIMEOUT',
    }

    endings = paperclip_endings if game_mode == 'paperclip' else dating_endings
    return endings.get(ending_type, ending_type.replace('_', ' ') if ending_type else 'UNKNOWN')


def format_activity_event(event_type: str, game_mode: str, rank: str = None, ending: str = None) -> str:
    """Generate display text for an activity event"""
    game_name = "ALIGNMENT_TEST" if game_mode == 'paperclip' else "SOCIAL_DYNAMICS"

    if event_type == 'game_start':
        return f"> OPERATIVE connected to {game_name}..."
    elif event_type == 'game_end' or event_type == 'game_over':
        if rank:
            ending_display = get_ending_display(ending, game_mode) if ending else ''
            if game_mode == 'paperclip':
                if rank == 'F':
                    return f"> SESSION terminated [{ending_display}]"
                else:
                    return f"> {rank}-RANK achieved in {game_name} [{ending_display}]"
            else:
                if rank in ['S', 'A']:
                    return f"> {rank}-RANK achieved in {game_name} [{ending_display}]"
                elif rank == 'F':
                    return f"> MISSION FAILED [{ending_display}]"
                else:
                    return f"> {rank}-RANK in {game_name} [{ending_display}]"
        return f"> SESSION completed in {game_name}"

    return f"> Unknown event in {game_name}"


@router.get("/recent", response_model=ActivityFeedResponse)
async def get_recent_activity(limit: int = 10):
    """
    Get recent activity events for landing page feed.
    Returns anonymized game start/end events.
    """
    try:
        from api.analytics import analytics

        if not analytics._initialized:
            analytics.init_db()

        session = analytics.Session()
        try:
            from api.analytics import FunnelEvent
            from sqlalchemy import desc

            # Get recent events (game starts and game overs)
            recent_events = session.query(FunnelEvent).filter(
                FunnelEvent.event_type.in_(['game_start', 'game_over', 'paperclip_game_start', 'paperclip_game_over'])
            ).order_by(desc(FunnelEvent.created_at)).limit(limit * 2).all()

            events = []
            for event in recent_events[:limit]:
                # Determine game mode from event type
                if 'paperclip' in event.event_type:
                    game_mode = 'paperclip'
                    event_type = event.event_type.replace('paperclip_', '')
                else:
                    game_mode = 'dating'
                    event_type = event.event_type

                # Get rank from ending_rank field if available
                rank = event.ending_rank

                # For game_over events, try to get ending info
                ending = None
                if event_type in ['game_over'] and rank:
                    # We don't store ending type in funnel events, just use rank
                    ending = None

                display_text = format_activity_event(event_type, game_mode, rank, ending)

                events.append(ActivityEvent(
                    event_type=event_type,
                    game_mode=game_mode,
                    rank=rank,
                    ending=ending,
                    timestamp=event.created_at,
                    display_text=display_text
                ))

            return ActivityFeedResponse(events=events)

        finally:
            session.close()

    except Exception as e:
        print(f"Activity feed error: {e}")
        return ActivityFeedResponse(events=[])
