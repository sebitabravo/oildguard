"""Startup, shutdown, and MQTT bridge handlers delegated from backend.main."""
from __future__ import annotations

import threading
from typing import Any

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def _probe_influx() -> None:
    main = _main()
    """Sonda de arranque que comprueba la AUTENTICACION, no solo el puerto.

    `/health` responde 200 con cualquier token, o sin token: probeando ahi el
    backend queda en verde mientras cada escritura se va a 401 y las filas
    terminan solo en memoria.

    El token se valida contra `/api/v2/buckets`: es de solo lectura, barato, y
    responde 401 con un token invalido. Ojo con `/api/v2/signin`: ese es el
    endpoint de SESION y espera Basic auth, asi que devuelve 401 incluso con un
    token perfectamente valido.

    Es best-effort por diseno: un fallo avisa en WARNING y no impide arrancar.
    """
    url = main.INFLUXDB_URL
    token = main.INFLUXDB_TOKEN.strip()
    probe_url = f"{url}/api/v2/buckets" if token else f"{url}/health"
    try:
        import urllib.request

        if not url:
            main.log.warning("InfluxDB probe skipped: INFLUXDB_URL is empty")
            return
        if not token:
            main.log.warning(
                "InfluxDB probe without INFLUXDB_TOKEN: %s only proves the port answers",
                probe_url,
            )
            req = urllib.request.Request(probe_url, method="GET")
        else:
            req = urllib.request.Request(  # noqa: S310 - local health probe
                probe_url,
                method="GET",
                headers={"Authorization": f"Token {token}"},
            )
        with urllib.request.urlopen(req, timeout=2) as resp:  # noqa: S310 - local health probe
            main.log.info("InfluxDB probe %s -> %s", probe_url, resp.status)
    except Exception as exc:  # noqa: BLE001 - probe must never block startup
        main.log.warning(
            "InfluxDB probe failed (%s=%s); ingest falls back to memory store",
            probe_url,
            exc,
        )


def enqueue_batch(rows: list[dict[str, Any]]) -> dict[str, Any]:
    main = _main()
    """Punto de entrada del puente MQTT: encola y reporta el resultado del turno.

    Un lote que no entra se descarta y se cuenta; devolver el drop en el ack
    hace visible la contrapresion en el log del broker en vez de perderla.
    """
    if main._PIPELINE.submit(rows):
        return {"status": "queued", "kind": "ingest-queued", "rows": len(rows)}
    return {
        "status": "dropped",
        "kind": "ingest-dropped",
        "rows": len(rows),
        "reason": "queue_full",
        "queue_capacity": main._PIPELINE.capacity(),
    }


def _start_mqtt_bridge() -> None:
    main = _main()
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
            main.log.warning("MQTT bridge disabled (no ingest_mqtt module: %s)", exc)
            return

    def _loop() -> None:
        try:
            run_forever(forward_fn=main.enqueue_batch)
        except Exception as exc:  # noqa: BLE001 - background thread boundary
            main.log.warning(
                "MQTT bridge stopped (broker %s:%s topic %s: %s); "
                "POST /ingest remains available",
                main.MQTT_HOST,
                main.MQTT_PORT,
                main.MQTT_TOPIC,
                exc,
            )

    t = threading.Thread(target=_loop, name="mqtt-bridge", daemon=True)
    t.start()
    main.log.info("MQTT bridge thread started (broker %s:%s topic %s)", main.MQTT_HOST, main.MQTT_PORT, main.MQTT_TOPIC)


def on_startup() -> None:
    main = _main()
    if main._INFLUX_WRITE and not main.INFLUXDB_TOKEN.strip():
        raise RuntimeError("INFLUXDB_TOKEN is required when OILGUARD_INFLUX_WRITE=1")
    main._probe_influx()
    main._INFLUX_WRITER.start()
    main._PIPELINE.start()
    main._start_mqtt_bridge()


def on_shutdown() -> None:
    # Vaciar el pipeline y despues el escritor: lo que este en la cola del
    # pipeline todavia puede encolar en la del escritor.
    main = _main()
    main._PIPELINE.stop(timeout=5.0)
    drained = main._INFLUX_WRITER.stop(timeout=5.0)
    main.log.info(
        "shutdown complete: influx drained=%d batches, written=%d, dropped=%d",
        drained,
        main._INFLUX_WRITER.written_batches(),
        main._INFLUX_WRITER.dropped_batches(),
    )
