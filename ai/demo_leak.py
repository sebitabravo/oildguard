"""T10 leak demo: clean -> slow-leak (LAB-ACCELERATED, labeled) -> abrupt-drop -> N4.

Runs three synthetic stages, scores each with the T10 stack
(``ai/level.py`` regression + ``ai/rul.py`` extrapolation +
``ai/ladder.py`` N1–N4), and prints the alert walk plus the RUL
countdown. Every accelerated rate is labeled LAB-ACCELERATED with its
x-factor vs the 0.5 %/h spec truth.

LAB-RATE NOTE: at the spec-true 0.5 %/h a 120 s demo drops ~0.008 L —
invisible by design (see sim/SCHEMA.md and docs/t9-anomaly.md). The
slow-leak stage therefore auto-accelerates to drop ~4 L over the run
(default 120 s -> ~129 %/h, x257 vs spec). It proves the
regression/RUL/ladder logic, not the field rate.

Usage::

    python3 ai/demo_leak.py --seconds 120
    python3 ai/demo_leak.py --seconds 300 --target-drop-l 6

Stdlib only.
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from ai import ladder as ladder_mod  # noqa: E402
from ai import rul as rul_mod  # noqa: E402
from sim.detect import detect_windows  # noqa: E402
from sim.generate import iter_rows  # noqa: E402

SPEC_LEAK_PCT_PER_H = 0.5
DEFAULT_SECONDS = 120.0
DEFAULT_TARGET_DROP_L = 4.0
DEFAULT_DROP_LITERS = 15.0


def accel_rate_for(seconds: float, target_drop_l: float) -> float:
    """Lab-accelerated leak rate (%/h) dropping ~target_drop_l over the run."""
    span = max(1.0, seconds - 2.0)  # onset at t = 2 s
    return target_drop_l / 95.0 * 100.0 * 3600.0 / span


def gen_stage(scenario: str, seconds: float, seed: int, **kw) -> list[dict]:
    return list(iter_rows(scenario, seconds, "wheel-RH-01", seed, **kw))


def rest_flags(rows: list[dict]) -> set[int]:
    """T7 detector rest membership as a set of seq (audit parity with T9)."""
    str_rows = [{k: (str(v) if v is not None else "") for k, v in r.items()}
                for r in rows]
    windows = detect_windows(str_rows)
    spans = sorted(
        (float(w["start_t_s"]), float(w["end_t_s"]))
        for w in windows if w["state"] == "rest")
    flagged: set[int] = set()
    for r in rows:
        t = float(r["t_s"])
        for lo, hi in spans:
            if lo <= t <= hi:
                flagged.add(int(r["seq"]))
                break
    return flagged


def to_samples(rows: list[dict], rest: set[int]) -> list[dict]:
    samples = []
    for r in rows:
        s = dict(r)
        s["rest"] = int(r["seq"]) in rest
        samples.append(s)
    return samples


def run_stage(name: str, rows: list[dict], expect: str, leak_note: str = "") -> dict:
    rest = rest_flags(rows)
    bundle = ladder_mod.evaluate(to_samples(rows, rest))
    bundle.update({"name": name, "rows": rows, "n_rest": len(rest),
                   "leak_note": leak_note, "expect": expect})
    return bundle


def print_stage(bundle: dict) -> None:
    lev, rul = bundle["level"], bundle["rul"]
    print(f"--- {bundle['name']} (expect: {bundle['expect']}){bundle['leak_note']}")
    print(f"    rows={len(bundle['rows'])} rest={bundle['n_rest']} "
          f"scored={lev['n_scored']} sigma_L={lev['sigma_liters']} L "
          f"conf={lev['confidence']} model={bundle['model']}")
    if rul["status"] == "ok":
        print(f"    RUL slope={rul['slope_L_per_h']} L/h R2={rul['r2']} "
              f"to-warning={rul['hours_to_warning']} h "
              f"to-critical={rul['hours']} h "
              f"cycles={rul['haul_cycles']} shifts={rul['shifts']} "
              f"conf={rul['confidence']}")
    else:
        print(f"    RUL SUPPRESSED: {rul['reason']}")
    for a in bundle["alerts"]:
        print(f"    {a['level']} {a['alert_id']} t_s={a['t_s']} "
              f"zone={a['zone']} lvl={a['inputs']['level_med_L']} L "
              f"({a['inputs']['level_med_pct']}%) z_med={a['inputs']['z_med']} "
              f":: {a['reason']}")
    if not bundle["alerts"]:
        print("    (no alerts)")


def print_countdown(bundle: dict, level_estimates: list[dict]) -> None:
    """RUL countdown: cumulative trend fit at each scored window end."""
    scored = sorted(
        [e for e in level_estimates if not e["gated"] and not e["train"]],
        key=lambda e: e["seq"])
    if len(scored) < 10:
        print("    countdown: insufficient scored samples")
        return
    print("    RUL countdown (cumulative, LAB-ACCELERATED rate):")
    step = max(1, len(scored) // 5)
    for k in range(step, len(scored) + 1, step):
        pts = [(e["t_s"], e["level_liters"]) for e in scored[:k]]
        trend = rul_mod.fit_trend(pts)
        if trend["slope_per_h"] < 0 and trend["r2"] >= 0.3:
            rate = -trend["slope_per_h"]
            cur = pts[-1][1]
            h = max(0.0, (cur - rul_mod.WARN_L) / rate)
            print(f"      t_s={pts[-1][0]:6.1f} lvl={cur:6.2f} L "
                  f"R2={trend['r2']:.2f} -> warn in {h:6.2f} h "
                  f"({h * 3600 / 29:.0f} cycles, {h / 8:.2f} shifts)")
        else:
            print(f"      t_s={pts[-1][0]:6.1f} lvl={pts[-1][1]:6.2f} L "
                  f"R2={trend['r2']:.2f} -> no extrapolatable trend yet")


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T10 regression/RUL/ladder demo.")
    p.add_argument("--seconds", type=float, default=DEFAULT_SECONDS,
                   help="per-stage length in seconds")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--target-drop-l", type=float, default=DEFAULT_TARGET_DROP_L,
                   help="slow-leak stage total drop (sets the LAB rate)")
    p.add_argument("--drop-liters", type=float, default=DEFAULT_DROP_LITERS,
                   help="abrupt-drop step Litres")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    rate = accel_rate_for(args.seconds, args.target_drop_l)
    factor = rate / SPEC_LEAK_PCT_PER_H
    print(f"T10_RUL_LADDER_DEMO seed={args.seed} seconds={args.seconds}")
    print(f"SPEC leak rate: {SPEC_LEAK_PCT_PER_H} %/h (field truth; "
          f"invisible in short demos)")

    stages = []
    stages.append(run_stage("clean", gen_stage("clean", args.seconds, args.seed),
                            "no-alert"))
    leak_note = (f" [LAB-ACCELERATED leak {rate:.1f} %/h x{factor:.0f} vs "
                 f"spec {SPEC_LEAK_PCT_PER_H} %/h; ~{args.target_drop_l} L "
                 f"over {args.seconds:.0f} s]")
    slow = run_stage("slow-leak",
                     gen_stage("slow-leak", args.seconds, args.seed,
                               leak_pct_per_h=rate),
                     "N1+N2+N3", leak_note=leak_note)
    stages.append(slow)
    stages.append(run_stage("abrupt-drop",
                            gen_stage("abrupt-drop", args.seconds, args.seed,
                                      drop_liters=args.drop_liters),
                            "N4"))

    ok = True
    for bundle in stages:
        print_stage(bundle)
        if bundle["name"] == "slow-leak":
            from ai import level as level_mod
            lev = level_mod.estimate(
                to_samples(bundle["rows"], rest_flags(bundle["rows"])))
            print_countdown(bundle, lev["estimates"])
        got = set(bundle["escalation"])
        if bundle["name"] == "clean" and got:
            print(f"    NOTE: clean run raised {sorted(got)} "
                  f"(single-window FP absorbed by ladder persistence; "
                  f"see docs/t10-rul-ladder.md)")
        if bundle["name"] == "slow-leak":
            for need in ("N1", "N2", "N3"):
                if need not in got:
                    print(f"    FAIL: slow-leak missing {need} "
                          f"(got {sorted(got)})")
                    ok = False
        if bundle["name"] == "abrupt-drop" and "N4" not in got:
            print(f"    FAIL: abrupt-drop missing N4 (got {sorted(got)})")
            ok = False

    walk = []
    for bundle in stages:
        for lv in bundle["escalation"]:
            if lv not in walk:
                walk.append(lv)
    print(f"WALK clean->slow-leak->abrupt-drop: "
          f"{'->'.join(walk) if walk else '(none)'}")
    print("T10_DEMO_DONE " + ("PASS" if ok else "FAIL (see above)"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
