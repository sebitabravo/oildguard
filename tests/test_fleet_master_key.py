"""Derivacion de llaves por dispositivo desde una llave maestra (R2).

El simulador Rust firma miles de dispositivos; listar una llave por equipo en
OILGUARD_DEVICE_KEYS no escala. shared.signing.derive_device_key permite
derivar la misma llave en ambos lados a partir de una sola maestra.
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from shared.signing import derive_device_key, sign_row
from sim.generate import iter_rows

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
NUMERIC = {
    "t_s", "slope_deg", "rotor_rpm", "wheel_rpm", "pressure_kpa",
    "temperature_c", "vib_rms_g", "vib_kurtosis", "level_liters", "level_pct",
}
MASTER = secrets.token_bytes(32)
MASTER_HEX = MASTER.hex()


def generated_row(device_id: str = "wheel-RH-01") -> dict:
    row = next(iter_rows("clean", 0.1, device_id, 7, start=T0))
    return {key: (float(value) if key in NUMERIC else value) for key, value in row.items()}


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(
        backend_main,
        "_write_to_influx",
        lambda rows: (
            "test-memory",
            {"code": "influx_written", "params": {"points": len(rows)}},
        ),
    )
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {}, raising=False)
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", MASTER, raising=False)
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", True, raising=False)
    with backend_main._store_lock:
        backend_main._store_rows.clear()
        backend_main._seen_signed_rows.clear()
        backend_main._verified_total = 0
        backend_main._rejected_total = 0
        backend_main._rejected_reasons.clear()
    return TestClient(backend_main.app)


def test_device_without_explicit_entry_verifies_with_the_derived_key(client):
    row = sign_row(generated_row(), derive_device_key(MASTER, "wheel-RH-01"))

    response = client.post("/ingest", json={"rows": [row]})

    assert response.status_code == 200
    assert response.json()["ingested"] == 1
    assert response.json()["rejected_reasons"] == {}


def test_derived_key_is_reproducible_per_device(client):
    derived = backend_main.device_key("wheel-RH-01")

    assert derived == derive_device_key(MASTER, "wheel-RH-01")
    assert derived != backend_main.device_key("wheel-RH-02")


def test_explicit_entry_keeps_priority_over_the_derived_key(client, monkeypatch):
    explicit = secrets.token_bytes(32)
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {"wheel-RH-01": explicit})

    derived_row = sign_row(generated_row(), derive_device_key(MASTER, "wheel-RH-01"))
    derived_response = client.post("/ingest", json={"rows": [derived_row]})
    explicit_response = client.post(
        "/ingest", json={"rows": [sign_row(generated_row(), explicit)]}
    )

    # La llave explicita manda: la firma derivada debe fallar en ese equipo.
    assert derived_response.json()["rejected_reasons"] == {"bad_signature": 1}
    assert explicit_response.json()["ingested"] == 1
    assert backend_main.device_key("wheel-RH-01") == explicit


def test_other_devices_still_derive_when_one_is_explicit(client, monkeypatch):
    explicit = secrets.token_bytes(32)
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {"wheel-RH-01": explicit})

    other = sign_row(generated_row("wheel-RH-02"), derive_device_key(MASTER, "wheel-RH-02"))

    assert client.post("/ingest", json={"rows": [other]}).json()["ingested"] == 1


def test_without_master_key_a_signed_unknown_device_stays_unknown(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", None)

    row = sign_row(generated_row(), derive_device_key(MASTER, "wheel-RH-01"))
    response = client.post("/ingest", json={"rows": [row]})

    assert response.status_code == 401
    assert response.json()["rejected_reasons"] == {"unknown_device": 1}


def test_row_without_device_id_is_not_derived(client):
    row = sign_row(generated_row(), derive_device_key(MASTER, "wheel-RH-01"))
    row["device_id"] = ""

    assert backend_main.device_key("") is None
    assert client.post("/ingest", json={"rows": [row]}).json()["rejected_reasons"] == {
        "unknown_device": 1
    }


def test_health_reports_explicit_count_and_master_key_flag_without_leaking_keys(client):
    client.post("/ingest", json={"rows": [sign_row(generated_row(), derive_device_key(MASTER, "wheel-RH-01"))]})

    health = client.get("/health")
    payload = health.json()

    assert health.status_code == 200
    assert payload["device_keys"] == {"explicit": 0, "master_key_configured": True}
    # devices sigue contando solo entradas explicitas; la derivacion no infla el numero.
    assert payload["signing"]["devices"] == 0
    assert MASTER_HEX not in health.text
    assert MASTER.hex() not in health.text


def test_health_reports_master_key_disabled_when_unset(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", None)

    payload = client.get("/health").json()

    assert payload["device_keys"] == {"explicit": 0, "master_key_configured": False}


def test_ingest_never_logs_key_material(client, caplog):
    with caplog.at_level(logging.DEBUG):
        client.post("/ingest", json={"rows": [sign_row(generated_row(), derive_device_key(MASTER, "wheel-RH-01"))]})
        client.post("/ingest", json={"rows": [generated_row()]})

    logged = caplog.text
    assert MASTER_HEX not in logged
    assert derive_device_key(MASTER, "wheel-RH-01").hex() not in logged


@pytest.mark.parametrize("spec", ["zz-not-hex", "0" * 0, "  "])
def test_malformed_master_key_is_rejected_at_parse_time(spec):
    if not spec.strip():
        assert backend_main.parse_master_key(spec) is None
        return
    with pytest.raises(ValueError):
        backend_main.parse_master_key(spec)


def test_valid_master_key_parses_to_bytes():
    assert backend_main.parse_master_key(f"  {MASTER_HEX}  ") == MASTER
    assert backend_main.parse_master_key("") is None
