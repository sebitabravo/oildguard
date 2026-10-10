"""OilGuard backend S4 slice (T8).

FastAPI ingestion + query API over the T6 signal contract
(``sim/SCHEMA.md``, mirrored in ``frontend/src/sim/signals.ts``).

Ingestion path: synthetic generator -> MQTT mock (topic
``oilguard/signals``) -> POST /ingest -> in-memory store + optional
InfluxDB. InfluxDB is best-effort: when the client is not installed or
the server is unreachable the rows stay in the memory store and the
fallback is logged clearly (never a silent drop).

Query path: GET /level (latest row + confidence stub), GET /windows
(rest windows grouped from in-memory ``recal_window`` flags; the full
rules detector lives in ``sim/detect.py``), GET /alerts (T10 N1–N4
ladder over the memory store) + GET /rul (T10 trend-extrapolated RUL,
lubrication-gated with an honest anomaly-only fallback).

OpenAPI docs are served at /docs and /openapi.json.
"""

from __future__ import annotations

import csv
import logging
import os
import threading
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from shared.messages import message
from shared.signing import derive_device_key, parse_device_keys, verify_row

try:  # paquete (pytest / uvicorn backend.main:app)
    from .store import DEFAULT_DEVICE, RETENTION_ROWS, StoreView, TelemetryStore
except ImportError:  # módulo suelto (Docker copia backend/ a /app)
    from store import DEFAULT_DEVICE, RETENTION_ROWS, StoreView, TelemetryStore  # type: ignore

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("oilguard-backend")

# ---------------------------------------------------------------------------
# Config (all overridable from docker-compose.yml environment)
# ---------------------------------------------------------------------------

INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://localhost:8086")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "oilguard")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "oilguard")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "oilguard-local-admin-token")
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "oilguard/signals")
_DEVICE_KEYS = parse_device_keys(os.getenv("OILGUARD_DEVICE_KEYS", ""))


def parse_master_key(spec: str) -> bytes | None:
    """Llave maestra en hex; None si no se configuro. Nunca incluye el valor en el error."""
    spec = spec.strip()
    if not spec:
        return None
    try:
        key = bytes.fromhex(spec)
    except ValueError:
        raise ValueError("OILGUARD_DEVICE_MASTER_KEY must be a hex string") from None
    if not key:
        raise ValueError("OILGUARD_DEVICE_MASTER_KEY must not be empty")
    return key


_DEVICE_MASTER_KEY = parse_master_key(os.getenv("OILGUARD_DEVICE_MASTER_KEY", ""))
_REQUIRE_SIGNATURE = os.getenv("OILGUARD_REQUIRE_SIGNATURE", "0") == "1"

CAPACITY_L = 95.0  # GDY106 nominal, SAE 85W-140 (physics anchor)

app = FastAPI(
    title="OilGuard Mining Sim API (S4/T8)",
    version="0.3.0",
    description=(
        "S4 ingestion + query slice. POST /ingest accepts T6 SignalRow "
        "batches; GET /level and GET /windows serve the memory store "
        "(InfluxDB when reachable). GET /alerts serves the T10 N1–N4 "
        "ladder and GET /rul the T10 trend-extrapolated RUL "
        "(synthetic-proxy until S7 bench proof; suppressed to "
        "anomaly-only when precision is insufficient)."
    ),
)

# Local-demo CORS so the Vite dashboard (T11) can call the API directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models (field names match SignalRow in frontend/src/sim/signals.ts 1:1)
# ---------------------------------------------------------------------------


