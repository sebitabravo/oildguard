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

import asyncio
import csv
import json
import logging
import os
import sys
import threading
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from shared.messages import message
from shared.signing import derive_device_key, parse_device_keys, verify_row

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
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "oilguard-local-admin-token")
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
# Cache de derivacion por maestra; cambiar de maestra crea otra entrada, asi
# que una llave de una instalacion jamas se sirve para otra.
_DEVICE_KEY_CACHE: dict[bytes, dict[str, bytes]] = {}
DEVICE_KEY_CACHE_LIMIT = 100_000
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

    La derivacion se cachea por maestra: el perfil la mostraba como 1.2 s de
    13 s en el camino firmado, porque se rederivaba la misma llave en cada una
    de las diez filas de un lote.
    """
    explicit = _DEVICE_KEYS.get(device_id)
    if explicit is not None:
        return explicit
    master = _DEVICE_MASTER_KEY
    if not master or not device_id:
        return None
    cache = _DEVICE_KEY_CACHE.get(master)
    if cache is None:
        cache = {}
        _DEVICE_KEY_CACHE[master] = cache
    key = cache.get(device_id)
    if key is None:
        key = derive_device_key(master, device_id)
        # Un device_id sin firmar podria inflar el cache sin limite.
        if len(cache) >= DEVICE_KEY_CACHE_LIMIT:
            cache.clear()
        cache[device_id] = key
    return key


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    # Locales del bucle: buscar un global por fila son millones de accesos al
    # diccionario de modulos en el camino mas caliente.
    require_signature = _REQUIRE_SIGNATURE
    add_prepared = prepared.append
    add_rejection = rejections.append
    lookup_key = device_key
    for original in rows:
        row = dict(original)
        device_id = row.get("device_id")
        if type(device_id) is not str:  # noqa: E721 - atajo deliberado
            device_id = str(device_id or "")
        has_signature = row.get("sig") is not None or row.get("sig_v") is not None
        reason: str | None = None
        identity: tuple | None = None
        if has_signature:
            key = lookup_key(device_id)
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
        elif require_signature:
            reason = "unsigned"
        if reason is not None:
            add_rejection((device_id, reason))
            continue
        row["sig_verified"] = has_signature
        add_prepared((row, identity))
    return prepared, rejections


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
        ts_of = _TISO.epoch
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


def flush_influx(rows: list[dict[str, Any]]) -> None:
    """Vuelca puntos a Influx y publica el estado para /health.

    Esta es la via SINCRONA que conserva el contrato de POST /ingest: la
    respuesta sigue diciendo si el lote se escribio. El camino MQTT no la usa;
    ese va al escritor asincrono.
    """
    global _influx_status, _influx_message
    _influx_status, _influx_message = _write_to_influx(rows)


def _write_line_protocol(protocol: str) -> None:
    """Escritura real desde el hilo dedicado (una llamada por lote armado)."""
    global _influx_status, _influx_message
    status, message = _write_line_protocol_raw(protocol)
    _influx_status, _influx_message = status, message


# El ingest solo encola; este hilo es el unico que habla con Influx desde la
# via MQTT. El CPU del worker estaba por debajo del 50 % esperando I/O.
_INFLUX_WRITER = InfluxWriter(
    write=_write_line_protocol,
    max_batches=INGEST_INFLUX_QUEUE_BATCHES,
    flush_rows=INGEST_FLUSH_ROWS,
    flush_seconds=INGEST_FLUSH_SECONDS,
    enabled=_INFLUX_WRITE,
)


def ingest_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Contrato síncrono de POST /ingest: verifica, almacena y reporta Influx."""
    result = verify_and_store(rows)
    accepted = result.pop("accepted")
    if accepted:
        flush_influx(accepted)
        log.info("ingest influx=%s", _influx_status)
    return {
        "ingested": result["ingested"],
        "latest_seq": result["latest_seq"],
        "store_rows": result["store_rows"],
        "influx": _influx_status,
        "influx_message": _influx_message,
        "rejected": result["rejected"],
        "rejected_reasons": result["rejected_reasons"],
    }


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


def _DEVICE_KEY_CACHE_SIZE() -> int:
    return sum(len(cache) for cache in _DEVICE_KEY_CACHE.values())


