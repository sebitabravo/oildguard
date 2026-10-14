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

import logging
import os
import time
from collections import Counter
from datetime import datetime as datetime, timezone as timezone
from typing import Any

from fastapi import FastAPI, Query
from fastapi import HTTPException as HTTPException
from fastapi.middleware.cors import CORSMiddleware

from shared.messages import message
from shared.signing import derive_device_key as derive_device_key, parse_device_keys, verify_row as verify_row

# Los modulos hermanos se importan UNO POR UNO con su propio try/except.
# En un solo try grande, que falte un simbolo en cualquiera de ellos cambia
# el modulo entero al modo plano y el error real desaparece bajo un
# "No module named 'X'" del modulo equivocado.
# Los dos layouts: paquete (pytest, uvicorn backend.main:app) y plano
# (Docker copia backend/ a /app y ejecuta main:app).
try:  # paquete
    from . import influx_writer as _influx_writer
    from . import aggregates as _aggregates
    from . import fleetagg as _fleetagg
    from . import ingest_mqtt as _ingest_mqtt
    from . import metrics as _metrics
    from . import outages as _outages
    from . import pipeline as _pipeline
    from . import store as _store
except ImportError:  # modulos sueltos
    import influx_writer as _influx_writer
    import aggregates as _aggregates
    import fleetagg as _fleetagg
    import ingest_mqtt as _ingest_mqtt
    import metrics as _metrics
    import outages as _outages
    import pipeline as _pipeline
    import store as _store

InfluxWriter = _influx_writer.InfluxWriter
bridge_state = _ingest_mqtt.bridge_state
bridge_timing_enabled = _ingest_mqtt.bridge_timing_enabled
DEFAULT_METRICS = _aggregates.DEFAULT_METRICS
QUANTILE_INTERPOLATION = _aggregates.QUANTILE_INTERPOLATION
aggregate_by_device = _aggregates.aggregate_by_device
aggregate_fleet = _aggregates.aggregate_fleet
build_frame = _aggregates.build_frame
parse_metrics = _aggregates.parse_metrics
CachedProbe = _metrics.CachedProbe
IngestMetrics = _metrics.IngestMetrics
TisoClock = _metrics.TisoClock
RateLimiter = _metrics.RateLimiter
IngestPipeline = _pipeline.IngestPipeline
DEFAULT_DEVICE = _store.DEFAULT_DEVICE
RETENTION_ROWS = _store.RETENTION_ROWS
StoreView = _store.StoreView
TelemetryStore = _store.TelemetryStore
as_float = _store.as_float
row_ts = _store.row_ts
outage_runs = _store.outage_runs

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("oilguard-backend")

# ---------------------------------------------------------------------------
# Config (all overridable from docker-compose.yml environment)
# ---------------------------------------------------------------------------

INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://localhost:8086")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "oilguard")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "oilguard")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "")
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "oilguard/signals")
# Influx se puede apagar para pruebas de carga: el almacén en memoria basta y
# las escrituras síncronas son el cuello de botella que hay que medir sin él.
_INFLUX_WRITE = os.getenv("OILGUARD_INFLUX_WRITE", "1") == "1"
INGEST_QUEUE_BATCHES = int(os.getenv("OILGUARD_INGEST_QUEUE", "1000"))
INGEST_FLUSH_ROWS = int(os.getenv("OILGUARD_INFLUX_FLUSH_ROWS", "5000"))
INGEST_FLUSH_SECONDS = float(os.getenv("OILGUARD_INFLUX_FLUSH_SECONDS", "1"))
INGEST_INFLUX_QUEUE_BATCHES = int(os.getenv("OILGUARD_INFLUX_QUEUE", "200"))
# Con el bucket lleno por las pruebas de carga, contar los puntos persistidos
# tardaba segundos. /health responde siempre en el plazo de espera; la sonda
# sigue en vuelo y rellena el cache cuando termina.
INFLUX_COUNT_TTL_S = float(os.getenv("OILGUARD_INFLUX_COUNT_TTL_S", "30"))
INFLUX_COUNT_PROBE_WAIT_S = float(os.getenv("OILGUARD_INFLUX_COUNT_PROBE_WAIT_S", "0.1"))
FLEET_TICK_SECONDS = float(os.getenv("OILGUARD_FLEET_TICK_SECONDS", "1"))
FLEET_WINDOW_MIN = 1
FLEET_WINDOW_MAX = 300
FLEET_DEFAULT_WINDOW = 10
_DEVICE_KEYS = parse_device_keys(os.getenv("OILGUARD_DEVICE_KEYS", ""))


