"""OilGuard MQTT bridge (T8, S4 slice).

Subscribes to the mock-broker topic ``oilguard/signals`` and forwards
each message to the backend ingestion path:

- Standalone: ``python3 backend/ingest_mqtt.py`` POSTs decoded batches
  to ``BACKEND_URL/ingest`` (default ``http://localhost:8000``).
- In-process: ``backend/main.py`` calls ``run_forever(forward_fn=...)``
  in a daemon thread so ``docker compose up`` wires the full path with
  no extra process.

Message format: JSON ``{"rows": [SignalRow, ...]}`` (the T6 contract in
``sim/SCHEMA.md``). A bare single SignalRow object is also accepted.
Use ``--publish-csv PATH`` to publish a T6 CSV as one JSON batch for
round-trip demos (see ``backend/API.md``).

Stdlib + paho-mqtt only. Retries forever with backoff; every failure is
logged clearly, never silent.
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import time
import urllib.request
from typing import Any, Callable

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("oilguard-mqtt-bridge")

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "oilguard/signals")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

RECONNECT_DELAYS = (1, 2, 5, 10, 30)  # s, cycled while the broker is down


def decode_payload(raw: bytes) -> list[dict[str, Any]]:
    """Decode one MQTT message into SignalRow dicts (raises ValueError)."""
    try:
        body = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"not JSON: {exc}") from exc
    if isinstance(body, dict) and isinstance(body.get("rows"), list):
        rows = body["rows"]
    elif isinstance(body, dict) and "seq" in body:
        rows = [body]
    else:
        raise ValueError('expected {"rows": [...]} or a single SignalRow object')
    if not rows:
        raise ValueError("empty batch")
    return rows


def parse_csv_row(row: dict[str, str]) -> dict[str, Any]:
    int_fields = {"seq", "moving", "recal_window", "engine_on", "link_down"}
    float_fields = {
        "t_s",
        "slope_deg",
        "rotor_rpm",
        "wheel_rpm",
        "pressure_kpa",
        "temperature_c",
        "vib_rms_g",
        "vib_kurtosis",
        "level_liters",
        "level_pct",
        "submerged_fraction_per_revolution",
    }
    parsed: dict[str, Any] = dict(row)
    for key in int_fields:
        parsed[key] = int(float(parsed[key]))
    for key in float_fields:
        parsed[key] = float(parsed[key])
    return parsed


def post_to_backend(rows: list[dict[str, Any]], backend_url: str = BACKEND_URL) -> dict[str, Any]:
    """POST a batch to /ingest via stdlib HTTP (raises on failure)."""
    data = json.dumps({"rows": rows}).encode("utf-8")
    req = urllib.request.Request(
        f"{backend_url.rstrip('/')}/ingest",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310 - local demo bridge
        return json.loads(resp.read().decode("utf-8"))


def run_forever(
    forward_fn: Callable[[list[dict[str, Any]]], dict[str, Any]] | None = None,
    host: str = MQTT_HOST,
    port: int = MQTT_PORT,
    topic: str = MQTT_TOPIC,
) -> None:
    """Subscribe forever; forward each message via forward_fn or HTTP POST."""
    try:
        import paho.mqtt.client as mqtt  # type: ignore
    except ImportError as exc:
        log.error("paho-mqtt not installed (%s); bridge cannot start", exc)
        raise

    def forward(rows: list[dict[str, Any]]) -> dict[str, Any]:
        if forward_fn is not None:
            return forward_fn(rows)
        return post_to_backend(rows)

    client = mqtt.Client()

    def on_connect(_c: Any, _u: Any, _f: Any, rc: int) -> None:
        if rc == 0:
            log.info("connected to mqtt %s:%d, subscribing %s", host, port, topic)
            client.subscribe(topic)
        else:
            log.warning("mqtt connect refused rc=%d", rc)

    def on_message(_c: Any, _u: Any, msg: Any) -> None:
        try:
            rows = decode_payload(msg.payload)
        except ValueError as exc:
            log.warning("dropping malformed message on %s: %s", msg.topic, exc)
            return
        try:
            ack = forward(rows)
            log.info("forwarded %d rows from %s -> ingest ack=%s", len(rows), msg.topic, ack)
        except Exception as exc:  # noqa: BLE001 - one bad batch must not kill the loop
            log.warning("forward failed (%d rows): %s", len(rows), exc)

    client.on_connect = on_connect
    client.on_message = on_message

    attempt = 0
    while True:
        try:
            log.info("connecting to mqtt %s:%d ...", host, port)
            client.connect(host, port, keepalive=30)
            client.loop_forever()
        except Exception as exc:  # noqa: BLE001 - retry boundary
            delay = RECONNECT_DELAYS[min(attempt, len(RECONNECT_DELAYS) - 1)]
            log.warning("mqtt error (%s); retrying in %ds", exc, delay)
            time.sleep(delay)
            attempt += 1


def publish_csv(path: str, host: str, port: int, topic: str, limit: int = 0) -> int:
    """Publish a T6 CSV file as one JSON batch (demo helper). Returns row count."""
    try:
        import paho.mqtt.client as mqtt  # type: ignore
    except ImportError as exc:
        log.error("paho-mqtt not installed (%s); cannot publish", exc)
        raise
    rows: list[dict[str, Any]] = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            rows.append(parse_csv_row(row))
            if limit and len(rows) >= limit:
                break
    client = mqtt.Client()
    client.connect(host, port, keepalive=30)
    payload = json.dumps({"rows": rows})
    info = client.publish(topic, payload)
    info.wait_for_publish(timeout=10)
    client.disconnect()
    log.info("published %d rows from %s -> mqtt %s:%d topic %s", len(rows), path, host, port, topic)
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="OilGuard MQTT bridge (T8).")
    parser.add_argument("--host", default=MQTT_HOST)
    parser.add_argument("--port", type=int, default=MQTT_PORT)
    parser.add_argument("--topic", default=MQTT_TOPIC)
    parser.add_argument("--backend-url", default=BACKEND_URL)
    parser.add_argument(
        "--publish-csv",
        metavar="PATH",
        default="",
        help="publish a T6 CSV as one JSON batch, then exit",
    )
    parser.add_argument("--limit", type=int, default=0, help="max CSV rows to publish")
    args = parser.parse_args()
    if args.publish_csv:
        publish_csv(args.publish_csv, args.host, args.port, args.topic, args.limit)
    else:
        os.environ["BACKEND_URL"] = args.backend_url
        run_forever(host=args.host, port=args.port, topic=args.topic)


if __name__ == "__main__":
    main()
