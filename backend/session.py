"""
Session state store (in-memory).
Keeps per-session conversation history for multi-turn LLM context.
Swap for Redis in production: replace SessionStore with a Redis-backed implementation.
"""

from collections import defaultdict
from typing import List


class SessionStore:
    """
    Thread-safe (GIL-protected) in-memory session store.

    Each session holds a list of ``{"role": "user"|"assistant", "content": str}`` dicts.
    Only the latest *max_turns* exchanges are returned to stay within LLM context limits.
    """

    def __init__(self, max_turns: int = 10) -> None:
        self._store: dict[str, List[dict]] = defaultdict(list)
        self.max_turns = max_turns

    def get(self, session_id: str) -> List[dict]:
        """Return the last *max_turns* messages for *session_id*."""
        return list(self._store[session_id][-(self.max_turns * 2):])

    def append(self, session_id: str, *, user: str, assistant: str) -> None:
        """Append a user/assistant exchange to the session."""
        self._store[session_id].extend(
            [
                {"role": "user", "content": user},
                {"role": "assistant", "content": assistant},
            ]
        )

    def clear(self, session_id: str) -> None:
        """Remove all history for *session_id*."""
        self._store.pop(session_id, None)
