import ast
import builtins
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from types import ModuleType

import pytest
from fastapi.testclient import TestClient

from ai import ladder, rul
from backend import main as backend_main
from sim.generate import iter_rows

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "shared" / "message_codes.json"
EMITTER_PATHS = (
    ROOT / "ai" / "ladder.py",
    ROOT / "ai" / "rul.py",
    ROOT / "backend" / "main.py",
)
T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
NUMERIC = {
    "t_s", "slope_deg", "rotor_rpm", "wheel_rpm", "pressure_kpa",
    "temperature_c", "vib_rms_g", "vib_kurtosis", "level_liters", "level_pct",
}


@pytest.fixture
def client(monkeypatch):
    with backend_main._store_lock:
        backend_main._store_rows.clear()
    monkeypatch.setattr(backend_main, "_influx_status", "unknown (no ingest yet)")
    monkeypatch.setattr(
        backend_main,
        "_influx_message",
        {"code": "influx_unknown_no_ingest", "params": {}},
        raising=False,
    )
    return TestClient(backend_main.app)


def api_batch(scenario="clean", seconds=120.0, **kwargs):
    rows = []
    for row in iter_rows(scenario, seconds, "wheel-RH-01", 7, start=T0, **kwargs):
        rows.append({key: float(value) if key in NUMERIC else value for key, value in row.items()})
    return {"rows": rows}


def test_catalog_matches_every_backend_emitter_and_parameter_set():
    assert CATALOG_PATH.is_file(), "shared/message_codes.json must define backend message codes"
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    emitted: dict[str, set[tuple[str, ...]]] = {}

    for path in EMITTER_PATHS:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Name) or node.func.id != "message":
                continue
            assert node.args and isinstance(node.args[0], ast.Constant)
            code = node.args[0].value
            assert isinstance(code, str), f"message code must be a string literal in {path}"
            params = tuple(keyword.arg for keyword in node.keywords if keyword.arg is not None)
            emitted.setdefault(code, set()).add(params)

    assert set(emitted) == set(catalog)
    for code, parameter_sets in emitted.items():
        assert parameter_sets == {tuple(catalog[code])}, code


def test_empty_store_exposes_influx_level_alert_and_rul_messages(client):
    health = client.get("/health").json()
    level_data = client.get("/level").json()["data"]
    alerts_data = client.get("/alerts").json()["data"]
    rul_data = client.get("/rul").json()["data"]

    assert health["influx"] == "unknown (no ingest yet)"
    assert health["influx_message"] == {"code": "influx_unknown_no_ingest", "params": {}}
    assert level_data["source_message"] == {"code": "source_no_rows", "params": {}}
    assert level_data["note_message"] == {"code": "level_no_rows_note", "params": {}}
    assert alerts_data["fallback_message"] == {"code": "alerts_no_rows_fallback", "params": {}}
    assert alerts_data["note_message"] == {"code": "alerts_no_evaluation_note", "params": {}}
    assert rul_data["reason_message"] == {"code": "rul_no_rows_reason", "params": {}}
    assert rul_data["note_message"] == {"code": "rul_no_rows_note", "params": {}}


def test_slow_leak_messages_cover_ladder_model_rul_and_fallback(client):
    assert client.post("/ingest", json=api_batch("slow-leak", 120.0, leak_pct_per_h=128.5)).status_code == 200
    alerts = client.get("/alerts").json()["data"]
    rul = client.get("/rul").json()["data"]
    by_level = {alert["level"]: alert for alert in alerts["alerts"]}

    assert alerts["note_message"] == {"code": "ladder_model_note", "params": {}}
    assert alerts["fallback_message"] == {"code": "alerts_memory_fallback", "params": {}}
    level_data = client.get("/level").json()["data"]
    assert level_data["source_message"] == {"code": "source_memory_store", "params": {}}
    assert level_data["note_message"] == {"code": "level_estimate_note", "params": {}}
    assert by_level["N1"]["reason_message"] == {
        "code": "ladder_n1_trend_persistence",
        "params": {"window": by_level["N1"]["window_id"], "zone": by_level["N1"]["zone"]},
    }
    assert by_level["N2"]["reason_message"]["code"] in {
        "ladder_n2_same_window_confirmation",
        "ladder_n2_confirmed_persistence",
    }
    assert by_level["N3"]["reason_message"]["code"] == "ladder_n3_shift_window"
    assert rul["status"] == "ok"
    assert rul["reason_message"] == {"code": "rul_significant_leak_trend", "params": {}}
    assert rul["note_message"] == {"code": "rul_model_note", "params": {}}


