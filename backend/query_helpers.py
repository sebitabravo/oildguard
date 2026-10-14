"""Store query and series helpers delegated from backend.main."""
from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import Query

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def _load_t10_evaluator() -> tuple[Any | None, str | None]:
    try:
        from ai.ladder import evaluate as evaluate_ladder  # type: ignore
    except Exception as exc:  # noqa: BLE001 - health informa si falta el analizador
        return None, str(exc)
    return evaluate_ladder, None


def _analysis_status() -> dict[str, Any]:
    main = _main()
    evaluator, reason = main._load_t10_evaluator()
    return {"available": evaluator is not None, "reason": reason}


def _samples_from_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Prepara muestras con la misma marca de reposo usada por el análisis T10."""
    samples = []
    for row in rows:
        sample = dict(row)
        try:
            sample["rest"] = int(float(row.get("recal_window", 0))) == 1
        except (ValueError, TypeError):
            sample["rest"] = False
        samples.append(sample)
    return samples


def _downsample_evenly(points: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    if len(points) <= limit:
        return points
    if limit == 1:
        return [points[-1]]
    last_index = len(points) - 1
    return [points[(index * last_index) // (limit - 1)] for index in range(limit)]


def _unevaluated_reason(
    bundle: dict[str, Any] | None,
    analysis_available: bool,
    evaluated: bool,
) -> str | None:
    if evaluated:
        return None
    if not analysis_available:
        return "analysis_unavailable"
    if bundle is None:
        return "no_rows"
    if str(bundle.get("rul", {}).get("reason", "")).startswith(
        "insufficient rest samples"
    ):
        return "insufficient_rest_samples"
    return "analysis_unavailable"


def _compose_rul_suppression_note(reason: str) -> str:
    detail = reason.strip()
    marker = "anomaly-only"
    if detail.lower().endswith(marker):
        detail = detail[: -len(marker)].rstrip(" ;,")
    if detail:
        return f"RUL unavailable: {detail}; anomaly-only alerts remain available."
    return "RUL unavailable; anomaly-only alerts remain available."


def _parse_series_signals(raw: str | None) -> list[str]:
    main = _main()
    """Señales extra de la serie; vacío o desconocido -> las tres por defecto."""
    if not raw:
        return []
    requested = [item.strip() for item in raw.split(",") if item.strip()]
    unknown = [name for name in requested if name not in main.SERIES_SIGNALS]
    if unknown:
        raise ValueError(
            f"unknown signals: {', '.join(sorted(unknown))}; "
            f"available: {', '.join(main.SERIES_SIGNALS)}"
        )
    seen: set[str] = set()
    ordered: list[str] = []
    for name in requested:
        if name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


def level_series(
    limit: int = Query(default=300, ge=1, le=2000),
    device_id: str | None = Query(default=None),
    signals: str | None = Query(default=None),
) -> dict:
    main = _main()
    """Sirve la serie fusionada y limitada de nivel del almacenamiento de sesión.

    ``signals`` añade columnas por punto (aditivo, no cambia el contrato) y
    ``truth_liters`` aparece solo si las filas traen la verdad del generador:
    inventar una verdad que no se midió sería exactamente el tipo de dato que
    este producto no debe mostrar.
    """
    rows = main._sorted_device_rows(main.select_device(device_id))
    try:
        requested = _parse_series_signals(signals)
    except ValueError as exc:
        raise main.HTTPException(status_code=422, detail=str(exc)) from exc
    if not rows:
        return {
            "status": "ok",
            "kind": "oil-level-series",
            "as_of": main._now_iso(),
            "count": 0,
            "reason": "no_rows",
            "series": [],
        }

    from ai import level as level_estimator

    try:
        estimate = level_estimator.estimate(main._samples_from_rows(rows))
    except ValueError as exc:
        raise main.HTTPException(status_code=422, detail=str(exc)) from exc
    sigma_l = estimate.get("sigma_liters")
    has_truth = any(main.as_float(row.get("level_liters")) is not None for row in rows)
    series = []
    for row, point in zip(rows, estimate["estimates"]):
        item: dict[str, Any] = {
            "t_s": point["t_s"],
            "level_l": point["level_liters"],
            "sigma_l": sigma_l,
            "moving": int(float(row.get("moving", 0))),
            "recal_window": int(float(row.get("recal_window", 0))),
        }
        for name in requested:
            item[name] = main.as_float(row.get(name))
        if has_truth:
            item["truth_liters"] = main.as_float(row.get("level_liters"))
        series.append(item)
    series = main._downsample_evenly(series, limit)
    return {
        "status": "ok",
        "kind": "oil-level-series",
        "as_of": main._now_iso(),
        "count": len(series),
        "reason": None if estimate["estimates"] else "insufficient_rest_samples",
        "series": series,
    }


def windows(limit: int = 50, device_id: str | None = Query(default=None)) -> dict:
    main = _main()
    """Rest windows grouped from in-memory ``recal_window`` flags.

    Consecutive rows with recal_window == 1 form one window (zone by
    majority vote, audit only). The full stillness-rules detector is
    ``sim/detect.py`` — see docs/t7-windows.md.
    """
    rows = main._sorted_device_rows(main.select_device(device_id))
    out: list[dict[str, Any]] = []
    cur: list[dict[str, Any]] = []

    def flush(group: list[dict[str, Any]]) -> None:
        zone = Counter(g.get("fsm_state", "?") for g in group).most_common(1)[0][0]
        out.append(
            {
                "window_id": len(out),
                "state": "rest",
                "start_t_s": group[0].get("t_s"),
                "end_t_s": group[-1].get("t_s"),
                "start_iso": group[0].get("t_iso"),
                "end_iso": group[-1].get("t_iso"),
                "duration_s": round(
                    float(group[-1].get("t_s", 0.0)) - float(group[0].get("t_s", 0.0)), 1
                ),
                "zone": zone,
                "reason": "recal_window==1 grouping (in-memory; full T7 detector: sim/detect.py)",
            }
        )

    for r in rows:
        if int(r.get("recal_window", 0)) == 1:
            cur.append(r)
        elif cur:
            flush(cur)
            cur = []
    if cur:
        flush(cur)
    return {
        "status": "ok",
        "kind": "rest-windows",
        "as_of": main._now_iso(),
        "count": len(out),
        "windows": out[: max(0, limit)],
        "note": "Grouped from ingested recal_window flags. No rows yet? Run sim/run_t7.py for the full detector.",
    }
