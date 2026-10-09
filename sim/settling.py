"""T7 settling-transient extractor / viscosity proxy (S3 slice).

On each move->rest edge (rest windows from ``sim/detect.py``) this fits a
damped-sine decay constant tau from the pressure RMS envelope and emits
``settling_ms`` plus a ``viscosity_proxy`` label
(dilute / normal / degraded).

 Honest synthetic-scale note: the T6 generator emits NO settling transient
and has NO viscosity parameter — rest pressure is flat noise. So when
``--viscosity-proxy`` is > 0 (default 1.0 = nominal fresh 85W-140), the
extractor superimposes the T3 damped-sine stub transient

    s(t) = A * exp(-t/tau) * sin(2*pi*f*t)

with ``tau = 0.3*v + 0.45`` and ``f = 2.2 - 0.4*(v-0.5)`` mirrored from
``frontend/src/sim/bench/settling.ts``, then fits tau back from the RMS
envelope. The DIRECTION (higher proxy -> larger tau -> slower settling ->
degraded label) is the requirement; the absolute ms scale is synthetic
until bench drain-and-weigh data (S7) replaces the stub. Every output row
records the injected proxy (0 = raw fit, no injection) so downstream T9+
consumers can tell synthetic from measured. Pass ``--viscosity-proxy 0``
to fit the raw pressure (on T6 data this yields the noise floor — small
amplitude, poor r_squared — which is itself the honest signal that no
transient is present).

Fit: pressure residual vs the tail median, RMS envelope in 0.25 s bins
over 6 s post-edge, log-linear least squares ln(env) = lnA - t/tau.
settling_ms = tau * ln(A/eps) * 1000 with eps = 0.05 kPa (same envelope
form as T3's estimateSettlingMs). proxy_est inverts the T3 tau formula;
labels reuse the T3 cut points (<0.8 dilute, <1.5 normal, else degraded).

Output CSV: edge_id,edge_t_s,edge_iso,tau_s,settling_ms,
viscosity_proxy_est,viscosity_label,amplitude_kpa,r_squared,injected_proxy.

Stdlib only.
"""

from __future__ import annotations

import argparse
import csv
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

SETTLE_FIT_S = 6.0
BIN_S = 0.5  # 5 samples/bin at 10 Hz: stable RMS energy AND ~1 sine period
# (1.8-2.2 Hz stub band), so phase ripple averages out instead of aliasing.
# Escalas ajustadas a la señal real de ~2.6 kPa: la oscilación inyectada vale ~el hold-up
# (6 L ~ 0.12 kPa) y el piso de "asentado" 0.005 kPa (medio ruido de un transductor 0-10 kPa).
INJECT_AMPLITUDE_KPA = 0.15  # synthetic wobble size at the edge instant
EPS_KPA = 0.005  # envelope "settled" floor for the ms projection

SETTLE_HEADER = [
    "edge_id",
    "edge_t_s",
    "edge_iso",
    "tau_s",
    "settling_ms",
    "viscosity_proxy_est",
    "viscosity_label",
    "amplitude_kpa",
    "r_squared",
    "injected_proxy",
]


def settling_tau(viscosity_proxy: float) -> float:
    """Decay constant (s). Mirrors settlingTau in bench/settling.ts."""
    return 0.3 * viscosity_proxy + 0.45


def settling_freq(viscosity_proxy: float) -> float:
    """Wobble frequency (Hz). Mirrors settlingFreq in bench/settling.ts."""
    return 2.2 - 0.4 * (viscosity_proxy - 0.5)


def viscosity_label(proxy_est: float) -> str:
    """Honest proxy label (never called raw viscosity)."""
    if proxy_est < 0.8:
        return "dilute"
    if proxy_est < 1.5:
        return "normal"
    return "degraded"


def _median(xs: list[float]) -> float:
    s = sorted(xs)
    m = len(s) // 2
    return (s[m - 1] + s[m]) / 2.0 if len(s) % 2 == 0 else s[m]


