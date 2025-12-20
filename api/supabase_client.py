"""
Supabase client for leaderboard persistence
"""

import os
from typing import Optional, List, Dict, Any
from supabase import create_client, Client


def grade_to_rank(grade: str) -> int:
    """Convert grade letter to numeric rank (lower is better)"""
    grades = {'S': 1, 'A': 2, 'B': 3, 'C': 4, 'D': 5}
    return grades.get(grade[0].upper(), 6)


class SupabaseClient:
    """Supabase client wrapper for leaderboard operations"""

    def __init__(self):
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        if self._client is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_KEY")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
            self._client = create_client(url, key)
        return self._client

    def upsert_score(
        self,
        device_id: str,
        callsign: str,
        grade: str,
        vibe: int,
        trust: int,
        tension: int,
        ending_type: str,
        turns: int,
        game_mode: str = 'dating'
    ) -> bool:
        """
        Upsert a score to the leaderboard.
        Only updates if the new score is better than existing for the same game_mode.
        Returns True if the score was inserted/updated, False if ignored.
        """
        new_grade_rank = grade_to_rank(grade)
        new_score = vibe + trust + tension

        # Check for existing entry for this device_id + game_mode
        result = self.client.table('leaderboard').select(
            'grade_rank, score'
        ).eq('device_id', device_id).eq('game_mode', game_mode).execute()

        existing = result.data[0] if result.data else None

        if existing:
            existing_grade_rank = existing['grade_rank']
            existing_score = existing['score']

            # Only update if new score is better
            # Better = lower grade_rank, or same grade_rank with higher score
            is_better = (
                new_grade_rank < existing_grade_rank or
                (new_grade_rank == existing_grade_rank and new_score > existing_score)
            )

            if not is_better:
                return False

            # Update existing entry
            self.client.table('leaderboard').update({
                'callsign': callsign,
                'grade': grade[0].upper(),
                'grade_rank': new_grade_rank,
                'score': new_score,
                'vibe': vibe,
                'trust': trust,
                'tension': tension,
                'ending_type': ending_type,
                'turns': turns,
                'updated_at': 'now()'
            }).eq('device_id', device_id).eq('game_mode', game_mode).execute()

            return True

        # Insert new entry
        self.client.table('leaderboard').insert({
            'device_id': device_id,
            'callsign': callsign,
            'grade': grade[0].upper(),
            'grade_rank': new_grade_rank,
            'score': new_score,
            'vibe': vibe,
            'trust': trust,
            'tension': tension,
            'ending_type': ending_type,
            'turns': turns,
            'game_mode': game_mode
        }).execute()

        return True

    def get_leaderboard(self, limit: int = 100, game_mode: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get the leaderboard sorted by ranking.
        Order: grade_rank ASC, score DESC, created_at ASC (oldest first for ties)
        Optional: filter by game_mode ('dating' or 'paperclip')
        """
        query = self.client.table('leaderboard').select(
            'callsign, grade, score, ending_type, created_at, device_id, game_mode'
        )

        if game_mode:
            query = query.eq('game_mode', game_mode)

        result = query.order(
            'grade_rank', desc=False
        ).order(
            'score', desc=True
        ).order(
            'created_at', desc=False
        ).limit(limit).execute()

        return result.data if result.data else []

    def get_top_n(self, n: int = 5, game_mode: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get top N entries for landing page preview"""
        return self.get_leaderboard(limit=n, game_mode=game_mode)

    def get_player_rank(self, device_id: str, game_mode: Optional[str] = None) -> Optional[int]:
        """
        Get the rank of a specific player.
        Returns None if player not on leaderboard.
        """
        leaderboard = self.get_leaderboard(limit=1000, game_mode=game_mode)
        for i, entry in enumerate(leaderboard):
            if entry.get('device_id') == device_id:
                return i + 1
        return None

    def get_player_entry(self, device_id: str, game_mode: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get a player's leaderboard entry by device ID"""
        query = self.client.table('leaderboard').select('*').eq('device_id', device_id)

        if game_mode:
            query = query.eq('game_mode', game_mode)

        result = query.execute()

        return result.data[0] if result.data else None

    def update_callsign(self, device_id: str, new_callsign: str, game_mode: Optional[str] = None) -> bool:
        """
        Update a player's callsign.
        Returns True if updated, False if player not found.
        """
        # Check if player exists
        existing = self.get_player_entry(device_id, game_mode)
        if not existing:
            return False

        # Update callsign
        query = self.client.table('leaderboard').update({
            'callsign': new_callsign,
            'updated_at': 'now()'
        }).eq('device_id', device_id)

        if game_mode:
            query = query.eq('game_mode', game_mode)

        query.execute()

        return True


# Global instance
supabase_client = SupabaseClient()