class SignalRow(BaseModel):
    t_iso: str
    t_s: float
    seq: int = Field(ge=0)
    device_id: str
    fsm_state: Literal["LOAD", "HAUL", "DUMP", "WAIT"]
    moving: Literal[0, 1]
    recal_window: Literal[0, 1]
    engine_on: Literal[0, 1]
    slope_deg: float
    rotor_rpm: float
    wheel_rpm: float
    rotating_sensor_regime: Literal["static_pool", "slosh", "centrifugal_rimming"]
    submerged_fraction_per_revolution: float = Field(ge=0, le=1)
    pressure_kpa: float
    temperature_c: float
    vib_rms_g: float
    vib_kurtosis: float
    level_liters: float
    level_pct: float
    link_down: Literal[0, 1]
    label: Literal[
        "normal", "slow-leak", "abrupt-drop", "sensor-drift", "link-outage-buffered"
    ]
    sig_v: str | None = None
    sig: str | None = None


class IngestBatch(BaseModel):
    rows: list[SignalRow] = Field(min_length=1, max_length=5000)


# ---------------------------------------------------------------------------
# Per-device telemetry store (R2): thread-safe, primary read path,
# Influx fallback target
# ---------------------------------------------------------------------------


class _SeenView:
    """``.clear()`` sobre los sets antireplay de todos los dispositivos."""

    __slots__ = ("_store",)

    def __init__(self, store: TelemetryStore) -> None:
        self._store = store

    def clear(self) -> None:
        self._store.clear_seen()

    def __len__(self) -> int:
        return self._store.tracked_identities()


_STORE = TelemetryStore(retention_rows=RETENTION_ROWS, default_device=DEFAULT_DEVICE)
_store_lock = _STORE.lock  # el lock histórico; ahora es el del almacén
_store_rows = StoreView(_STORE)  # lista global histórica, resuelta por dispositivo
_seen_signed_rows = _SeenView(_STORE)
_verified_total = 0
_rejected_total = 0
_rejected_reasons: Counter[str] = Counter()
_influx_status = "unknown (no ingest yet)"
_influx_message = message("influx_unknown_no_ingest")


def device_key(device_id: str) -> bytes | None:
    """Llave de un dispositivo: la explicita si existe, si no la derivada de la maestra.

    Listar una llave por equipo no escala a miles de dispositivos, asi que
    ``OILGUARD_DEVICE_MASTER_KEY`` permite derivarlas. La entrada explicita
    siempre gana: sirve para puentear un equipo durante una rotacion.
    """
    key = _DEVICE_KEYS.get(device_id)
    if key is not None:
        return key
    if _DEVICE_MASTER_KEY and device_id:
        return derive_device_key(_DEVICE_MASTER_KEY, device_id)
    return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_to_influx(rows: list[dict[str, Any]]) -> tuple[str, dict[str, Any]]:
    """Best-effort InfluxDB write. Returns legacy text and a message code.

    Never raises: every failure degrades to the memory store and is
    logged clearly so a missing/unreachable InfluxDB is visible, not silent.
    """
    try:
        from influxdb_client import InfluxDBClient, Point  # type: ignore
        from influxdb_client.client.write_api import SYNCHRONOUS  # type: ignore
    except ImportError:
        msg = "disabled (influxdb-client not installed); rows kept in memory"
        log.warning("InfluxDB %s", msg)
        return msg, message("influx_client_missing")
    try:
        client = InfluxDBClient(
            url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG, timeout=3000
        )
        write_api = client.write_api(write_options=SYNCHRONOUS)
        points = []
        for r in rows:
            points.append(
                Point("oilguard_signals")
                .tag("device_id", str(r.get("device_id", "unknown")))
                .tag("fsm_state", str(r.get("fsm_state", "?")))
                .tag("label", str(r.get("label", "?")))
                .tag("sig_verified", str(bool(r.get("sig_verified", False))).lower())
                .field("pressure_kpa", float(r.get("pressure_kpa", 0.0)))
                .field("temperature_c", float(r.get("temperature_c", 0.0)))
                .field("vib_rms_g", float(r.get("vib_rms_g", 0.0)))
                .field("vib_kurtosis", float(r.get("vib_kurtosis", 0.0)))
                .field("level_liters", float(r.get("level_liters", 0.0)))
                .field("seq", int(r.get("seq", 0)))
                .time(r.get("t_iso"))
            )
        write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=points)
        client.close()
        return (
            f"written ({len(points)} points -> {INFLUXDB_URL} bucket={INFLUXDB_BUCKET})",
            message("influx_written", points=len(points)),
        )
    except Exception as exc:  # noqa: BLE001 - best-effort boundary, must not fail ingest
        msg = f"fallback-memory (unreachable {INFLUXDB_URL}: {exc}); rows kept in memory"
        log.warning("InfluxDB write failed; %s", msg)
        return msg, message("influx_unreachable")