def fit_edge(samples: list[tuple[float, float]], injected: float) -> dict:
    """Fit tau from post-edge (t_rel, pressure) samples.

    ``injected`` > 0 superimposes the synthetic T3-stub transient first.
    Returns tau_s, settling_ms, proxy_est, label, amplitude, r_squared.
    """
    if injected > 0:
        tau0 = settling_tau(injected)
        f0 = settling_freq(injected)
        samples = [
            (t, p + INJECT_AMPLITUDE_KPA * math.exp(-t / tau0)
             * math.sin(2.0 * math.pi * f0 * t))
            for t, p in samples
        ]
    if len(samples) < 8:
        return {"tau_s": 0.0, "settling_ms": 0, "viscosity_proxy_est": 0.0,
                "viscosity_label": "dilute", "amplitude_kpa": 0.0, "r_squared": 0.0}
    # Fit span is whatever post-edge stillness exists (callers truncate at
    # the rest window end so HAUL noise never enters the tail). Baseline and
    # noise floor come from the last 1 s of that span.
    t_max = max(t for t, _ in samples)
    tail = [p for t, p in samples if t >= t_max - 1.0] or [p for _, p in samples]
    base = _median(tail)
    # RMS envelope in BIN_S bins.
    nbins = max(1, int(SETTLE_FIT_S / BIN_S))
    bins: list[list[float]] = [[] for _ in range(nbins)]
    for t, p in samples:
        b = min(nbins - 1, int(t / BIN_S))
        if b >= 0:
            bins[b].append((p - base) ** 2)
    envs: list[tuple[float, float]] = []
    for b, vals in enumerate(bins):
        if not vals:
            continue
        env = math.sqrt(sum(vals) / len(vals))
        envs.append(((b + 0.5) * BIN_S, env))
    if len(envs) < 4:
        return {"tau_s": 0.0, "settling_ms": 0, "viscosity_proxy_est": 0.0,
                "viscosity_label": "dilute", "amplitude_kpa": 0.0, "r_squared": 0.0}
    # Noise floor from the span tail bins (transient decayed there);
    # subtract in quadrature so the log-linear fit sees the exponential,
    # and fit only bins clearly above the floor (the decay head).
    # Floor F fixed INDEPENDENTLY from the span tail (median bin energy
    # over the last 1 s, where the transient has decayed): no A/F tradeoff,
    # so noise cannot hallucinate a transient by underestimating F.
    # Then grid-search tau with single-parameter LS for A^2 on ALL bins:
    #   env^2(t) = A^2 * exp(-2t/tau) + F^2
    # Linear space throughout (no log/Jensen bias) and no head gate
    # (no selection bias).
    tail_e2 = [e * e for t, e in envs if t >= t_max - 1.0] or [e * e for _, e in envs]
    f2 = _median(tail_e2)
    floor = math.sqrt(max(f2, 0.0))
    ts = [t for t, _ in envs]
    ys = [e * e - f2 for _, e in envs]
    best = None
    n_grid = 80
    lo_l, hi_l = math.log(0.15), math.log(5.0)
    for g in range(n_grid):
        tau_c = math.exp(lo_l + (hi_l - lo_l) * g / (n_grid - 1))
        xs = [math.exp(-2.0 * t / tau_c) for t in ts]
        denom = sum(x * x for x in xs)
        a = sum(x * y for x, y in zip(xs, ys)) / denom if denom > 1e-18 else 0.0
        a = max(a, 0.0)
        ssr = sum((y - a * x) ** 2 for x, y in zip(xs, ys))
        if best is None or ssr < best[0]:
            best = (ssr, tau_c, a)
    _, tau, a2 = best
    ymean = sum(e * e for _, e in envs) / len(envs)
    sst = sum((e * e - ymean) ** 2 for _, e in envs)
    r2 = max(0.0, 1.0 - best[0] / sst) if sst > 1e-18 else 0.0
    amp = math.sqrt(max(a2, 0.0))
    if not (amp > 2.0 * floor or (floor <= 1e-9 and amp > 0.1)):
        # No transient above the noise: honest non-detection (raw T6 fit
        # lands here). Consumers must gate on r_squared and amplitude_kpa,
        # not on the label alone.
        return {"tau_s": 0.0, "settling_ms": 0, "viscosity_proxy_est": 0.0,
                "viscosity_label": "dilute", "amplitude_kpa": amp, "r_squared": r2}
    if tau > 0 and amp > EPS_KPA:
        ms = int(round(tau * math.log(amp / EPS_KPA) * 1000.0))
    else:
        ms = 0
    proxy_est = max(0.0, (tau - 0.45) / 0.3) if tau > 0 else 0.0
    return {"tau_s": tau, "settling_ms": ms, "viscosity_proxy_est": proxy_est,
            "viscosity_label": viscosity_label(proxy_est),
            "amplitude_kpa": amp, "r_squared": r2}


