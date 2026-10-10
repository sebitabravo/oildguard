"""Escritor de Influx asincrono (R2c).

El worker de ingesta escribia en Influx de forma sincrona: cada lote pagaba la
ida y vuelta al broker, y con el CPU por debajo del 50 % la razon es que estaba
esperando, no calculando. Aqui el worker solo encola line protocol ya armado y
un hilo dedicado escribe.

La cola del escritor es acotada. Cuando se llena se descarta el LOTE DE INFLUX
y se cuenta, nunca el del almacen: las filas ya estan en memoria y la API las
sigue sirviendo completas. Perder persistencia historica es una degradacion
visible; perder el estado vivo seria untrue.
"""

from __future__ import annotations

import logging
import os
import queue
import threading
from datetime import datetime, timezone
from typing import Any, Callable, Iterable

try:  # paquete / módulo suelto (Docker copia backend/ a /app)
    from .metrics import RateLimiter
except ImportError:
    from metrics import RateLimiter  # type: ignore

log = logging.getLogger("oilguard-influx-writer")

MEASUREMENT = "oilguard_signals"
TAGS = ("device_id", "fsm_state", "label", "sig_verified")
FLOAT_FIELDS = ("pressure_kpa", "temperature_c", "vib_rms_g", "vib_kurtosis", "level_liters")
INT_FIELDS = ("seq",)
DEFAULT_MAX_BATCHES = 200
DROP_LOG_INTERVAL_S = float(os.getenv("OILGUARD_DROP_LOG_INTERVAL_S", "1"))


def _escape_tag(value: str) -> str:
    """Comas, espacios y signos iguales separan campos: hay que escaparlos.

    El caso comun es un valor sin nada que escapar, y una cadena de cuatro
    ``replace`` por fila son millones de llamadas: se comprueba primero si hay
    algo que escapar.
    """
    if _ESCAPE_CHARS.isdisjoint(value):
        return value
    return value.replace("\\", "\\\\").replace(",", "\\,").replace(" ", "\\ ").replace("=", "\\=")


_ESCAPE_CHARS = frozenset(", =\\")
_MEASUREMENT = _escape_tag(MEASUREMENT)
# Los nombres de campo y de tag son constantes: se escapan una vez aqui y no
# en cada fila.
_FIELDS_FLOAT = tuple(_escape_tag(name) for name in FLOAT_FIELDS)
_FIELDS_INT = tuple(_escape_tag(name) for name in INT_FIELDS)
_TAG_NAMES = tuple(_escape_tag(name) for name in TAGS)


def _as_number(value: Any) -> float | None:
    """El simulador Rust publica los campos numericos como cadenas.

    Descartarlas perderia todas las senales en Influx y solo dejaria el seq,
    asi que se coaccionan igual que hacia la escritura por Points.
    """
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        try:
            number = float(value)
        except ValueError:
            return None
    else:
        return None
    return number if number == number and -1e308 < number < 1e308 else None


_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
_NS_CACHE_LIMIT = 4096
_NS_CACHE: dict[str, int | None] = {}


def _iso_to_ns(value: str) -> int | None:
    """ISO-8601 -> nanosegundos epoch, en aritmetica entera exacta.

    ``datetime.timestamp()`` devuelve float y a 1.77e9 el float64 solo deja
    ~95 ns de resolucion: se perde precision que el reloj del simulador si
    tiene. Con enteros no hay deriva.
    """
    cached = _NS_CACHE.get(value, False)
    if cached is not False:
        return cached  # type: ignore[return-value]
    try:
        moment = datetime.fromisoformat(value)
    except ValueError:
        result: int | None = None
    else:
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        delta = moment.astimezone(timezone.utc) - _EPOCH
        result = (
            (delta.days * 86_400 + delta.seconds) * 1_000_000_000
            + delta.microseconds * 1_000
        )
    if len(_NS_CACHE) >= _NS_CACHE_LIMIT:
        _NS_CACHE.clear()
    _NS_CACHE[value] = result
    return result


