"""In-memory store access helpers delegated from backend.main."""
from __future__ import annotations

from typing import Any

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def _now_iso() -> str:
    main = _main()
    return main.datetime.now(main.timezone.utc).isoformat()


def select_device(device_id: str | None) -> str | None:
    main = _main()
    """Device explícito; si no, ``OILGUARD_DEFAULT_DEVICE`` si existe, si no el más reciente.

    Un ``device_id`` explícito siempre gana aunque no tenga filas: así una
    consulta sobre un equipo callado devuelve su vacío honesto en vez del
    dato de otro equipo.
    """
    if device_id:
        return device_id
    return main._STORE.default_device_id()


def _sorted_device_rows(device_id: str | None) -> list[dict[str, Any]]:
    main = _main()
    if not device_id:
        return []
    with main._store_lock:
        return sorted(main._STORE.rows(device_id), key=lambda r: int(r.get("seq", 0)))


def _latest_row(device_id: str | None = None) -> dict[str, Any] | None:
    main = _main()
    with main._store_lock:
        return main._STORE.latest(main.select_device(device_id))
