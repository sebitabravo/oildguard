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
import queue
import threading
from datetime import datetime, timezone
from typing import Any, Callable, Iterable

log = logging.getLogger("oilguard-influx-writer")

MEASUREMENT = "oilguard_signals"
TAGS = ("device_id", "fsm_state", "label", "sig_verified")
FLOAT_FIELDS = ("pressure_kpa", "temperature_c", "vib_rms_g", "vib_kurtosis", "level_liters")
INT_FIELDS = ("seq",)
DEFAULT_MAX_BATCHES = 200


def _escape_tag(value: str) -> str:
    """Comas, espacios y signos iguales separan campos: hay que escaparlos."""
    return value.replace("\\", "\\\\").replace(",", "\\,").replace(" ", "\\ ").replace("=", "\\=")


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
    for name in TAGS:
        value = row.get(name)
        if value is None:
            continue
        rendered = str(value).lower() if isinstance(value, bool) else str(value)
        tags.append(f"{_escape_tag(name)}={_escape_tag(rendered)}")
    tag_part = f"{_escape_tag(MEASUREMENT)}" + ("," + ",".join(tags) if tags else "")

    fields = []
    for name in FLOAT_FIELDS:
        number = _as_number(row.get(name))
        if number is not None:
            fields.append(f"{_escape_tag(name)}={number}")
    for name in INT_FIELDS:
        number = _as_number(row.get(name))
        if number is not None:
            fields.append(f"{_escape_tag(name)}={int(number)}i")
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
        enabled: bool = True,
        name: str = "influx-writer",
    ) -> None:
        self._write = write
        self._queue: queue.Queue[str] = queue.Queue(maxsize=max(1, int(max_batches)))
        self.enabled = bool(enabled)
        self._name = name
        self._lock = threading.Lock()
        self._stopping = threading.Event()
        self._thread: threading.Thread | None = None
        self._written_batches = 0
        self._written_points = 0
        self._dropped_batches = 0
        self._dropped_points = 0
        self._failed_batches = 0

    # -- entrada ------------------------------------------------------------

    def submit(self, rows: list[dict[str, Any]]) -> bool:
        """Encola un lote. False significa que se descarto (cola del escritor llena)."""
        if not self.enabled or not rows:
            return True
        protocol = encode_line_protocol(rows)
        if not protocol:
            return True
        try:
            self._queue.put_nowait(protocol)
        except queue.Full:
            with self._lock:
                self._dropped_batches += 1
                self._dropped_points += len(rows)
                dropped = self._dropped_batches
            log.warning(
                "influx writer queue full (maxsize=%d); dropped influx batch #%d (%d rows); "
                "memory store keeps every row",
                self._queue.maxsize,
                dropped,
                len(rows),
            )
            return False
        return True

    # -- worker -------------------------------------------------------------

    def run_forever(self) -> None:
        while not self._stopping.is_set():
            try:
                protocol = self._queue.get(timeout=0.2)
            except queue.Empty:
                continue
            self._consume(protocol)

    def _consume(self, protocol: str) -> None:
        try:
            self._write(protocol)
        except Exception:  # noqa: BLE001 - Influx es best-effort; las filas ya estan en memoria
            with self._lock:
                self._failed_batches += 1
            log.exception("influx write failed; rows kept in the memory store")
            return
        with self._lock:
            self._written_batches += 1
            self._written_points += protocol.count("\n") + 1

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
        drained = 0
        while True:
            try:
                protocol = self._queue.get_nowait()
            except queue.Empty:
                break
            self._consume(protocol)
            drained += 1
        return drained

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

    def reset(self) -> None:
        with self._lock:
            self._written_batches = 0
            self._written_points = 0
            self._dropped_batches = 0
            self._dropped_points = 0
            self._failed_batches = 0