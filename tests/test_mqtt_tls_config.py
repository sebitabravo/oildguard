from pathlib import Path
from unittest.mock import Mock

from backend import ingest_mqtt

ROOT = Path(__file__).resolve().parents[1]


def test_mosquitto_config_has_tls_listener_and_certificate_paths():
    lines = (ROOT / "mosquitto/config/mosquitto.conf").read_text().splitlines()
    start = lines.index("listener 8883")
    block = "\n".join(lines[start : start + 8])

    assert "cafile /mosquitto/certs/ca.crt" in block
    assert "certfile /mosquitto/certs/server.crt" in block
    assert "keyfile /mosquitto/certs/server.key" in block


def test_dev_certificate_script_has_bash_shebang():
    script = ROOT / "scripts/gen-dev-certs.sh"

    assert script.exists()
    assert script.read_text().startswith("#!/usr/bin/env bash\n")


def test_gitignore_excludes_generated_certificates():
    assert "mosquitto/certs/" in (ROOT / ".gitignore").read_text().splitlines()


def test_ingest_builds_tls_context_from_ca_environment_without_network(monkeypatch):
    factory = Mock(return_value=object())
    monkeypatch.setattr(ingest_mqtt.ssl, "create_default_context", factory)
    monkeypatch.setenv("OILGUARD_MQTT_CA", "/tmp/dev-ca.crt")

    context = ingest_mqtt.create_mqtt_tls_context()

    factory.assert_called_once_with(cafile="/tmp/dev-ca.crt")
    assert context is factory.return_value
