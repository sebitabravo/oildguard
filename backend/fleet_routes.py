"""Fleet query handlers delegated from backend.main."""
from __future__ import annotations

from typing import Any, Literal

from fastapi import HTTPException, Query

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def fleet_aggregates(
    window_s: int = Query(default=10, ge=1, le=300),
    metrics: str | None = Query(default=None),
    group: Literal["fleet", "device"] = Query(default="fleet"),
    limit: int = Query(default=200, ge=1, le=2000),
) -> dict:
    main = _main()
    """Percentiles por metrica sobre los ultimos ``window_s`` segundos.

    ``group=fleet`` aplana toda la flota en un bloque por metrica; ``group=device``
    devuelve un bloque por equipo. Las respuestas vacias llevan ``reason`` y
    ``code`` ``no_rows`` en vez de ceros, que serian indistinguibles de una flota
    en reposo real.
    """
    try:
        requested = main.parse_metrics(metrics)
    except ValueError as exc:
        raise main.HTTPException(status_code=422, detail=str(exc)) from exc

    frame = main.build_frame(main._STORE.snapshot_window(window_s))
    if group == "fleet":
        blocks, rows, devices = main.aggregate_fleet(frame, requested)
    else:
        blocks, rows, devices = main.aggregate_by_device(frame, requested, limit)

    empty = rows == 0
    return {
        "status": "ok",
        "kind": "fleet-aggregates",
        "as_of": main._now_iso(),
        "window_s": window_s,
        "metrics": requested,
        "group": group,
        "limit": limit,
        "rows": rows,
        "devices": devices,
        "quantile_interpolation": main.QUANTILE_INTERPOLATION,
        "aggregates": [] if empty and group == "device" else blocks,
        "reason": "no_rows" if empty else None,
        "code": "no_rows" if empty else None,
    }


def alert_level_for(device_id: str) -> tuple[str | None, str | None]:
    main = _main()
    """Nivel de alerta de un equipo segun la escalera T10, o por que falta.

    Devuelve ``(nivel, razon)``; la razon es un token estable
    (``analyzer_unavailable``, ``no_rows``, ``evaluation_failed``, ``no_alert``)
    para que la UI lo localice sin analizar prosa.

    Evaluar la escalera cuesta una pasada sobre las filas del equipo, asi que
    se hace aqui y no por ruta: /fleet/devices ya es la ruta cara de la flota y
    el cache de la UI la refresca cada pocos segundos.
    """
    evaluator, import_reason = main._load_t10_evaluator()
    if evaluator is None:
        return None, "analyzer_unavailable"
    rows = main._sorted_device_rows(device_id)
    if not rows:
        return None, "no_rows"
    try:
        bundle = evaluator(main._samples_from_rows(rows))
    except Exception:  # noqa: BLE001 - puntuar nunca debe tumbar la ruta
        return None, "evaluation_failed"
    alerts = bundle.get("alerts") or []
    highest: str | None = None
    for alert in alerts:
        level = str(alert.get("level", ""))
        if level in main._LADDER_ORDER and (
            highest is None or main._LADDER_ORDER.index(level) > main._LADDER_ORDER.index(highest)
        ):
            highest = level
    if highest is None:
        return None, "no_alert"
    return highest, None


