"""Send deterministic, signed synthetic batches to the local demo backend."""

from __future__ import annotations

import json
import math
import os
import signal
import sys
import threading
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.signing import derive_device_key, sign_row
from sim.generate import SAMPLE_RATE_HZ
from sim.physics import pressure_kpa_from_volume

DEVICE_ID = "wheel-RH-01"
BATCH_SECONDS = 1.0
DEMO_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
DEMO_DATA_PATH = Path(__file__).with_name("demo-data.json")
DEFAULT_BACKEND_PORT = 8001
DEMO_HORIZON_SECONDS = 24 * 60 * 60
DEMO_ACCELERATION_SECONDS = 120


def configured_ingest_url() -> str:
    port_text = os.environ.get("OILGUARD_DEMO_BACKEND_PORT", str(DEFAULT_BACKEND_PORT))
    if not port_text.isascii() or not port_text.isdecimal():
        raise RuntimeError("OILGUARD_DEMO_BACKEND_PORT must be a valid TCP port")
    port = int(port_text)
    if not 1 <= port <= 65535:
        raise RuntimeError("OILGUARD_DEMO_BACKEND_PORT must be a valid TCP port")
    return f"http://127.0.0.1:{port}/ingest"


def demo_leak_config() -> tuple[float, float]:
    def read_finite(name: str, default: str) -> float:
        try:
            value = float(os.environ.get(name, default))
        except ValueError:
            raise RuntimeError(f"{name} debe ser un número finito.") from None
        if not math.isfinite(value):
            raise RuntimeError(f"{name} debe ser un número finito.")
        return value

    leak_l_per_h = read_finite("OILGUARD_DEMO_LEAK_L_PER_H", "60")
    floor_pct = read_finite("OILGUARD_DEMO_FLOOR_PCT", "40")
    if leak_l_per_h <= 0:
        raise RuntimeError("OILGUARD_DEMO_LEAK_L_PER_H debe ser mayor que cero.")
    if not 0 <= floor_pct < 100:
        raise RuntimeError("OILGUARD_DEMO_FLOOR_PCT debe estar entre 0 y 100, sin incluir 100.")
    return leak_l_per_h, floor_pct


def _master_key() -> bytes:
    key_hex = os.environ.get("OILGUARD_DEVICE_MASTER_KEY", "")
    try:
        key = bytes.fromhex(key_hex)
    except ValueError:
        raise RuntimeError("OILGUARD_DEVICE_MASTER_KEY must contain valid hex") from None
    if not key:
        raise RuntimeError("OILGUARD_DEVICE_MASTER_KEY is required")
    return key


def _demo_payload() -> dict[str, object]:
    return json.loads(DEMO_DATA_PATH.read_text(encoding="utf-8"))


def first_batch(
    seed: int = 7,
    start: datetime = DEMO_START,
    batch_index: int = 0,
    clock: Callable[[], datetime] | None = None,
) -> list[dict[str, object]]:
    """Load the canonical demo templates and sign one reproducible batch."""
    master_key = _master_key()
    device_key = derive_device_key(master_key, DEVICE_ID)
    payload = _demo_payload()
    rows_per_batch = int(BATCH_SECONDS * SAMPLE_RATE_HZ)
    rows = [dict(row) for row in payload["demo"]["ingestRows"][:rows_per_batch]]
    send_time = (clock or (lambda: datetime.now(timezone.utc)))()
    for row in rows:
        elapsed = batch_index * BATCH_SECONDS + float(row["t_s"])
        row["seq"] = batch_index * int(BATCH_SECONDS * SAMPLE_RATE_HZ) + int(row["seq"])
        row["t_s"] = f"{elapsed:.1f}"
        row["device_id"] = DEVICE_ID
        row["t_iso"] = (send_time + timedelta(seconds=elapsed)).astimezone(timezone.utc).isoformat()
    return [sign_row(row, device_key) for row in rows]


