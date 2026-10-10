"""Metricas de ingesta del backend (R2).

Sin estas, una flota que pierde lotes por una cola llena es indistinguible de
una flota sana: solo se nota cuando el nivel deja de bajar. Los descartes se
cuentan, la latencia se mide y todo es legible en un endpoint.

La latencia es ``receive time - t_iso``. Se descartan (y se cuentan aparte) los
valores negativos y los absurdos: un emisor con el reloj adelantado o parado
envejece el p99 y lo volveria inaccionable como señal.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Any, Callable

# Por encima de esto la muestra no es latencia de ingesta sino un emisor roto.
MAX_LATENCY_S = 3600.0
MAX_SAMPLES = 100_000
QUANTILES = (("p50", 0.50), ("p95", 0.95), ("p99", 0.99))


def _percentile(sorted_values: list[float], quantile: float) -> float | None:
    """Percentil con interpolacion lineal, el mismo metodo que publica /fleet."""
    if not sorted_values:
        return None
    if len(sorted_values) == 1:
        return sorted_values[0]
    position = quantile * (len(sorted_values) - 1)
    lower = int(position)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = position - lower
    return sorted_values[lower] * (1.0 - weight) + sorted_values[upper] * weight


class RollingCounter:
    """Contador por segundos que solo conserva la ventana que se consulta."""

    def __init__(self, window_s: float = 10.0, now_fn: Callable[[], float] = time.time) -> None:
        self.window_s = float(window_s)
        self._now_fn = now_fn
        self._buckets: deque[tuple[int, int]] = deque()
        self._total = 0
        self._lock = threading.Lock()

    def add(self, amount: int = 1, now: float | None = None) -> None:
        if amount <= 0:
            return
        stamp = int(now if now is not None else self._now_fn())
        with self._lock:
            if self._buckets and self._buckets[-1][0] == stamp:
                previous, count = self._buckets[-1]
                self._buckets[-1] = (previous, count + amount)
            else:
                self._buckets.append((stamp, amount))
            self._total += amount

    def total(self, window_s: float, now: float | None = None) -> int:
        stamp = int(now if now is not None else self._now_fn())
        with self._lock:
            # La poda usa SIEMPRE la ventana propia del contador: si se podara
            # con la ventana consultada, un total(1s) borraria los datos que un
            # total(10s) posterior todavia necesita.
            self._evict(stamp - int(self.window_s))
            floor = stamp - int(window_s)
            return sum(count for bucket, count in self._buckets if bucket > floor)

    def cumulative(self) -> int:
        with self._lock:
            return self._total

    def _evict(self, floor: int) -> None:
        while self._buckets and self._buckets[0][0] <= floor:
            self._buckets.popleft()


class RollingLatency:
    """Muestras de latencia en una ventana deslizante acotada.

    Se acota por numero de muestras ademas de por tiempo: a 100k filas/s una
    ventana de 10 s son un millón de floats, y el proceso de ingesta no puede
    pagar esa memoria. Si se supera el tope se descartan las mas antiguas y
    quedan visibles en ``dropped_samples``.
    """

    def __init__(
        self,
        window_s: float = 10.0,
        max_samples: int = MAX_SAMPLES,
        now_fn: Callable[[], float] = time.time,
    ) -> None:
        self.window_s = float(window_s)
        self.max_samples = max(1, int(max_samples))
        self._now_fn = now_fn
        self._samples: deque[tuple[float, float]] = deque()
        self._invalid = 0
        self._dropped = 0
        self._lock = threading.Lock()

    def observe(self, value: float, now: float | None = None) -> bool:
        stamp = now if now is not None else self._now_fn()
        if value < 0.0 or value > MAX_LATENCY_S:
            with self._lock:
                self._invalid += 1
            return False
        with self._lock:
            self._samples.append((stamp, value))
            self._evict(stamp)
            while len(self._samples) > self.max_samples:
                self._samples.popleft()
                self._dropped += 1
        return True

    def _evict(self, now: float) -> None:
        floor = now - self.window_s
        while self._samples and self._samples[0][0] <= floor:
            self._samples.popleft()

    def snapshot(self, now: float | None = None) -> dict[str, Any]:
        stamp = now if now is not None else self._now_fn()
        with self._lock:
            self._evict(stamp)
            values = sorted(value for _, value in self._samples)
            invalid, dropped = self._invalid, self._dropped
        result: dict[str, Any] = {
            "count": len(values),
            "min_s": values[0] if values else None,
            "max_s": values[-1] if values else None,
            "mean_s": (sum(values) / len(values)) if values else None,
            "invalid_samples": invalid,
            "dropped_samples": dropped,
            "unit": "s",
            "definition": "receive time - t_iso",
            "percentile_method": "linear",
            "max_latency_s": MAX_LATENCY_S,
        }
        for name, quantile in QUANTILES:
            result[f"{name}_s"] = _percentile(values, quantile)
        return result


class IngestMetrics:
    """Contadores de filas, latencia y estado de la cola en un solo objeto."""

    def __init__(
        self,
        window_s: float = 10.0,
        now_fn: Callable[[], float] = time.time,
    ) -> None:
        self.window_s = float(window_s)
        self._now_fn = now_fn
        self._accepted = RollingCounter(window_s=window_s, now_fn=now_fn)
        self._rejected = RollingCounter(window_s=window_s, now_fn=now_fn)
        self._latency = RollingLatency(window_s=window_s, now_fn=now_fn)
        self._lock = threading.Lock()

    def record(
        self,
        accepted: int = 0,
        rejected: int = 0,
        latency_s: float | None = None,
        now: float | None = None,
    ) -> None:
        stamp = now if now is not None else self._now_fn()
        if accepted:
            self._accepted.add(accepted, stamp)
        if rejected:
            self._rejected.add(rejected, stamp)
        if latency_s is not None:
            self._latency.observe(latency_s, stamp)

    def record_latencies(self, values: Any, now: float | None = None) -> None:
        """Registra un lote de latencias; evita un lock por fila en rafagas grandes."""
        if not values:
            return
        stamp = now if now is not None else self._now_fn()
        with self._lock:
            for value in values:
                self._latency.observe(value, stamp)

    def snapshot(self, now: float | None = None, queue: dict[str, Any] | None = None) -> dict[str, Any]:
        stamp = now if now is not None else self._now_fn()
        return {
            "rows": {
                "accepted_1s": self._accepted.total(1.0, stamp),
                "accepted_10s": self._accepted.total(10.0, stamp),
                "accepted_total": self._accepted.cumulative(),
                "rejected_1s": self._rejected.total(1.0, stamp),
                "rejected_10s": self._rejected.total(10.0, stamp),
                "rejected_total": self._rejected.cumulative(),
            },
            "queue": dict(queue or {}),
            "latency": self._latency.snapshot(stamp),
            "window_s": self.window_s,
        }

    def compact(self, now: float | None = None, queue: dict[str, Any] | None = None) -> dict[str, Any]:
        """Resumen de pocas claves para /health (que ya responde mucho)."""
        stamp = now if now is not None else self._now_fn()
        latency = self._latency.snapshot(stamp)
        state = dict(queue or {})
        return {
            "queue_depth": state.get("depth", 0),
            "dropped_batches": state.get("dropped_batches", 0),
            "accepted_rows_10s": self._accepted.total(10.0, stamp),
            "rejected_rows_10s": self._rejected.total(10.0, stamp),
            "latency_p50_s": latency["p50_s"],
            "latency_p95_s": latency["p95_s"],
            "latency_p99_s": latency["p99_s"],
        }

    def reset(self) -> None:
        with self._lock:
            self._accepted = RollingCounter(window_s=self.window_s, now_fn=self._now_fn)
            self._rejected = RollingCounter(window_s=self.window_s, now_fn=self._now_fn)
            self._latency = RollingLatency(window_s=self.window_s, now_fn=self._now_fn)