"""Compatibility projection for the store's signed-row identity set."""
from __future__ import annotations

try:
    from .store import TelemetryStore
except ImportError:
    from store import TelemetryStore

class _SeenView:
    """``.clear()`` sobre los sets antireplay de todos los dispositivos."""

    __slots__ = ("_store",)

    def __init__(self, store: TelemetryStore) -> None:
        self._store = store

    def clear(self) -> None:
        self._store.clear_seen()

    def __len__(self) -> int:
        return self._store.tracked_identities()

