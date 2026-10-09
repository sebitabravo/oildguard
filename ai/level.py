"""T10 level regression (S5 slice): pressure (temp-compensated, rest-gated) -> level.

MODEL LABEL: ``synthetic-proxy`` — NOT proven until the S7 bench
drain-and-weigh calibration. Every output carries the label; do not
present these levels as a validated measurement.

SYNTHETIC-PROXY (field-anchor pending h(L) bench): pressure maps to oil
volume through the ASSUMED gear-case geometry (``sim/geometry.py``) and the
hydrostatics of ``sim/physics.py``: ``p = rho(T) * g * h(V)``. The former
linear ``28 kPa at 95 L`` gain implied a 3.2 m head and is gone. See
``docs/thesis-annex.md`` section 2 (930E/GDY106 scope).

Method
------
Same rest-gated, temperature-compensated residual as T9 (``ai/anomaly.py``;
baseline = first rest window, sigma floored at ``SIGMA_FLOOR_KPA``), mapped to
oil volume through the NONLINEAR pool geometry:

    p_anchor = pressure_kpa_from_volume(CAPACITY_L, T_ref)
    level_L  = volume_from_pressure_kpa(p_anchor + (residual - mu), T_ref)

Anchoring on the baseline mean (instead of the absolute pressure) makes each
run self-recalibrating: the first rest window reads 95 L by construction and
only DEVIATIONS from it move the estimate. That matches the recalibration
narrative (stillness windows), at the cost that an already-leaking baseline
reads high — documented, not hidden (see ``baseline`` provenance in every
output).

Only rest samples are estimated; moving samples are gated out (counted,
``level_liters = None``), never estimated.

Confidence is a baseline-precision property, not per-sample luck::

    sigma_L = sigma_kpa / kpa_per_liter(95 L, T_ref)
    confidence = clamp(1 - sigma_L / 5.0, 0, 1)

i.e. a rest-noise floor of ~0.5 L (0.01 kPa on a 0-10 kPa class transducer)
yields ~0.9. A noisy
baseline degrades every estimate openly; ``ai/rul.py`` suppresses RUL
entirely when ``sigma_L > 2.0 L`` (lubrication/precision gate).

Stdlib only.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from ai.anomaly import SIGMA_FLOOR_KPA, fit_baseline, residual  # noqa: E402
from sim.physics import (  # noqa: E402
    kpa_per_liter,
    pressure_kpa_from_volume,
    volume_from_pressure_kpa,
)

MODEL_LABEL = "synthetic-proxy"  # NOT proven until S7 bench proof
CAPACITY_L = 95.0  # GDY106 nominal, SAE 85W-140 (physics anchor)
WARN_PCT = 50.0  # warning < 50%
CRIT_PCT = 30.0  # critical < 30%
MIN_BASELINE_N = 10
SIGMA_L_SUPPRESS_L = 2.0  # precision gate consumed by ai/rul.py


def _f(value, default: float = float("nan")) -> float:
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _is_rest(sample: dict) -> bool:
    """Rest predicate. Accepts ``rest`` bool, else ``recal_window``, else
    ``moving`` — so T7-detector, backend-store, and CSV inputs all work."""
    if "rest" in sample and sample["rest"] is not None and sample["rest"] != "":
        v = sample["rest"]
        if isinstance(v, str):
            return v.strip().lower() in ("1", "true", "yes", "rest")
        return bool(v)
    if "recal_window" in sample and sample["recal_window"] != "":
        try:
            return int(float(sample["recal_window"])) == 1
        except (ValueError, TypeError):
            pass
    if "moving" in sample and sample["moving"] != "":
        try:
            return int(float(sample["moving"])) == 0
        except (ValueError, TypeError):
            pass
    return False


def _group_rest_windows(scored: list[dict]) -> list[list[dict]]:
    """Consecutive rest samples (by seq order) form one window.

    Same grouping contract as GET /windows (recal_window runs); zone is a
    majority-vote audit label only, never consumed by the estimator.
    """
    ordered = sorted(scored, key=lambda s: s["seq"])
    windows: list[list[dict]] = []
    cur: list[dict] = []
    for s in ordered:
        if s["rest"]:
            cur.append(s)
        elif cur:
            windows.append(cur)
            cur = []
    if cur:
        windows.append(cur)
    return windows


def estimate(samples: list[dict]) -> dict:
    """Estimate oil level for rest-gated samples.

    Input: list of dicts with ``t_s``, ``seq``, ``pressure_kpa``,
    ``temperature_c`` + rest flag (see :func:`_is_rest`). Optional
    passthrough: ``t_iso``, ``device_id``, ``fsm_state``/``zone``,
    ``vib_rms_g``, ``vib_kurtosis``, ``label``.
    """
    parsed = []
    for s in samples:
        parsed.append({
            "seq": int(_f(s.get("seq"), -1)),
            "t_s": _f(s.get("t_s")),
            "t_iso": s.get("t_iso", ""),
            "device_id": s.get("device_id", ""),
            "zone": s.get("zone", s.get("fsm_state", "")),
            "pressure_kpa": _f(s.get("pressure_kpa")),
            "temperature_c": _f(s.get("temperature_c")),
            "vib_rms_g": _f(s.get("vib_rms_g")),
            "vib_kurtosis": _f(s.get("vib_kurtosis")),
            "label": s.get("label", ""),
            "rest": _is_rest(s),
        })
    rest = [s for s in parsed if s["rest"]]
    gated_out = len(parsed) - len(rest)
    out: dict = {
        "model": MODEL_LABEL,
        "n_rows": len(parsed),
        "n_rest": len(rest),
        "n_gated_out": gated_out,
        "capacity_liters": CAPACITY_L,
        "warn_pct": WARN_PCT,
        "crit_pct": CRIT_PCT,
        "estimates": [],
    }
    if not rest:
        out["note"] = "no rest samples; zero estimates"
        return out

    windows = _group_rest_windows(parsed)
    # Baseline = first rest window in time order (>= 10 samples), else the
    # first 30 rest samples chronologically — same rule as T9, so level
    # provenance links 1:1 to anomaly flags.
    first = windows[0] if windows else []
    if len(first) >= MIN_BASELINE_N:
        baseline_rows = list(first)
        baseline_source = f"first-rest-window n={len(baseline_rows)}"
    else:
        baseline_rows = sorted(rest, key=lambda s: s["t_s"])[:30]
        baseline_source = (
            f"first-30-rest-samples (first window n<{MIN_BASELINE_N}) "
            f"n={len(baseline_rows)}"
        )
    adapt = [
        {"row": {"pressure_kpa": s["pressure_kpa"],
                 "temperature_c": s["temperature_c"]},
         "window": {"window_id": "0"}}
        for s in baseline_rows
    ]
    base = fit_baseline(adapt)
    base["source"] = baseline_source
    out["baseline"] = base
    mu, sigma, beta, t_ref = base["mu"], base["sigma"], base["beta"], base["t_ref"]
    kpa_per_l = kpa_per_liter(CAPACITY_L, t_ref)
    out["kpa_per_liter"] = kpa_per_l
    sigma_l = sigma / kpa_per_l
    p_anchor = pressure_kpa_from_volume(CAPACITY_L, t_ref)
    out["sigma_liters"] = round(sigma_l, 4)
    confidence = max(0.0, min(1.0, 1.0 - sigma_l / 5.0))
    out["confidence"] = round(confidence, 3)

    train_ids = {id(s) for s in baseline_rows}
    estimates = []
    for s in parsed:
        if not s["rest"] or s["pressure_kpa"] != s["pressure_kpa"] \
                or s["temperature_c"] != s["temperature_c"]:
            estimates.append({
                "seq": s["seq"], "t_s": s["t_s"], "t_iso": s["t_iso"],
                "device_id": s["device_id"], "zone": s["zone"],
                "rest": s["rest"], "gated": True, "train": False,
                "level_liters": None, "level_pct": None, "z": None,
                "residual_kpa": None, "label": s["label"],
                "vib_rms_g": None if s["vib_rms_g"] != s["vib_rms_g"] else s["vib_rms_g"],
                "vib_kurtosis": None if s["vib_kurtosis"] != s["vib_kurtosis"] else s["vib_kurtosis"],
                "temperature_c": None if s["temperature_c"] != s["temperature_c"] else s["temperature_c"],
            })
            continue
        res = residual(s["pressure_kpa"], s["temperature_c"], beta, t_ref)
        z = (res - mu) / sigma if sigma > 0 else 0.0
        level = volume_from_pressure_kpa(p_anchor + (res - mu), t_ref)
        estimates.append({
            "seq": s["seq"], "t_s": s["t_s"], "t_iso": s["t_iso"],
            "device_id": s["device_id"], "zone": s["zone"],
            "rest": True, "gated": False,
            "train": id(s) in train_ids,
            "level_liters": round(level, 4),
            "level_pct": round(100.0 * level / CAPACITY_L, 3),
            "z": round(z, 3),
            "residual_kpa": round(res, 4),
            "label": s["label"],
            "vib_rms_g": None if s["vib_rms_g"] != s["vib_rms_g"] else s["vib_rms_g"],
            "vib_kurtosis": None if s["vib_kurtosis"] != s["vib_kurtosis"] else s["vib_kurtosis"],
            "temperature_c": s["temperature_c"],
        })
    estimates.sort(key=lambda e: e["seq"])
    out["estimates"] = estimates
    out["n_train"] = sum(1 for e in estimates if e["train"])
    out["n_scored"] = sum(1 for e in estimates if not e["gated"] and not e["train"])
    out["sigma_floor_kpa"] = SIGMA_FLOOR_KPA
    out["note"] = (
        f"model={MODEL_LABEL} (UNPROVEN until S7 bench drain-and-weigh; "
        f"assumed gear-case geometry, {p_anchor:.3f} kPa at {CAPACITY_L} L "
        f"and {t_ref:.1f} C). "
        f"Baseline {baseline_source} also anchors 95 L — a leak already "
        f"present in the baseline reads high."
    )
    return out
