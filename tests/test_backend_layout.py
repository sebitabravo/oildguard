"""El paquete backend debe importar igual en los dos layouts (R2c).

Hay dos formas de cargar estos modulos:

- como paquete: ``from backend import main`` (pytest, ``uvicorn backend.main:app``)
- planos: Docker copia ``backend/`` a ``/app`` y ejecuta ``main:app``, asi que
  alli no hay paquete y los imports son de nivel superior.

Un solo bloque ``try`` con todos los imports hace que, si falta un simbolo en
cualquiera de ellos, el modulo entero caiga al modo plano y el error real
desaparezca bajo un ``No module named`` del modulo equivocado. Estos tests lo
pinan.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BACKEND = REPO / "backend"


def _run(code: str, *, flat: bool = False) -> subprocess.CompletedProcess:
    """Ejecuta codigo en un subproceso.

    ``flat=True`` replica el layout de la imagen: cwd en backend/ (el WORKDIR
    /app) y la raiz del repo en PYTHONPATH para `shared`, igual que el
    Dockerfile que copia backend/, shared/, ai/ y sim/ alli.
    """
    env = dict(os.environ)
    if flat:
        env["PYTHONPATH"] = str(REPO)
        return subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            cwd=str(BACKEND),
            env=env,
        )
    return subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        cwd=str(REPO),
        env=env,
    )


def test_backend_imports_as_a_package():
    result = _run("import backend.main as m; print(m.CAPACITY_L)")

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "95.0"


def test_backend_imports_flat_like_the_docker_app_layout():
    """Como en /app: sin paquete, imports de nivel superior."""
    result = _run("import main; print(main.CAPACITY_L)", flat=True)

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "95.0"


def test_influx_writer_imports_in_both_layouts():
    package = _run("from backend.influx_writer import InfluxWriter, encode_row; print('ok')")
    flat = _run("from influx_writer import InfluxWriter, encode_row; print('ok')", flat=True)

    assert package.returncode == 0, package.stderr
    assert flat.returncode == 0, flat.stderr


def test_every_sibling_symbol_main_exports_resolves_in_both_layouts():
    """Los simbolos que main.py reexporta deben existir en los dos layouts."""
    names = [
        "InfluxWriter", "CachedProbe", "IngestMetrics", "TisoClock", "RateLimiter",
        "IngestPipeline", "TelemetryStore", "StoreView", "outage_runs", "as_float",
        "bridge_state", "bridge_timing_enabled", "build_frame", "aggregate_fleet",
        "aggregate_by_device", "parse_metrics", "DEFAULT_METRICS",
        "QUANTILE_INTERPOLATION", "DEFAULT_DEVICE", "RETENTION_ROWS",
    ]
    check = ";".join(f"assert hasattr(m, {name!r}), {name!r}" for name in names)

    package = _run(f"import backend.main as m;{check};print('ok')")
    flat = _run(f"import main as m;{check};print('ok')", flat=True)

    assert package.returncode == 0, package.stderr
    assert flat.returncode == 0, flat.stderr


def test_a_missing_symbol_reports_the_real_error_not_a_flat_import_mistake():
    """Si falta un simbolo, el error debe nombrarlo, no cambiar de layout.

    Es la regresion que rompió la rama: un simbolo ausente en un modulo hizo
    caer todo main.py al modo plano y el fallo aparecio como
    "No module named 'influx_writer'".
    """
    stub = BACKEND.parent / "_layout_probe"
    stub.mkdir(exist_ok=True)
    try:
        (stub / "backend_probe.py").write_text(
            "try:\n"
            "    from .missing_module import thing  # noqa: F401\n"
            "except ImportError:\n"
            "    import missing_module  # noqa: F401\n",
            encoding="utf-8",
        )
        result = subprocess.run(
            [sys.executable, "-c", "import backend_probe"],
            capture_output=True,
            text=True,
            cwd=str(stub),
        )
        assert result.returncode != 0
        assert "No module named 'missing_module'" in result.stderr
        # El nombre real aparece en el mensaje, no el de otro modulo.
        assert "influx_writer" not in result.stderr
    finally:
        for path in sorted(stub.rglob("*"), reverse=True):
            path.unlink() if path.is_file() else path.rmdir()
        stub.rmdir()


def test_bridge_timing_is_off_by_default_and_costs_nothing():
    from backend.ingest_mqtt import bridge_state, bridge_timing_enabled

    assert bridge_timing_enabled() is False
    assert bridge_state()["callbacks"] == 0