def test_rul_structured_reasons_cover_every_suppression_gate():
    def evaluate(values, sigma_l=0.5):
        estimates = [
            {"t_s": float(index * 10), "level_liters": value, "gated": False, "train": False}
            for index, value in enumerate(values)
        ]
        return rul.extrapolate({"estimates": estimates, "sigma_liters": sigma_l})

    insufficient = rul.extrapolate({"estimates": [], "sigma_liters": 0.5})
    assert insufficient["reason_message"] == {
        "code": "rul_insufficient_rest_samples",
        "params": {"count": 0, "minimum": rul.MIN_SCORED_N},
    }

    precision = evaluate([95.0 - index for index in range(10)], sigma_l=3.0)
    assert precision["reason_message"] == {
        "code": "rul_baseline_precision_insufficient",
        "params": {"sigma_l": 3.0, "max_sigma_l": rul.MAX_SIGMA_L},
    }

    no_trend = evaluate([90.0] * 10)
    assert no_trend["reason_message"]["code"] == "rul_no_leak_trend"
    assert no_trend["reason_message"]["params"]["slope_l_per_h"] == 0.0

    weak = evaluate([95, 80, 94, 81, 93, 82, 92, 83, 91, 84])
    assert weak["reason_message"]["code"] == "rul_trend_too_weak"
    assert weak["reason_message"]["params"]["r2"] == pytest.approx(weak["r2"], abs=0.0005)
    assert weak["reason_message"]["params"]["minimum_r2"] == rul.MIN_R2


def test_ladder_emits_consecutive_window_confirmation_params(monkeypatch):
    estimates = []
    for seq in list(range(10)) + [10] + list(range(11, 21)):
        estimates.append({
            "seq": seq,
            "t_s": float(seq),
            "gated": False,
            "train": seq == 10,
            "z": None if seq == 10 else -4.0,
            "level_liters": None if seq == 10 else 90.0,
            "vib_kurtosis": None if seq == 10 else 0.0,
            "vib_rms_g": None if seq == 10 else 0.0,
            "temperature_c": None if seq == 10 else 40.0,
            "zone": "DUMP",
        })
    level_output = {
        "estimates": estimates,
        "baseline": {"source": "test", "t_ref": 40.0},
        "sigma_liters": 0.5,
    }
    monkeypatch.setattr(
        ladder.level_mod,
        "estimate",
        lambda _samples, baseline=None: level_output,
    )
    monkeypatch.setattr(
        ladder.rul_mod,
        "extrapolate",
        lambda _level: {"status": "suppressed", "slope_L_per_h": None},
    )

    bundle = ladder.evaluate([])
    n2 = next(alert for alert in bundle["alerts"] if alert["level"] == "N2")
    assert n2["reason_message"] == {
        "code": "ladder_n2_confirmed_persistence",
        "params": {"windows": [0, 1]},
    }


def test_analyzer_unavailable_and_evaluation_failure_fallbacks_are_coded(client, monkeypatch):
    assert client.post("/ingest", json=api_batch("clean", 60.0)).status_code == 200
    original_import = builtins.__import__

    def import_without_analyzer(name, *args, **kwargs):
        if name == "ai.ladder":
            raise ModuleNotFoundError("private evaluator detail")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", import_without_analyzer)
    alerts = client.get("/alerts").json()["data"]
    rul_data = client.get("/rul").json()["data"]
    assert alerts["fallback_message"] == {
        "code": "alerts_analyzer_unavailable_fallback",
        "params": {},
    }
    assert rul_data["note_message"] == {
        "code": "rul_analyzer_unavailable_note",
        "params": {},
    }
    assert rul_data["reason_message"] == {
        "code": "rul_analyzer_unavailable_reason",
        "params": {},
    }

    monkeypatch.setattr(
        backend_main,
        "_load_t10_evaluator",
        lambda: (lambda _rows, baseline=None: 1 / 0, None),
    )
    alerts = client.get("/alerts").json()["data"]
    assert alerts["fallback_message"] == {
        "code": "alerts_evaluation_failed_fallback",
        "params": {},
    }