def _timestamp_ns(value: Any) -> int | None:
    """``t_iso`` a nanosegundos epoch, que es lo unico que acepta Influx.

    Influx rechaza RFC3339 (con ``+00:00`` y con ``Z``): pide un entero epoch.
    Se usan nanosegundos y no segundos porque el timestamp es la clave primaria
    y a 10 Hz varias filas caen en el mismo segundo: con precision de segundo se
    pisarian entre si.
    """
    if isinstance(value, str) and value:
        return _iso_to_ns(value)
    number = _as_number(value)
    if number is None:
        return None
    seconds = int(number)
    return seconds * 1_000_000_000 + int(round((number - seconds) * 1_000_000_000))


def encode_row(row: dict[str, Any]) -> str | None:
    """Una fila como linea de line protocol, o None si no se puede escribir."""
    timestamp = _timestamp_ns(row.get("t_iso"))
    if timestamp is None:
        return None

    tags = []
    for name, escaped_name in zip(TAGS, _TAG_NAMES):
        value = row.get(name)
        if value is None:
            continue
        rendered = str(value).lower() if isinstance(value, bool) else str(value)
        tags.append(f"{escaped_name}={_escape_tag(rendered)}")
    tag_part = _MEASUREMENT + ("," + ",".join(tags) if tags else "")

    fields = []
    for name, escaped_name in zip(FLOAT_FIELDS, _FIELDS_FLOAT):
        number = _as_number(row.get(name))
        if number is not None:
            fields.append(f"{escaped_name}={number}")
    for name, escaped_name in zip(INT_FIELDS, _FIELDS_INT):
        number = _as_number(row.get(name))
        if number is not None:
            fields.append(f"{escaped_name}={int(number)}i")
    if not fields:
        return None
    return f"{tag_part} {','.join(fields)} {timestamp}"


def encode_line_protocol(rows: Iterable[dict[str, Any]]) -> str:
    """Todo el lote en una sola pasada, separado por saltos de linea."""
    lines = []
    for row in rows:
        line = encode_row(row)
        if line is not None:
            lines.append(line)
    return "\n".join(lines)


