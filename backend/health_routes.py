"""Health and ingest-status handlers delegated from backend.main."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def queue_state() -> dict[str, Any]:
    main = _main()
    """Estado de la cola que consumen /metrics/ingest y /health."""
    return {
        "depth": main._PIPELINE.depth(),
        "capacity": main._PIPELINE.capacity(),
        "dropped_batches": main._PIPELINE.dropped_batches(),
        "accepted_batches": main._PIPELINE.accepted_batches(),
        "failed_batches": main._PIPELINE.failed_batches(),
        "pending_influx_points": main._PIPELINE.pending_points(),
    }


def influx_state() -> dict[str, Any]:
    main = _main()
    """Estado de la persistencia: la del escritor dedicado mas la via sincrona."""
    return {
        "enabled": main._INFLUX_WRITE,
        "async": True,
        "flush_rows": main.INGEST_FLUSH_ROWS,
        "flush_seconds": main.INGEST_FLUSH_SECONDS,
        "status": main._influx_status,
        **main._INFLUX_WRITER.state(),
    }


def health() -> dict:
    main = _main()
    analysis = main._analysis_status()
    with main._store_lock:
        n = main._STORE.total_rows()
        device_count = len(main._STORE.devices())
        signing = {
            "enforced": main._REQUIRE_SIGNATURE,
            "devices": len(main._DEVICE_KEYS),
            "verified_total": main._verified_total,
            "rejected_total": main._rejected_total,
            "rejected_reasons": dict(main._rejected_reasons),
        }
    main._INFLUX_POINTS.refresh()
    influx_points, influx_points_reason, influx_points_at = main._INFLUX_POINTS.peek()
    return {
        "status": "ok" if analysis["available"] else "degraded",
        "service": "oilguard-backend",
        "stage": "S4-t8",
        "analysis": analysis,
        "store_rows": n,
        "devices": device_count,
        "retention_rows": main.RETENTION_ROWS,
        "influx_points": influx_points,
        "influx_points_as_of": (
            datetime.fromtimestamp(influx_points_at, timezone.utc).isoformat()
            if influx_points_at is not None
            else None
        ),
        "influx_points_reason": influx_points_reason,
        "influx_points_ttl_s": main.INFLUX_COUNT_TTL_S,
        "influx": main._influx_status,
        "influx_message": main._influx_message,
        "mqtt": {"host": main.MQTT_HOST, "port": main.MQTT_PORT, "topic": main.MQTT_TOPIC},
        "signing": signing,
        "device_keys": {
            "explicit": len(main._DEVICE_KEYS),
            "master_key_configured": bool(main._DEVICE_MASTER_KEY),
        },
        "ingest": main._INGEST_METRICS.compact(queue=main.queue_state()),
    }


def metrics_ingest() -> dict:
    main = _main()
    """Contadores de ingesta, contrapresion de la cola y latencia p50/p95/p99."""
    return {
        "status": "ok",
        "kind": "ingest-metrics",
        "as_of": main._now_iso(),
        "ingest": {
            **main._INGEST_METRICS.snapshot(queue=main.queue_state()),
            "influx": main.influx_state(),
            **(
                {"mqtt_bridge": main.bridge_state()}
                if main.bridge_timing_enabled()
                else {}
            ),
            "retention_rows": main.RETENTION_ROWS,
            "devices": len(main._STORE.devices()),
        },
    }
