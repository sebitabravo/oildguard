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
from datetime import datetime
from typing import Any, Callable

# Por encima de esto la muestra no es latencia de ingesta sino un emisor roto.
MAX_LATENCY_S = 3600.0
MAX_SAMPLES = 100_000
# Ancho del bucket de los contadores rodantes. Una ventana medida en buckets
# de 1 s pierde hasta un segundo entero: la ventana de 1 s devolvia solo el
# bucket corriente (0 justo tras una frontera) y la de 10 s cubria 9 s reales.
# 50 ms deja el error de cuantizacion por debajo del 5%.
RATE_BUCKET_S = 0.05
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


class TisoClock:
    """Convierte ``t_iso`` a epoch memoizando el ultimo valor visto.

    El simulador sella la hora al emitir, asi que las diez filas de un lote
    comparten ``t_iso`` y un lote grande repite el mismo valor cientos de
    veces. ``datetime.fromisoformat`` por fila costaba 0.6 s cada 300k filas,
    mas que todo el Almacen. Un recordatorio de una entrada resuelve el caso
    comum sin cambiar el resultado de un valor distinto.
    """

    __slots__ = ("_last", "_parse_calls", "_cache", "_limit")

    def __init__(self, limit: int = 4096) -> None:
        self._last: tuple[str, float | None] | None = None
        self._parse_calls = 0
        self._cache: dict[str, float | None] = {}
        self._limit = max(1, int(limit))

    @property
    def parse_calls(self) -> int:
        return self._parse_calls

    @property
    def cached(self) -> int:
        return len(self._cache)

    def epoch(self, value: Any) -> float | None:
        if not isinstance(value, str) or not value:
            return None
        if self._last is not None and self._last[0] == value:
            return self._last[1]
        cached = self._cache.get(value, False)
        if cached is not False:
            self._last = (value, cached)
            return cached
        self._parse_calls += 1
        try:
            epoch = datetime.fromisoformat(value).timestamp()
        except ValueError:
            epoch = None
        if len(self._cache) >= self._limit:
            self._cache.clear()
        self._cache[value] = epoch
        self._last = (value, epoch)
        return epoch


class RollingCounter:
    """Contador por buckets que solo conserva la ventana propia del contador."""

    def __init__(self, window_s: float = 10.0, now_fn: Callable[[], float] = time.time) -> None:
        self.window_s = float(window_s)
        self._now_fn = now_fn
        self._buckets: deque[tuple[int, int]] = deque()
        self._total = 0
        self._lock = threading.Lock()

    @staticmethod
    def _bucket_of(moment: float) -> int:
        return int(moment / RATE_BUCKET_S)

    def add(self, amount: int = 1, now: float | None = None) -> None:
        if amount <= 0:
            return
        moment = now if now is not None else self._now_fn()
        bucket = self._bucket_of(moment)
        with self._lock:
            # Podar tambien aqui, no solo al leer: si nadie consulta
            # /metrics/ingest los buckets crecerian sin limite.
            self._evict(self._bucket_of(moment - self.window_s))
            if self._buckets and self._buckets[-1][0] == bucket:
                previous, count = self._buckets[-1]
                self._buckets[-1] = (previous, count + amount)
            else:
                self._buckets.append((bucket, amount))
            self._total += amount

    def total(self, window_s: float, now: float | None = None) -> int:
        moment = now if now is not None else self._now_fn()
        high = self._bucket_of(moment)
        low = self._bucket_of(moment - window_s)
        with self._lock:
            # La poda usa SIEMPRE la ventana propia del contador: si se podara
            # con la ventana consultada, un total(1s) borraria los datos que un
            # total(10s) posterior todavia necesita.
            self._evict(self._bucket_of(moment - self.window_s))
            # La ventana es (now - W, now]: se incluye el bucket corriente y se
            # excluye el que abre la ventana, para que mida W segundos de reloj
            # y no W - 1 mas un parcial.
            return sum(count for bucket, count in self._buckets if low < bucket <= high)

    def cumulative(self) -> int:
        with self._lock:
            return self._total

    def bucket_count(self) -> int:
        with self._lock:
            return len(self._buckets)

    def _evict(self, floor: int) -> None:
        if self._buckets and self._buckets[0][0] <= floor:
            # Filtrar y no solo popleft: un loteDelayed puede insertar un bucket
            # viejo al final y dejaria una entrada caducada sin podar.
            self._buckets = deque(
                (bucket, count) for bucket, count in self._buckets if bucket > floor
            )


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

    def observe_many(self, values: Any, now: float | None = None) -> None:
        """Registra un lote de latencias con un solo lock.

        El perfil mostraba ``observe`` como 0.7 s de 5.1 s porque tomaba el lock
        una vez por fila; un lote de diez mil filas son diez mil esperas.
        """
        if not values:
            return
        stamp = now if now is not None else self._now_fn()
        with self._lock:
            samples = self._samples
            limit = self.max_samples
            for value in values:
                if value < 0.0 or value > MAX_LATENCY_S:
                    self._invalid += 1
                    continue
                samples.append((stamp, value))
                while len(samples) > limit:
                    samples.popleft()
                    self._dropped += 1
            self._evict(stamp)

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