def _influx_probe_key() -> tuple:
    """Identidad de la instalacion que produce el conteo cacheado.

    Si cambian las credenciales, el cliente instalado o la propia funcion que
    cuenta, el numero cacheado pertenece a otra instalacion: servirlo seria
    mentir sobre la persistencia.
    """
    return (
        INFLUXDB_URL,
        INFLUXDB_ORG,
        INFLUXDB_BUCKET,
        INFLUXDB_TOKEN,
        sys.modules.get("influxdb_client"),
        _count_influx_points,
    )


# Contar millones de puntos persistidos tarda segundos y /health debe
# responder igual: la sonda corre en segundo plano con TTL y la ruta solo lee
# el cache, esperando como mucho INFLUX_COUNT_PROBE_WAIT_S.
_INFLUX_POINTS = CachedProbe(
    fetch=lambda: _count_influx_points(),
    key_fn=_influx_probe_key,
    ttl_s=INFLUX_COUNT_TTL_S,
    wait_s=INFLUX_COUNT_PROBE_WAIT_S,
)


def queue_state() -> dict[str, Any]:
    """Estado de la cola que consumen /metrics/ingest y /health."""
    return {
        "depth": _PIPELINE.depth(),
        "capacity": _PIPELINE.capacity(),
        "dropped_batches": _PIPELINE.dropped_batches(),
        "accepted_batches": _PIPELINE.accepted_batches(),
        "failed_batches": _PIPELINE.failed_batches(),
        "pending_influx_points": _PIPELINE.pending_points(),
    }


def influx_state() -> dict[str, Any]:
    """Estado de la persistencia: la del escritor dedicado mas la via sincrona."""
    return {
        "enabled": _INFLUX_WRITE,
        "async": True,
        "flush_rows": INGEST_FLUSH_ROWS,
        "flush_seconds": INGEST_FLUSH_SECONDS,
        "status": _influx_status,
        **_INFLUX_WRITER.state(),
    }


