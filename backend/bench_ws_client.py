"""Cliente pequeno que mantiene abierto /ws/fleet durante una prueba de estres.

No dibuja nada: solo cuenta los ticks que recibe y mide su latencia, que es lo
que hace el dashboard en una demo real. Sirve para comprobar que el tick, ahora
incremental, sigue el ritmo con la UI conectada.

    python -m backend.bench_ws_client --seconds 60

Requiere `websockets` (ya esta en backend/requirements.txt).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time


async def _run(url: str, seconds: float, window_s: int) -> dict[str, object]:
    try:
        import websockets
    except ImportError:  # pragma: no cover
        raise SystemExit("falta 'websockets' (esta en backend/requirements.txt)")

    ticks = 0
    rows = 0
    gaps: list[float] = []
    last = time.monotonic()
    started = last
    slowest = 0.0

    async with websockets.connect(f"{url}?window_s={window_s}") as socket:
        while time.monotonic() - started < seconds:
            try:
                raw = await asyncio.wait_for(socket.recv(), timeout=10)
            except asyncio.TimeoutError:
                gaps.append(10.0)
                continue
            now = time.monotonic()
            gap = now - last
            last = now
            if ticks:
                gaps.append(gap)
                slowest = max(slowest, gap)
            payload = json.loads(raw)
            ticks += 1
            rows = int(payload.get("rows") or 0)

    elapsed = time.monotonic() - started
    gaps.sort()
    return {
        "url": url,
        "seconds": round(elapsed, 1),
        "ticks": ticks,
        "tick_rate_hz": round(ticks / elapsed, 2) if elapsed else 0.0,
        "last_rows": rows,
        "mean_interval_s": round(sum(gaps) / len(gaps), 3) if gaps else None,
        "p95_interval_s": round(gaps[int(len(gaps) * 0.95)], 3) if gaps else None,
        "slowest_interval_s": round(slowest, 3),
        "timeout_gaps": sum(1 for gap in gaps if gap >= 9.9),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="ws://localhost:8000/ws/fleet")
    parser.add_argument("--seconds", type=float, default=60.0)
    parser.add_argument("--window", type=int, default=5)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    result = asyncio.run(_run(args.url, args.seconds, args.window))
    text = json.dumps(result, indent=2)
    print(text)
    if args.out:
        from pathlib import Path

        Path(args.out).write_text(text + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())