def _count_influx_points() -> int | None:
    if not INFLUXDB_URL or not INFLUXDB_ORG or not INFLUXDB_BUCKET or not INFLUXDB_TOKEN:
        return None

    client = None
    try:
        from influxdb_client import InfluxDBClient  # type: ignore

        client = InfluxDBClient(
            url=INFLUXDB_URL,
            token=INFLUXDB_TOKEN,
            org=INFLUXDB_ORG,
            timeout=1200,
        )
        query = (
            f'from(bucket: "{INFLUXDB_BUCKET}") '
            '|> range(start: 0) '
            '|> filter(fn: (r) => r._measurement == "oilguard_signals" '
            'and r._field == "seq") '
            "|> count()"
        )
        tables = client.query_api().query(query, org=INFLUXDB_ORG)
        return sum(
            int(record.get_value())
            for table in tables
            for record in table.records
        )
    except Exception as exc:  # noqa: BLE001 - la salud debe seguir disponible si Influx no responde
        log.debug("InfluxDB persisted point count unavailable: %s", exc)
        return None
    finally:
        if client is not None:
            try:
                client.close()
            except Exception as exc:  # noqa: BLE001 - el cierre es complementario a la consulta
                log.debug("InfluxDB count client close failed: %s", exc)


def verify_rows(
    rows: list[dict[str, Any]],
) -> tuple[list[tuple[dict[str, Any], tuple | None]], list[tuple[str, str]]]:
    """Verifica firmas FUERA del lock y devuelve filas preparadas + rechazos.

    El HMAC es la parte cara del ingest y no toca estado compartido, así que
    hacerlo fuera del lock reduce la sección crítica a la inserción en el
    deque: sin eso, miles de dispositivos serializan el HMAC de todos en un
    solo mutex y la latencia crece con el tamaño del lote, no con el del store.
    """
    prepared: list[tuple[dict[str, Any], tuple | None]] = []
    rejections: list[tuple[str, str]] = []
    for original in rows:
        row = dict(original)
        device_id = str(row.get("device_id", "") or "")
        has_signature = row.get("sig") is not None or row.get("sig_v") is not None
        reason: str | None = None
        identity: tuple | None = None
        if has_signature:
            key = device_key(device_id)
            if key is None:
                reason = "unknown_device"
            else:
                try:
                    valid = verify_row(row, key)
                except (KeyError, TypeError, ValueError, OverflowError):
                    valid = False
                if not valid:
                    reason = "bad_signature"
                else:
                    identity = (device_id, int(row["seq"]), str(row["t_iso"]))
        elif _REQUIRE_SIGNATURE:
            reason = "unsigned"
        if reason is not None:
            rejections.append((device_id, reason))
            continue
        row["sig_verified"] = has_signature
        prepared.append((row, identity))
    return prepared, rejections


