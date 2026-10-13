"""Synchronous and writer-thread Influx persistence adapters delegated from backend.main."""
from __future__ import annotations

from typing import Any

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def flush_influx(rows: list[dict[str, Any]]) -> None:
    main = _main()
    """Vuelca puntos a Influx y publica el estado para /health.

    Esta es la via SINCRONA que conserva el contrato de POST /ingest: la
    respuesta sigue diciendo si el lote se escribio. El camino MQTT no la usa;
    ese va al escritor asincrono.
    """
    main._influx_status, main._influx_message = main._write_to_influx(rows)


def _write_line_protocol(protocol: str) -> None:
    main = _main()
    """Escritura real desde el hilo dedicado (una llamada por lote armado)."""
    status, message = main._write_line_protocol_raw(protocol)
    main._influx_status, main._influx_message = status, message


def ingest_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    main = _main()
    """Contrato síncrono de POST /ingest: verifica, almacena y reporta Influx."""
    result = main.verify_and_store(rows)
    accepted = result.pop("accepted")
    if accepted:
        main.flush_influx(accepted)
        main.log.info("ingest influx=%s", main._influx_status)
    return {
        "ingested": result["ingested"],
        "latest_seq": result["latest_seq"],
        "store_rows": result["store_rows"],
        "influx": main._influx_status,
        "influx_message": main._influx_message,
        "rejected": result["rejected"],
        "rejected_reasons": result["rejected_reasons"],
    }