def test_ingest_and_health_keep_legacy_influx_text_with_structured_sibling(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 0)
    monkeypatch.setattr(
        backend_main,
        "_write_to_influx",
        lambda rows: (
            f"written ({len(rows)} points -> test bucket)",
            {"code": "influx_written", "params": {"points": len(rows)}},
        ),
    )
    response = client.post("/ingest", json=api_batch("clean", 0.1))
    assert response.status_code == 200
    assert response.json()["influx"] == "written (1 points -> test bucket)"
    assert response.json()["influx_message"] == {
        "code": "influx_written",
        "params": {"points": 1},
    }
    health = client.get("/health").json()
    assert health["influx"] == "written (1 points -> test bucket)"
    assert health["influx_message"] == {
        "code": "influx_written",
        "params": {"points": 1},
    }


def test_abrupt_ladder_reason_messages_cover_all_n4_templates():
    cases = (
        (
            {"level_med_pct": 20.0, "level_med_L": 19.0, "z_min": 0.0, "kurt_max": 0.0},
            None,
            "ladder_n4_critical_level",
            {"level_pct": 20.0, "critical_pct": ladder.CRIT_PCT},
        ),
        (
            {"level_med_pct": 80.0, "level_med_L": 80.0, "z_min": 0.0, "kurt_max": 0.0},
            {"level_med_L": 90.0},
            "ladder_n4_abrupt_drop",
            {"from_l": 90.0, "to_l": 80.0, "threshold_l": ladder.ABRUPT_STEP_L},
        ),
        (
            {"level_med_pct": 80.0, "level_med_L": 80.0, "z_min": -11.0, "kurt_max": 6.0},
            None,
            "ladder_n4_extreme_collapse",
            {"z": -11.0, "kurtosis": 6.0},
        ),
    )
    for current, previous, code, params in cases:
        detected, _reason, structured = ladder._abrupt(current, previous)
        assert detected is True
        assert structured == {"code": code, "params": params}


def test_influx_write_messages_cover_success_unreachable_and_missing_client(monkeypatch):
    class FakePoint:
        def __init__(self, _measurement):
            pass

        def tag(self, *_args):
            return self

        def field(self, *_args):
            return self

        def time(self, *_args):
            return self

    class FakeWriteApi:
        def __init__(self, error=None):
            self.error = error

        def write(self, **_kwargs):
            if self.error:
                raise self.error

    class FakeClient:
        write_error = None

        def __init__(self, **_kwargs):
            pass

        def write_api(self, **_kwargs):
            return FakeWriteApi(self.write_error)

        def close(self):
            pass

    def install_client(error=None):
        FakeClient.write_error = error
        package = ModuleType("influxdb_client")
        package.__path__ = []
        package.InfluxDBClient = FakeClient
        package.Point = FakePoint
        client_module = ModuleType("influxdb_client.client")
        client_module.__path__ = []
        write_module = ModuleType("influxdb_client.client.write_api")
        write_module.SYNCHRONOUS = object()
        monkeypatch.setitem(sys.modules, "influxdb_client", package)
        monkeypatch.setitem(sys.modules, "influxdb_client.client", client_module)
        monkeypatch.setitem(sys.modules, "influxdb_client.client.write_api", write_module)

    row = {"seq": 1, "t_iso": "2026-01-01T00:00:00+00:00"}
    install_client()
    status, structured = backend_main._write_to_influx([row])
    assert status.startswith("written (1 points ->")
    assert structured == {"code": "influx_written", "params": {"points": 1}}

    install_client(RuntimeError("private endpoint detail"))
    status, structured = backend_main._write_to_influx([row])
    assert status.startswith("fallback-memory (unreachable ")
    assert structured == {"code": "influx_unreachable", "params": {}}

    original_import = builtins.__import__

    def import_without_influx(name, *args, **kwargs):
        if name == "influxdb_client":
            raise ImportError("client unavailable")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", import_without_influx)
    status, structured = backend_main._write_to_influx([row])
    assert status == "disabled (influxdb-client not installed); rows kept in memory"
    assert structured == {"code": "influx_client_missing", "params": {}}
