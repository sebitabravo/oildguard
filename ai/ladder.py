"""T10 N1–N4 alert ladder (S5 slice) over rest-gated level + RUL.

MODEL LABEL: ``synthetic-proxy`` (inherited from ``ai/level.py`` — NOT
proven until the S7 bench drain-and-weigh calibration). Every alert
carries the label plus threshold + inputs + window + baseline provenance:
nothing to trust blindly.

Ladder
------
- N1 trend (persistence): pressure-drop and/or falling-level evidence in
  one rest window — the watch entry. Single-sample T9 FPs die here
  unless they persist across the window median.
- N2 confirmed leak (2-of-3 channels): at least two of
  {pressure-residual persistence, level-regression trend, vib-impact}
  fire, in the same window or two consecutive windows. Temperature is
  the EXCLUSION channel: a temp drift with rising pressure is the
  sensor-drift signature (``sim/generate.py``), so it VETOES N2 and caps
  the window at N1 + anomaly-only note. Rationale: synthetic leaks carry
  no temp/vib signature by construction (T6); confirming a leak on a
  temp rise would false-confirm drift as leak. S7 bench may promote temp
  to a confirming channel with real heat-transfer evidence.
- N3 shift-window: an active N1/N2 leak whose RUL-to-warning is shorter
  than one 8 h maintenance shift — the plannable signal.
- N4 critical: median level < 30%, or an abrupt window-to-window level
  drop > 5 L, or an extreme single-sample collapse (z < -10 with a
  kurtosis spike > 5). Abrupt steps invalidate linear RUL (see
  ``ai/rul.py`` note); N4 fires instead of rescaling it.

Thresholds: warning < 50%, critical < 30% (feature-doc physics anchors),
|z| > 3.0 (T9), shift 8 h, haul cycle 29 s.

Entry point :func:`evaluate` runs level + RUL + ladder over raw samples
and returns the bundle consumed by GET /alerts, GET /rul, and
``ai/demo_leak.py``.

Stdlib only.
"""

from __future__ import annotations

import os
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from ai import level as level_mod  # noqa: E402
from ai import rul as rul_mod  # noqa: E402
from shared.messages import message  # noqa: E402

MODEL_LABEL = "synthetic-proxy"  # NOT proven until S7 bench proof
Z_THR = 3.0
WARN_PCT = 50.0
CRIT_PCT = 30.0
ABRUPT_STEP_L = 5.0  # window-to-window median level drop = abrupt loss
Z_EXTREME = 10.0  # single-sample collapse trigger (with kurt spike)
KURT_SPIKE = 5.0
RMS_HIGH_G = 0.6  # rest RMS above this = friction/impact signature
TEMP_DRIFT_C = 1.5  # exclusion-channel veto band around T baseline
SHIFT_H = 8.0
LADDER = ["N1", "N2", "N3", "N4"]
SEVERITY = {"N1": "watch", "N2": "warning", "N3": "warning", "N4": "critical"}


def _median(values: list[float]) -> float | None:
    vals = [v for v in values if v is not None and v == v]
    if not vals:
        return None
    return float(statistics.median(vals))


def summarize_windows(level_out: dict) -> list[dict]:
    """Group scored estimates into rest windows with channel statistics."""
    scored = [e for e in level_out.get("estimates", []) if not e["gated"]]
    wins: list[list[dict]] = []
    cur: list[dict] = []
    for e in scored:
        if e["train"]:
            if cur:
                wins.append(cur)
                cur = []
            continue  # baseline-training samples are reference, not evidence
        if cur and e["seq"] != cur[-1]["seq"] + 1:
            # Non-contiguous (train gap or gated gap) — boundary kept so a
            # window never silently spans a leak step hidden in the gap.
            wins.append(cur)
            cur = []
        cur.append(e)
    if cur:
        wins.append(cur)
    base = level_out.get("baseline", {})
    t_ref = base.get("t_ref")
    sigma_l = level_out.get("sigma_liters")
    out = []
    for i, w in enumerate(wins):
        zs = [e["z"] for e in w if e["z"] is not None]
        lvs = [e["level_liters"] for e in w if e["level_liters"] is not None]
        kurts = [e["vib_kurtosis"] for e in w if e.get("vib_kurtosis") is not None]
        rmss = [e["vib_rms_g"] for e in w if e.get("vib_rms_g") is not None]
        temps = [e["temperature_c"] for e in w if e.get("temperature_c") is not None]
        z_med = _median(zs)
        lv_med = _median(lvs)
        zones: dict[str, int] = {}
        for e in w:
            zones[e["zone"]] = zones.get(e["zone"], 0) + 1
        zone = max(zones, key=zones.get) if zones else ""
        out.append({
            "window_id": i,
            "n": len(w),
            "start_t_s": w[0]["t_s"],
            "end_t_s": w[-1]["t_s"],
            "start_seq": w[0]["seq"],
            "end_seq": w[-1]["seq"],
            "zone": zone,  # audit label only
            "z_med": z_med,
            "z_min": min(zs) if zs else None,
            "level_med_L": round(lv_med, 4) if lv_med is not None else None,
            "level_med_pct": round(100.0 * lv_med / level_mod.CAPACITY_L, 2)
            if lv_med is not None else None,
            "kurt_max": max(kurts) if kurts else None,
            "rms_med": _median(rmss),
            "temp_med": _median(temps),
            "temp_drift": (round(_median(temps) - t_ref, 3)
                           if _median(temps) is not None and t_ref is not None else None),
            "sigma_liters": sigma_l,
        })
    return out


