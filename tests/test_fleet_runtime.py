"""Runtime del backend: Python 3.12, polars fijado e interpolación lineal.

El método de percentiles es parte del contrato público de /fleet/aggregates;
si polars cambia el default (nearest), los números publicados cambian sin
que nadie lo note. Este test fija la intención.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
REQUIREMENTS = (ROOT / "backend" / "requirements.txt").read_text(encoding="utf-8")
DOCKERFILE = (ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")


def pinned_polars() -> str:
    match = re.search(r"^polars==(\S+)$", REQUIREMENTS, re.MULTILINE)
    assert match, "polars debe estar fijado con polars==X.Y.Z en backend/requirements.txt"
    return match.group(1)


def test_polars_installed_matches_the_pinned_requirement():
    import polars

    assert polars.__version__ == pinned_polars()


def test_dockerfile_builds_on_python_312_slim():
    assert "FROM python:3.12-slim" in DOCKERFILE


def test_websocket_transport_is_installed_next_to_uvicorn():
    """uvicorn sin ws devuelve 404 en /ws/fleet aunque el ASGI app sea correcta.

    TestClient no reproduce esto porque fala el transporte del servidor: el
    endpoint pasaba en verde mientras el servicio en produccion no aceptaba
    conexiones WebSocket.
    """
    assert re.search(r"^websockets==\S+$", REQUIREMENTS, re.MULTILINE), (
        "backend/requirements.txt debe fijar websockets: uvicorn sin transporte "
        "ws responde 404 en /ws/fleet"
    )

    # Lo que uvicorn comprueba al arrancar es justo que estos import funcionan;
    # sin uno de los dos registra "No supported WebSocket library detected".
    import websockets  # noqa: F401

    import uvicorn

    assert uvicorn.__version__


def test_polars_linear_quantile_matches_hand_computed_values():
    import polars as pl

    series = pl.Series("x", [1.0, 2.0, 3.0, 4.0])

    assert series.quantile(0.5, interpolation="linear") == pytest.approx(2.5)
    assert series.quantile(0.95, interpolation="linear") == pytest.approx(3.85)
    assert series.quantile(0.99, interpolation="linear") == pytest.approx(3.97)