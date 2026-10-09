from datetime import datetime, timezone
import secrets

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from shared.signing import sign_row
from sim.generate import iter_rows

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
KEY = secrets.token_bytes(32)


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(backend_main, "_write_to_influx", lambda _rows: "test-memory")
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {"wheel-RH-01": KEY}, raising=False)
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", True, raising=False)
    with backend_main._store_lock:
        backend_main._store_rows.clear()
        backend_main._seen_signed_rows.clear()
        backend_main._verified_total = 0
        backend_main._rejected_total = 0
        backend_main._rejected_reasons.clear()
    return TestClient(backend_main.app)


def generated_row():
    row = next(iter_rows("clean", 0.1, "wheel-RH-01", 7, start=T0))
    row["submerged_fraction_per_revolution"] = float(
        row["submerged_fraction_per_revolution"]
    )
    for field in (
        "t_s", "slope_deg", "rotor_rpm", "wheel_rpm", "pressure_kpa",
        "temperature_c", "vib_rms_g", "vib_kurtosis", "level_liters", "level_pct",
    ):
        row[field] = float(row[field])
    return row


def test_signed_http_row_is_marked_verified(client):
    row = sign_row(generated_row(), KEY)

    response = client.post("/ingest", json={"rows": [row]})

    assert response.status_code == 200
    with backend_main._store_lock:
        stored = dict(backend_main._store_rows[-1])
    assert stored["sig_verified"] is True
    assert stored["rotating_sensor_regime"] == row["rotating_sensor_regime"]
    assert stored["submerged_fraction_per_revolution"] == row[
        "submerged_fraction_per_revolution"
    ]
    assert response.json()["rejected"] == 0


def test_enforced_ingest_rejects_unsigned_rows_and_reports_counts(client):
    response = client.post("/ingest", json={"rows": [generated_row()]})

    assert response.status_code == 401
    assert response.json()["rejected_reasons"] == {"unsigned": 1}
    assert response.json()["ingested"] == 0


def test_tampered_signature_is_rejected_even_when_permissive(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", False)
    row = sign_row(generated_row(), KEY)
    row["pressure_kpa"] += 1

    response = client.post("/ingest", json={"rows": [row]})

    assert response.status_code == 200
    assert response.json()["rejected_reasons"] == {"bad_signature": 1}
    assert response.json()["ingested"] == 0


def test_wrong_signature_version_is_rejected(client):
    row = sign_row(generated_row(), KEY)
    row["sig_v"] = "unknown-version"

    response = client.post("/ingest", json={"rows": [row]})

    assert response.status_code == 401
    assert response.json()["rejected_reasons"] == {"bad_signature": 1}


def test_signed_row_for_unconfigured_device_is_rejected(client):
    row = generated_row()
    row["device_id"] = "wheel-unknown"
    row = sign_row(row, KEY)

    response = client.post("/ingest", json={"rows": [row]})

    assert response.status_code == 401
    assert response.json()["rejected_reasons"] == {"unknown_device": 1}


def test_duplicate_signed_row_is_rejected_as_replay(client):
    row = sign_row(generated_row(), KEY)

    first = client.post("/ingest", json={"rows": [row]})
    second = client.post("/ingest", json={"rows": [row]})

    assert first.json()["ingested"] == 1
    assert second.status_code == 401
    assert second.json()["rejected_reasons"] == {"replay": 1}
    assert second.json()["store_rows"] == 1


def test_health_exposes_aggregate_signing_status_without_device_ids(client):
    row = sign_row(generated_row(), KEY)
    client.post("/ingest", json={"rows": [row]})
    client.post("/ingest", json={"rows": [generated_row()]})

    signing = client.get("/health").json()["signing"]

    assert signing == {
        "enforced": True,
        "devices": 1,
        "verified_total": 1,
        "rejected_total": 1,
        "rejected_reasons": {"unsigned": 1},
    }
    assert "wheel-RH-01" not in str(signing)


def test_in_process_mqtt_ingest_uses_same_signature_rules(client):
    result = backend_main.ingest_rows(
        [sign_row(generated_row(), KEY), generated_row()]
    )

    assert result["ingested"] == 1
    assert result["rejected_reasons"] == {"unsigned": 1}
    with backend_main._store_lock:
        assert backend_main._store_rows[0]["sig_verified"] is True


def test_only_verified_rows_are_written_to_influx(client, monkeypatch):
    written = []
    monkeypatch.setattr(
        backend_main,
        "_write_to_influx",
        lambda rows: written.extend(rows) or "test-memory",
    )

    backend_main.ingest_rows([sign_row(generated_row(), KEY), generated_row()])

    assert len(written) == 1
    assert written[0]["sig_verified"] is True


def test_permissive_mode_accepts_unsigned_rows_as_unverified(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", False)

    response = client.post("/ingest", json={"rows": [generated_row()]})

    assert response.status_code == 200
    assert response.json()["rejected"] == 0
    with backend_main._store_lock:
        assert backend_main._store_rows[0]["sig_verified"] is False

