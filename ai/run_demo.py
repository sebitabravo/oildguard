"""T9 demo runner: clean (expect no-flag) + slow-leak + abrupt-drop (must flag).

Full demo (default, no --in)::

    python3 ai/run_demo.py

generates three signal files, runs the T7 detector (``sim/detect.py``)
on each, scores rest-gated residuals with ``ai/anomaly.py`` and prints
a precision-style summary.

Single-file mode (used by the T9 verification step)::

    python3 sim/generate.py --scenario clean --seconds 120 --out /tmp/t9-clean.csv
    python3 sim/run_t7.py --in /tmp/t9-clean.csv --out /tmp/t7-windows.csv
    python3 ai/run_demo.py --in /tmp/t9-clean.csv --windows /tmp/t7-windows.csv

LAB-RATE NOTE: at the spec-true 0.5 %/h a 30 s demo drops ~0.004 L
(~0.004 kPa) — invisible by design (see sim/SCHEMA.md). The slow-leak
demo therefore uses an ACCELERATED rate (default 30 %/h x60) over
300 s, CLEARLY LABELED everywhere it appears. It proves the detector
logic, not the field rate; hour-scale runs at 0.5 %/h are noted in
docs/t9-anomaly.md.

Stdlib only (sklearn only via --iforest passthrough).
"""

from __future__ import annotations

import argparse
import csv
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from ai.anomaly import score_rows, write_flags  # noqa: E402
from sim.detect import detect_windows  # noqa: E402
from sim.generate import iter_rows  # noqa: E402

SPEC_LEAK_PCT_PER_H = 0.5
DEMO_LEAK_PCT_PER_H = 30.0  # LAB-ACCELERATED x60, labeled everywhere
DEMO_LEAK_SECONDS = 300.0
DEMO_CLEAN_SECONDS = 120.0
DEMO_DROP_SECONDS = 120.0
DEMO_DROP_LITERS = 15.0


def write_csv(path: str, rows: list[dict], header: list[str]) -> None:
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


def rows_to_windows(rows: list[dict]) -> list[dict]:
    str_rows = [{k: (str(v) if v is not None else "") for k, v in r.items()} for r in rows]
    return detect_windows(str_rows)


def gen_rows(scenario: str, seconds: float, seed: int = 7, **kw) -> tuple[list[dict], list[str]]:
    from sim.generate import HEADER
    rows = list(iter_rows(scenario, seconds, "wheel-RH-01", seed, **kw))
    return rows, HEADER


def run_one(name: str, rows: list[dict], header: list[str], tmpdir: str,
            z_threshold: float, use_iforest: bool,
            leak_note: str = "") -> dict:
    sig_path = os.path.join(tmpdir, f"t9-{name}.csv")
    win_path = os.path.join(tmpdir, f"t9-{name}-windows.csv")
    flag_path = os.path.join(tmpdir, f"t9-{name}-flags.jsonl")
    write_csv(sig_path, rows, header)
    windows = rows_to_windows(rows)
    with open(win_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "window_id", "state", "start_t_s", "end_t_s",
            "start_iso", "end_iso", "duration_s", "zone", "reason"])
        w.writeheader()
        w.writerows(windows)
    str_rows = [{k: (str(v) if v is not None else "") for k, v in r.items()} for r in rows]
    str_windows = [{k: str(v) for k, v in ww.items()} for ww in windows]
    summary = score_rows(str_rows, str_windows,
                         z_threshold=z_threshold, use_iforest=use_iforest)
    write_flags(summary["flags"], flag_path)
    # Post-onset rest coverage: did the scenario even reach a scored window?
    labels = {r.get("label", "") for r in rows}
    summary.update({
        "name": name, "sig": sig_path, "win": win_path,
        "flags_path": flag_path, "labels": sorted(labels),
        "n_windows": len(windows),
        "n_rest_windows": sum(1 for x in windows if x["state"] == "rest"),
        "leak_note": leak_note,
    })
    return summary


