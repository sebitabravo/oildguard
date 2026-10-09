"""T10 RUL extrapolation (S5 slice): trend of level estimates -> time left.

MODEL LABEL: ``synthetic-proxy`` (inherited from ``ai/level.py`` — NOT
proven until the S7 bench drain-and-weigh calibration).

Method
------
Least-squares slope of scored (post-baseline, rest-gated) level
estimates vs time. With a significantly negative slope, time left to the
warning (50%) and critical (30%) thresholds extrapolates linearly::

    rate_L_per_h = -slope
    hours_to_X = (current_level - threshold_X) / rate_L_per_h
    haul_cycles = hours * 3600 / CYCLE_S   (29 s haul loop, sim/SCHEMA.md)
    shifts      = hours / SHIFT_H          (8 h maintenance shift)

Lubrication / precision gating (per spec: RUL only on valid lubrication
condition, else anomaly-only fallback): RUL is SUPPRESSED — hours null,
``anomaly_only: True`` — when any of these hold:

- fewer than 10 scored rest samples (no trend basis);
- baseline ``sigma_L > 2.0 L`` (rest precision insufficient);
- slope not negative (no leak trend: flat or refilling);
- R² < 0.30 (trend too weak to extrapolate honestly).

Suppression is surfaced, never silent: the payload carries the reason
and the ladder keeps emitting anomaly-only (N1/N2/N4) alerts.

Stdlib only.
"""

from __future__ import annotations

MODEL_LABEL = "synthetic-proxy"  # NOT proven until S7 bench proof
CAPACITY_L = 95.0
WARN_L = CAPACITY_L * 0.50  # 47.5 L
CRIT_L = CAPACITY_L * 0.30  # 28.5 L
CYCLE_S = 29.0  # LOAD 6 + HAUL 12 + DUMP 6 + WAIT 5 (T4 FSM)
SHIFT_H = 8.0  # maintenance shift
MIN_SCORED_N = 10
MIN_R2 = 0.30
MAX_SIGMA_L = 2.0


def fit_trend(points: list[tuple[float, float]]) -> dict:
    """Least-squares fit of level vs time. Returns slope/h, R², SE."""
    n = len(points)
    if n < 3:
        return {"n": n, "slope_per_h": 0.0, "r2": 0.0, "se_slope_per_h": float("inf")}
    mx = sum(p[0] for p in points) / n
    my = sum(p[1] for p in points) / n
    sxx = sum((p[0] - mx) ** 2 for p in points)
    if sxx <= 0:
        return {"n": n, "slope_per_h": 0.0, "r2": 0.0, "se_slope_per_h": float("inf")}
    sxy = sum((p[0] - mx) * (p[1] - my) for p in points)
    slope_per_s = sxy / sxx  # liters per second
    pred = [my + (slope_per_s) * (p[0] - mx) for p in points]
    ss_tot = sum((p[1] - my) ** 2 for p in points)
    ss_res = sum((p[1] - pr) ** 2 for p, pr in zip(points, pred))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    var = ss_res / (n - 2) if n > 2 else 0.0
    se_per_s = (var / sxx) ** 0.5 if sxx > 0 else float("inf")
    return {
        "n": n,
        "slope_per_h": slope_per_s * 3600.0,
        "intercept_l": my - slope_per_s * mx,
        "r2": max(0.0, min(1.0, r2)),
        "se_slope_per_h": se_per_s * 3600.0,
    }


def _suppressed(reason: str, trend: dict, sigma_l) -> dict:
    return {
        "model": MODEL_LABEL,
        "status": "suppressed",
        "reason": reason,
        "anomaly_only": True,
        "hours": None,
        "hours_to_warning": None,
        "hours_to_critical": None,
        "haul_cycles": None,
        "shifts": None,
        "confidence": 0.0,
        "slope_L_per_h": round(trend.get("slope_per_h", 0.0), 4),
        "r2": round(trend.get("r2", 0.0), 3),
        "n": trend.get("n", 0),
        "sigma_liters": sigma_l,
        "thresholds": {"warning_L": WARN_L, "critical_L": CRIT_L},
        "note": (
            "RUL suppressed (lubrication/precision gate); surface "
            "anomaly-only alerts instead. See reason."
        ),
    }


def extrapolate(level_out: dict) -> dict:
    """Extrapolate RUL from an ``ai/level.py`` estimate payload."""
    estimates = [e for e in level_out.get("estimates", [])
                 if not e["gated"] and not e["train"]
                 and e["level_liters"] is not None]
    sigma_l = level_out.get("sigma_liters")
    trend = fit_trend([(e["t_s"], e["level_liters"]) for e in estimates
                       if e["t_s"] == e["t_s"]])
    if trend["n"] < MIN_SCORED_N:
        return _suppressed(
            f"insufficient rest samples (n={trend['n']} < {MIN_SCORED_N}); "
            f"anomaly-only", trend, sigma_l)
    if sigma_l is not None and sigma_l > MAX_SIGMA_L:
        return _suppressed(
            f"baseline precision insufficient (sigma_L={sigma_l} L > "
            f"{MAX_SIGMA_L} L); anomaly-only", trend, sigma_l)
    if not trend["slope_per_h"] < 0:
        return _suppressed(
            f"no leak trend (slope={trend['slope_per_h']:.4f} L/h >= 0); "
            f"anomaly-only", trend, sigma_l)
    if trend["r2"] < MIN_R2:
        return _suppressed(
            f"trend too weak (R2={trend['r2']:.3f} < {MIN_R2}); "
            f"anomaly-only", trend, sigma_l)
    rate = -trend["slope_per_h"]
    current = estimates[-1]["level_liters"]
    h_warn = (current - WARN_L) / rate
    h_crit = (current - CRIT_L) / rate
    # Already below a threshold -> 0 (not negative): the condition is now.
    h_warn = max(0.0, h_warn)
    h_crit = max(0.0, h_crit)
    confidence = trend["r2"] * min(1.0, trend["n"] / 30.0)
    return {
        "model": MODEL_LABEL,
        "status": "ok",
        "reason": "leak trend significant; RUL extrapolated",
        "anomaly_only": False,
        "hours": round(h_crit, 2),
        "hours_to_warning": round(h_warn, 2),
        "hours_to_critical": round(h_crit, 2),
        "haul_cycles": round(h_crit * 3600.0 / CYCLE_S, 1),
        "shifts": round(h_crit / SHIFT_H, 2),
        "confidence": round(max(0.0, min(1.0, confidence)), 3),
        "slope_L_per_h": round(trend["slope_per_h"], 4),
        "se_slope_L_per_h": round(trend["se_slope_per_h"], 4)
        if trend["se_slope_per_h"] != float("inf") else None,
        "r2": round(trend["r2"], 3),
        "n": trend["n"],
        "current_level_L": current,
        "sigma_liters": sigma_l,
        "thresholds": {"warning_L": WARN_L, "critical_L": CRIT_L},
        "cycle_s": CYCLE_S,
        "shift_h": SHIFT_H,
        "note": (
            f"model={MODEL_LABEL} (UNPROVEN until S7 bench). Linear "
            f"extrapolation of the rest-gated level trend; abrupt steps "
            f"invalidate it (N4 fires instead of rescaling RUL)."
        ),
    }
