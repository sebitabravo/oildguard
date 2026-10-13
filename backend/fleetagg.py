"""Agregados de flota incrementales (R2d).

``fleet_tick`` costaba ``O(filas retenidas)``: por cada tick se releian las
filas de la ventana de los 1000 dispositivos y se montaba un DataFrame de
Polars completo. Con py-spy, ese camino era el 49 % del CPU del contenedor.

Aqui cada fila aceptada actualiza estructuras en el momento de la ingesta, de
modo que un tick es ``O(dispositivos)`` en vez de ``O(filas)``.

Division de trabajo, y es deliberada:

- **Exacto**: ``count``, ``mean``, ``min``, ``max``, ``rows`` y ``devices``.
  ``count`` y ``sum`` son acumuladores; ``min``/``max`` usan colas monotonas,
  la estructura clasica de ventana deslizante, asi que expulsar la fila mas
  antigua no obliga a recalcular nada.
- **Aproximado**: solo los cuantiles (``p50``/``p95``/``p99``). Cada
  dispositivo guarda una muestra::*;
  cuando se supera el doble del tope, la muestra se reduce a la mitad
  conservando uno de cada dos elementos. Es el mismo criterio de embolsado
  que usan los Sketch de Apache: O(1) amortizado, sin azar, y sobre una
  muestra uniforme de todo el intervalo retenido.

  Con el tope de 32 muestras por dispositivo y senal, y 1000 dispositivos, el
  tick mezcla ~32000-64000 muestras por senal. El error de un cuantil alto
  cae como ``sqrt(q(1-q)/n)``, muy por debajo del 1 % del rango que exige el
  brief (ver ``tests/test_fleet_incremental.py``).

**Semantica de ventana por dispositivo, no global.** El calculo exacto usa
``cutoff = ultima_ts_del_dispositivo - window``, es decir, cada equipo se
mide contra su propio reloj. Eso importa: un equipo que dejo de publicar hace
una hora sigue aportando las filas de su ultima ventana. Una estructura
indexada por un reloj global lo contaria como cero. Aqui cada dispositivo
mantiene su propia ventana, asi que la equivalencia se conserva.

**Horizonte.** Se retienen ``DEFAULT_HORIZON_S`` segundos por dispositivo. Para
``window_s > horizonte`` la respuesta es exacta pero vacia por construccion, y
por eso ``fleet_tick`` cae a la ruta exacta (Polars) en ese caso, en vez de
inventar un cero.
"""

from __future__ import annotations

import threading
from collections import deque
from typing import Any, Iterable, Sequence

try:
    from .metrics import QUANTILES, _percentile as _quantile_linear
except ImportError:
    from metrics import QUANTILES, _percentile as _quantile_linear

DEFAULT_HORIZON_S = 300.0
DEFAULT_SAMPLES = 32


class _DeviceWindow:
    """Ventana deslizante por dispositivo y por senal.

    ``rows`` es la deque maestra: guarda (t_s, valores) y es la que marca que
    filas entran y salen. Las demas estructuras son indice sobre ella, nunca
    una segunda copia de los datos.
    """

    __slots__ = ("rows", "count", "total", "lows", "highs", "samples")

    def __init__(self, metrics: Sequence[str]) -> None:
        self.rows: deque[tuple[float, tuple[float | None, ...]]] = deque()
        self.count: dict[str, int] = {m: 0 for m in metrics}
        self.total: dict[str, float] = {m: 0.0 for m in metrics}
        # Colas monotonas: (t_s, valor). La cabeza es el extremo vivo.
        self.lows: dict[str, deque[tuple[float, float]]] = {m: deque() for m in metrics}
        self.highs: dict[str, deque[tuple[float, float]]] = {m: deque() for m in metrics}
        self.samples: dict[str, deque[float]] = {m: deque() for m in metrics}

    @property
    def latest(self) -> float:
        return self.rows[-1][0] if self.rows else 0.0


