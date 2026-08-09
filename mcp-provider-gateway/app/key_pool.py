from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock


@dataclass
class KeyState:
    key: str
    cooldown_until: float = 0.0


class KeyPool:
    def __init__(self, keys: list[str], cooldown_seconds: float = 30.0):
        self._states = [KeyState(k) for k in keys]
        self._cooldown_seconds = cooldown_seconds
        self._cursor = 0
        self._lock = Lock()

    @property
    def size(self) -> int:
        return len(self._states)

    def next_key(self) -> str:
        if not self._states:
            raise RuntimeError("No API key is configured for this provider")
        with self._lock:
            now = time.monotonic()
            for offset in range(len(self._states)):
                idx = (self._cursor + offset) % len(self._states)
                state = self._states[idx]
                if state.cooldown_until <= now:
                    self._cursor = (idx + 1) % len(self._states)
                    return state.key
            idx = min(range(len(self._states)), key=lambda i: self._states[i].cooldown_until)
            self._cursor = (idx + 1) % len(self._states)
            return self._states[idx].key

    def cooldown(self, key: str) -> None:
        with self._lock:
            for state in self._states:
                if state.key == key:
                    state.cooldown_until = time.monotonic() + self._cooldown_seconds
                    return