def _parse_t_iso(value: Any) -> float | None:
    """Epoch de ``t_iso``; None si no es ISO-8601 parseable.

    Delega en ``_TISO`` para no repetir el parseo cuando el lote entero
    comparte marca de tiempo, que es lo que hace el simulador en tiempo real.
    """
    return _TISO.epoch(value)


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
    _INFLUX_POINTS.refresh()
    influx_points, influx_points_reason, influx_points_at = _INFLUX_POINTS.peek()
    return {
        "status": "ok" if analysis["available"] else "degraded",
        "service": "oilguard-backend",
        "stage": "S4-t8",
        "analysis": analysis,
        "store_rows": n,
        "devices": device_count,
        "retention_rows": RETENTION_ROWS,
        "influx_points": influx_points,
        "influx_points_as_of": (
            datetime.fromtimestamp(influx_points_at, timezone.utc).isoformat()
            if influx_points_at is not None
            else None
        ),
        "influx_points_reason": influx_points_reason,
        "influx_points_ttl_s": INFLUX_COUNT_TTL_S,
        "influx": _influx_status,
        "influx_message": _influx_message,
        "mqtt": {"host": MQTT_HOST, "port": MQTT_PORT, "topic": MQTT_TOPIC},
        "signing": signing,
        "device_keys": {
            "explicit": len(_DEVICE_KEYS),
            "master_key_configured": bool(_DEVICE_MASTER_KEY),
        },
        "ingest": _INGEST_METRICS.compact(queue=queue_state()),
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


def fleet_tick(window_s: int) -> dict[str, Any]:
    """Un tick del stream: agregados de flota en grupo fleet + estado de ingesta."""
    if _FLEET_ROLLING.covers(window_s):
        blocks, rows, devices = _FLEET_ROLLING.snapshot(window_s)
    else:
        # Fuera del horizonte lo incremental no puede responder sin inventarse
        # un cero, asi que se cae a la ruta exacta.
        frame = build_frame(_STORE.snapshot_window(window_s))
        blocks, rows, devices = aggregate_fleet(frame, list(DEFAULT_METRICS))
    return {
        "type": "fleet_tick",
        "as_of": _now_iso(),
        "window_s": window_s,
        "rows": rows,
        "devices": devices,
        "quantile_interpolation": QUANTILE_INTERPOLATION,
        "aggregates": blocks,
        "ingest": _INGEST_METRICS.compact(queue=queue_state()),
    }


class TickCache:
    """Un solo tick por intervalo para todos los clientes del WebSocket.

    ``fleet_tick`` es O(filas retenidas): leer la ventana completa de la flota
    para cada conexion convertia una推送 por segundo por cliente en N
    recomputos completos por segundo. Medido con py-spy en la matriz de estres:
    el tick era el 49 % del CPU del contenedor.
    """

    def __init__(self, interval_s: float, now_fn: Any = time.monotonic) -> None:
        self.interval_s = float(interval_s)
        self._now_fn = now_fn
        self._lock = threading.Lock()
        self._payload: dict[str, Any] | None = None
        self._window: int | None = None
        self._at = 0.0

    def get(self, window_s: int) -> dict[str, Any] | None:
        now = self._now_fn()
        with self._lock:
            fresh = self._payload is not None and (now - self._at) < self.interval_s
            if fresh and self._window == window_s:
                return self._payload
        payload = fleet_tick(window_s)
        with self._lock:
            self._payload, self._window, self._at = payload, window_s, self._now_fn()
        return payload

    def advance(self, seconds: float) -> None:
        with self._lock:
            self._at -= seconds

    def reset(self) -> None:
        with self._lock:
            self._payload, self._window, self._at = None, None, 0.0


_FLEET_TICK_CACHE = TickCache(FLEET_TICK_SECONDS)


def cached_fleet_tick(window_s: int) -> dict[str, Any]:
    return _FLEET_TICK_CACHE.get(window_s)


def _parse_tick_window(raw: str, current: int) -> int:
    """Ventana pedida por el cliente, o la actual si el mensaje no es valido."""
    try:
        message_in = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return current
    if not isinstance(message_in, dict):
        return current
    value = message_in.get("window_s")
    if isinstance(value, bool) or not isinstance(value, int):
        return current
    return value if FLEET_WINDOW_MIN <= value <= FLEET_WINDOW_MAX else current


@app.websocket("/ws/fleet")
async def fleet_stream(websocket: WebSocket) -> None:
    """Emite un tick por segundo; el cliente puede pedir otra ventana.

    Nunca se acumulan ticks: hay uno en vuelo como maximo, asi que un cliente
    lento pierde muestras en vez de acumular memoria en el servidor. La lectura
    corre en una tarea aparte para no perder un ``window_s`` que llega justo en
    el limite del timeout, que es lo que pasaria al cancelar un ``receive``.
    """
    await websocket.accept()
    window_s = FLEET_DEFAULT_WINDOW
    commands: asyncio.Queue[str] = asyncio.Queue(maxsize=8)
    closed = asyncio.Event()

    async def _reader() -> None:
        try:
            while True:
                raw = await websocket.receive_text()
                if commands.full():
                    commands.get_nowait()  # el comando mas viejo cede el paso
                commands.put_nowait(raw)
        except WebSocketDisconnect:
            pass
        except Exception as exc:  # noqa: BLE001 - el cierre del socket es normal
            log.debug("fleet ws reader stopped: %s", exc)
        finally:
            closed.set()

    reader = asyncio.create_task(_reader())
    try:
        while not closed.is_set():
            # El calculo de percentiles es CPU-bound; en el hilo de eventos
            # congelaria cada ruta HTTP durante cada tick.
            payload = await run_in_threadpool(cached_fleet_tick, window_s)
            await websocket.send_json(payload)
            try:
                raw = await asyncio.wait_for(commands.get(), timeout=FLEET_TICK_SECONDS)
            except asyncio.TimeoutError:
                continue
            window_s = _parse_tick_window(raw, window_s)
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001 - una conexion rota no es un 500
        log.info("fleet ws closed (%s)", exc)
    finally:
        reader.cancel()
        log.info("fleet ws disconnected (window_s=%d)", window_s)


@app.get("/fleet/aggregates")
def fleet_aggregates(
    window_s: int = Query(default=10, ge=1, le=300),
    metrics: str | None = Query(default=None),
    group: Literal["fleet", "device"] = Query(default="fleet"),
    limit: int = Query(default=200, ge=1, le=2000),
) -> dict:
    """Percentiles por metrica sobre los ultimos ``window_s`` segundos.

    ``group=fleet`` aplana toda la flota en un bloque por metrica; ``group=device``
    devuelve un bloque por equipo. Las respuestas vacias llevan ``reason`` y
    ``code`` ``no_rows`` en vez de ceros, que serian indistinguibles de una flota
    en reposo real.
    """
    try:
        requested = parse_metrics(metrics)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    frame = build_frame(_STORE.snapshot_window(window_s))
    if group == "fleet":
        blocks, rows, devices = aggregate_fleet(frame, requested)
    else:
        blocks, rows, devices = aggregate_by_device(frame, requested, limit)

    empty = rows == 0
    return {
        "status": "ok",
        "kind": "fleet-aggregates",
        "as_of": _now_iso(),
        "window_s": window_s,
        "metrics": requested,
        "group": group,
        "limit": limit,
        "rows": rows,
        "devices": devices,
        "quantile_interpolation": QUANTILE_INTERPOLATION,
        "aggregates": [] if empty and group == "device" else blocks,
        "reason": "no_rows" if empty else None,
        "code": "no_rows" if empty else None,
    }


# El coste de la escalera es lineal en filas: ~18 ms cada 3600 filas por
# equipo. En una flota de 10 equipos con 3600 filas cada uno son 180 ms, cuatro
# veces el presupuesto de la ruta. El brief pide el nivel "si es barato, si no
# omitirlo con una razon documentada", asi que por defecto la escalera solo se
# evalua cuando el almacen cabe en este presupuesto de filas, y `?alert_level=on`
# la fuerza asumiendo el coste.
ALERT_LEVEL_ROW_BUDGET = int(os.getenv("OILGUARD_ALERT_LEVEL_ROW_BUDGET", "8000"))


def alert_level_for(device_id: str) -> tuple[str | None, str | None]:
    """Nivel de alerta de un equipo segun la escalera T10, o por que falta.

    Devuelve ``(nivel, razon)``; la razon es un token estable
    (``analyzer_unavailable``, ``no_rows``, ``evaluation_failed``, ``no_alert``)
    para que la UI lo localice sin analizar prosa.

    Evaluar la escalera cuesta una pasada sobre las filas del equipo, asi que
    se hace aqui y no por ruta: /fleet/devices ya es la ruta cara de la flota y
    el cache de la UI la refresca cada pocos segundos.
    """
    evaluator, import_reason = _load_t10_evaluator()
    if evaluator is None:
        return None, "analyzer_unavailable"
    rows = _sorted_device_rows(device_id)
    if not rows:
        return None, "no_rows"
    try:
        bundle = evaluator(_samples_from_rows(rows))
    except Exception:  # noqa: BLE001 - puntuar nunca debe tumbar la ruta
        return None, "evaluation_failed"
    alerts = bundle.get("alerts") or []
    highest: str | None = None
    for alert in alerts:
        level = str(alert.get("level", ""))
        if level in _LADDER_ORDER and (
            highest is None or _LADDER_ORDER.index(level) > _LADDER_ORDER.index(highest)
        ):
            highest = level
    if highest is None:
        return None, "no_alert"
    return highest, None


_LADDER_ORDER = ("N1", "N2", "N3", "N4")


@app.get("/fleet/devices")
def fleet_devices(
    alert_level: Literal["auto", "on", "off"] = Query(default="auto"),
) -> dict:
    """Retención, estado de firmas, última lectura y alerta por dispositivo.

    ``alert_level`` controla la escalera T10: ``auto`` (por defecto) solo la
    evalua si el almacen cabe en ``OILGUARD_ALERT_LEVEL_ROW_BUDGET`` filas,
    ``on`` la fuerza y ``off`` la omite. Ver ``alert_level`` en la respuesta
    para saber que paso y por que.
    """
    with _store_lock:
        stats = _STORE.device_stats()
    devices = [stats[device] for device in sorted(stats)]
    total_rows = sum(device["rows_retained"] for device in devices)
    within_budget = total_rows <= ALERT_LEVEL_ROW_BUDGET
    evaluate = alert_level == "on" or (alert_level == "auto" and within_budget)

    budget_reason = None
    if evaluate:
        for device in devices:
            level, reason = alert_level_for(device["device_id"])
            device["alert_level"] = level
            device["alert_level_reason"] = reason
    else:
        budget_reason = (
            "ladder_budget_exceeded" if alert_level == "auto" else "disabled_by_query"
        )
        for device in devices:
            device["alert_level"] = None
            device["alert_level_reason"] = budget_reason

    reasons = sorted({device["alert_level_reason"] for device in devices if device["alert_level_reason"]})
    return {
        "status": "ok",
        "kind": "fleet-devices",
        "as_of": _now_iso(),
        "count": len(devices),
        "retention_rows": RETENTION_ROWS,
        "devices": devices,
        "alert_level": {
            "evaluated": bool(evaluate and devices),
            "mode": alert_level,
            "rows_scanned": total_rows if evaluate else 0,
            "row_budget": ALERT_LEVEL_ROW_BUDGET,
            "reason": reasons[0] if reasons else None,
        },
        "reason": None if devices else "no_rows",
        "code": None if devices else "no_rows",
    }


@app.get("/fleet/outages")
def fleet_outages(
    device_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=2000),
) -> dict:
    """Rachas de filas con ``link_down`` por dispositivo (historial de cortes)."""
    with _store_lock:
        devices = [device_id] if device_id else _STORE.devices()
        runs: list[dict[str, Any]] = []
        for device in devices:
            if _OUTAGES.is_dirty(device):
                # Llegada fuera de orden: el incremental no puede garantizar la
                # agrupacion por seq, asi que se reconstruye desde el almacen.
                _OUTAGES.rebuild(device, _STORE.rows(device))
            runs.extend(_OUTAGES.runs(device))
    runs.sort(key=lambda run: (str(run.get("start_t_iso") or ""), run["device_id"]), reverse=True)
    total = len(runs)
    return {
        "status": "ok",
        "kind": "fleet-outages",
        "as_of": _now_iso(),
        "device_id": device_id,
        "count": min(total, limit),
        "outages_total": total,
        "outages": runs[:limit],
        "reason": "no_outages" if total == 0 else None,
        "code": "no_outages" if total == 0 else None,
    }


