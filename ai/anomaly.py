"""T9 anomaly detection (S5 slice): z-score baseline + optional IsolationForest.

Method
------
Rest-gated pressure residual with linear temperature compensation:

    T_REF  = mean temperature of the baseline rest window
    beta   = least-squares slope of pressure on temperature in that window
             (0 when temperature variance is negligible; clipped to +-0.05 kPa/°C)
    r      = p_obs - beta * (T_obs - T_REF)
    z      = (r - mu) / sigma   (mu/sigma from the baseline window)

Only samples inside T7 ``rest`` windows (``sim/detect.py`` output) are
scored; every other sample is gated out and counted, never flagged.
The baseline is the FIRST rest window in time order (the natural
"recalibration" reference). When it holds fewer than 10 samples the
baseline extends to the first 30 rest samples chronologically; the
choice is logged and stored in every flag payload.

IsolationForest (``--iforest``) is an OPT-IN second opinion on
``[residual, vib_rms_g, temperature_c]`` fitted on the same baseline
samples. It requires scikit-learn (see ``ai/requirements.txt``). When
sklearn is missing the run logs a clear fallback warning and scores
with the z-score baseline only.

Inputs:  T6 CSV (``sim/generate.py``) + T7 windows CSV (``sim/detect.py``).
Output:  JSONL flags, one auditable object per flag
         (ts, score, threshold, inputs, window_id, scenario).

Stdlib only unless ``--iforest`` with sklearn installed.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
import sys

# Mitad del ruido de reposo del transductor 0-10 kPa (0.01 kPa, ~0.25 L a 95 L): evita la
# división por cero sin tapar la resolución real. Con 0.10 kPa (~5 L) el piso ahogaría todo.
SIGMA_FLOOR_KPA = 0.005
# Cota del coeficiente térmico empírico: ~25x el efecto físico rho(T) (~0.002 kPa/°C).
BETA_CLIP_KPA_PER_C = 0.05
MIN_BASELINE_N = 10
BASELINE_FALLBACK_N = 30
DEFAULT_Z_THRESHOLD = 3.0
DEFAULT_CONTAMINATION = 0.05


def load_rows(path: str) -> list[dict]:
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def load_windows(path: str) -> list[dict]:
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def _f(value, default: float = float("nan")) -> float:
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def assign_rest_windows(rows: list[dict], windows: list[dict]) -> dict[int, dict]:
    """Map signal row index -> rest window row for rows inside a rest window."""
    rest = [w for w in windows if w.get("state") == "rest"]
    spans = []
    for w in rest:
        try:
            spans.append((_f(w["start_t_s"]), _f(w["end_t_s"]), w))
        except (KeyError, ValueError):
            continue
    spans.sort(key=lambda s: s[0])
    mapping: dict[int, dict] = {}
    for i, r in enumerate(rows):
        t = _f(r.get("t_s"))
        if math.isnan(t):
            continue
        for lo, hi, w in spans:
            if lo <= t <= hi:
                mapping[i] = w
                break
    return mapping


def fit_baseline(rest_samples: list[dict]) -> dict:
    """Fit temp coefficient + mu/sigma on baseline samples.

    Baseline = samples from the first rest window in time order; if that
    window holds fewer than MIN_BASELINE_N samples, fall back to the
    first BASELINE_FALLBACK_N rest samples chronologically.
    """
    by_window: dict[str, list[dict]] = {}
    for s in rest_samples:
        by_window.setdefault(str(s["window"].get("window_id")), []).append(s)
    first_wid = sorted(by_window, key=lambda k: _f(by_window[k][0]["row"].get("t_s")))
    first_wid = first_wid[0] if first_wid else None
    baseline = list(by_window.get(first_wid, [])) if first_wid is not None else []
    baseline_source = f"first-rest-window id={first_wid} n={len(baseline)}"
    if len(baseline) < MIN_BASELINE_N:
        ordered = sorted(rest_samples, key=lambda s: _f(s["row"].get("t_s")))
        baseline = ordered[:BASELINE_FALLBACK_N]
        baseline_source = (
            f"first-{BASELINE_FALLBACK_N}-rest-samples (first window n<"
            f"{MIN_BASELINE_N}) n={len(baseline)}"
        )
    ps = [_f(s["row"].get("pressure_kpa")) for s in baseline]
    ts = [_f(s["row"].get("temperature_c")) for s in baseline]
    ps = [v for v in ps if not math.isnan(v)]
    ts = [v for v in ts if not math.isnan(v)]
    n = min(len(ps), len(ts))
    ps, ts = ps[:n], ts[:n]
    if n == 0:
        raise ValueError("no valid baseline samples (pressure/temperature parse failed)")
    t_ref = sum(ts) / n
    mean_p = sum(ps) / n
    var_t = sum((t - t_ref) ** 2 for t in ts) / n if n > 1 else 0.0
    if var_t > 1e-4 and n >= MIN_BASELINE_N:
        cov = sum((p - mean_p) * (t - t_ref) for p, t in zip(ps, ts)) / n
        beta = max(-BETA_CLIP_KPA_PER_C, min(BETA_CLIP_KPA_PER_C, cov / var_t))
    else:
        beta = 0.0
    resid = [p - beta * (t - t_ref) for p, t in zip(ps, ts)]
    mu = sum(resid) / len(resid)
    sigma = statistics.pstdev(resid) if len(resid) > 1 else 0.0
    sigma = max(sigma, SIGMA_FLOOR_KPA)
    return {
        "mu": mu,
        "sigma": sigma,
        "beta": beta,
        "t_ref": t_ref,
        "n": n,
        "window_id": first_wid,
        "source": baseline_source,
    }


def residual(pressure: float, temp: float, beta: float, t_ref: float) -> float:
    return pressure - beta * (temp - t_ref)


def try_iforest(baseline_feats: list[list[float]], contamination: float):
    """Import + fit IsolationForest, or return (None, reason)."""
    try:
        from sklearn.ensemble import IsolationForest  # type: ignore
    except ImportError:
        return None, "sklearn-missing"
    if len(baseline_feats) < MIN_BASELINE_N:
        return None, "baseline-too-small"
    clf = IsolationForest(contamination=contamination, random_state=7)
    clf.fit(baseline_feats)
    return clf, "ok"


def score_rows(
    rows: list[dict],
    windows: list[dict],
    z_threshold: float = DEFAULT_Z_THRESHOLD,
    use_iforest: bool = False,
    contamination: float = DEFAULT_CONTAMINATION,
) -> dict:
    rest_map = assign_rest_windows(rows, windows)
    rest_samples = [
        {"idx": i, "row": rows[i], "window": rest_map[i]} for i in sorted(rest_map)
    ]
    gated_out = len(rows) - len(rest_samples)
    summary: dict = {
        "n_rows": len(rows),
        "n_rest": len(rest_samples),
        "n_gated_out": gated_out,
        "z_threshold": z_threshold,
        "iforest_requested": use_iforest,
        "iforest_status": "not-requested",
        "baselines": {},
        "flags": [],
    }
    if not rest_samples:
        summary["note"] = "no rest windows matched; zero flags"
        return summary
    samples_by_key: dict[tuple[str, str], list[dict]] = {}
    for sample in rest_samples:
        row = sample["row"]
        key = (str(row.get("device_id", "")), str(row.get("fsm_state", "")))
        samples_by_key.setdefault(key, []).append(sample)

    train_idx: set[int] = set()
    key_fits = {}
    for key, key_samples in samples_by_key.items():
        key_name = "|".join(key)
        base = fit_baseline(key_samples)
        if base["n"] < MIN_BASELINE_N:
            summary["baselines"][key_name] = {
                "status": "sin línea base suficiente",
                "n": base["n"],
                "minimum": MIN_BASELINE_N,
            }
            continue

        base["status"] = "ok"
        summary["baselines"][key_name] = base
        key_fits[key] = (key_samples, base)
    if len(key_fits) == 1:
        summary["baseline"] = next(iter(key_fits.values()))[1]

    clf_by_key = {}
    iforest_statuses = []
    for key, (key_samples, base) in key_fits.items():
        key_name = "|".join(key)
        if base["source"].startswith("first-rest-window"):
            train_wid = str(base["window_id"])
            key_train_idx = {
                s["idx"] for s in key_samples
                if str(s["window"].get("window_id")) == train_wid
            }
        else:
            ordered = sorted(key_samples, key=lambda s: _f(s["row"].get("t_s")))
            key_train_idx = {s["idx"] for s in ordered[:BASELINE_FALLBACK_N]}
        train_idx.update(key_train_idx)

        clf, if_status = (None, "not-requested")
        if use_iforest:
            feats = []
            for sample in key_samples:
                row = sample["row"]
                p, t = _f(row.get("pressure_kpa")), _f(row.get("temperature_c"))
                v = _f(row.get("vib_rms_g"))
                if math.isnan(p) or math.isnan(t) or math.isnan(v):
                    continue
                feats.append([residual(p, t, base["beta"], base["t_ref"]), v, t])
            clf, if_status = try_iforest(feats[:base["n"]], contamination)
            if clf is None:
                print(
                    f"WARN iforest fallback: {if_status} for {key_name}; scoring with z-score baseline only",
                    file=sys.stderr,
                )
        clf_by_key[key] = (clf, if_status)
        iforest_statuses.append(if_status)
    if use_iforest and len(set(iforest_statuses)) > 1:
        summary["iforest_status"] = "mixed"
    elif iforest_statuses:
        summary["iforest_status"] = iforest_statuses[0]

    flags = []
    for s in rest_samples:
        r = s["row"]
        key = (str(r.get("device_id", "")), str(r.get("fsm_state", "")))
        if key not in key_fits or s["idx"] in train_idx:
            continue
        base = key_fits[key][1]
        mu, sigma, beta, t_ref = base["mu"], base["sigma"], base["beta"], base["t_ref"]
        p, t = _f(r.get("pressure_kpa")), _f(r.get("temperature_c"))
        v, k = _f(r.get("vib_rms_g")), _f(r.get("vib_kurtosis"))
        if math.isnan(p) or math.isnan(t):
            continue
        res = residual(p, t, beta, t_ref)
        z = (res - mu) / sigma if sigma > 0 else 0.0
        z_flag = abs(z) > z_threshold
        if_flag = False
        if_score = None
        clf, if_status = clf_by_key[key]
        if clf is not None and not math.isnan(v):
            feat = [[res, v, t]]
            pred = clf.predict(feat)[0]
            if_score = float(-clf.decision_function(feat)[0])
            if_flag = bool(pred == -1)
        if not (z_flag or if_flag):
            continue
        if clf is not None:
            method = "zscore+iforest" if (z_flag and if_flag) else (
                "zscore" if z_flag else "iforest"
            )
        else:
            method = "zscore"
        direction = "pressure-drop" if z < 0 else "pressure-spike"
        flags.append({
            "ts": r.get("t_iso", ""),
            "t_s": _f(r.get("t_s")),
            "seq": int(float(r.get("seq", -1))),
            "device_id": r.get("device_id", ""),
            "fsm_state": r.get("fsm_state", ""),
            "scenario": r.get("label", ""),
            "window_id": int(float(s["window"].get("window_id", -1))),
            "zone": s["window"].get("zone", ""),
            "score": round(z, 3),
            "threshold": z_threshold,
            "method": method,
            "if_score": if_score,
            "iforest_status": if_status,
            "inputs": {
                "pressure_kpa": p,
                "temperature_c": t,
                "vib_rms_g": None if math.isnan(v) else v,
                "vib_kurtosis": None if math.isnan(k) else k,
                "residual_kpa": round(res, 4),
                "baseline_mu_kpa": round(mu, 4),
                "baseline_sigma_kpa": round(sigma, 4),
                "temp_beta_kpa_per_c": round(beta, 5),
                "temp_ref_c": round(t_ref, 3),
                "baseline_window_id": base["window_id"],
                "baseline_n": base["n"],
                "baseline_source": base["source"],
            },
            "reason": f"|z|={abs(z):.2f}>{z_threshold} ({direction}, rest-gated)",
        })
    flags.sort(key=lambda f: f["seq"])
    summary["flags"] = flags
    summary["n_scored"] = sum(len(samples) for samples, _ in key_fits.values()) - len(train_idx)
    summary["n_flags"] = len(flags)
    summary["n_train"] = len(train_idx)
    return summary


def write_flags(flags: list[dict], path: str) -> None:
    with open(path, "w") as f:
        for flag in flags:
            f.write(json.dumps(flag) + "\n")


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T9 z-score/IF anomaly scorer.")
    p.add_argument("--in", dest="inp", required=True, help="T6 signal CSV")
    p.add_argument("--windows", required=True, help="T7 windows CSV")
    p.add_argument("--out", default="ai/flags.jsonl", help="output JSONL flags")
    p.add_argument("--z-threshold", type=float, default=DEFAULT_Z_THRESHOLD)
    p.add_argument("--iforest", action="store_true", help="enable IsolationForest second opinion")
    p.add_argument("--contamination", type=float, default=DEFAULT_CONTAMINATION)
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    rows = load_rows(args.inp)
    windows = load_windows(args.windows)
    if not rows:
        raise SystemExit("input CSV has no rows")
    summary = score_rows(
        rows, windows,
        z_threshold=args.z_threshold,
        use_iforest=args.iforest,
        contamination=args.contamination,
    )
    write_flags(summary["flags"], args.out)
    base = summary.get("baseline", {})
    print(f"in={args.inp} windows={args.windows} out={args.out}")
    print(f"rows={summary['n_rows']} rest={summary['n_rest']} "
          f"scored={summary.get('n_scored', 0)} gated_out={summary['n_gated_out']} "
          f"train={summary.get('n_train', 0)} flags={summary['n_flags']}")
    if base:
        print(f"baseline {base['source']} mu={base['mu']:.3f}kPa "
              f"sigma={base['sigma']:.3f}kPa beta={base['beta']:.4f}kPa/C "
              f"Tref={base['t_ref']:.2f}C z_thr={summary['z_threshold']}")
    print(f"iforest requested={summary['iforest_requested']} status={summary['iforest_status']}")
    for f in summary["flags"][:10]:
        print(f"  FLAG seq={f['seq']} t_s={f['t_s']} z={f['score']} "
              f"w={f['window_id']} zone={f['zone']} scenario={f['scenario']} method={f['method']}")
    if len(summary["flags"]) > 10:
        print(f"  ... +{len(summary['flags']) - 10} more (see {args.out})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
