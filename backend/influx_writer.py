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


def encode_row(row: dict[str, Any]) -> str | None:
    """Una fila como linea de line protocol, o None si no se puede escribir."""
    timestamp = row.get("t_iso")
    if not isinstance(timestamp, str) or not timestamp:
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
        value = row.get(name)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        fields.append(f"{_escape_tag(name)}={float(value)}")
    for name in INT_FIELDS:
        value = row.get(name)
        if isinstance(value, bool) or not isinstance(value, int):
            continue
        fields.append(f"{_escape_tag(name)}={value}i")
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