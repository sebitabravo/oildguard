import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_backend_rejects_unsigned_rows_when_signature_setting_is_unset(monkeypatch):
    monkeypatch.delenv("OILGUARD_REQUIRE_SIGNATURE", raising=False)
    monkeypatch.delenv("OILGUARD_DEVICE_MASTER_KEY", raising=False)
    monkeypatch.delenv("OILGUARD_DEVICE_KEYS", raising=False)
    env = os.environ.copy()
    env["OILGUARD_INFLUX_WRITE"] = "0"
    source = """
from fastapi.testclient import TestClient
from backend.main import app

row = {
    "t_iso": "2026-01-01T00:00:00+00:00",
    "t_s": 1.0,
    "seq": 1,
    "device_id": "unsigned-device",
    "fsm_state": "WAIT",
    "moving": 0,
    "recal_window": 0,
    "engine_on": 0,
    "slope_deg": 0.0,
    "rotor_rpm": 0.0,
    "wheel_rpm": 0.0,
    "rotating_sensor_regime": "static_pool",
    "submerged_fraction_per_revolution": 0.0,
    "pressure_kpa": 0.0,
    "temperature_c": 0.0,
    "vib_rms_g": 0.0,
    "vib_kurtosis": 0.0,
    "level_liters": 0.0,
    "level_pct": 0.0,
    "link_down": 0,
    "label": "normal",
}
with TestClient(app) as client:
    response = client.post("/ingest", json={"rows": [row]})
assert response.status_code == 401, response.text
assert response.json()["ingested"] == 0, response.json()
assert response.json()["rejected_reasons"] == {"unsigned": 1}, response.json()
"""

    result = subprocess.run(
        [sys.executable, "-c", source],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