def fleet_devices(
    alert_level: Literal["auto", "on", "off"] = Query(default="auto"),
) -> dict:
    main = _main()
    """Retención, estado de firmas, última lectura y alerta por dispositivo.

    ``alert_level`` controla la escalera T10: ``auto`` (por defecto) solo la
    evalua si el almacen cabe en ``OILGUARD_ALERT_LEVEL_ROW_BUDGET`` filas,
    ``on`` la fuerza y ``off`` la omite. Ver ``alert_level`` en la respuesta
    para saber que paso y por que.
    """
    with main._store_lock:
        stats = main._STORE.device_stats()
    devices = [stats[device] for device in sorted(stats)]
    total_rows = sum(device["rows_retained"] for device in devices)
    within_budget = total_rows <= main.ALERT_LEVEL_ROW_BUDGET
    evaluate = alert_level == "on" or (alert_level == "auto" and within_budget)

    budget_reason = None
    if evaluate:
        for device in devices:
            level, reason = main.alert_level_for(device["device_id"])
            device["alert_level"] = level
            device["alert_level_reason"] = reason
    else:
        budget_reason = (
            "ladder_budget_exceeded" if alert_level == "auto" else "disabled_by_query"
        )
        for device in devices:
            device["alert_level"] = None
            device["alert_level_reason"] = budget_reason

    reasons = sorted({device["alert_level_reason"] for device in devices if device["alert_level_reason"]})
    return {
        "status": "ok",
        "kind": "fleet-devices",
        "as_of": main._now_iso(),
        "count": len(devices),
        "retention_rows": main.RETENTION_ROWS,
        "devices": devices,
        "alert_level": {
            "evaluated": bool(evaluate and devices),
            "mode": alert_level,
            "rows_scanned": total_rows if evaluate else 0,
            "row_budget": main.ALERT_LEVEL_ROW_BUDGET,
            "reason": reasons[0] if reasons else None,
        },
        "reason": None if devices else "no_rows",
        "code": None if devices else "no_rows",
    }


def fleet_outages(
    device_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=2000),
) -> dict:
    main = _main()
    """Rachas de filas con ``link_down`` por dispositivo (historial de cortes)."""
    with main._store_lock:
        devices = [device_id] if device_id else main._STORE.devices()
        runs: list[dict[str, Any]] = []
        for device in devices:
            if main._OUTAGES.is_dirty(device):
                # Llegada fuera de orden: el incremental no puede garantizar la
                # agrupacion por seq, asi que se reconstruye desde el almacen.
                main._OUTAGES.rebuild(device, main._STORE.rows(device))
            runs.extend(main._OUTAGES.runs(device))
    runs.sort(key=lambda run: (str(run.get("start_t_iso") or ""), run["device_id"]), reverse=True)
    total = len(runs)
    return {
        "status": "ok",
        "kind": "fleet-outages",
        "as_of": main._now_iso(),
        "device_id": device_id,
        "count": min(total, limit),
        "outages_total": total,
        "outages": runs[:limit],
        "reason": "no_outages" if total == 0 else None,
        "code": "no_outages" if total == 0 else None,
    }


def config_thresholds() -> dict:
    main = _main()
    """Espejo de solo lectura de las constantes que el analisis usa de verdad.

    Los numeros se IMPORTAN de ai/ladder.py, ai/level.py y ai/rul.py, nunca se
    copian: una copia envejece en silencio y la UI acabaria enseñando
    umbrales que el backend ya no aplica. El canal N2 es 2-of-3 sobre las tres
    senales, y la temperatura actsua como veto, asi que ambos van aqui con el
    codigo del canal.
    """
    from ai import ladder, level, rul

    return {
        "status": "ok",
        "kind": "config-thresholds",
        "as_of": main._now_iso(),
        "model": ladder.MODEL_LABEL,
        "capacity_l": level.CAPACITY_L,
        "warn_pct": ladder.WARN_PCT,
        "crit_pct": ladder.CRIT_PCT,
        "warn_l": rul.WARN_L,
        "crit_l": rul.CRIT_L,
        "min_scored_n": rul.MIN_SCORED_N,
        "min_baseline_n": level.MIN_BASELINE_N,
        "min_r2": rul.MIN_R2,
        "max_sigma_l": rul.MAX_SIGMA_L,
        "z_thr": ladder.Z_THR,
        "z_extreme": ladder.Z_EXTREME,
        "kurt_spike": ladder.KURT_SPIKE,
        "rms_high_g": ladder.RMS_HIGH_G,
        "temp_drift_c": ladder.TEMP_DRIFT_C,
        "abrupt_step_l": ladder.ABRUPT_STEP_L,
        "shift_h": ladder.SHIFT_H,
        "cycle_s": rul.CYCLE_S,
        "min_channels": 2,
        "n2_votes_of": 3,
        "channels": ["pressure_drop", "level_trend", "vib_impact"],
        "temp_veto": True,
        "ladder": list(ladder.LADDER),
        "severity": dict(ladder.SEVERITY),
        "sources": {
            "ladder": "ai/ladder.py",
            "level": "ai/level.py",
            "rul": "ai/rul.py",
        },
    }
