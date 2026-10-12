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
- 95% slope confidence interval contains zero (trend is not significant);
- R² < 0.30 (trend too weak to extrapolate honestly).

Suppression is surfaced, never silent: the payload carries the reason
and the ladder keeps emitting anomaly-only (N1/N2/N4) alerts.

Stdlib only.
"""

from __future__ import annotations

from shared.messages import message

MODEL_LABEL = "synthetic-proxy"  # NOT proven until S7 bench proof
CAPACITY_L = 95.0
WARN_L = CAPACITY_L * 0.50  # 47.5 L
CRIT_L = CAPACITY_L * 0.30  # 28.5 L
CYCLE_S = 29.0  # LOAD 6 + HAUL 12 + DUMP 6 + WAIT 5 (T4 FSM)
SHIFT_H = 8.0  # maintenance shift
MIN_SCORED_N = 10
MIN_R2 = 0.30
MAX_SIGMA_L = 2.0

# Tabla t bilateral 95 % de NIST/SEMATECH E-Handbook, sección 1.3.6.7.2:
# https://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm
_T_CRITICAL_95 = (
    12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
    2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
    2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042,
)


def t_critical_95(degrees_of_freedom: int) -> float:
    if degrees_of_freedom < 1:
        raise ValueError("degrees_of_freedom must be positive")
    if degrees_of_freedom > len(_T_CRITICAL_95):
        return 1.96
    return _T_CRITICAL_95[degrees_of_freedom - 1]


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


def _suppressed(reason: str, reason_message: dict, trend: dict, sigma_l) -> dict:
    return {
        "model": MODEL_LABEL,
        "status": "suppressed",
        "reason": reason,
        "reason_message": reason_message,
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
        "note_message": message("rul_suppressed_note"),
    }


def _hours_to_critical(
    current_level_l: float,
    slope_l_per_h: float,
) -> tuple[float | None, str | None]:
    if slope_l_per_h >= 0:
        return None, "The fitted trend has no future crossing of the critical level."
    if current_level_l <= CRIT_L:
        return 0.0, None
    return (current_level_l - CRIT_L) / -slope_l_per_h, None


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
            f"anomaly-only",
            message(
                "rul_insufficient_rest_samples",
                count=trend["n"],
                minimum=MIN_SCORED_N,
            ),
            trend,
            sigma_l,
        )
    if sigma_l is not None and sigma_l > MAX_SIGMA_L:
        return _suppressed(
            f"baseline precision insufficient (sigma_L={sigma_l} L > "
            f"{MAX_SIGMA_L} L); anomaly-only",
            message(
                "rul_baseline_precision_insufficient",
                sigma_l=sigma_l,
                max_sigma_l=MAX_SIGMA_L,
            ),
            trend,
            sigma_l,
        )
    if not trend["slope_per_h"] < 0:
        return _suppressed(
            f"no leak trend (slope={trend['slope_per_h']:.4f} L/h >= 0); "
            f"anomaly-only",
            message(
                "rul_no_leak_trend",
                slope_l_per_h=trend["slope_per_h"],
            ),
            trend,
            sigma_l,
        )
    if trend["r2"] < MIN_R2:
        return _suppressed(
            f"trend too weak (R2={trend['r2']:.3f} < {MIN_R2}); anomaly-only",
            message(
                "rul_trend_too_weak",
                r2=trend["r2"],
                minimum_r2=MIN_R2,
            ),
            trend,
            sigma_l,
        )
    degrees_of_freedom = trend["n"] - 2
    margin = t_critical_95(degrees_of_freedom) * trend["se_slope_per_h"]
    slope_low = trend["slope_per_h"] - margin
    slope_high = trend["slope_per_h"] + margin
    if slope_low <= 0.0 <= slope_high:
        return _suppressed(
            "slope confidence interval includes zero; anomaly-only",
            message("pendiente_no_significativa"),
            trend,
            sigma_l,
        )

    rate = -trend["slope_per_h"]
    current = estimates[-1]["level_liters"]
    h_warn = max(0.0, (current - WARN_L) / rate)
    h_crit = max(0.0, (current - CRIT_L) / rate)
    h_crit_low, h_crit_low_reason = _hours_to_critical(
        current, slope_low
    )
    h_crit_high, h_crit_high_reason = _hours_to_critical(
        current, slope_high
    )
    confidence = trend["r2"] * min(1.0, trend["n"] / 30.0)
    return {
        "model": MODEL_LABEL,
        "status": "ok",
        "reason": "leak trend significant; RUL extrapolated",
        "reason_message": message("rul_significant_leak_trend"),
        "anomaly_only": False,
        "hours": round(h_crit, 2),
        "hours_to_warning": round(h_warn, 2),
        "hours_to_critical": round(h_crit, 2),
        "confidence_band": {
            "level": 0.95,
            "slope_low_L_per_h": round(slope_low, 4),
            "slope_high_L_per_h": round(slope_high, 4),
            "hours_to_critical_low": round(h_crit_low, 2)
            if h_crit_low is not None else None,
            "hours_to_critical_low_reason": h_crit_low_reason,
            "hours_to_critical_high": round(h_crit_high, 2)
            if h_crit_high is not None else None,
            "hours_to_critical_high_reason": h_crit_high_reason,
        },
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
        "note_message": message("rul_model_note"),
    }