def ingest_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Core ingestion used by POST /ingest and the MQTT bridge thread."""
    global _influx_status, _influx_message, _verified_total, _rejected_total
    prepared, rejections = verify_rows(rows)

    with _store_lock:
        accepted, replays = _STORE.commit(prepared, rejections)
        rejected_reasons: Counter[str] = Counter(reason for _, reason in rejections)
        if replays:
            rejected_reasons["replay"] += replays
        total = _STORE.total_rows()
        _rejected_total += sum(rejected_reasons.values())
        _rejected_reasons.update(rejected_reasons)
        _verified_total += sum(1 for row in accepted if row.get("sig_verified"))

    if accepted:
        influx, influx_message = _write_to_influx(accepted)
    else:
        influx, influx_message = _influx_status, _influx_message
    _influx_status = influx
    _influx_message = influx_message
    latest_seq = max((int(r.get("seq", 0)) for r in accepted), default=0)
    log.info(
        "ingest accepted=%d rejected=%d reasons=%s latest_seq=%d store_rows=%d influx=%s",
        len(accepted),
        sum(rejected_reasons.values()),
        dict(rejected_reasons),
        latest_seq,
        total,
        influx,
    )
    return {
        "ingested": len(accepted),
        "latest_seq": latest_seq,
        "store_rows": total,
        "influx": influx,
        "influx_message": influx_message,
        "rejected": sum(rejected_reasons.values()),
        "rejected_reasons": dict(rejected_reasons),
    }


def select_device(device_id: str | None) -> str | None:
    """Device explícito; si no, ``OILGUARD_DEFAULT_DEVICE`` si existe, si no el más reciente.

    Un ``device_id`` explícito siempre gana aunque no tenga filas: así una
    consulta sobre un equipo callado devuelve su vacío honesto en vez del
    dato de otro equipo.
    """
    if device_id:
        return device_id
    return _STORE.default_device_id()


def _sorted_device_rows(device_id: str | None) -> list[dict[str, Any]]:
    if not device_id:
        return []
    with _store_lock:
        return sorted(_STORE.rows(device_id), key=lambda r: int(r.get("seq", 0)))


def _latest_row(device_id: str | None = None) -> dict[str, Any] | None:
    with _store_lock:
        return _STORE.latest(select_device(device_id))


def _load_t10_evaluator() -> tuple[Any | None, str | None]:
    try:
        from ai.ladder import evaluate as evaluate_ladder  # type: ignore
    except Exception as exc:  # noqa: BLE001 - health informa si falta el analizador
        return None, str(exc)
    return evaluate_ladder, None


def _analysis_status() -> dict[str, Any]:
    evaluator, reason = _load_t10_evaluator()
    return {"available": evaluator is not None, "reason": reason}


def _samples_from_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Prepara muestras con la misma marca de reposo usada por el análisis T10."""
    samples = []
    for row in rows:
        sample = dict(row)
        try:
            sample["rest"] = int(float(row.get("recal_window", 0))) == 1
        except (ValueError, TypeError):
            sample["rest"] = False
        samples.append(sample)
    return samples


