from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    from backend import main

    monkeypatch.setattr(
        main,
        "_write_to_influx",
        lambda rows: ("test-memory", {"code": "influx_written", "params": {"points": len(rows)}}),
    )
    with main._store_lock:
        main._store_rows.clear()
    return TestClient(main.app)


def test_rejected_only_device_does_not_enter_fleet_inventory(client, monkeypatch):
    from backend import main
    from shared.signing import sign_row

    monkeypatch.setattr(main, "_DEVICE_KEYS", {"trusted-device": b"k" * 32})
    monkeypatch.setattr(main, "_REQUIRE_SIGNATURE", True)
    unsigned = {
        "t_iso": "2026-01-01T00:00:00+00:00",
        "t_s": 0,
        "seq": 1,
        "device_id": "rejected-device",
        "fsm_state": "LOAD",
        "moving": 0,
        "recal_window": 1,
        "engine_on": 1,
        "slope_deg": 0.1,
        "rotor_rpm": 100.0,
        "wheel_rpm": 3.0,
        "rotating_sensor_regime": "static_pool",
        "submerged_fraction_per_revolution": 1.0,
        "pressure_kpa": 1.0,
        "temperature_c": 40.0,
        "vib_rms_g": 0.2,
        "vib_kurtosis": 2.0,
        "level_liters": 90.0,
        "level_pct": 95.0,
        "link_down": 0,
        "label": "normal",
    }
    accepted = sign_row({**unsigned, "device_id": "trusted-device"}, b"k" * 32)
    assert client.post("/ingest", json={"rows": [accepted]}).status_code == 200
    initial_count = client.get("/fleet/devices").json()["count"]
    assert initial_count == 1

    response = client.post("/ingest", json={"rows": [unsigned]})
    fleet = client.get("/fleet/devices").json()

    assert response.status_code == 401
    assert response.json()["rejected"] == 1
    assert response.json()["rejected_reasons"] == {"unsigned": 1}
    assert fleet["count"] == initial_count
    assert "rejected-device" not in {item["device_id"] for item in fleet["devices"]}
    assert fleet["rejected_by_device"] == {
        "rejected-device": {
            "rows_rejected": 1,
            "rejected_reasons": {"unsigned": 1},
        }
    }


@pytest.mark.parametrize("line_break", ["\r", "\n"])
def test_escape_tag_rejects_line_breaks(line_break):
    from backend.influx_writer import _escape_tag

    with pytest.raises(ValueError, match="line break"):
        _escape_tag(f"device{line_break}injected")


def test_mosquitto_acl_is_limited_to_signal_topics():
    config_dir = Path(__file__).parents[1] / "mosquitto" / "config"
    config = (config_dir / "mosquitto.conf").read_text()
    acl = (config_dir / "acl").read_text()

    assert "per_listener_settings true" in config
    assert "listener 1883" in config and "listener 8883" in config
    assert "allow_anonymous true" in config
    assert "allow_anonymous false" in config
    assert config.count("acl_file /mosquitto/config/acl") == 2
    assert "topic write oilguard/signals/#" in acl
    # El backend se suscribe a oilguard/signals y a oilguard/signals/+, y el
    # comodin '#' no cubre el topic sin sufijo: sin esta linea el SUBSCRIBE
    # del topic base le quedaba denegado.
    assert (
        "user backend\n"
        "topic read oilguard/signals\n"
        "topic read oilguard/signals/+\n"
        "topic read oilguard/signals/#\n"
        "topic write oilguard/signals/#" in acl
    )
    assert "user feeder\ntopic write oilguard/signals/#" in acl


def test_direct_ab_ingest_checkout_checks_worktree_before_git(monkeypatch):
    from backend import ab_ingest

    calls: list[str] = []
    monkeypatch.setattr(ab_ingest, "check_clean_worktree", lambda: calls.append("guard"))
    monkeypatch.setattr(
        ab_ingest.subprocess,
        "run",
        lambda *args, **kwargs: calls.append("git"),
    )

    ab_ingest.checkout("HEAD")

    assert calls == ["guard", "git"]