@app.get("/config/thresholds")
def config_thresholds() -> dict:
    """Espejo de solo lectura de las constantes que el analisis usa de verdad.

    Los numeros se IMPORTAN de ai/ladder.py, ai/level.py y ai/rul.py, nunca se
    copian: una copia envejece en silencio y la UI acabaria enseñando
    umbrales que el backend ya no aplica. El canal N2 es 2-of-3 sobre las tres
    senales, y la temperatura actsua como veto, asi que ambos van aqui con el
    codigo del canal.
    """
    from ai import ladder, level, rul

    return {
        "status": "ok",
        "kind": "config-thresholds",
        "as_of": _now_iso(),
        "model": ladder.MODEL_LABEL,
        "capacity_l": level.CAPACITY_L,
        "warn_pct": ladder.WARN_PCT,
        "crit_pct": ladder.CRIT_PCT,
        "warn_l": rul.WARN_L,
        "crit_l": rul.CRIT_L,
        "min_scored_n": rul.MIN_SCORED_N,
        "min_baseline_n": level.MIN_BASELINE_N,
        "min_r2": rul.MIN_R2,
        "max_sigma_l": rul.MAX_SIGMA_L,
        "z_thr": ladder.Z_THR,
        "z_extreme": ladder.Z_EXTREME,
        "kurt_spike": ladder.KURT_SPIKE,
        "rms_high_g": ladder.RMS_HIGH_G,
        "temp_drift_c": ladder.TEMP_DRIFT_C,
        "abrupt_step_l": ladder.ABRUPT_STEP_L,
        "shift_h": ladder.SHIFT_H,
        "cycle_s": rul.CYCLE_S,
        "min_channels": 2,
        "n2_votes_of": 3,
        "channels": ["pressure_drop", "level_trend", "vib_impact"],
        "temp_veto": True,
        "ladder": list(ladder.LADDER),
        "severity": dict(ladder.SEVERITY),
        "sources": {
            "ladder": "ai/ladder.py",
            "level": "ai/level.py",
            "rul": "ai/rul.py",
        },
    }