def _downsample_evenly(points: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    if len(points) <= limit:
        return points
    if limit == 1:
        return [points[-1]]
    last_index = len(points) - 1
    return [points[(index * last_index) // (limit - 1)] for index in range(limit)]


def _t10_bundle(
    device_id: str | None = None,
) -> tuple[dict[str, Any] | None, str, dict[str, Any], bool, bool]:
    """Evaluate the T10 ladder/RUL over the in-memory store.

    Returns (bundle, fallback_note, available, evaluated). Empty stores
    remain healthy but unevaluated; a missing evaluator is unavailable.
    Rest grouping reuses the same ``recal_window`` runs as GET /windows
    (the full T7 rules detector is ``sim/detect.py``).
    """
    evaluator, import_reason = _load_t10_evaluator()
    if evaluator is None:
        return None, (
            f"T10 analyzer unavailable ({import_reason}); rows remain stored, "
            "but alerts and RUL were not evaluated. Rebuild the backend image "
            "with its runtime packages included."
        ), message("alerts_analyzer_unavailable_fallback"), False, False

    rows = _sorted_device_rows(select_device(device_id))
    if not rows:
        return None, (
            "no rows ingested yet; POST SignalRow batches to /ingest, "
            "then GET /alerts walks the N1–N4 ladder."
        ), message("alerts_no_rows_fallback"), True, False
    samples = _samples_from_rows(rows)
    try:
        bundle = evaluator(samples)
    except Exception as exc:  # noqa: BLE001 - scoring must never 500 queries
        log.warning("T10 evaluation failed: %s", exc)
        return None, (
            f"T10 evaluation failed ({exc}); surface anomaly-only "
            f"(ai/flags.jsonl path) instead."
        ), message("alerts_evaluation_failed_fallback"), False, False
    fallback = (
        "memory-store grouping by recal_window flags (full T7 detector: "
        "sim/detect.py); rest-gated synthetic-proxy model, UNPROVEN until "
        "S7 bench (see docs/t10-rul-ladder.md)."
    )
    rul_reason = str(bundle.get("rul", {}).get("reason", ""))
    if rul_reason.startswith("insufficient rest samples"):
        return bundle, fallback, message("alerts_memory_fallback"), True, False
    return bundle, fallback, message("alerts_memory_fallback"), True, True


def _unevaluated_reason(
    bundle: dict[str, Any] | None,
    analysis_available: bool,
    evaluated: bool,
) -> str | None:
    if evaluated:
        return None
    if not analysis_available:
        return "analysis_unavailable"
    if bundle is None:
        return "no_rows"
    if str(bundle.get("rul", {}).get("reason", "")).startswith(
        "insufficient rest samples"
    ):
        return "insufficient_rest_samples"
    return "analysis_unavailable"


def _compose_rul_suppression_note(reason: str) -> str:
    detail = reason.strip()
    marker = "anomaly-only"
    if detail.lower().endswith(marker):
        detail = detail[: -len(marker)].rstrip(" ;,")
    if detail:
        return f"RUL unavailable: {detail}; anomaly-only alerts remain available."
    return "RUL unavailable; anomaly-only alerts remain available."


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict:
    analysis = _analysis_status()
    with _store_lock:
        n = _STORE.total_rows()
        device_count = len(_STORE.devices())
        signing = {
            "enforced": _REQUIRE_SIGNATURE,
            "devices": len(_DEVICE_KEYS),
            "verified_total": _verified_total,
            "rejected_total": _rejected_total,
            "rejected_reasons": dict(_rejected_reasons),
        }
    influx_points = _count_influx_points()
    return {
        "status": "ok" if analysis["available"] else "degraded",
        "service": "oilguard-backend",
        "stage": "S4-t8",
        "analysis": analysis,
        "store_rows": n,
        "devices": device_count,
        "retention_rows": RETENTION_ROWS,
        "influx_points": influx_points,
        "influx": _influx_status,
        "influx_message": _influx_message,
        "mqtt": {"host": MQTT_HOST, "port": MQTT_PORT, "topic": MQTT_TOPIC},
        "signing": signing,
        "device_keys": {
            "explicit": len(_DEVICE_KEYS),
            "master_key_configured": bool(_DEVICE_MASTER_KEY),
        },
    }


@app.post("/ingest")
def ingest(batch: IngestBatch) -> dict:
    """Accept one SignalRow batch (10 Hz rows from sim/generate.py).

    Breaking change vs the S0 stub (single ``IngestPayload`` object):
    old 4-field payloads now return 422 — see backend/API.md migration note.
    """
    rows = [r.model_dump() for r in batch.rows]
    result = ingest_rows(rows)
    if result["ingested"] == 0 and result["rejected"] and _REQUIRE_SIGNATURE:
        return JSONResponse(
            status_code=401,
            content={"status": "error", "kind": "ingest-ack", **result},
        )
    return {
        "status": "ok",
        "kind": "ingest-ack",
        "as_of": _now_iso(),
        **result,
    }


@app.get("/level")
def level(device_id: str | None = Query(default=None)) -> dict:
    """Latest fused-level reading. Confidence is a stub until S5 (T10)."""
    device = select_device(device_id)
    latest = _latest_row(device)
    if latest is None:
        data: dict[str, Any] = {
            "level_liters": CAPACITY_L,
            "level_pct": 100.0,
            "capacity_liters": CAPACITY_L,
            "confidence": 0.0,
            "unit": "L",
            "device_id": device,
            "source": "default (no rows ingested yet)",
            "source_message": message("source_no_rows"),
            "reference": "GDY106 nominal 95 L SAE 85W-140",
            "note": "POST SignalRow batches to /ingest; confidence lands in S5 (T10).",
            "note_message": message("level_no_rows_note"),
        }
    else:
        data = {
            "level_liters": latest.get("level_liters"),
            "level_pct": latest.get("level_pct"),
            "capacity_liters": CAPACITY_L,
            "confidence": 0.0,
            "unit": "L",
            "t_iso": latest.get("t_iso"),
            "seq": latest.get("seq"),
            "device_id": latest.get("device_id"),
            "pressure_kpa": latest.get("pressure_kpa"),
            "temperature_c": latest.get("temperature_c"),
            "source": "memory store (InfluxDB when reachable)",
            "source_message": message("source_memory_store"),
            "reference": "GDY106 nominal 95 L SAE 85W-140",
            "note": "Level echoes ingested ground truth; fused estimate + confidence land in S5 (T10).",
            "note_message": message("level_memory_store_note"),
        }
    return {
        "status": "ok",
        "kind": "oil-level",
        "as_of": _now_iso(),
        "device_id": device,
        "data": data,
    }


@app.get("/level/series")
def level_series(
    limit: int = Query(default=300, ge=1, le=2000),
    device_id: str | None = Query(default=None),
) -> dict:
    """Sirve la serie fusionada y limitada de nivel del almacenamiento de sesión."""
    rows = _sorted_device_rows(select_device(device_id))
    if not rows:
        return {
            "status": "ok",
            "kind": "oil-level-series",
            "as_of": _now_iso(),
            "count": 0,
            "reason": "no_rows",
            "series": [],
        }

    from ai import level as level_estimator

    estimate = level_estimator.estimate(_samples_from_rows(rows))
    sigma_l = estimate.get("sigma_liters")
    series = []
    for row, point in zip(rows, estimate["estimates"]):
        series.append({
            "t_s": point["t_s"],
            "level_l": point["level_liters"],
            "sigma_l": sigma_l,
            "moving": int(float(row.get("moving", 0))),
            "recal_window": int(float(row.get("recal_window", 0))),
        })
    series = _downsample_evenly(series, limit)
    return {
        "status": "ok",
        "kind": "oil-level-series",
        "as_of": _now_iso(),
        "count": len(series),
        "reason": None if estimate["estimates"] else "insufficient_rest_samples",
        "series": series,
    }


@app.get("/windows")
def windows(limit: int = 50, device_id: str | None = Query(default=None)) -> dict:
    """Rest windows grouped from in-memory ``recal_window`` flags.

    Consecutive rows with recal_window == 1 form one window (zone by
    majority vote, audit only). The full stillness-rules detector is
    ``sim/detect.py`` — see docs/t7-windows.md.
    """
    rows = _sorted_device_rows(select_device(device_id))
    out: list[dict[str, Any]] = []
    cur: list[dict[str, Any]] = []

    def flush(group: list[dict[str, Any]]) -> None:
        zone = Counter(g.get("fsm_state", "?") for g in group).most_common(1)[0][0]
        out.append(
            {
                "window_id": len(out),
                "state": "rest",
                "start_t_s": group[0].get("t_s"),
                "end_t_s": group[-1].get("t_s"),
                "start_iso": group[0].get("t_iso"),
                "end_iso": group[-1].get("t_iso"),
                "duration_s": round(
                    float(group[-1].get("t_s", 0.0)) - float(group[0].get("t_s", 0.0)), 1
                ),
                "zone": zone,
                "reason": "recal_window==1 grouping (in-memory; full T7 detector: sim/detect.py)",
            }
        )

    for r in rows:
        if int(r.get("recal_window", 0)) == 1:
            cur.append(r)
        elif cur:
            flush(cur)
            cur = []
    if cur:
        flush(cur)
    return {
        "status": "ok",
        "kind": "rest-windows",
        "as_of": _now_iso(),
        "count": len(out),
        "windows": out[: max(0, limit)],
        "note": "Grouped from ingested recal_window flags. No rows yet? Run sim/run_t7.py for the full detector.",
    }


@app.get("/alerts")
def alerts(device_id: str | None = Query(default=None)) -> dict:
    bundle, fallback, fallback_message, analysis_available, evaluated = _t10_bundle(device_id)
    reason = _unevaluated_reason(bundle, analysis_available, evaluated)
    if bundle is None:
        data: dict[str, Any] = {
            "alerts": [],
            "escalation": [],
            "ladder": ["N1", "N2", "N3", "N4"],
            "model": "synthetic-proxy",
            "note": "No T10 evaluation available for the current store.",
            "note_message": message("alerts_no_evaluation_note"),
            "fallback": fallback,
            "fallback_message": fallback_message,
        }
    else:
        data = {
            "alerts": bundle["alerts"],
            "escalation": bundle["escalation"],
            "ladder": bundle["ladder"],
            "level": bundle["level"],
            "rul_status": bundle["rul"].get("status"),
            "model": bundle["model"],
            "note": bundle["note"],
            "note_message": bundle["note_message"],
            "fallback": fallback,
            "fallback_message": fallback_message,
        }
    response = {
        "status": "ok" if analysis_available else "unavailable",
        "kind": "alerts",
        "as_of": _now_iso(),
        "evaluated": evaluated,
        "data": data,
    }
    if reason is not None:
        response["reason"] = reason
    return response


@app.get("/rul")
def rul(device_id: str | None = Query(default=None)) -> dict:
    bundle, fallback, fallback_message, analysis_available, evaluated = _t10_bundle(device_id)
    response_reason = _unevaluated_reason(bundle, analysis_available, evaluated)
    if not analysis_available:
        reason = fallback
        data = {
            "hours": None,
            "haul_cycles": None,
            "shifts": None,
            "confidence": 0.0,
            "status": "unavailable",
            "anomaly_only": True,
            "model": "synthetic-proxy",
            "note": f"RUL unavailable: {reason}",
            "reason_message": message("rul_analyzer_unavailable_reason"),
            "note_message": message("rul_analyzer_unavailable_note"),
            "fallback": fallback,
            "fallback_message": fallback_message,
        }
    elif bundle is None:
        reason = fallback
        data = {
            "hours": None,
            "haul_cycles": None,
            "shifts": None,
            "confidence": 0.0,
            "status": "suppressed",
            "anomaly_only": True,
            "model": "synthetic-proxy",
            "note": f"RUL unavailable: {reason} Surface anomaly-only alerts instead.",
            "reason": "no rows ingested yet",
            "reason_message": message("rul_no_rows_reason"),
            "note_message": message("rul_no_rows_note"),
            "fallback": fallback,
            "fallback_message": fallback_message,
        }
    elif bundle["rul"].get("status") != "ok":
        r = bundle["rul"]
        reason = r.get("reason", "")
        data = {
            "hours": None,
            "haul_cycles": None,
            "shifts": None,
            "confidence": 0.0,
            "status": "suppressed",
            "anomaly_only": True,
            "model": "synthetic-proxy",
            "note": _compose_rul_suppression_note(reason),
            "reason": reason,
            "reason_message": r["reason_message"],
            "note_message": message("rul_suppressed_summary"),
            "fallback": fallback,
            "fallback_message": fallback_message,
        }
    else:
        r = bundle["rul"]
        data = {
            "hours": r["hours"],
            "hours_to_warning": r["hours_to_warning"],
            "hours_to_critical": r["hours_to_critical"],
            "haul_cycles": r["haul_cycles"],
            "shifts": r["shifts"],
            "confidence": r["confidence"],
            "status": "ok",
            "anomaly_only": False,
            "slope_L_per_h": r["slope_L_per_h"],
            "r2": r["r2"],
            "current_level_L": r["current_level_L"],
            "model": r["model"],
            "reason": r["reason"],
            "reason_message": r["reason_message"],
            "note": r["note"],
            "note_message": r["note_message"],
            "fallback": fallback,
            "fallback_message": fallback_message,
        }
    response = {
        "status": "ok" if analysis_available else "unavailable",
        "kind": "rul",
        "as_of": _now_iso(),
        "evaluated": evaluated,
        "data": data,
    }
    if response_reason is not None:
        response["reason"] = response_reason
    return response


# ---------------------------------------------------------------------------
# Startup: InfluxDB probe + best-effort MQTT bridge thread
# ---------------------------------------------------------------------------


def _probe_influx() -> None:
    try:
        import urllib.request

        req = urllib.request.Request(f"{INFLUXDB_URL}/health", method="GET")
        with urllib.request.urlopen(req, timeout=2) as resp:  # noqa: S310 - local health probe
            log.info("InfluxDB probe %s -> %s", INFLUXDB_URL, resp.status)
    except Exception as exc:  # noqa: BLE001 - probe must never block startup
        log.warning(
            "InfluxDB probe failed (%s=%s); ingest falls back to memory store",
            INFLUXDB_URL,
            exc,
        )


def _start_mqtt_bridge() -> None:
    """Launch the MQTT -> ingest bridge in a daemon thread (best-effort).

    If the broker or paho-mqtt is unavailable the thread logs and exits;
    the HTTP POST /ingest path always works regardless.
    """
    try:
        from .ingest_mqtt import run_forever  # type: ignore
    except ImportError:
        try:
            from ingest_mqtt import run_forever  # type: ignore
        except ImportError as exc:
            log.warning("MQTT bridge disabled (no ingest_mqtt module: %s)", exc)
            return

    def _loop() -> None:
        try:
            run_forever(forward_fn=lambda rows: ingest_rows(rows))
        except Exception as exc:  # noqa: BLE001 - background thread boundary
            log.warning(
                "MQTT bridge stopped (broker %s:%s topic %s: %s); "
                "POST /ingest remains available",
                MQTT_HOST,
                MQTT_PORT,
                MQTT_TOPIC,
                exc,
            )

    t = threading.Thread(target=_loop, name="mqtt-bridge", daemon=True)
    t.start()
    log.info("MQTT bridge thread started (broker %s:%s topic %s)", MQTT_HOST, MQTT_PORT, MQTT_TOPIC)


@app.on_event("startup")
def on_startup() -> None:
    _probe_influx()
    _start_mqtt_bridge()


def load_rows_from_csv(path: str, limit: int = 0) -> list[dict[str, Any]]:
    """Helper for local demos: read T6 CSV rows (used by docs/smoke only)."""
    out: list[dict[str, Any]] = []
    int_fields = {"seq", "moving", "recal_window", "engine_on", "link_down"}
    float_fields = {
        "t_s",
        "slope_deg",
        "rotor_rpm",
        "wheel_rpm",
        "pressure_kpa",
        "temperature_c",
        "vib_rms_g",
        "vib_kurtosis",
        "level_liters",
        "level_pct",
    }
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            parsed: dict[str, Any] = dict(row)
            for k in int_fields:
                parsed[k] = int(float(parsed[k]))
            for k in float_fields:
                parsed[k] = float(parsed[k])
            out.append(parsed)
            if limit and len(out) >= limit:
                break
    return out
