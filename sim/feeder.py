"""Send deterministic, signed synthetic batches to the local demo backend."""

from __future__ import annotations

import json
import os
import signal
import sys
import threading
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.signing import derive_device_key, sign_row
from sim.generate import SAMPLE_RATE_HZ, iter_rows

DEVICE_ID = "wheel-RH-01"
BATCH_SECONDS = 1.0
DEMO_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
DEFAULT_BACKEND_PORT = 8001


def configured_ingest_url() -> str:
    port_text = os.environ.get("OILGUARD_DEMO_BACKEND_PORT", str(DEFAULT_BACKEND_PORT))
    if not port_text.isascii() or not port_text.isdecimal():
        raise RuntimeError("OILGUARD_DEMO_BACKEND_PORT must be a valid TCP port")
    port = int(port_text)
    if not 1 <= port <= 65535:
        raise RuntimeError("OILGUARD_DEMO_BACKEND_PORT must be a valid TCP port")
    return f"http://127.0.0.1:{port}/ingest"


def _master_key() -> bytes:
    key_hex = os.environ.get("OILGUARD_DEVICE_MASTER_KEY", "")
    try:
        key = bytes.fromhex(key_hex)
    except ValueError:
        raise RuntimeError("OILGUARD_DEVICE_MASTER_KEY must contain valid hex") from None
    if not key:
        raise RuntimeError("OILGUARD_DEVICE_MASTER_KEY is required")
    return key


def first_batch(
    seed: int = 7,
    start: datetime = DEMO_START,
    batch_index: int = 0,
) -> list[dict[str, object]]:
    """Build one reproducible batch and sign it with the backend's device key."""
    master_key = _master_key()
    device_key = derive_device_key(master_key, DEVICE_ID)
    batch_start = start + timedelta(seconds=batch_index * BATCH_SECONDS)
    rows = list(
        iter_rows(
            "clean",
            BATCH_SECONDS,
            DEVICE_ID,
            seed + batch_index,
            start=batch_start,
        )
    )
    for row in rows:
        row["seq"] = batch_index * int(BATCH_SECONDS * SAMPLE_RATE_HZ) + int(row["seq"])
        row["t_s"] = f"{batch_index * BATCH_SECONDS + float(row['t_s']):.1f}"
    return [sign_row(row, device_key) for row in rows]


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


def run(stop: threading.Event) -> tuple[int, int, int]:
    batches = sent_rows = failed_batches = batch_index = 0
    while not stop.is_set():
        ingested = post_batch(first_batch(batch_index=batch_index))
        batches += 1
        sent_rows += ingested
        failed_batches += ingested == 0
        batch_index += 1
        stop.wait(1.0)
    return batches, sent_rows, failed_batches


def main() -> int:
    stop = threading.Event()
    signal.signal(signal.SIGINT, lambda _signum, _frame: stop.set())
    signal.signal(signal.SIGTERM, lambda _signum, _frame: stop.set())
    try:
        configured_ingest_url()
        batches, sent_rows, failed_batches = run(stop)
    except RuntimeError:
        print("batches=0 rows=0 failed_batches=1")
        return 1
    print(f"batches={batches} rows={sent_rows} failed_batches={failed_batches}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