class RollingFleet:
    """Agregados incrementales de flota, mantenidos en la ingesta."""

    def __init__(
        self,
        metrics: Sequence[str],
        *,
        horizon_s: float = DEFAULT_HORIZON_S,
        samples_per_metric: int = DEFAULT_SAMPLES,
    ) -> None:
        self.metrics = tuple(metrics)
        self.horizon_s = float(horizon_s)
        # Se reduce a la mitad al pasar de este tope, asi que la muestra
        # efectiva vive entre ``samples`` y ``2 * samples``.
        self._decimate_at = max(4, samples_per_metric * 2)
        self._devices: dict[str, _DeviceWindow] = {}
        self._lock = threading.RLock()

    # ---------------------------------------------------------------- ingesta

    def observe(self, device_id: str, t_s: float, values: Sequence[float | None]) -> None:
        with self._lock:
            self._observe_locked(device_id, t_s, values)

    def _observe_locked(self, device_id: str, t_s: float, values: Sequence[float | None]) -> None:
        """Registra una fila aceptada. ``values`` sigue el orden de ``self.metrics``."""
        window = self._devices.get(device_id)
        if window is None:
            window = _DeviceWindow(self.metrics)
            self._devices[device_id] = window

        row = (t_s, tuple(values))
        window.rows.append(row)

        for metric, value in zip(self.metrics, values):
            if value is None:
                continue
            window.count[metric] += 1
            window.total[metric] += value

            lows = window.lows[metric]
            while lows and lows[-1][1] >= value:
                lows.pop()
            lows.append((t_s, value))

            highs = window.highs[metric]
            while highs and highs[-1][1] <= value:
                highs.pop()
            highs.append((t_s, value))

            bucket = window.samples[metric]
            bucket.append(value)
            if len(bucket) > self._decimate_at:
                # Embolsado por reduccion a la mitad: conserva uno de cada dos
                # elementos, o sea una muestra uniforme de todo el intervalo,
                # sin azar y en O(1) amortizado. deque no admite rebanado,
                # asi que la muestra se reconstruye.
                window.samples[metric] = deque(list(bucket)[::2])

        self._expire(window)

    def observe_many(self, rows: Iterable[tuple[str, float, Sequence[float | None]]]) -> None:
        for device_id, t_s, values in rows:
            self.observe(device_id, t_s, values)

    def _expire(self, window: _DeviceWindow) -> None:
        """Saca de la ventana lo que ya no cabe en el horizonte."""
        cutoff = window.latest - self.horizon_s
        self._evict_below(window, cutoff)

    def _evict_below(self, window: _DeviceWindow, cutoff: float) -> None:
        with self._lock:
            self._evict_below_locked(window, cutoff)

    def _evict_below_locked(self, window: _DeviceWindow, cutoff: float) -> None:
        rows = window.rows
        while rows and rows[0][0] < cutoff:
            t_s, values = rows.popleft()
            for metric, value in zip(self.metrics, values):
                if value is None:
                    continue
                window.count[metric] -= 1
                window.total[metric] -= value
                lows = window.lows[metric]
                if lows and lows[0][0] <= t_s:
                    lows.popleft()
                highs = window.highs[metric]
                if highs and highs[0][0] <= t_s:
                    highs.popleft()

    # ------------------------------------------------------------------ tick

    def covers(self, window_s: float) -> bool:
        """True si el horizonte retenido puede responder a esta ventana."""
        return float(window_s) <= self.horizon_s

    def snapshot(self, window_s: float) -> tuple[dict[str, Any], int, int]:
        with self._lock:
            return self._snapshot_locked(window_s)

    def _snapshot_locked(self, window_s: float) -> tuple[dict[str, Any], int, int]:
        """(bloques, filas, dispositivos) para la ventana pedida."""
        window = float(window_s)
        rows_total = 0
        devices = 0

        pools: dict[str, list[float]] = {m: [] for m in self.metrics}
        lows: dict[str, float] = {}
        highs: dict[str, float] = {}
        counts: dict[str, int] = {}
        sums: dict[str, float] = {}

        for device_window in self._devices.values():
            if not device_window.rows:
                continue
            # Corte contra el reloj del propio dispositivo, igual que la ruta
            # exacta: un equipo parado sigue aportando su ultima ventana.
            self._evict_below(device_window, device_window.latest - window)

            kept = len(device_window.rows)
            if kept == 0:
                continue
            devices += 1
            rows_total += kept

            for metric in self.metrics:
                counts[metric] = counts.get(metric, 0) + device_window.count[metric]
                sums[metric] = sums.get(metric, 0.0) + device_window.total[metric]

                low_q = device_window.lows[metric]
                if low_q:
                    candidate = low_q[0][1]
                    previous = lows.get(metric)
                    lows[metric] = candidate if previous is None else min(previous, candidate)

                high_q = device_window.highs[metric]
                if high_q:
                    candidate = high_q[0][1]
                    previous = highs.get(metric)
                    highs[metric] = candidate if previous is None else max(previous, candidate)

                pools[metric].extend(device_window.samples[metric])

        if rows_total == 0:
            return {}, 0, 0

        blocks: dict[str, dict[str, Any]] = {}
        for metric in self.metrics:
            count = counts[metric]
            block: dict[str, Any] = {
                "count": count,
                "mean": None,
                "min": None,
                "max": None,
                "devices": devices,
            }
            if count > 0:
                # Con count > 0 las colas monotonas no pueden estar vacias:
                # cada valor no nulo que sigue en la ventana entro en ellas.
                block["mean"] = sums[metric] / count
                block["min"] = lows[metric]
                block["max"] = highs[metric]
                values = sorted(pools[metric])
                for label, q in QUANTILES:
                    block[label] = _quantile_linear(values, q)
            else:
                # Polars devuelve null en las estadisticas de una columna sin
                # ningun valor no nulo.
                for label, _q in QUANTILES:
                    block[label] = None
            blocks[metric] = block

        return blocks, rows_total, devices


    # ------------------------------------------------------------- utilidades

    def device_count(self) -> int:
        with self._lock:
            return len(self._devices)

    def forget(self, device_id: str) -> None:
        with self._lock:
            self._devices.pop(device_id, None)

    def reset(self) -> None:
        with self._lock:
            self._devices.clear()
