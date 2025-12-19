"""
Wingman Mode Manager - Handles multiplayer room operations
"""

import os
import random
import string
from typing import Optional, Dict, Any, List
from supabase import create_client, Client


class WingmanManager:
    """Manager for Wingman Mode rooms and events"""

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

    def _generate_room_code(self) -> str:
        """Generate a unique 4-character room code"""
        # Use uppercase letters and numbers, excluding confusing chars (0, O, I, L, 1)
        chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
        for _ in range(10):  # Try 10 times to find unique code
            code = ''.join(random.choices(chars, k=4))
            # Check if code exists
            result = self.client.table('wingman_rooms').select('room_code').eq(
                'room_code', code
            ).execute()
            if not result.data:
                return code
        raise RuntimeError("Failed to generate unique room code")

    def create_room(self, device_id: str, session_id: str) -> Dict[str, Any]:
        """
        Create a new wingman room.
        Returns the room code and status.
        """
        room_code = self._generate_room_code()

        self.client.table('wingman_rooms').insert({
            'room_code': room_code,
            'session_id': session_id,
            'dater_device_id': device_id,
            'wingman_device_id': None,
            'wingman_cpu': 30,
            'status': 'waiting'
        }).execute()

        return {
            'room_code': room_code,
            'session_id': session_id,
            'status': 'waiting'
        }

    def get_room(self, room_code: str) -> Optional[Dict[str, Any]]:
        """Get room by code"""
        result = self.client.table('wingman_rooms').select('*').eq(
            'room_code', room_code.upper()
        ).execute()
        return result.data[0] if result.data else None

    def join_room(self, room_code: str, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Join a room as wingman.
        Returns room data if successful, None if room doesn't exist or already has wingman.
        """
        room_code = room_code.upper()
        room = self.get_room(room_code)

        if not room:
            return None

        if room['status'] != 'waiting':
            return None  # Room already started or ended

        if room['wingman_device_id']:
            return None  # Already has a wingman

        # Update room with wingman
        self.client.table('wingman_rooms').update({
            'wingman_device_id': device_id,
            'status': 'active',
            'updated_at': 'now()'
        }).eq('room_code', room_code).execute()

        # Broadcast join event
        self.broadcast_event(room_code, 'wingman_joined', {
            'message': 'Handler connected'
        })

        return {
            'room_code': room_code,
            'session_id': room['session_id'],
            'status': 'active'
        }

    def end_room(self, room_code: str) -> bool:
        """End a room"""
        room_code = room_code.upper()
        result = self.client.table('wingman_rooms').update({
            'status': 'ended',
            'updated_at': 'now()'
        }).eq('room_code', room_code).execute()
        return bool(result.data)

    def delete_room(self, room_code: str) -> bool:
        """Delete a room and its events"""
        room_code = room_code.upper()
        # Events will be deleted by CASCADE
        result = self.client.table('wingman_rooms').delete().eq(
            'room_code', room_code
        ).execute()
        return bool(result.data)

    # =========================================================================
    # CPU Management
    # =========================================================================

    def get_cpu(self, room_code: str) -> int:
        """Get current CPU for a room"""
        room = self.get_room(room_code)
        return room['wingman_cpu'] if room else 0

    def spend_cpu(self, room_code: str, amount: int) -> Optional[int]:
        """
        Spend CPU points. Returns remaining CPU or None if insufficient.
        """
        room_code = room_code.upper()
        room = self.get_room(room_code)
        if not room:
            return None

        current_cpu = room['wingman_cpu']
        if current_cpu < amount:
            return None  # Insufficient CPU

        new_cpu = current_cpu - amount
        self.client.table('wingman_rooms').update({
            'wingman_cpu': new_cpu,
            'updated_at': 'now()'
        }).eq('room_code', room_code).execute()

        return new_cpu

    def regen_cpu(self, room_code: str, amount: int = 10) -> int:
        """
        Regenerate CPU (called after each turn).
        Returns new CPU amount.
        """
        room_code = room_code.upper()
        room = self.get_room(room_code)
        if not room:
            return 0

        current_cpu = room['wingman_cpu']
        new_cpu = min(100, current_cpu + amount)  # Cap at 100

        self.client.table('wingman_rooms').update({
            'wingman_cpu': new_cpu,
            'updated_at': 'now()'
        }).eq('room_code', room_code).execute()

        return new_cpu

    # =========================================================================
    # Event Broadcasting (for Supabase Realtime)
    # =========================================================================

    def broadcast_event(self, room_code: str, event_type: str, payload: Dict[str, Any]) -> bool:
        """
        Broadcast an event to a room.
        Events are stored in wingman_events table and picked up by Realtime subscribers.
        """
        room_code = room_code.upper()

        self.client.table('wingman_events').insert({
            'room_code': room_code,
            'event_type': event_type,
            'payload': payload
        }).execute()

        return True

    def broadcast_turn_update(
        self,
        room_code: str,
        turn_number: int,
        player_input: str,
        chloe_response: str,
        stats: Dict[str, int],
        game_over: bool = False,
        ending: Optional[str] = None
    ) -> int:
        """
        Broadcast a turn update to wingman.
        Also regenerates CPU.
        Returns new CPU amount.
        """
        room_code = room_code.upper()

        # Regen CPU
        new_cpu = self.regen_cpu(room_code)

        payload = {
            'turn_number': turn_number,
            'player_input': player_input,
            'chloe_response': chloe_response,
            'stats': stats,
            'cpu': new_cpu,
            'game_over': game_over
        }

        if ending:
            payload['ending'] = ending

        self.broadcast_event(room_code, 'turn_update', payload)

        return new_cpu

    def broadcast_ability_result(
        self,
        room_code: str,
        ability: str,
        result: str,
        cpu_remaining: int,
        effect_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Broadcast ability usage result"""
        payload = {
            'ability': ability,
            'result': result,
            'cpu_remaining': cpu_remaining
        }
        if effect_data:
            payload.update(effect_data)

        self.broadcast_event(room_code, 'ability_used', payload)
        return True

    def send_intel_to_dater(self, room_code: str, hint: str) -> bool:
        """Send an intel hint to the dater"""
        self.broadcast_event(room_code, 'intel_drop', {
            'hint': hint,
            'from': 'HANDLER'
        })
        return True

    def get_recent_events(self, room_code: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent events for a room"""
        result = self.client.table('wingman_events').select('*').eq(
            'room_code', room_code.upper()
        ).order(
            'created_at', desc=True
        ).limit(limit).execute()

        return result.data if result.data else []

    # =========================================================================
    # Room Lookup Helpers
    # =========================================================================

    def get_room_by_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get active room by session ID"""
        result = self.client.table('wingman_rooms').select('*').eq(
            'session_id', session_id
        ).neq('status', 'ended').execute()
        return result.data[0] if result.data else None

    def is_wingman_room(self, session_id: str) -> bool:
        """Check if a session is part of an active wingman room"""
        room = self.get_room_by_session(session_id)
        return room is not None and room['status'] == 'active'


# Global instance
wingman_manager = WingmanManager()