def channels(win: dict, trend_slope_per_h: float | None) -> dict:
    """Evaluate the 2-of-3 confirmation channels + temp exclusion."""
    ch = {}
    ch["pressure_drop"] = win["z_med"] is not None and win["z_med"] < -Z_THR
    ch["level_trend"] = (
        win["level_med_L"] is not None
        and trend_slope_per_h is not None
        and trend_slope_per_h < 0
        and (level_mod.CAPACITY_L - win["level_med_L"])
        > 2.0 * (win["sigma_liters"] or 0.0)
    ) or (win["level_med_pct"] is not None and win["level_med_pct"] < WARN_PCT)
    ch["vib_impact"] = (
        (win["kurt_max"] is not None and win["kurt_max"] > KURT_SPIKE)
        or (win["rms_med"] is not None and win["rms_med"] > RMS_HIGH_G)
    )
    # Exclusion channel: temp drift + NON-falling pressure = sensor-drift
    # signature (T6 sensor-drift ramps pressure AND temp). A true leak
    # drops pressure at stable temp.
    ch["temp_drift_veto"] = bool(
        win["temp_drift"] is not None and abs(win["temp_drift"]) > TEMP_DRIFT_C
        and (win["z_med"] is not None and win["z_med"] > -Z_THR)
    )
    return ch


def _abrupt(win: dict, prev: dict | None) -> tuple[bool, str, dict | None]:
    if win["level_med_pct"] is not None and win["level_med_pct"] < CRIT_PCT:
        return (
            True,
            f"level {win['level_med_pct']}% < critical {CRIT_PCT}%",
            message(
                "ladder_n4_critical_level",
                level_pct=win["level_med_pct"],
                critical_pct=CRIT_PCT,
            ),
        )
    if (prev is not None and win["level_med_L"] is not None
            and prev["level_med_L"] is not None
            and prev["level_med_L"] - win["level_med_L"] > ABRUPT_STEP_L):
        from_l = round(prev["level_med_L"], 1)
        to_l = round(win["level_med_L"], 1)
        return True, (
            f"abrupt window-to-window drop "
            f"{from_l:.1f}->{to_l:.1f} L "
            f"(>{ABRUPT_STEP_L} L)"), message(
                "ladder_n4_abrupt_drop",
                from_l=from_l,
                to_l=to_l,
                threshold_l=ABRUPT_STEP_L,
            )
    if (win["z_min"] is not None and win["z_min"] < -Z_EXTREME
            and win["kurt_max"] is not None and win["kurt_max"] > KURT_SPIKE):
        z = round(win["z_min"], 1)
        kurtosis = round(win["kurt_max"], 1)
        return True, (
            f"extreme collapse z={z:.1f} with kurtosis spike "
            f"{kurtosis:.1f} (impact transient)"), message(
                "ladder_n4_extreme_collapse",
                z=z,
                kurtosis=kurtosis,
            )
    return False, "", None


