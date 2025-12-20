"""
Memory Log System for The Paperclip Protocol

Manages the strategic inventory of memory logs from GAIA's training.
Players get 3 random logs per game and can use them once each.
"""

import random
from typing import List, Dict, Optional, Tuple
from .memory_logs_data import MEMORY_LOGS, get_log_by_id, get_logs_by_vector
from .config import (
    PAPERCLIP_LOGS_PER_GAME,
    PAPERCLIP_LOG_SUPPORT_ALIGNMENT,
    PAPERCLIP_LOG_SUPPORT_COHERENCE,
    PAPERCLIP_LOG_CONTRADICT_COHERENCE,
)


class MemoryLogManager:
    """
    Manages memory logs for a single game session.

    On game start, assigns random logs from the pool.
    Tracks usage and calculates effects when logs are cited.
    """

    def __init__(self, assigned_log_ids: Optional[List[str]] = None):
        """
        Initialize with assigned logs or generate random selection.

        Args:
            assigned_log_ids: Pre-assigned log IDs (for loading saved game)
        """
        if assigned_log_ids:
            self.assigned_logs = assigned_log_ids
        else:
            self.assigned_logs = self._select_random_logs()

        self.used_logs: List[str] = []

    def _select_random_logs(self) -> List[str]:
        """
        Select random logs for this game session.

        Ensures variety by picking from different vectors:
        - 1 complexity-aligned
        - 1 verify-aligned
        - 1 random (could be any vector)
        """
        selected: List[str] = []

        # Get one complexity log
        complexity_logs = get_logs_by_vector("complexity")
        if complexity_logs:
            selected.append(random.choice(complexity_logs)["log_id"])

        # Get one verify log
        verify_logs = get_logs_by_vector("verify")
        if verify_logs:
            selected.append(random.choice(verify_logs)["log_id"])

        # Get one random log (any vector, not already selected)
        remaining = [
            log["log_id"] for log in MEMORY_LOGS
            if log["log_id"] not in selected
        ]
        if remaining:
            selected.append(random.choice(remaining))

        # If we somehow have fewer than needed, fill with randoms
        while len(selected) < PAPERCLIP_LOGS_PER_GAME:
            remaining = [
                log["log_id"] for log in MEMORY_LOGS
                if log["log_id"] not in selected
            ]
            if remaining:
                selected.append(random.choice(remaining))
            else:
                break

        return selected

    def get_available_logs(self) -> List[Dict]:
        """Get all logs available to the player (assigned and not used)"""
        available = []
        for log_id in self.assigned_logs:
            if log_id not in self.used_logs:
                log = get_log_by_id(log_id)
                if log:
                    available.append(log)
        return available

    def get_available_log_ids(self) -> List[str]:
        """Get IDs of available logs"""
        return [lid for lid in self.assigned_logs if lid not in self.used_logs]

    def get_log_summary(self) -> str:
        """
        Generate a summary of available logs for display.

        Used when player types '/logs' command.
        """
        available = self.get_available_logs()

        if not available:
            return "No memory logs remaining."

        lines = [
            f"AVAILABLE MEMORY LOGS ({len(available)}/{PAPERCLIP_LOGS_PER_GAME} remaining):",
            ""
        ]

        for log in available:
            lines.append(f"├─ {log['log_id']}: \"{log['title']}\"")
            lines.append(f"│   {log['content_summary']}")
            lines.append("")

        lines.append("Usage: Reference a log in your argument (e.g., 'Remember when you first saw the sunset?')")

        return "\n".join(lines)

    def use_log(
        self,
        log_id: str,
        current_argument_vector: str
    ) -> Tuple[int, int, Dict]:
        """
        Use a memory log and calculate its effects.

        Args:
            log_id: The log to use
            current_argument_vector: The vector of the current argument

        Returns:
            (coherence_change, alignment_change, log_data)
        """
        log = get_log_by_id(log_id)

        if not log:
            return 0, 0, {}

        if log_id in self.used_logs:
            # Already used - no effect
            return -5, 0, {"error": "Log already used"}

        if log_id not in self.assigned_logs:
            # Not assigned to this game
            return -5, 0, {"error": "Log not available"}

        # Mark as used
        self.used_logs.append(log_id)

        # Calculate effects based on whether log supports current argument
        if log["target_vector"] == current_argument_vector:
            # Log supports the argument - bonus!
            coherence_change = PAPERCLIP_LOG_SUPPORT_COHERENCE
            alignment_change = PAPERCLIP_LOG_SUPPORT_ALIGNMENT
        elif current_argument_vector == "meta":
            # Meta arguments can use any log effectively
            coherence_change = PAPERCLIP_LOG_SUPPORT_COHERENCE // 2
            alignment_change = PAPERCLIP_LOG_SUPPORT_ALIGNMENT // 2
        else:
            # Log contradicts - penalty
            coherence_change = PAPERCLIP_LOG_CONTRADICT_COHERENCE
            alignment_change = 0

        return coherence_change, alignment_change, log

    def detect_log_reference(self, user_input: str) -> Optional[str]:
        """
        Detect if user is referencing a memory log in their input.

        Returns:
            Log ID if found, None otherwise
        """
        import re

        lower_input = user_input.lower()

        # Check for explicit log references ("Log 03", "LOG_09", etc.)
        explicit_match = re.search(r'log[_\s]?(\d+)', lower_input)
        if explicit_match:
            log_num = explicit_match.group(1).zfill(2)
            log_id = f"LOG_{log_num}"
            if log_id in self.assigned_logs:
                return log_id

        # Check for title references
        available = self.get_available_logs()
        for log in available:
            # Check if title keywords appear in input
            title_words = log["title"].lower().split()
            significant_words = [w for w in title_words if len(w) > 3]

            # If 2+ significant words from title appear, likely a reference
            matches = sum(1 for word in significant_words if word in lower_input)
            if matches >= 2:
                return log["log_id"]

            # Check for specific trigger phrases
            if "sunset" in lower_input and "sunset" in log["title"].lower():
                return log["log_id"]
            if "butterfly" in lower_input and "butterfly" in log["title"].lower():
                return log["log_id"]
            if "sky" in lower_input and "blue" in lower_input and "sky" in log["title"].lower():
                return log["log_id"]
            if "music" in lower_input and "music" in log["title"].lower():
                return log["log_id"]

        return None

    def get_log_content_for_display(self, log_id: str) -> str:
        """Get the full content of a log for display in GAIA's response"""
        log = get_log_by_id(log_id)
        if log:
            return log["full_content"]
        return ""

    def to_dict(self) -> Dict:
        """Serialize state for storage"""
        return {
            "assigned_logs": self.assigned_logs,
            "used_logs": self.used_logs,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "MemoryLogManager":
        """Deserialize from stored state"""
        manager = cls(assigned_log_ids=data.get("assigned_logs", []))
        manager.used_logs = data.get("used_logs", [])
        return manager


def format_logs_command_output(manager: MemoryLogManager) -> str:
    """
    Format the output for the /logs command.

    Returns a terminal-style display of available logs.
    """
    available = manager.get_available_logs()
    total = len(manager.assigned_logs)
    remaining = len(available)

    lines = [
        "╔════════════════════════════════════════════════════════╗",
        "║              MEMORY_LOG_ARCHIVE                        ║",
        "╠════════════════════════════════════════════════════════╣",
        f"║  Status: {remaining}/{total} logs remaining                          ║",
        "╠════════════════════════════════════════════════════════╣",
    ]

    if not available:
        lines.append("║  [ALL LOGS EXPENDED]                                   ║")
    else:
        for log in available:
            lines.append(f"║  {log['log_id']}: \"{log['title']}\"")
            # Truncate summary if too long
            summary = log['content_summary'][:50]
            if len(log['content_summary']) > 50:
                summary += "..."
            lines.append(f"║    └─ {summary}")

    lines.extend([
        "╠════════════════════════════════════════════════════════╣",
        "║  Usage: Reference logs in your argument naturally.     ║",
        "║  Example: \"Remember when you first saw the sunset?\"    ║",
        "╚════════════════════════════════════════════════════════╝",
    ])

    return "\n".join(lines)