class InfluxWriter:
    """Hilo dedicado que escribe lotes de line protocol ya armados."""

    def __init__(
        self,
        write: Callable[[str], Any],
        *,
        max_batches: int = DEFAULT_MAX_BATCHES,
        flush_rows: int = 5000,
        flush_seconds: float = 1.0,
        enabled: bool = True,
        name: str = "influx-writer",
    ) -> None:
        self._write = write
        self._queue: "queue.Queue[list[dict[str, Any]]]" = queue.Queue(maxsize=max(1, int(max_batches)))
        self.flush_rows = max(1, int(flush_rows))
        self.flush_seconds = max(0.01, float(flush_seconds))
        self.enabled = bool(enabled)
        self._name = name
        self._lock = threading.Lock()
        self._stopping = threading.Event()
        self._thread: threading.Thread | None = None
        self._buffer: list[str] = []
        self._written_batches = 0
        self._written_points = 0
        self._drop_limiter = RateLimiter(interval_s=DROP_LOG_INTERVAL_S)
        self._dropped_batches = 0
        self._dropped_points = 0
        self._failed_batches = 0

    # -- entrada ------------------------------------------------------------

    def submit(self, rows: list[dict[str, Any]]) -> bool:
        """Encola un lote. False significa que se descarto (cola del escritor llena)."""
        if not self.enabled or not rows:
            return True
        try:
            self._queue.put_nowait(rows)
        except queue.Full:
            with self._lock:
                self._dropped_batches += 1
                self._dropped_points += len(rows)
                dropped = self._dropped_batches
            allowed, total = self._drop_limiter.should_log()
            if allowed:
                log.warning(
                    "influx writer queue full (maxsize=%d); %d influx batches dropped "
                    "so far (latest has %d rows); memory store keeps every row",
                    self._queue.maxsize,
                    total,
                    len(rows),
                )
            return False
        return True

    # -- worker -------------------------------------------------------------

    def run_forever(self) -> None:
        while not self._stopping.is_set():
            try:
                rows = self._queue.get(timeout=self.flush_seconds)
            except queue.Empty:
                self.flush_buffer()
                continue
            # El simulador publica un mensaje por dispositivo y por tick: sin
            # agrupar serian 1000 escrituras de 10 puntos por segundo, y cada
            # ida y vuelta a Influx cuesta mas que las 10 filas que lleva.
            self._buffer.append(rows)
            if self._pending_points() >= self.flush_rows:
                self.flush_buffer()

    def _pending_points(self) -> int:
        return sum(len(rows) for rows in self._buffer)

    def _absorb_queue(self) -> None:
        """Pasa lo encolado al buffer sin escribir todavia."""
        while True:
            try:
                self._buffer.append(self._queue.get_nowait())
            except queue.Empty:
                return

    def flush_buffer(self) -> int:
        """Escribe lo que hay en el buffer. No toca la cola: escribirla aqui
        mezclaria todos los lotes pendientes en una sola llamada y perderia el
        vaciado incremental por umbral de filas."""
        with self._lock:
            pending, self._buffer = self._buffer, []
        if not pending:
            return 0
        rows = [row for chunk in pending for row in chunk]
        protocol = encode_line_protocol(rows)
        if not protocol:
            return 0
        return self._consume(protocol)

    def drain_and_flush(self) -> int:
        """Vuelca cola y buffer en una sola escritura (fin de vida del escritor)."""
        self._absorb_queue()
        return self.flush_buffer()

    def _consume(self, protocol: str) -> int:
        try:
            self._write(protocol)
        except Exception:  # noqa: BLE001 - Influx es best-effort; las filas ya estan en memoria
            with self._lock:
                self._failed_batches += 1
            log.exception("influx write failed; rows kept in the memory store")
            return 0
        points = protocol.count("\n") + 1
        with self._lock:
            self._written_batches += 1
            self._written_points += points
        return points

    def start(self) -> threading.Thread:
        if self._thread is not None:
            return self._thread
        self._stopping.clear()
        self._thread = threading.Thread(target=self.run_forever, name=self._name, daemon=True)
        self._thread.start()
        return self._thread

    def stop(self, timeout: float = 5.0) -> int:
        """Para el escritor tras vaciar la cola: nada de lo encolado se pierde."""
        self._stopping.set()
        thread = self._thread
        self._thread = None
        if thread is not None and thread.is_alive():
            thread.join(timeout=timeout)
        self.drain_and_flush()
        return 1

    # -- observabilidad -----------------------------------------------------

    def pending(self) -> int:
        return self._queue.qsize()

    def dropped_batches(self) -> int:
        with self._lock:
            return self._dropped_batches

    def written_batches(self) -> int:
        with self._lock:
            return self._written_batches

    def failed_batches(self) -> int:
        with self._lock:
            return self._failed_batches

    def state(self) -> dict[str, Any]:
        with self._lock:
            return {
                "enabled": self.enabled,
                "async": True,
                "queue_depth": self._queue.qsize(),
                "queue_capacity": self._queue.maxsize,
                "written_batches": self._written_batches,
                "written_points": self._written_points,
                "dropped_batches": self._dropped_batches,
                "dropped_points": self._dropped_points,
                "failed_batches": self._failed_batches,
            }

    def buffered_points(self) -> int:
        """Puntos aun no escritos, contando los que siguen en la cola."""
        with self._lock:
            buffered = self._pending_points()
        return buffered + self._queue.qsize()

    def reset(self) -> None:
        with self._lock:
            self._written_batches = 0
            self._written_points = 0
            self._dropped_batches = 0
            self._dropped_points = 0
            self._failed_batches = 0