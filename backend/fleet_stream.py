"""Fleet websocket and tick-cache implementation delegated from backend.main."""
from __future__ import annotations

import asyncio
import json
import threading
import time
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def fleet_tick(window_s: int) -> dict[str, Any]:
    main = _main()
    """Un tick del stream: agregados de flota en grupo fleet + estado de ingesta."""
    if main._FLEET_ROLLING.covers(window_s):
        blocks, rows, devices = main._FLEET_ROLLING.snapshot(window_s)
    else:
        # Fuera del horizonte lo incremental no puede responder sin inventarse
        # un cero, asi que se cae a la ruta exacta.
        frame = main.build_frame(main._STORE.snapshot_window(window_s))
        blocks, rows, devices = main.aggregate_fleet(frame, list(main.DEFAULT_METRICS))
    return {
        "type": "fleet_tick",
        "as_of": main._now_iso(),
        "window_s": window_s,
        "rows": rows,
        "devices": devices,
        "quantile_interpolation": main.QUANTILE_INTERPOLATION,
        "aggregates": blocks,
        "ingest": main._INGEST_METRICS.compact(queue=main.queue_state()),
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
        main = _main()
        now = self._now_fn()
        with self._lock:
            fresh = self._payload is not None and (now - self._at) < self.interval_s
            if fresh and self._window == window_s:
                return self._payload
        payload = main.fleet_tick(window_s)
        with self._lock:
            self._payload, self._window, self._at = payload, window_s, self._now_fn()
        return payload

    def advance(self, seconds: float) -> None:
        with self._lock:
            self._at -= seconds

    def reset(self) -> None:
        with self._lock:
            self._payload, self._window, self._at = None, None, 0.0


def cached_fleet_tick(window_s: int) -> dict[str, Any]:
    main = _main()
    return main._FLEET_TICK_CACHE.get(window_s)


def _parse_tick_window(raw: str, current: int) -> int:
    main = _main()
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
    return value if main.FLEET_WINDOW_MIN <= value <= main.FLEET_WINDOW_MAX else current


async def fleet_stream(websocket: WebSocket) -> None:
    main = _main()
    """Emite un tick por segundo; el cliente puede pedir otra ventana.

    Nunca se acumulan ticks: hay uno en vuelo como maximo, asi que un cliente
    lento pierde muestras en vez de acumular memoria en el servidor. La lectura
    corre en una tarea aparte para no perder un ``window_s`` que llega justo en
    el limite del timeout, que es lo que pasaria al cancelar un ``receive``.
    """
    await websocket.accept()
    window_s = main.FLEET_DEFAULT_WINDOW
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
            main.log.debug("fleet ws reader stopped: %s", exc)
        finally:
            closed.set()

    reader = asyncio.create_task(_reader())
    try:
        while not closed.is_set():
            # El calculo de percentiles es CPU-bound; en el hilo de eventos
            # congelaria cada ruta HTTP durante cada tick.
            payload = await run_in_threadpool(main.cached_fleet_tick, window_s)
            await websocket.send_json(payload)
            try:
                raw = await asyncio.wait_for(commands.get(), timeout=main.FLEET_TICK_SECONDS)
            except asyncio.TimeoutError:
                continue
            window_s = main._parse_tick_window(raw, window_s)
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001 - una conexion rota no es un 500
        main.log.info("fleet ws closed (%s)", exc)
    finally:
        reader.cancel()
        main.log.info("fleet ws disconnected (window_s=%d)", window_s)
