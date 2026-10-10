"""Matriz de estrés: simulador Rust -> Mosquitto -> backend, throughput vs latencia.

Uso (con el stack de docker compose arriba y el binario release compilado):

    python3 bench/stress/run_matrix.py --devices 100,1000,5000 --seconds 60 \
        --edge edge-sim/target/release/oilguard-edge --out docs/bench/stress-results.json

Por cada tamaño de flota lanza el simulador en modo realtime, muestrea
``/metrics/ingest`` del backend cada segundo y ``docker stats`` del contenedor
del backend, y guarda los resultados crudos. Solo stdlib: corre igual en CI o en
una máquina de laboratorio.
"""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import subprocess
import sys
import time
import urllib.request
from typing import Any

WARMUP_S = 5.0


def _get_json(url: str, timeout: float = 2.0) -> dict[str, Any] | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def unwrap_metrics(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    """El backend envuelve las métricas en {"ingest": {...}}; acepta ambas formas."""
    if payload is None:
        return None
    return payload.get("ingest", payload)


def _docker_stats(container: str) -> dict[str, Any] | None:
    try:
        out = subprocess.run(
            ["docker", "stats", "--no-stream", "--format", "{{json .}}", container],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        ).stdout.strip()
        data = json.loads(out)
    except Exception:
        return None
    return {"cpu_pct": _pct(data.get("CPUPerc")), "mem": data.get("MemUsage")}


def _pct(value: str | None) -> float | None:
    try:
        return float(str(value).rstrip("%"))
    except ValueError:
        return None


def summarize(samples: list[dict[str, Any]], expected_rows_per_s: float) -> dict[str, Any]:
    """Resume las muestras del régimen estable (después del calentamiento)."""
    steady = [s for s in samples if s["t"] >= WARMUP_S and s.get("metrics")]
    rates = [s["metrics"]["rows"]["accepted_1s"] for s in steady if "rows" in s["metrics"]]
    lat = [s["metrics"].get("latency", {}) for s in steady]
    p50 = [x["p50_s"] for x in lat if x.get("p50_s") is not None]
    p99 = [x["p99_s"] for x in lat if x.get("p99_s") is not None]
    cpu = [s["docker"]["cpu_pct"] for s in steady if s.get("docker") and s["docker"]["cpu_pct"] is not None]
    queue_depth = [s["metrics"].get("queue", {}).get("depth", 0) for s in steady]
    dropped = [s["metrics"].get("queue", {}).get("dropped_batches", 0) for s in steady]
    return {
        "expected_rows_per_s": expected_rows_per_s,
        "accepted_rows_per_s_median": statistics.median(rates) if rates else None,
        "accepted_ratio": (statistics.median(rates) / expected_rows_per_s) if rates else None,
        "latency_p50_s_median": statistics.median(p50) if p50 else None,
        "latency_p99_s_max": max(p99) if p99 else None,
        "queue_depth_max": max(queue_depth) if queue_depth else None,
        "dropped_batches_final": dropped[-1] if dropped else None,
        "backend_cpu_pct_median": statistics.median(cpu) if cpu else None,
        "samples": len(steady),
    }


def run_case(args: argparse.Namespace, devices: int) -> dict[str, Any]:
    cmd = [
        args.edge,
        "--devices", str(devices),
        "--rate-hz", str(args.rate_hz),
        "--seconds", str(args.seconds),
        "--mode", "realtime",
        "--mqtt-url", args.mqtt_url,
        "--batch-rows", str(args.batch_rows),
        "--stats-interval", "5",
        "--device-prefix", f"stress{devices}",
    ]
    sim = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    samples: list[dict[str, Any]] = []
    t0 = time.monotonic()
    while sim.poll() is None:
        now = time.monotonic() - t0
        samples.append(
            {
                "t": round(now, 2),
                "metrics": unwrap_metrics(_get_json(f"{args.backend}/metrics/ingest")),
                "docker": _docker_stats(args.backend_container) if int(now) % 5 == 0 else None,
            }
        )
        time.sleep(1.0)
    stderr = sim.stderr.read() if sim.stderr else ""
    sim_stats = [json.loads(line) for line in stderr.splitlines() if line.startswith("{")]
    return {
        "devices": devices,
        "rate_hz": args.rate_hz,
        "seconds": args.seconds,
        "simulator_final": sim_stats[-1] if sim_stats else None,
        "summary": summarize(samples, devices * args.rate_hz),
        "samples": samples,
    }


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--devices", default="100,1000,5000")
    p.add_argument("--rate-hz", type=int, default=10)
    p.add_argument("--seconds", type=int, default=60)
    p.add_argument("--batch-rows", type=int, default=10)
    p.add_argument("--edge", default="edge-sim/target/release/oilguard-edge")
    p.add_argument("--mqtt-url", default="mqtt://localhost:1883")
    p.add_argument("--backend", default="http://localhost:8000")
    p.add_argument("--backend-container", default="oilguard-backend")
    p.add_argument("--pause-s", type=float, default=15.0)
    p.add_argument("--out", default="docs/bench/stress-results.json")
    args = p.parse_args(argv)

    if _get_json(f"{args.backend}/health") is None:
        print("backend not reachable", file=sys.stderr)
        return 2
    results = []
    for i, devices in enumerate(int(x) for x in args.devices.split(",")):
        if i:
            time.sleep(args.pause_s)
        print(f"running {devices} devices x {args.rate_hz} Hz for {args.seconds} s", file=sys.stderr)
        results.append(run_case(args, devices))
    report = {
        "environment": {
            "machine": platform.machine(),
            "platform": platform.platform(),
            "python": platform.python_version(),
        },
        "warmup_s": WARMUP_S,
        "cases": results,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")
    for case in results:
        print(json.dumps({"devices": case["devices"], **case["summary"]}), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