try:
    from . import device_access as _device_access
except ImportError:
    import device_access as _device_access

parse_master_key = _device_access.parse_master_key


_DEVICE_MASTER_KEY = parse_master_key(os.getenv("OILGUARD_DEVICE_MASTER_KEY", ""))
# Cache de derivacion por maestra; cambiar de maestra crea otra entrada, asi
# que una llave de una instalacion jamas se sirve para otra.
_DEVICE_KEY_CACHE: dict[bytes, dict[str, bytes]] = {}
DEVICE_KEY_CACHE_LIMIT = 100_000
_REQUIRE_SIGNATURE = os.getenv("OILGUARD_REQUIRE_SIGNATURE", "1") == "1"

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
_DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:4174",
    "http://localhost:4321",
)
_CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("OILGUARD_CORS_ORIGINS", ",".join(_DEFAULT_CORS_ORIGINS)).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models (field names match SignalRow in frontend/src/sim/signals.ts 1:1)
# ---------------------------------------------------------------------------


try:
    from . import ingest_models as _ingest_models
except ImportError:
    import ingest_models as _ingest_models

SignalRow = _ingest_models.SignalRow


IngestBatch = _ingest_models.IngestBatch


# ---------------------------------------------------------------------------
# Per-device telemetry store (R2): thread-safe, primary read path,
# Influx fallback target
# ---------------------------------------------------------------------------


try:
    from . import seen_view as _seen_view
except ImportError:
    import seen_view as _seen_view

_SeenView = _seen_view._SeenView


_STORE = TelemetryStore(retention_rows=RETENTION_ROWS, default_device=DEFAULT_DEVICE)
_store_lock = _STORE.lock  # el lock histórico; ahora es el del almacén
_store_rows = StoreView(_STORE)  # lista global histórica, resuelta por dispositivo
_seen_signed_rows = _SeenView(_STORE)
_verified_total = 0
_rejected_total = 0
_rejected_reasons: Counter[str] = Counter()
_influx_status = "unknown (no ingest yet)"
_influx_message = message("influx_unknown_no_ingest")


device_key = _device_access.device_key


try:
    from . import store_access as _store_access
except ImportError:
    import store_access as _store_access

_now_iso = _store_access._now_iso


def _write_to_influx(rows: list[dict[str, Any]]) -> tuple[str, dict[str, Any]]:
    """Best-effort InfluxDB write. Returns legacy text and a message code.

    Never raises: every failure degrades to the memory store and is
    logged clearly so a missing/unreachable InfluxDB is visible, not silent.
    """
    if not _INFLUX_WRITE:
        # Comparte codigo con "cliente ausente": para el cliente el contrato
        # es identico (no se escribio nada, las filas quedan en memoria).
        msg = "disabled (OILGUARD_INFLUX_WRITE=0); rows kept in memory"
        log.info("InfluxDB %s", msg)
        return msg, message("influx_client_missing")
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


try:
    from . import influx_probe as _influx_probe
except ImportError:
    import influx_probe as _influx_probe

_count_influx_points = _influx_probe._count_influx_points


try:
    from . import verify_rows as _verify_rows
except ImportError:
    import verify_rows as _verify_rows

verify_rows = _verify_rows.verify_rows