def _run_in_background_thread(work: Callable[[], None]) -> None:
    threading.Thread(target=work, daemon=True).start()


class CachedProbe:
    """Cache con TTL para una sonda cara que no puede bloquear el camino de la request.

    Una sonda se lanza en segundo plano y la llamada espera como mucho
    ``timeout``; si no llega a tiempo, sigue en vuelo y su resultado rellena el
    cache para la llamada siguiente. Asi /health responde siempre en milisegundos
    aunque la sonda tarde segundos, y ningun trabajo se tira a la basura.

    Cada sonda lleva la generacion con la que se lanzo y solo escribe si esa
    generacion sigue vigente. Sin esa guarda, una sonda lenta que sobrevive a un
    ``reset()`` o a un cambio de configuracion escribe su resultado viejo sobre
    el cache nuevo: el numero de la instalacion anterior se sirria como si
    fuera de la actual.
    """

    def __init__(
        self,
        fetch: Callable[[], Any],
        key_fn: Callable[[], Any] | None = None,
        ttl_s: float = 30.0,
        wait_s: float = 0.1,
        now_fn: Callable[[], float] = time.time,
        executor: Callable[[Callable[[], None]], None] | None = None,
    ) -> None:
        self._fetch = fetch
        self._key_fn = key_fn
        self.ttl_s = float(ttl_s)
        self.wait_s = float(wait_s)
        self._now_fn = now_fn
        self._default_now_fn = now_fn
        self._executor = executor or _run_in_background_thread
        self._default_executor = self._executor
        self._lock = threading.Lock()
        self._value: Any = None
        self._reason = "not_probed"
        self._as_of: float | None = None
        self._key: Any = None
        self._done: threading.Event | None = None
        self._generation = 0

    def set_executor(self, executor: Callable[[Callable[[], None]], None] | None) -> None:
        """Sustituye el lanzador de sondas (los tests inyectan uno manual)."""
        with self._lock:
            self._executor = executor or self._default_executor

    def peek(self) -> tuple[Any, str | None, float | None]:
        with self._lock:
            return self._value, (None if self._value is not None else self._reason), self._as_of

    def reset(self) -> None:
        with self._lock:
            self._generation += 1
            self._value, self._reason, self._as_of, self._key = None, "not_probed", None, None
            self._done = None
            self._now_fn = self._default_now_fn
            self._executor = self._default_executor

    def _fresh(self) -> bool:
        return self._as_of is not None and (self._now_fn() - self._as_of) < self.ttl_s

    def refresh(self, wait_s: float | None = None) -> Any:
        """Devuelve el valor cacheado; lanza la sonda si vencio el TTL."""
        key = self._key_fn() if self._key_fn is not None else None
        launched = False
        with self._lock:
            # Una entrada cacheada pertenece a la configuracion que la produjo:
            # si esa cambio, el numero es de otra instalacion y no vale. La
            # generacion se incrementa para que la sonda en vuelo se descarte.
            if key != self._key:
                self._generation += 1
                self._value, self._reason, self._as_of = None, "not_probed", None
                self._key = key
                self._done = None
            if self._fresh():
                return self._value
            if self._done is None:
                self._done = threading.Event()
                generation = self._generation
                self._executor(lambda: self._run(generation))
                launched = True
            done = self._done
        # Solo espera quien lanza la sonda. Si ya hay una en vuelo, el llamador
        # lee el cache de inmediato: hacer esperar a todos por un sondeo ajeno
        # devuelve /health a ser lento mientras Influx sigue colgado.
        if launched:
            done.wait(self.wait_s if wait_s is None else wait_s)
        with self._lock:
            return self._value

    def _run(self, generation: int) -> None:
        try:
            value = self._fetch()
            reason = None if value is not None else "count_unavailable"
        except Exception:  # noqa: BLE001 - una sonda rota no puede tumbar /health
            value, reason = None, "probe_failed"
        with self._lock:
            if generation != self._generation:
                return  # la sonda pertenece a una configuracion que ya no es la vigente
            self._value, self._reason, self._as_of = value, reason, self._now_fn()
            self._done = None
        # El valor se publica bajo el lock; el evento solo evita que un waiter
        # siga esperando cuando la sonda ya termino.


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
        """Registra un lote de latencias con un solo lock del almacén de muestras."""
        if not values:
            return
        stamp = now if now is not None else self._now_fn()
        with self._lock:
            self._latency.observe_many(values, stamp)

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
            # Las ventanas se cuentan en buckets: la lectura lleva un error de
            # cuantizacion de hasta un bucket (<=5%) respecto al reloj real.
            "resolution_s": RATE_BUCKET_S,
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