@app.get("/metrics/ingest")
def metrics_ingest() -> dict:
    """Contadores de ingesta, contrapresion de la cola y latencia p50/p95/p99."""
    return {
        "status": "ok",
        "kind": "ingest-metrics",
        "as_of": _now_iso(),
        "ingest": {
            **_INGEST_METRICS.snapshot(queue=queue_state()),
            "influx": influx_state(),
            **(
                {"mqtt_bridge": bridge_state()}
                if bridge_timing_enabled()
                else {}
            ),
            "retention_rows": RETENTION_ROWS,
            "devices": len(_STORE.devices()),
        },
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


SERIES_SIGNALS = ("pressure_kpa", "temperature_c", "vib_rms_g")


def _parse_series_signals(raw: str | None) -> list[str]:
    """Señales extra de la serie; vacío o desconocido -> las tres por defecto."""
    if not raw:
        return []
    requested = [item.strip() for item in raw.split(",") if item.strip()]
    unknown = [name for name in requested if name not in SERIES_SIGNALS]
    if unknown:
        raise ValueError(
            f"unknown signals: {', '.join(sorted(unknown))}; "
            f"available: {', '.join(SERIES_SIGNALS)}"
        )
    seen: set[str] = set()
    ordered: list[str] = []
    for name in requested:
        if name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


@app.get("/level/series")
def level_series(
    limit: int = Query(default=300, ge=1, le=2000),
    device_id: str | None = Query(default=None),
    signals: str | None = Query(default=None),
) -> dict:
    """Sirve la serie fusionada y limitada de nivel del almacenamiento de sesión.

    ``signals`` añade columnas por punto (aditivo, no cambia el contrato) y
    ``truth_liters`` aparece solo si las filas traen la verdad del generador:
    inventar una verdad que no se midió sería exactamente el tipo de dato que
    este producto no debe mostrar.
    """
    rows = _sorted_device_rows(select_device(device_id))
    try:
        requested = _parse_series_signals(signals)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
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
    has_truth = any(as_float(row.get("level_liters")) is not None for row in rows)
    series = []
    for row, point in zip(rows, estimate["estimates"]):
        item: dict[str, Any] = {
            "t_s": point["t_s"],
            "level_l": point["level_liters"],
            "sigma_l": sigma_l,
            "moving": int(float(row.get("moving", 0))),
            "recal_window": int(float(row.get("recal_window", 0))),
        }
        for name in requested:
            item[name] = as_float(row.get(name))
        if has_truth:
            item["truth_liters"] = as_float(row.get("level_liters"))
        series.append(item)
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


def enqueue_batch(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Punto de entrada del puente MQTT: encola y reporta el resultado del turno.

    Un lote que no entra se descarta y se cuenta; devolver el drop en el ack
    hace visible la contrapresion en el log del broker en vez de perderla.
    """
    if _PIPELINE.submit(rows):
        return {"status": "queued", "kind": "ingest-queued", "rows": len(rows)}
    return {
        "status": "dropped",
        "kind": "ingest-dropped",
        "rows": len(rows),
        "reason": "queue_full",
        "queue_capacity": _PIPELINE.capacity(),
    }


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
            run_forever(forward_fn=enqueue_batch)
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
    _INFLUX_WRITER.start()
    _PIPELINE.start()
    _start_mqtt_bridge()


@app.on_event("shutdown")
def on_shutdown() -> None:
    # Vaciar el pipeline y despues el escritor: lo que este en la cola del
    # pipeline todavia puede encolar en la del escritor.
    _PIPELINE.stop(timeout=5.0)
    drained = _INFLUX_WRITER.stop(timeout=5.0)
    log.info(
        "shutdown complete: influx drained=%d batches, written=%d, dropped=%d",
        drained,
        _INFLUX_WRITER.written_batches(),
        _INFLUX_WRITER.dropped_batches(),
    )


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
