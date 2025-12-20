"""
Session management for Paperclip Protocol game state persistence
In-memory storage with TTL (for MVP)
"""

from typing import Dict, Optional, Tuple
import uuid
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models import PaperclipGameState
from backend.paperclip_engine import PaperclipEngine
from backend.logs import MemoryLogManager


class PaperclipSessionStore:
    """In-memory session storage for Paperclip Protocol with TTL"""

    def __init__(self, ttl_minutes: int = 60, cleanup_interval: int = 50):
        self._sessions: Dict[str, dict] = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self._request_count = 0
        self._cleanup_interval = cleanup_interval

    def create(self) -> Tuple[str, PaperclipGameState, MemoryLogManager]:
        """
        Create new Paperclip game session.

        Returns:
            (session_id, initial_state, log_manager)
        """
        session_id = str(uuid.uuid4())

        # Create initial game state
        state = PaperclipEngine.create_initial_state()

        # Create log manager with random logs
        log_manager = MemoryLogManager()

        # Store assigned log IDs in state
        state.available_logs = log_manager.assigned_logs

        self._sessions[session_id] = {
            "state": state,
            "log_manager": log_manager,
            "created_at": datetime.now(),
            "last_activity": datetime.now()
        }

        return session_id, state, log_manager

    def get(self, session_id: str) -> Optional[Tuple[PaperclipGameState, MemoryLogManager]]:
        """Get game state and log manager by session ID"""
        self._maybe_cleanup()
        session = self._sessions.get(session_id)
        if session:
            session["last_activity"] = datetime.now()
            return session["state"], session["log_manager"]
        return None

    def get_state(self, session_id: str) -> Optional[PaperclipGameState]:
        """Get just the game state"""
        result = self.get(session_id)
        if result:
            return result[0]
        return None

    def get_log_manager(self, session_id: str) -> Optional[MemoryLogManager]:
        """Get just the log manager"""
        result = self.get(session_id)
        if result:
            return result[1]
        return None

    def _maybe_cleanup(self):
        """Run cleanup every N requests"""
        self._request_count += 1
        if self._request_count >= self._cleanup_interval:
            self._request_count = 0
            self.cleanup_expired()

    def update(
        self,
        session_id: str,
        state: PaperclipGameState,
        log_manager: Optional[MemoryLogManager] = None
    ):
        """Update game state and optionally log manager"""
        if session_id in self._sessions:
            self._sessions[session_id]["state"] = state
            if log_manager:
                self._sessions[session_id]["log_manager"] = log_manager
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


# Global session store instance for Paperclip Protocol
paperclip_sessions = PaperclipSessionStore()
