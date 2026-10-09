"""T7 move/rest detector (rules only, no ML).

Rest = speed < 0.5 m/s + leveled (|slope| < 2 deg) + engine-on,
sustained for 3 s. Moving = everything else.

The detector consumes LIVE STILLNESS ONLY (wheel/rotor speed, slope,
engine flag). It NEVER branches on the ``fsm_state`` zone name: the
``zone`` column in the output is a majority-vote audit label used solely
to prove agreement with the T4/T5 FSM after the fact. WAIT is the empty
return drive (moving) per the T4/T5 decision, so a correct detector
reports WAIT windows as moving even though the truck is "waiting".

Speed scale: ``sim/generate.py`` emits no speed column, so speed is
derived as ``wheel_rpm * WHEEL_MPS_PER_RPM`` (0.05 m/s per wheel-rpm).
The scale is synthetic and documented here; what matters is separation:
stopped idle (~3.7 wheel-rpm -> ~0.19 m/s) sits well below the 0.5 m/s
gate while haul rumble (~87 wheel-rpm -> ~4.4 m/s) sits well above it.
T8+ may replace this proxy with GPS/odometry without changing the rule.

Rest entry is delayed by the 3 s confirmation run (30 samples at 10 Hz);
rest exit is immediate on the first disqualifying sample ("moving
otherwise"). Rest windows therefore start ~3 s after the truck actually
stops; the FSM-agreement check excludes that entry transient.

Output windows CSV: window_id,state,start_t_s,end_t_s,start_iso,end_iso,
duration_s,zone,reason.

Stdlib only.
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter

SPEED_MAX_MPS = 0.5
SLOPE_MAX_DEG = 2.0
REST_CONFIRM_S = 3.0
SAMPLE_RATE_HZ = 10
WHEEL_MPS_PER_RPM = 0.05  # synthetic speed scale, see module docstring
REST_SAMPLES = int(round(REST_CONFIRM_S * SAMPLE_RATE_HZ))  # 30

WINDOW_HEADER = [
    "window_id",
    "state",
    "start_t_s",
    "end_t_s",
    "start_iso",
    "end_iso",
    "duration_s",
    "zone",
    "reason",
]

REST_STATES = ("LOAD", "DUMP")  # audit only, never consumed by the rule


def speed_mps(row: dict) -> float:
    """Synthetic vehicle speed from wheel RPM (documented scale)."""
    try:
        return float(row.get("wheel_rpm", 0.0)) * WHEEL_MPS_PER_RPM
    except (ValueError, TypeError):
        return float("inf")


def disqualifier(row: dict) -> str | None:
    """Return None when the sample qualifies for rest, else the reason."""
    try:
        engine = int(float(row.get("engine_on", 0)))
    except (ValueError, TypeError):
        engine = 0
    if engine != 1:
        return "engine-off"
    try:
        slope = abs(float(row.get("slope_deg", 0.0)))
    except (ValueError, TypeError):
        return "slope-unknown"
    if slope >= SLOPE_MAX_DEG:
        return "slope>=2deg"
    if speed_mps(row) >= SPEED_MAX_MPS:
        return "speed>=0.5"
    return None


def detect_windows(rows: list[dict]) -> list[dict]:
    """Split samples into rest/moving windows (see module docstring).

    Rest entry is CONFIRMED late: a rest window starts REST_SAMPLES-1
    samples after stillness onset (the "for 3 s" rule). Rest exit is
    immediate on the first disqualifying sample ("moving otherwise").
    Runs of stillness shorter than 3 s never confirm and stay moving.
    """
    n = len(rows)
    qual = [disqualifier(r) is None for r in rows]
    windows: list[dict] = []
    wid = 0

    def zone_of(lo: int, hi: int) -> str:
        votes = Counter(r.get("fsm_state", "?") for r in rows[lo:hi])
        return votes.most_common(1)[0][0] if votes else "?"

    def reason_of(lo: int, hi: int) -> str:
        votes = Counter(disqualifier(r) or "ok" for r in rows[lo:hi])
        bad = [(k, v) for k, v in votes.most_common() if k != "ok"]
        if not bad:
            return "entry-transient (<3s stillness, unconfirmed)"
        return "+".join(f"{k}x{v}" for k, v in bad[:2])

    i = 0
    while i < n:
        if qual[i]:
            j = i
            while j < n and qual[j]:
                j += 1
            run = j - i
            if run >= REST_SAMPLES:
                # Confirmed rest run; entry delayed by the 3 s rule
                # (chronological order: entry transient first, then rest).
                windows.append(("moving", i, i + REST_SAMPLES - 2))
                windows.append(("rest", i + REST_SAMPLES - 1, j - 1))
            else:
                # Too short to confirm: stays moving (transient flicker).
                windows.append(("moving", i, j - 1))
            i = j
        else:
            j = i
            while j < n and not qual[j]:
                j += 1
            windows.append(("moving", i, j - 1))
            i = j

    out = []
    for state, lo, hi in windows:
        t0 = float(rows[lo].get("t_s", 0.0))
        t1 = float(rows[hi].get("t_s", 0.0))
        if state == "rest":
            reason = "speed<0.5+leveled+engine-on 3s"
        else:
            reason = reason_of(lo, hi + 1)
        out.append({
            "window_id": wid,
            "state": state,
            "start_t_s": f"{t0:.1f}",
            "end_t_s": f"{t1:.1f}",
            "start_iso": rows[lo].get("t_iso", ""),
            "end_iso": rows[hi].get("t_iso", ""),
            "duration_s": f"{t1 - t0:.1f}",
            "zone": zone_of(lo, hi + 1),
            "reason": reason,
        })
        wid += 1
    return out


def fsm_agreement(rows: list[dict], windows: list[dict]) -> tuple[float, float]:
    """(raw, steady-state) detector-vs-FSM agreement.

    Raw = fraction of samples where rest <=> fsm in LOAD/DUMP. Steady-state
    excludes the 3 s entry transient after each moving->rest edge, which the
    confirmation rule delays by design.
    """
    rest_by_seq: dict[int, bool] = {}
    for w in windows:
        is_rest = w["state"] == "rest"
        lo = float(w["start_t_s"]);
        hi = float(w["end_t_s"])
        for r in rows:
            t = float(r.get("t_s", -1.0))
            if lo <= t <= hi:
                rest_by_seq[int(r.get("seq", -1))] = is_rest
    raw_ok = raw_n = 0
    steady_ok = steady_n = 0
    rest_starts = sorted(float(w["start_t_s"]) for w in windows if w["state"] == "rest")
    for r in rows:
        seq = int(r.get("seq", -1))
        if seq not in rest_by_seq:
            continue
        expect_rest = r.get("fsm_state") in REST_STATES
        got_rest = rest_by_seq[seq]
        raw_n += 1
        raw_ok += expect_rest == got_rest
        t = float(r.get("t_s", 0.0))
        if any(0.0 <= s - t < REST_CONFIRM_S for s in rest_starts):
            continue  # confirmation transient, excluded by design
        steady_n += 1
        steady_ok += expect_rest == got_rest
    raw = raw_ok / raw_n if raw_n else 1.0
    steady = steady_ok / steady_n if steady_n else 1.0
    return raw, steady


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T7 move/rest rule detector.")
    p.add_argument("--in", dest="inp", required=True, help="input CSV from sim/generate.py")
    p.add_argument("--out", dest="out", required=True, help="output windows CSV")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    with open(args.inp, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        raise SystemExit("input CSV has no rows")
    windows = detect_windows(rows)
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=WINDOW_HEADER)
        w.writeheader()
        w.writerows(windows)
    raw, steady = fsm_agreement(rows, windows)
    n_rest = sum(1 for x in windows if x["state"] == "rest")
    n_mov = len(windows) - n_rest
    print(f"in={args.inp} out={args.out} samples={len(rows)} "
          f"windows={len(windows)} rest={n_rest} moving={n_mov}")
    print(f"FSM_AGREEMENT raw={raw:.3f} steady_state={steady:.3f} "
          f"(steady excludes 3 s entry transient; WAIT=moving is CORRECT per T4/T5)")
    for x in windows[:5]:
        print(f"  w{x['window_id']} {x['state']:6s} {x['start_t_s']:>6s}..{x['end_t_s']:<6s} "
              f"zone={x['zone']:4s} reason={x['reason']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
