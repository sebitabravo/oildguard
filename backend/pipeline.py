"""Cola de ingesta en lotes y worker de drenaje (R2).

Escribir en Influx dentro de la llamada de ingesta convertia cada lote en una
ida y vuelta sincrona: el backend pagaba la latencia del broker en el camino
critico. Aqui el puente MQTT solo encola; un unico worker verifica, escribe
en el almacen y agrupa los puntos para Influx.

La cola es acotada a proposito. Si el worker no da abasto, el lote se
descarta y se cuenta: un drop silencioso seria peor que una perdida visible,
porque pareceria una flota sana.
"""

from __future__ import annotations

import logging
import os
import queue
import threading
from typing import Any, Callable, Iterable

try:  # paquete (pytest) / módulo suelto (Docker copia backend/ a /app)
    from .metrics import RateLimiter
except ImportError:
    from metrics import RateLimiter  # type: ignore

log = logging.getLogger("oilguard-ingest-pipeline")

DEFAULT_MAX_BATCHES = 1000
# Avisar de cada descarte era un aviso por lote: ~1700 lineas/s en la matriz
# de estres, con el CPU del backend al 93 %. El total exacto vive en las
# metricas; el log solo tiene que ser visible.
DROP_LOG_INTERVAL_S = float(os.getenv("OILGUARD_DROP_LOG_INTERVAL_S", "1"))
DEFAULT_FLUSH_ROWS = 5000
DEFAULT_FLUSH_SECONDS = 1.0


class IngestPipeline:
    """Cola acotada entre el puente MQTT y el worker de almacenamiento."""

    def __init__(
        self,
        process: Callable[[list[dict[str, Any]]], dict[str, Any]],
        flush: Callable[[list[dict[str, Any]]], Any] | None = None,
        *,
        max_batches: int = DEFAULT_MAX_BATCHES,
        flush_rows: int = DEFAULT_FLUSH_ROWS,
        flush_seconds: float = DEFAULT_FLUSH_SECONDS,
        influx_enabled: bool = True,
    ) -> None:
        self._process = process
        self._flush = flush
        self._queue: queue.Queue[list[dict[str, Any]]] = queue.Queue(
            maxsize=max(1, int(max_batches))
        )
        self.flush_rows = max(1, int(flush_rows))
        self.flush_seconds = max(0.01, float(flush_seconds))
        self.influx_enabled = influx_enabled
        self._buffer: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        self._stopping = threading.Event()
        self._thread: threading.Thread | None = None
        self._drop_limiter = RateLimiter(interval_s=DROP_LOG_INTERVAL_S)
        self._dropped = 0
        self._accepted = 0
        self._failed = 0
        self._last_drop_at: float | None = None

    # -- entrada ------------------------------------------------------------

    def submit(self, rows: list[dict[str, Any]]) -> bool:
        """Encola un lote. False significa descartado por cola llena."""
        try:
            self._queue.put_nowait(rows)
        except queue.Full:
            with self._lock:
                self._dropped += 1
            allowed, total = self._drop_limiter.should_log()
            if allowed:
                log.warning(
                    "ingest queue full (maxsize=%d); %d batches dropped so far "
                    "(latest has %d rows)",
                    self._queue.maxsize,
                    total,
                    len(rows),
                )
            return False
        return True

    # -- worker -------------------------------------------------------------

    def drain_once(self, timeout: float) -> bool:
        """Procesa un lote si llega antes del timeout; si expira, cierra la ventana.

        Devuelve True si hubo lote. La expiracion tambien sirve para el
        vaciado por tiempo, asi que un worker que no recibe nada sigue
        escribiendo los puntos que ya tiene en el buffer.
        """
        try:
            rows = self._queue.get(timeout=timeout)
        except queue.Empty:
            self.flush_buffer()
            return False
        try:
            result = self._process(rows) or {}
            accepted = result.get("accepted") or []
            with self._lock:
                self._accepted += 1
            if accepted and self.influx_enabled:
                with self._lock:
                    self._buffer.extend(accepted)
                    ready = len(self._buffer) >= self.flush_rows
                if ready:
                    self.flush_buffer()
        except Exception:  # noqa: BLE001 - un lote malo no puede matar al worker
            with self._lock:
                self._failed += 1
            log.exception("ingest batch failed; worker continues")
        finally:
            self._queue.task_done()
        return True

    def run_forever(self) -> None:
        """Bucle del hilo worker hasta que se detenga la pipeline."""
        while not self._stopping.is_set():
            self.drain_once(self.flush_seconds)

    def start(self, name: str = "ingest-worker") -> threading.Thread:
        if self._thread is not None:
            return self._thread
        self._stopping.clear()
        self._thread = threading.Thread(target=self.run_forever, name=name, daemon=True)
        self._thread.start()
        return self._thread

    def stop(self, timeout: float = 2.0) -> None:
        """Detiene el worker y vacia el buffer para no perder los ultimos puntos."""
        self._stopping.set()
        thread = self._thread
        self._thread = None
        if thread is not None and thread.is_alive():
            thread.join(timeout=timeout)
        self.flush_buffer()

    # -- Influx -------------------------------------------------------------

    def flush_buffer(self) -> int:
        """Escribe los puntos pendientes en Influx y vacia el buffer."""
        if not self.influx_enabled:
            return 0
        with self._lock:
            pending, self._buffer = self._buffer, []
        if not pending or self._flush is None:
            return 0
        try:
            self._flush(pending)
        except Exception:  # noqa: BLE001 - Influx es best-effort; las filas ya estan en memoria
            log.exception("influx flush failed; %d rows kept in the memory store", len(pending))
            return 0
        return len(pending)

    # -- observabilidad -----------------------------------------------------

    def depth(self) -> int:
        return self._queue.qsize()

    def capacity(self) -> int:
        return self._queue.maxsize

    def dropped_batches(self) -> int:
        with self._lock:
            return self._dropped

    def accepted_batches(self) -> int:
        with self._lock:
            return self._accepted

    def failed_batches(self) -> int:
        with self._lock:
            return self._failed

    def pending_points(self) -> int:
        with self._lock:
            return len(self._buffer)

    def drain_for_test(self, rounds: int = 64, timeout: float = 0.05) -> int:
        """Vacia la cola de forma determinista; devuelve los lotes procesados."""
        processed = 0
        for _ in range(rounds):
            if not self.drain_once(timeout=timeout):
                break
            processed += 1
        return processed

    def __iter__(self) -> Iterable[list[dict[str, Any]]]:
        while True:
            yield self._queue.get()
