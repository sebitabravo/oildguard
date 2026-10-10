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
import threading
import time
from pathlib import Path

import pytest

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

PAYLOAD = (
    b'{"rows":[{"dev_id":"dev-1","seq":1,"t_s":1.0,'
    b'"pressure_kpa":2.5,"temp_c":20.0,"vibration_mm_s":1.0}]}'
)


class _FakeMsg:
    topic = "oilguard/signals/dev-1"

    def __init__(self, payload: bytes):
        self.payload = payload


def _drive_callback(monkeypatch, forward, payload: bytes = PAYLOAD) -> None:
    """Ejecuta el callback real de run_forever contra un cliente paho falso.

    on_message es una closure, asi que solo se alcanza a traves del cliente:
    el falso entrega un mensaje en loop_forever y luego bloquea en un Event.
    El hilo se abandona como daemon al terminar la prueba.

    Se inyecta un modulo paho ficticio en vez de depender del driver: asi la
    prueba es hermetica y no cambia si el broker esta disponible.
    """
    import types

    import backend.ingest_mqtt as im

    delivered = threading.Event()
    park = threading.Event()  # nunca se activa: el hilo queda aparcado

    class _FakeClient:
        def __init__(self, *_a, **_k):
            self.on_message = None

        def connect(self, *_a, **_k):
            return 0

        def loop_forever(self):
            # run_forever reconecta en bucle mientras loop_forever devuelva, asi
            # que el mensaje se entrega una sola vez y luego el hilo se queda
            # bloqueado hasta que la prueba lo libere.
            if not delivered.is_set():
                # Se marca DESPUES del callback: la prueba lee el estado de
                # temporizacion en cuanto ve la senal.
                self.on_message(self, None, _FakeMsg(payload))
                delivered.set()
            # Tras entregar, el hilo queda aparcado: run_forever reconectaria
            # en bucle y quemaria CPU durante el resto de la sesion.
            park.wait()

        def subscribe(self, *_a, **_k):
            return 0

        def disconnect(self):
            return 0

        def publish(self, *_a, **_k):
            raise AssertionError("no se publica nada en este camino")

    paho = types.ModuleType("paho")
    mqtt_pkg = types.ModuleType("paho.mqtt")
    mqtt_mod = types.ModuleType("paho.mqtt.client")
    mqtt_mod.Client = _FakeClient
    paho.mqtt = mqtt_pkg
    mqtt_pkg.client = mqtt_mod

    for name, module in (
        ("paho", paho),
        ("paho.mqtt", mqtt_pkg),
        ("paho.mqtt.client", mqtt_mod),
    ):
        monkeypatch.setitem(sys.modules, name, module)

    thread = threading.Thread(
        target=lambda: im.run_forever(forward), daemon=True
    )
    thread.start()
    assert delivered.wait(5), "el cliente falso nunca recibio el mensaje"


def test_bridge_timing_costs_nothing_when_disabled(monkeypatch):
    import backend.ingest_mqtt as im

    im.bridge_timing_reset()
    monkeypatch.delenv("OILGUARD_BRIDGE_TIMING", raising=False)
    assert im.bridge_timing_enabled() is False

    calls: list = []
    _drive_callback(monkeypatch, lambda rows: calls.append(rows) or {"accepted": len(rows)})

    assert len(calls) == 1
    # Con la bandera apagada no se toca ni un solo temporizador.
    assert im.bridge_state()["callbacks"] == 0
    im.bridge_timing_reset()


def test_bridge_timing_splits_decode_and_submit_when_enabled(monkeypatch):
    import backend.ingest_mqtt as im

    im.bridge_timing_reset()
    monkeypatch.setenv("OILGUARD_BRIDGE_TIMING", "1")
    assert im.bridge_timing_enabled() is True

    calls: list = []

    def forward(rows):
        calls.append(rows)
        time.sleep(0.005)  # submit lento a proposito para separarlo de decode
        return {"accepted": len(rows)}

    _drive_callback(monkeypatch, forward)

    state = im.bridge_state()
    assert len(calls) == 1
    assert state["callbacks"] == 1
    assert state["mean_total_ms"] > 0.0
    assert state["mean_submit_ms"] >= 4.0
    # decode + submit cuadra con el total medido.
    assert state["mean_decode_ms"] + state["mean_submit_ms"] == pytest.approx(
        state["mean_total_ms"], rel=0.05
    )
    assert 0.0 <= state["decode_share"] <= 1.0
    assert state["max_total_ms"] == pytest.approx(state["mean_total_ms"], rel=0.5)
    im.bridge_timing_reset()


def test_bridge_timing_reset_clears_partial_state(monkeypatch):
    import backend.ingest_mqtt as im

    monkeypatch.setenv("OILGUARD_BRIDGE_TIMING", "1")
    _drive_callback(monkeypatch, lambda rows: {"accepted": len(rows)})
    assert im.bridge_state()["callbacks"] == 1

    im.bridge_timing_reset()
    assert im.bridge_state() == {
        "callbacks": 0,
        "mean_total_ms": 0.0,
        "mean_decode_ms": 0.0,
        "mean_submit_ms": 0.0,
        "max_total_ms": 0.0,
        "decode_share": 0.0,
    }