def extract(rows: list[dict], windows: list[dict], injected: float) -> list[dict]:
    """Run the fit on every rest window's move->rest edge."""
    by_t = sorted(rows, key=lambda r: float(r.get("t_s", 0.0)))
    out = []
    eid = 0
    for w in windows:
        if w["state"] != "rest":
            continue
        edge = float(w["start_t_s"])
        rest_end = float(w["end_t_s"])
        # Truncate at the rest window end: the next moving zone's noise
        # must never enter the fit tail (demo stops are short by design).
        span = min(edge + SETTLE_FIT_S, rest_end + 1e-9)
        samples = []
        for r in by_t:
            t = float(r.get("t_s", 0.0))
            if edge <= t <= span:
                try:
                    samples.append((t - edge, float(r.get("pressure_kpa", 0.0))))
                except (ValueError, TypeError):
                    continue
        fit = fit_edge(samples, injected)
        out.append({
            "edge_id": eid,
            "edge_t_s": f"{edge:.1f}",
            "edge_iso": w.get("start_iso", ""),
            "tau_s": f"{fit['tau_s']:.3f}",
            "settling_ms": fit["settling_ms"],
            "viscosity_proxy_est": f"{fit['viscosity_proxy_est']:.2f}",
            "viscosity_label": fit["viscosity_label"],
            "amplitude_kpa": f"{fit['amplitude_kpa']:.3f}",
            "r_squared": f"{fit['r_squared']:.3f}",
            "injected_proxy": injected,
        })
        eid += 1
    return out


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T7 settling/viscosity extractor.")
    p.add_argument("--in", dest="inp", required=True, help="signal CSV from sim/generate.py")
    p.add_argument("--windows", required=True, help="windows CSV from sim/detect.py")
    p.add_argument("--out", dest="out", required=True, help="output settling CSV")
    p.add_argument("--viscosity-proxy", type=float, default=1.0,
                   help="T3-stub proxy for synthetic transient injection (0 = raw fit)")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    with open(args.inp, newline="") as f:
        rows = list(csv.DictReader(f))
    with open(args.windows, newline="") as f:
        windows = list(csv.DictReader(f))
    if not rows or not windows:
        raise SystemExit("signal CSV or windows CSV is empty")
    out = extract(rows, windows, args.viscosity_proxy)
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=SETTLE_HEADER)
        w.writeheader()
        w.writerows(out)
    if args.viscosity_proxy > 0:
        print(f"SYNTHETIC settling injection: proxy={args.viscosity_proxy} "
              f"(T3 stub scale; direction real, absolute ms synthetic until S7 bench)")
    else:
        print("RAW pressure fit (no injection): expect noise floor on T6 data")
    print(f"in={args.inp} edges={len(out)} out={args.out}")
    for e in out[:4]:
        print(f"  edge{e['edge_id']} t={e['edge_t_s']}s tau={e['tau_s']}s "
              f"settling={e['settling_ms']}ms proxy_est={e['viscosity_proxy_est']} "
              f"label={e['viscosity_label']} r2={e['r_squared']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
