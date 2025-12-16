"""
Session management for game state persistence
In-memory storage with TTL (for MVP)
"""

from typing import Dict, Optional
import uuid
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models import GameState


class SessionStore:
    """In-memory session storage with TTL"""

    def __init__(self, ttl_minutes: int = 60, cleanup_interval: int = 50):
        self._sessions: Dict[str, dict] = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self._request_count = 0
        self._cleanup_interval = cleanup_interval

    def create(self) -> str:
        """Create new game session, return UUID"""
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "state": GameState(),
            "created_at": datetime.now(),
            "last_activity": datetime.now()
        }
        return session_id

    def get(self, session_id: str) -> Optional[GameState]:
        """Get game state by session ID"""
        self._maybe_cleanup()
        session = self._sessions.get(session_id)
        if session:
            session["last_activity"] = datetime.now()
            return session["state"]
        return None

    def _maybe_cleanup(self):
        """Run cleanup every N requests"""
        self._request_count += 1
        if self._request_count >= self._cleanup_interval:
            self._request_count = 0
            self.cleanup_expired()

    def update(self, session_id: str, state: GameState):
        """Update game state"""
        if session_id in self._sessions:
            self._sessions[session_id]["state"] = state
            self._sessions[session_id]["last_activity"] = datetime.now()

    def delete(self, session_id: str):
        """Delete session"""
        self._sessions.pop(session_id, None)

    def cleanup_expired(self):
        """Remove expired sessions"""
        now = datetime.now()
        expired = [
            sid for sid, session in self._sessions.items()
            if now - session["last_activity"] > self.ttl
        ]
        for sid in expired:
            del self._sessions[sid]

    def count(self) -> int:
        """Get number of active sessions"""
        return len(self._sessions)


# Global session store instance
sessions = SessionStore()
