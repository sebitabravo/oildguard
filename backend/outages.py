"""Rachas de corte (``link_down``) seguidas en la ingesta (R2d).

``/fleet/outages`` ordenaba las filas de cada dispositivo y las reescaneaba
enteras en cada peticion: ``O(dispositivos · n log n)`` con ``n`` filas
retenidas, y el dashboard la consulta cada pocos segundos.

Aqui la racha se mantiene al insertar la fila. Una racha abierta es un
``start``; al cerrarse pasa a un deque acotado. Leer es entonces
``O(dispositivos + resultado)``.

**Late arrival.** El almacen inserta en orden de llegada, pero el calculo
exacto ordenaba por ``seq`` antes de escanear. Una fila que llega con un
``seq`` menor que el ultimo visto podria cerrar una racha que en realidad se
extiende. En vez de suponer que eso no pasa, el dispositivo se marca ``dirty``
y se reconstruye desde el almacen cuando se lee: correcto siempre, y el coste
se paga solo en los equipos con llegadas fuera de orden.

El recorte de las rachas es por ``maxlen``, no global: cada equipo conserva sus
ultimas rachas. Es el mismo criterio que la retencion de filas, y evita que un
equipo ruidoso empuje el historial de todos los demas.
"""

from __future__ import annotations

from collections import deque
from typing import Any, Iterable

DEFAULT_MAX_RUNS_PER_DEVICE = 50


def build_run(
    device_id: str,
    start: dict[str, Any],
    end: dict[str, Any],
    rows_buffered: int,
) -> dict[str, Any]:
    """Construye el bloque de una racha desde su primera y su ultima fila.

    ``forwarded`` queda en None a proposito: el backend no entrega nada durante
    un corte, asi que afirmar un numero de filas entregadas seria inventar una
    medida. La UI lo trata como desconocido.
    """
    return {
        "device_id": device_id,
        "start_t_iso": start.get("t_iso"),
        "end_t_iso": end.get("t_iso"),
        "start_t_s": start["t_s"],
        "end_t_s": end["t_s"],
        "duration_s": round(end["t_s"] - start["t_s"], 3),
        "rows_buffered": rows_buffered,
        "forwarded": None,
    }


def runs_from_rows(rows: Iterable[dict[str, Any]], device_id: str) -> list[dict[str, Any]]:
    """Rachas de filas con ``link_down`` dentro de filas ya ordenadas por ``seq``.

    Es la ruta exacta: la que se usaba antes en cada peticion. Se conserva
    porque es la referencia contra la que se prueba la incremental.
    """
    runs: list[dict[str, Any]] = []
    start: dict[str, Any] | None = None
    last: dict[str, Any] | None = None
    count = 0

    for row in rows:
        if int(row.get("link_down") or 0) == 1:
            if start is None:
                start = row
            last = row
            count += 1
        else:
            if start is not None and last is not None:
                runs.append(build_run(device_id, start, last, count))
            start = None
            last = None
            count = 0
    if start is not None and last is not None:
        runs.append(build_run(device_id, start, last, count))
    return runs


class _DeviceRuns:
    __slots__ = ("closed", "open_start", "open_last", "open_rows", "last_seq", "dirty")

    def __init__(self) -> None:
        self.closed: deque[dict[str, Any]] = deque(maxlen=DEFAULT_MAX_RUNS_PER_DEVICE)
        self.open_start: dict[str, Any] | None = None
        self.open_last: dict[str, Any] | None = None
        self.open_rows = 0
        self.last_seq = -1
        self.dirty = False


class OutageTracker:
    """Rachas de corte por dispositivo, mantenidas al insertar cada fila."""

    def __init__(self, max_runs_per_device: int = DEFAULT_MAX_RUNS_PER_DEVICE) -> None:
        self._devices: dict[str, _DeviceRuns] = {}
        self._max_runs = int(max_runs_per_device)

    def observe(self, device_id: str, seq: int, t_s: float, t_iso: Any, link_down: Any) -> None:
        """Registra una fila aceptada. Las llamadas deben llegar en orden de ``seq``."""
        state = self._devices.get(device_id)
        if state is None:
            state = _DeviceRuns()
            state.closed = deque(maxlen=self._max_runs)
            self._devices[device_id] = state

        if seq <= state.last_seq:
            # Llegada fuera de orden: el incremental ya no puede garantizar que
            # la agrupacion por seq sea la correcta, asi que se reconstruye al
            # leer en vez de dar una respuesta silenciosamente equivocada.
            state.dirty = True
            return

        state.last_seq = seq
        row = {"t_s": t_s, "t_iso": t_iso}

        if int(link_down or 0) == 1:
            if state.open_start is None:
                state.open_start = row
            state.open_last = row
            state.open_rows += 1
        elif state.open_start is not None:
            state.closed.append(build_run(device_id, state.open_start, state.open_last, state.open_rows))
            state.open_start = None
            state.open_last = None
            state.open_rows = 0

    def rebuild(self, device_id: str, rows: Iterable[dict[str, Any]]) -> None:
        """Recalcula desde el almacen tras una llegada fuera de orden."""
        ordered = sorted(rows, key=lambda row: int(row.get("seq", 0)))
        state = self._devices.get(device_id)
        if state is None:
            state = _DeviceRuns()
            state.closed = deque(maxlen=self._max_runs)
            self._devices[device_id] = state
        # Se SUSTITUYE el historial, no se anade: el incremental anterior ya
        # contabia rachas que la reconstruccion ya no confirma.
        state.closed.clear()
        for run in runs_from_rows(ordered, device_id):
            state.closed.append(run)
        state.open_start = None
        state.open_last = None
        state.open_rows = 0
        state.dirty = False
        if ordered:
            state.last_seq = int(ordered[-1].get("seq", state.last_seq))

    def is_dirty(self, device_id: str) -> bool:
        state = self._devices.get(device_id)
        return bool(state and state.dirty)

    def runs(self, device_id: str) -> list[dict[str, Any]]:
        """Rachas de un dispositivo: las cerradas mas la que sigue abierta."""
        state = self._devices.get(device_id)
        if state is None:
            return []
        out = list(state.closed)
        if state.open_start is not None and state.open_last is not None:
            out.append(build_run(device_id, state.open_start, state.open_last, state.open_rows))
        return out

    def device_ids(self) -> list[str]:
        return list(self._devices)

    def reset(self) -> None:
        self._devices.clear()