# Agregados incrementales de flota (R2d). Se alimentan en verify_and_store, de
# modo que fleet_tick responde en O(dispositivos) y no relee las filas de la
# ventana ni monta un DataFrame por tick.
_FLEET_ROLLING = _fleetagg.RollingFleet(DEFAULT_METRICS)
_FLEET_METRICS = list(DEFAULT_METRICS)

# Rachas de corte seguidas en la ingesta (R2d), en vez de reescanear las filas
# retenidas de cada dispositivo en cada peticion a /fleet/outages.
_OUTAGES = _outages.OutageTracker()
# Los agregados incrementales se vacian con el almacen; si no, un clear()
# dejaba un tick respondiendo con datos de la sesion anterior.
_STORE.on_clear(_FLEET_ROLLING.reset)
_STORE.on_clear(_OUTAGES.reset)


def verify_and_store(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Núcleo de ingesta: verifica firmas y escribe en el almacén. Sin Influx.

    Lo comparten ``POST /ingest`` y el worker de la cola; el vaciado a Influx
    vive aparte para que la vía HTTP conserve su contrato síncrono mientras el
    camino MQTT agrupa puntos en lugar de pagar una escritura por lote.
    """
    global _verified_total, _rejected_total
    received_at = time.time()
    prepared, rejections = verify_rows(rows)

    with _store_lock:
        accepted, replays = _STORE.commit(prepared, rejections, arrival=received_at)
        rejected_reasons: Counter[str] = Counter(reason for _, reason in rejections)
        if replays:
            rejected_reasons["replay"] += replays
        total = _STORE.total_rows()
        _rejected_total += sum(rejected_reasons.values())
        _rejected_reasons.update(rejected_reasons)
        _verified_total += sum(1 for row in accepted if row.get("sig_verified"))
        # Un solo recorrido de las filas aceptadas alimenta los agregados
        # incrementales; el corte de ventana es por reloj de cada dispositivo.
        rolling = _FLEET_ROLLING
        outages_tracker = _OUTAGES
        for row in accepted:
            ts = row_ts(row)
            device = row.get("device_id")
            rolling.observe(
                device,
                ts,
                [as_float(row.get(name)) for name in _FLEET_METRICS],
            )
            outages_tracker.observe(
                device,
                int(row.get("seq", 0)),
                ts,
                row.get("t_iso"),
                as_float(row.get("link_down")),
            )

    rejected_count = sum(rejected_reasons.values())
    # El almacenamiento va primero y completo; Influx se encola despues y no
    # puede hacer fallar ni retrasar la ingesta.
    if accepted:
        _INFLUX_WRITER.submit(accepted)
    _INGEST_METRICS.record(accepted=len(accepted), rejected=rejected_count, now=received_at)
    # Una sola pasada: los generadores anidados y la llamada por fila costaban
    # mas que la propia medicion de latencia.
    epoch_of = _TISO.epoch
    latencies: list[float] = []
    add_latency = latencies.append
    for row in accepted:
        epoch = epoch_of(row.get("t_iso"))
        if epoch is not None:
            add_latency(received_at - epoch)
    _INGEST_METRICS.record_latencies(latencies, now=received_at)

    latest_seq = 0
    for row in accepted:
        seq = int(row.get("seq", 0))
        if seq > latest_seq:
            latest_seq = seq
    log.debug(
        "ingest accepted=%d rejected=%d reasons=%s latest_seq=%d store_rows=%d",
        len(accepted),
        rejected_count,
        dict(rejected_reasons),
        latest_seq,
        total,
    )
    return {
        "accepted": accepted,
        "ingested": len(accepted),
        "latest_seq": latest_seq,
        "store_rows": total,
        "rejected": sum(rejected_reasons.values()),
        "rejected_reasons": dict(rejected_reasons),
    }


def _write_line_protocol_raw(protocol: str) -> tuple[str, dict[str, Any]]:
    """Escribe un lote de line protocol. Nunca lanza; degrada a memoria."""
    if not _INFLUX_WRITE:
        msg = "disabled (OILGUARD_INFLUX_WRITE=0); rows kept in memory"
        log.info("InfluxDB %s", msg)
        return msg, message("influx_client_missing")
    try:
        from influxdb_client import InfluxDBClient  # type: ignore
        from influxdb_client.client.write_api import SYNCHRONOUS  # type: ignore
    except ImportError:
        msg = "disabled (influxdb-client not installed); rows kept in memory"
        log.warning("InfluxDB %s", msg)
        return msg, message("influx_client_missing")
    points = protocol.count("\n") + 1
    client = None
    try:
        client = InfluxDBClient(
            url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG, timeout=3000
        )
        write_api = client.write_api(write_options=SYNCHRONOUS)
        write_api.write(
            bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=protocol
        )
        return (
            f"written ({points} points -> {INFLUXDB_URL} bucket={INFLUXDB_BUCKET})",
            message("influx_written", points=points),
        )
    except Exception as exc:  # noqa: BLE001 - best-effort; las filas ya estan en memoria
        msg = f"fallback-memory (unreachable {INFLUXDB_URL}: {exc}); rows kept in memory"
        log.warning("InfluxDB write failed; %s", msg)
        return msg, message("influx_unreachable")
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:  # noqa: BLE001 - el cierre es complementario a la escritura
                log.debug("influx write client close failed")


try:
    from . import ingest_persistence as _ingest_persistence
except ImportError:
    import ingest_persistence as _ingest_persistence

flush_influx = _ingest_persistence.flush_influx


_write_line_protocol = _ingest_persistence._write_line_protocol


# El ingest solo encola; este hilo es el unico que habla con Influx desde la
# via MQTT. El CPU del worker estaba por debajo del 50 % esperando I/O.
_INFLUX_WRITER = InfluxWriter(
    write=_write_line_protocol,
    max_batches=INGEST_INFLUX_QUEUE_BATCHES,
    flush_rows=INGEST_FLUSH_ROWS,
    flush_seconds=INGEST_FLUSH_SECONDS,
    enabled=_INFLUX_WRITE,
)


ingest_rows = _ingest_persistence.ingest_rows


# La cola y el worker viven a nivel de modulo para que POST /ingest, el puente
# MQTT y las pruebas compartan exactamente el mismo camino de verificacion.
_PIPELINE = IngestPipeline(
    process=verify_and_store,
    flush=flush_influx,
    max_batches=INGEST_QUEUE_BATCHES,
    flush_rows=INGEST_FLUSH_ROWS,
    flush_seconds=INGEST_FLUSH_SECONDS,
    # Influx ya no pasa por el worker: lo lleva InfluxWriter en su propio hilo.
    influx_enabled=False,
)

_INGEST_METRICS = IngestMetrics(window_s=10.0)
_TISO = TisoClock()


_DEVICE_KEY_CACHE_SIZE = _device_access._DEVICE_KEY_CACHE_SIZE


_influx_probe_key = _influx_probe._influx_probe_key


# Contar millones de puntos persistidos tarda segundos y /health debe
# responder igual: la sonda corre en segundo plano con TTL y la ruta solo lee
# el cache, esperando como mucho INFLUX_COUNT_PROBE_WAIT_S.
_INFLUX_POINTS = CachedProbe(
    fetch=lambda: _count_influx_points(),
    key_fn=_influx_probe_key,
    ttl_s=INFLUX_COUNT_TTL_S,
    wait_s=INFLUX_COUNT_PROBE_WAIT_S,
)


try:
    from . import health_routes as _health_routes
except ImportError:
    import health_routes as _health_routes

queue_state = _health_routes.queue_state


influx_state = _health_routes.influx_state


select_device = _store_access.select_device


_sorted_device_rows = _store_access._sorted_device_rows


_latest_row = _store_access._latest_row


try:
    from . import query_helpers as _query_helpers
except ImportError:
    import query_helpers as _query_helpers

_load_t10_evaluator = _query_helpers._load_t10_evaluator


_analysis_status = _query_helpers._analysis_status


_samples_from_rows = _query_helpers._samples_from_rows


_downsample_evenly = _query_helpers._downsample_evenly


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


_unevaluated_reason = _query_helpers._unevaluated_reason


_compose_rul_suppression_note = _query_helpers._compose_rul_suppression_note


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


health = _health_routes.health
app.add_api_route("/health", health, methods=["GET"])


try:
    from . import ingest_route as _ingest_route
except ImportError:
    import ingest_route as _ingest_route

ingest = _ingest_route.ingest
app.add_api_route("/ingest", ingest, methods=["POST"])


try:
    from . import fleet_stream as _fleet_stream
except ImportError:
    import fleet_stream as _fleet_stream

fleet_tick = _fleet_stream.fleet_tick

TickCache = _fleet_stream.TickCache


_FLEET_TICK_CACHE = TickCache(FLEET_TICK_SECONDS)


cached_fleet_tick = _fleet_stream.cached_fleet_tick


_parse_tick_window = _fleet_stream._parse_tick_window


fleet_stream = _fleet_stream.fleet_stream
app.add_api_websocket_route("/ws/fleet", fleet_stream)


try:
    from . import fleet_routes as _fleet_routes
except ImportError:
    import fleet_routes as _fleet_routes

fleet_aggregates = _fleet_routes.fleet_aggregates
app.add_api_route("/fleet/aggregates", fleet_aggregates, methods=["GET"])


# El coste de la escalera es lineal en filas: ~18 ms cada 3600 filas por
# equipo. En una flota de 10 equipos con 3600 filas cada uno son 180 ms, cuatro
# veces el presupuesto de la ruta. El brief pide el nivel "si es barato, si no
# omitirlo con una razon documentada", asi que por defecto la escalera solo se
# evalua cuando el almacen cabe en este presupuesto de filas, y `?alert_level=on`
# la fuerza asumiendo el coste.
ALERT_LEVEL_ROW_BUDGET = int(os.getenv("OILGUARD_ALERT_LEVEL_ROW_BUDGET", "8000"))


alert_level_for = _fleet_routes.alert_level_for


_LADDER_ORDER = ("N1", "N2", "N3", "N4")


fleet_devices = _fleet_routes.fleet_devices
app.add_api_route("/fleet/devices", fleet_devices, methods=["GET"])


fleet_outages = _fleet_routes.fleet_outages
app.add_api_route("/fleet/outages", fleet_outages, methods=["GET"])


config_thresholds = _fleet_routes.config_thresholds
app.add_api_route("/config/thresholds", config_thresholds, methods=["GET"])


metrics_ingest = _health_routes.metrics_ingest
app.add_api_route("/metrics/ingest", metrics_ingest, methods=["GET"])


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


SERIES_SIGNALS = ("pressure_kpa", "temperature_c", "vib_rms_g")


_parse_series_signals = _query_helpers._parse_series_signals


level_series = _query_helpers.level_series
app.add_api_route("/level/series", level_series, methods=["GET"])


windows = _query_helpers.windows
app.add_api_route("/windows", windows, methods=["GET"])


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
            "confidence_band": r["confidence_band"],
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


try:
    from . import lifecycle as _lifecycle
except ImportError:
    import lifecycle as _lifecycle

_probe_influx = _lifecycle._probe_influx


enqueue_batch = _lifecycle.enqueue_batch


_start_mqtt_bridge = _lifecycle._start_mqtt_bridge


on_startup = _lifecycle.on_startup
app.on_event("startup")(on_startup)


on_shutdown = _lifecycle.on_shutdown
app.on_event("shutdown")(on_shutdown)