def iter_batches(
    seed: int = 7,
    start: datetime = DEMO_START,
    seconds: float = 120.0,
    target_drop_l: float = 4.0,
    calibration_seconds: float | None = None,
    clock: Callable[[], datetime] | None = None,
    leak_l_per_h: float | None = None,
    floor_l: float = 0.0,
):
    """Yield signed batches from the canonical JSON templates."""
    master_key = _master_key()
    device_key = derive_device_key(master_key, DEVICE_ID)
    payload = _demo_payload()
    demo = payload["demo"]
    templates = demo["ingestRows"]
    if not templates:
        raise RuntimeError("demo JSON must contain ingest row templates")
    capacity_l = float(payload["physics"]["constants"]["capacityL"])
    rate_horizon = calibration_seconds if calibration_seconds is not None else seconds
    leak_l_per_s = (
        leak_l_per_h / 3600.0
        if leak_l_per_h is not None
        else target_drop_l / max(1.0, rate_horizon - 2.0)
    )
    effective_floor_l = max(0.0, floor_l)
    sample_count = int(round(seconds * SAMPLE_RATE_HZ))
    rows_per_batch = int(BATCH_SECONDS * SAMPLE_RATE_HZ)
    for offset in range(0, sample_count, rows_per_batch):
        batch_clock = (clock or (lambda: datetime.now(timezone.utc)))()
        batch = []
        for seq in range(offset, min(offset + rows_per_batch, sample_count)):
            row = dict(templates[seq % len(templates)])
            elapsed = seq / SAMPLE_RATE_HZ
            level_l = max(
                effective_floor_l,
                capacity_l - leak_l_per_s * max(0.0, elapsed - 2.0),
            )
            temperature_c = float(row["temperature_c"])
            template_level_l = float(row["level_liters"])
            pressure_noise = float(row["pressure_kpa"]) - pressure_kpa_from_volume(
                template_level_l, temperature_c
            )
            row.update({
                "t_iso": (
                    batch_clock + timedelta(seconds=(seq - offset) / SAMPLE_RATE_HZ)
                ).astimezone(timezone.utc).isoformat(),
                "t_s": f"{elapsed:.1f}",
                "seq": seq,
                "device_id": DEVICE_ID,
                "level_liters": f"{level_l:.4f}",
                "level_pct": f"{100.0 * level_l / capacity_l:.3f}",
                "pressure_kpa": f"{pressure_kpa_from_volume(max(0.0, level_l), temperature_c) + pressure_noise:.3f}",
                "label": "slow-leak" if elapsed >= 2.0 else "normal",
            })
            batch.append(row)
        yield [sign_row(row, device_key) for row in batch]


def post_batch(rows: list[dict[str, object]], timeout: float = 5.0) -> int:
    request = urllib.request.Request(
        configured_ingest_url(),
        data=json.dumps({"rows": rows}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read())
            return int(payload.get("ingested", 0))
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError):
        return 0


def run(
    stop: threading.Event,
    leak_l_per_h: float | None = None,
    floor_l: float = 0.0,
) -> tuple[int, int, int]:
    batches = sent_rows = failed_batches = 0
    for batch in iter_batches(
        seconds=DEMO_HORIZON_SECONDS,
        calibration_seconds=DEMO_ACCELERATION_SECONDS,
        leak_l_per_h=leak_l_per_h,
        floor_l=floor_l,
    ):
        if stop.is_set():
            break
        ingested = post_batch(batch)
        batches += 1
        sent_rows += ingested
        failed_batches += ingested == 0
        stop.wait(1.0)
    return batches, sent_rows, failed_batches


def main() -> int:
    stop = threading.Event()
    signal.signal(signal.SIGINT, lambda _signum, _frame: stop.set())
    signal.signal(signal.SIGTERM, lambda _signum, _frame: stop.set())
    try:
        configured_ingest_url()
        leak_l_per_h, floor_pct = demo_leak_config()
        capacity_l = float(_demo_payload()["physics"]["constants"]["capacityL"])
        floor_l = capacity_l * floor_pct / 100.0
        minutes_to_floor = (capacity_l - floor_l) / leak_l_per_h * 60.0

        def format_es(value: float) -> str:
            return f"{value:g}".replace(".", ",")

        print(
            f"Fuga demo: {format_es(leak_l_per_h)} L/h; piso {format_es(floor_pct)} % "
            f"({format_es(floor_l)} L); el piso se alcanza en ~{format_es(minutes_to_floor)} min.",
            file=sys.stderr,
        )
        batches, sent_rows, failed_batches = run(stop, leak_l_per_h, floor_l)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(f"batches={batches} rows={sent_rows} failed_batches={failed_batches}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