def evaluate(samples: list[dict]) -> dict:
    """Run level + RUL + N1–N4 ladder. Input: raw sample dicts (see
    ``ai/level.py``). Output bundle: level, rul, windows, alerts,
    escalation."""
    lev = level_mod.estimate(samples)
    rul = rul_mod.extrapolate(lev)
    wins = summarize_windows(lev)
    slope = rul.get("slope_L_per_h")
    slope = slope if rul.get("status") == "ok" else None

    alerts: list[dict] = []
    seen = set()
    leak_active_from: int | None = None

    def raise_alert(lv: str, win: dict, ch: dict | None, reason: str,
                    reason_message: dict,
                    extra_inputs: dict | None = None) -> None:
        if lv in seen:
            return
        seen.add(lv)
        inputs = {
            "z_med": win["z_med"],
            "z_min": win["z_min"],
            "level_med_L": win["level_med_L"],
            "level_med_pct": win["level_med_pct"],
            "kurt_max": win["kurt_max"],
            "rms_med": win["rms_med"],
            "temp_med": win["temp_med"],
            "temp_drift_c": win["temp_drift"],
            "trend_slope_L_per_h": slope,
            "rul_hours_to_warning": rul.get("hours_to_warning"),
            "rul_hours": rul.get("hours"),
            "rul_status": rul.get("status"),
            "n_window": win["n"],
        }
        if extra_inputs:
            inputs.update(extra_inputs)
        alerts.append({
            "alert_id": f"{lv}-w{win['window_id']:02d}",
            "level": lv,
            "severity": SEVERITY[lv],
            "t_s": win["end_t_s"],
            "window_id": win["window_id"],
            "zone": win["zone"],
            "channels": ch,
            "inputs": inputs,
            "thresholds": {
                "z_thr": Z_THR,
                "warn_pct": WARN_PCT,
                "crit_pct": CRIT_PCT,
                "abrupt_step_L": ABRUPT_STEP_L,
                "shift_h": SHIFT_H,
            },
            "baseline": lev.get("baseline", {}).get("source"),
            "model": MODEL_LABEL,
            "reason": reason,
            "reason_message": reason_message,
        })

    prev: dict | None = None
    for win in wins:
        ch = channels(win, slope)
        confirm_votes = sum([ch["pressure_drop"], ch["level_trend"], ch["vib_impact"]])
        # N4 first: critical preempts everything in this window.
        is_abrupt, why, why_message = _abrupt(win, prev)
        if is_abrupt:
            raise_alert("N4", win, ch, f"N4 critical: {why}", why_message)
            leak_active_from = leak_active_from if leak_active_from is not None else win["window_id"]
        # N1: trend entry — any leak-evidence channel in one window.
        evidence = ch["pressure_drop"] or ch["level_trend"] or ch["vib_impact"]
        if evidence and "N1" not in seen:
            raise_alert("N1", win, ch,
                        f"N1 trend (persistence entry): evidence in window "
                        f"{win['window_id']} zone={win['zone']}",
                        message(
                            "ladder_n1_trend_persistence",
                            window=win["window_id"],
                            zone=win["zone"],
                        ))
            leak_active_from = win["window_id"]
        # N2: confirmation — 2-of-3 channels same window, or evidence in
        # two consecutive windows (persistence counts as confirmation).
        confirmed = False
        how = ""
        n2_message = None
        if evidence and not ch["temp_drift_veto"]:
            if confirm_votes >= 2:
                confirmed = True
                how = (f"{confirm_votes}-of-3 channels same window "
                       f"{win['window_id']}")
                n2_message = message(
                    "ladder_n2_same_window_confirmation",
                    votes=confirm_votes,
                    window=win["window_id"],
                )
            elif (prev is not None and prev.get("_evidence")
                    and win["window_id"] == prev["window_id"] + 1):
                confirmed = True
                how = (f"persistence: evidence in consecutive windows "
                       f"{prev['window_id']}+{win['window_id']}")
                n2_message = message(
                    "ladder_n2_confirmed_persistence",
                    windows=[prev["window_id"], win["window_id"]],
                )
        if confirmed and "N2" not in seen:
            raise_alert("N2", win, ch, f"N2 confirmed leak: {how}", n2_message)
        elif (evidence and ch["temp_drift_veto"] and "N2" not in seen
                and win.get("_veto_noted") is None):
            win["_veto_noted"] = True  # audit trace on the window, not an alert
        # N3: shift-window — active leak + RUL-to-warning < one shift.
        if (leak_active_from is not None and "N3" not in seen
                and rul.get("status") == "ok"
                and rul.get("hours_to_warning") is not None
                and rul["hours_to_warning"] < SHIFT_H):
            raise_alert("N3", win, ch,
                        f"N3 shift-window: RUL-to-warning "
                        f"{rul['hours_to_warning']} h < {SHIFT_H} h shift",
                        message(
                            "ladder_n3_shift_window",
                            warning_hours=rul["hours_to_warning"],
                            shift_hours=SHIFT_H,
                        ),
                        extra_inputs={"rul_confidence": rul.get("confidence")})
        win["_evidence"] = evidence
        prev = win

    for w in wins:
        w.pop("_evidence", None)
        w.pop("_veto_noted", None)
    alerts.sort(key=lambda a: (LADDER.index(a["level"]), a["window_id"]))
    return {
        "model": MODEL_LABEL,
        "level": {
            "baseline": lev.get("baseline"),
            "sigma_liters": lev.get("sigma_liters"),
            "confidence": lev.get("confidence"),
            "n_rest": lev.get("n_rest"),
            "n_scored": lev.get("n_scored"),
            "n_gated_out": lev.get("n_gated_out"),
        },
        "rul": rul,
        "windows": wins,
        "alerts": alerts,
        "escalation": [a["level"] for a in alerts],
        "ladder": LADDER,
        "note": (
            f"model={MODEL_LABEL} (UNPROVEN until S7 bench). "
            f"Rest-gated, auditable; temp drift vetoes N2 (exclusion "
            f"channel) instead of confirming."
        ),
        "note_message": message("ladder_model_note"),
    }