def print_case(summary: dict, expect: str) -> None:
    base = summary.get("baseline", {})
    print(f"--- {summary['name']} (expect: {expect}){summary['leak_note']}")
    print(f"    sig={summary['sig']} rows={summary['n_rows']} "
          f"windows={summary['n_windows']} rest={summary['n_rest_windows']} "
          f"scored={summary.get('n_scored', 0)} flags={summary['n_flags']}")
    if base:
        print(f"    baseline {base['source']} mu={base['mu']:.3f} "
              f"sigma={base['sigma']:.3f} beta={base['beta']:.4f}")
    for f in summary["flags"][:5]:
        print(f"    FLAG seq={f['seq']} t_s={f['t_s']} z={f['score']} "
              f"w={f['window_id']} zone={f['zone']} scenario={f['scenario']}")
    if summary["n_flags"] > 5:
        print(f"    ... +{summary['n_flags'] - 5} more (see {summary['flags_path']})")


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T9 anomaly demo runner.")
    p.add_argument("--in", dest="inp", default=None, help="single-file mode: T6 CSV")
    p.add_argument("--windows", default=None, help="single-file mode: T7 windows CSV")
    p.add_argument("--out", default="ai/flags.jsonl", help="single-file mode: flags output")
    p.add_argument("--z-threshold", type=float, default=3.0)
    p.add_argument("--iforest", action="store_true")
    p.add_argument("--tmpdir", default="/tmp")
    return p.parse_args(argv)


def single_file_mode(args) -> int:
    if not args.windows:
        print("ERROR: single-file mode needs --windows <t7-windows.csv> "
              "(produce it with: python3 sim/run_t7.py --in <csv> --out <windows>)",
              file=sys.stderr)
        return 2
    with open(args.inp, newline="") as f:
        rows = list(csv.DictReader(f))
    with open(args.windows, newline="") as f:
        windows = list(csv.DictReader(f))
    summary = score_rows(rows, windows,
                         z_threshold=args.z_threshold, use_iforest=args.iforest)
    write_flags(summary["flags"], args.out)
    print(f"in={args.inp} windows={args.windows} out={args.out}")
    print(f"rows={summary['n_rows']} rest={summary['n_rest']} "
          f"scored={summary.get('n_scored', 0)} flags={summary['n_flags']}")
    for f in summary["flags"][:10]:
        print(f"  FLAG seq={f['seq']} t_s={f['t_s']} z={f['score']} "
              f"w={f['window_id']} scenario={f['scenario']} method={f['method']}")
    return 0


def full_demo(args) -> int:
    print("T9_ANOMALY_DEMO z_thr=%.1f iforest=%s" % (args.z_threshold, args.iforest))
    print(f"SPEC leak rate: {SPEC_LEAK_PCT_PER_H} %/h (field truth; invisible in short demos)")
    cases = []

    rows, header = gen_rows("clean", DEMO_CLEAN_SECONDS)
    cases.append((run_one("clean", rows, header, args.tmpdir,
                          args.z_threshold, args.iforest), "no-flag"))

    rows, header = gen_rows("slow-leak", DEMO_LEAK_SECONDS,
                            leak_pct_per_h=DEMO_LEAK_PCT_PER_H)
    note = (f" [LAB-ACCELERATED leak {DEMO_LEAK_PCT_PER_H} %/h "
            f"x{DEMO_LEAK_PCT_PER_H / SPEC_LEAK_PCT_PER_H:.0f} vs spec "
            f"{SPEC_LEAK_PCT_PER_H} %/h]")
    cases.append((run_one("slow-leak", rows, header, args.tmpdir,
                          args.z_threshold, args.iforest,
                          leak_note=note), "must-flag"))

    rows, header = gen_rows("abrupt-drop", DEMO_DROP_SECONDS,
                            drop_liters=DEMO_DROP_LITERS)
    cases.append((run_one("abrupt-drop", rows, header, args.tmpdir,
                          args.z_threshold, args.iforest), "must-flag"))

    ok = True
    for summary, expect in cases:
        print_case(summary, expect)
        if expect == "no-flag" and summary["n_flags"] != 0:
            print(f"    NOTE: clean run flagged {summary['n_flags']} "
                  f"(see FP note in docs/t9-anomaly.md)")
        if expect == "must-flag" and summary["n_flags"] == 0:
            print(f"    FAIL: {summary['name']} produced zero flags")
            ok = False

    # Precision-style summary: flags are evaluated at rest-sample level
    # against the generator's label column (ground truth, audit only).
    print("SUMMARY precision-style (rest-gated samples; label = generator truth):")
    for summary, expect in cases:
        print(f"  {summary['name']:12s} scored={summary.get('n_scored', 0):4d} "
              f"flags={summary['n_flags']:4d} expect={expect}")
    print("T9_DEMO_DONE " + ("PASS" if ok else "FAIL (see above)"))
    return 0 if ok else 1


def main(argv=None) -> int:
    args = parse_args(argv)
    if args.inp:
        return single_file_mode(args)
    return full_demo(args)


if __name__ == "__main__":
    raise SystemExit(main())
