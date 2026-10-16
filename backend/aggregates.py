"""Agregaciones de flota sobre Polars (R2).

Cada endpoint analitico mezclaba dispositivos: "el nivel cae" no significa nada
si la respuesta es de toda la mina. Aqui la ventana se calcula con Polars
sobre columnas Float64 construidas en una sola pasada por los deques, sin
copiar un dict por fila.
"""

from __future__ import annotations

from typing import Any, Sequence

import polars as pl

try:  # paquete / módulo suelto (Docker copia backend/ a /app)
    from .store import NUMERIC_COLUMNS
except ImportError:
    from store import NUMERIC_COLUMNS  # type: ignore

DEFAULT_METRICS = ("pressure_kpa", "temperature_c", "vib_rms_g")
AVAILABLE_METRICS = tuple(NUMERIC_COLUMNS)
QUANTILE_INTERPOLATION = "linear"
QUANTILES = (("p50", 0.50), ("p95", 0.95), ("p99", 0.99))
STATISTICS = ("mean", "p50", "p95", "p99", "min", "max")


def parse_metrics(raw: str | None) -> list[str]:
    """Lista de metricas solicitada; vacia o desconocida -> las cuatro por defecto."""
    if not raw:
        return list(DEFAULT_METRICS)
    requested = [item.strip() for item in raw.split(",") if item.strip()]
    if not requested:
        return list(DEFAULT_METRICS)
    unknown = [name for name in requested if name not in AVAILABLE_METRICS]
    if unknown:
        raise ValueError(
            f"unknown metrics: {', '.join(sorted(unknown))}; "
            f"available: {', '.join(AVAILABLE_METRICS)}"
        )
    # Deduplicar conservando el orden pedido.
    seen: set[str] = set()
    ordered: list[str] = []
    for name in requested:
        if name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


def build_frame(columns: dict[str, list[Any]]) -> pl.DataFrame:
    """DataFrame columnar desde ``TelemetryStore.snapshot_window``.

    Se construye columna a columna: convertir miles de filas en dicts para
    luego aplanarlas de nuevo seria el doble del trabajo en el camino caliente.
    Las columnas ausentes se rellenan con null en vez de omitirse, para no
    romper la alineacion de alturas cuando se pide un subconjunto.
    """
    height = max((len(values) for values in columns.values()), default=0)

    def series(name: str, dtype: pl.DataType) -> pl.Series:
        values = columns.get(name)
        if values is None:
            values = [None] * height
        return pl.Series(name, values, dtype=dtype)

    frame_columns: dict[str, pl.Series] = {
        "device_id": series("device_id", pl.Utf8),
        "t_s": series("t_s", pl.Float64),
        "t_iso": series("t_iso", pl.Utf8),
    }
    for name in AVAILABLE_METRICS:
        frame_columns[name] = series(name, pl.Float64)
    return pl.DataFrame(frame_columns)


def _stat_expressions(metrics: Sequence[str]) -> list[pl.Expr]:
    expressions: list[pl.Expr] = []
    for name in metrics:
        expressions.append(pl.col(name).mean().alias(f"{name}__mean"))
        for label, quantile in QUANTILES:
            expressions.append(
                pl.col(name)
                .quantile(quantile, interpolation=QUANTILE_INTERPOLATION)
                .alias(f"{name}__{label}")
            )
        expressions.append(pl.col(name).min().alias(f"{name}__min"))
        expressions.append(pl.col(name).max().alias(f"{name}__max"))
        expressions.append(pl.col(name).count().alias(f"{name}__count"))
    return expressions


def _metric_block(row: dict[str, Any], name: str, devices: int) -> dict[str, Any]:
    block: dict[str, Any] = {stat: row.get(f"{name}__{stat}") for stat in STATISTICS}
    block["count"] = row.get(f"{name}__count") or 0
    block["devices"] = devices
    return block


def aggregate_fleet(
    frame: pl.DataFrame, metrics: Sequence[str]
) -> tuple[dict[str, Any], int, int]:
    """Agrega toda la flota. Devuelve (bloques, filas, dispositivos distintos)."""
    rows = frame.height
    if rows == 0:
        return {}, 0, 0
    devices = frame.get_column("device_id").n_unique()
    row = frame.select(_stat_expressions(metrics)).to_dicts()[0]
    blocks = {name: _metric_block(row, name, devices) for name in metrics}
    return blocks, rows, devices


def aggregate_by_device(
    frame: pl.DataFrame, metrics: Sequence[str], limit: int
) -> tuple[list[dict[str, Any]], int, int]:
    """Agrega por dispositivo. Devuelve (lista, filas, dispositivos)."""
    rows = frame.height
    if rows == 0:
        return [], 0, 0
    grouped = (
        frame.group_by("device_id")
        .agg(_stat_expressions(metrics) + [pl.len().alias("rows")])
        .sort("device_id")
    )
    devices = grouped.height
    out: list[dict[str, Any]] = []
    for row in grouped.head(limit).to_dicts():
        out.append(
            {
                "device_id": row["device_id"],
                "rows": row["rows"],
                "metrics": {name: _metric_block(row, name, 1) for name in metrics},
            }
        )
    return out, rows, devices
