"""Signature verification helper delegated from backend.main."""
from __future__ import annotations

from typing import Any

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def verify_rows(
    rows: list[dict[str, Any]],
) -> tuple[list[tuple[dict[str, Any], tuple | None]], list[tuple[str, str]]]:
    main = _main()
    """Verifica firmas FUERA del lock y devuelve filas preparadas + rechazos.

    El HMAC es la parte cara del ingest y no toca estado compartido, así que
    hacerlo fuera del lock reduce la sección crítica a la inserción en el
    deque: sin eso, miles de dispositivos serializan el HMAC de todos en un
    solo mutex y la latencia crece con el tamaño del lote, no con el del store.
    """
    prepared: list[tuple[dict[str, Any], tuple | None]] = []
    rejections: list[tuple[str, str]] = []
    # Locales del bucle: buscar un global por fila son millones de accesos al
    # diccionario de modulos en el camino mas caliente.
    require_signature = main._REQUIRE_SIGNATURE
    add_prepared = prepared.append
    add_rejection = rejections.append
    lookup_key = main.device_key
    for original in rows:
        row = dict(original)
        device_id = row.get("device_id")
        if type(device_id) is not str:  # noqa: E721 - atajo deliberado
            device_id = str(device_id or "")
        has_signature = row.get("sig") is not None or row.get("sig_v") is not None
        reason: str | None = None
        identity: tuple | None = None
        if not has_signature and (not device_id or row.get("seq") is None):
            reason = "missing_identity"
            main.log.warning(
                "Rejecting ingest row without device_id or seq: missing_identity"
            )
        elif has_signature:
            if not device_id or row.get("seq") is None:
                main.log.warning("Rejecting signed ingest row without device_id or seq")
            key = lookup_key(device_id)
            if key is None:
                reason = "unknown_device"
            else:
                try:
                    valid = main.verify_row(row, key)
                except (KeyError, TypeError, ValueError, OverflowError):
                    valid = False
                if not valid:
                    reason = "bad_signature"
                else:
                    identity = (device_id, int(row["seq"]), str(row["t_iso"]))
        elif require_signature:
            reason = "unsigned"
        if reason is not None:
            add_rejection((device_id, reason))
            continue
        row["sig_verified"] = has_signature
        add_prepared((row, identity))
    return prepared, rejections

