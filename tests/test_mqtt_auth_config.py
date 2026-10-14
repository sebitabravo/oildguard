"""Autenticacion MQTT en el broker: password file, ACL y credenciales cableadas.

El pipeline estaba muerto porque el ACL concedia lectura a usuarios que nunca
podian autenticarse (no habia password file) y a un topico que el backend ni
siquiera intenta suscribirse.
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = ROOT / "mosquitto/config"
SCRIPT = ROOT / "scripts/gen-mqtt-passwd.sh"


def _listener_block(name: str) -> str:
    lines = (CONFIG_DIR / "mosquitto.conf").read_text().splitlines()
    start = lines.index(name)
    rest = lines[start + 1 :]
    end = next(
        (offset for offset, line in enumerate(rest) if line.startswith("listener ")),
        len(rest),
    )
    return "\n".join(rest[:end])


def _acl() -> str:
    return (CONFIG_DIR / "acl").read_text()


def _user_block(username: str) -> list[str]:
    lines = [line.strip() for line in _acl().splitlines() if line.strip() and not line.lstrip().startswith("#")]
    start = lines.index(f"user {username}")
    rest = lines[start + 1 :]
    end = next((offset for offset, line in enumerate(rest) if line.startswith("user ")), len(rest))
    return rest[:end]


def _anonymous_block() -> list[str]:
    """Reglas que aplican a un cliente sin autenticar: lo anterior al primer user."""
    lines = [line.strip() for line in _acl().splitlines() if line.strip() and not line.lstrip().startswith("#")]
    return lines[: next((i for i, line in enumerate(lines) if line.startswith("user ")), len(lines))]


def test_plain_listener_references_the_password_file():
    assert "password_file /mosquitto/config/passwd" in _listener_block("listener 1883")


def test_tls_listener_does_not_use_the_password_file():
    """8883 autentica por certificado; un password file lo desorientaria."""
    assert "password_file" not in _listener_block("listener 8883")


def test_plain_listener_keeps_anonymous_writes():
    """El simulador de borde y el healthcheck publican sin credenciales."""
    block = _listener_block("listener 1883")
    assert "allow_anonymous true" in block


def test_anonymous_block_can_only_publish_signals():
    assert _anonymous_block() == ["topic write oilguard/signals/#"]


def test_backend_user_may_read_both_topics_it_subscribes_to():
    backend_rules = _user_block("backend")

    assert "topic read oilguard/signals" in backend_rules
    assert "topic read oilguard/signals/+" in backend_rules
    assert "topic write oilguard/signals/#" in backend_rules


def test_backend_user_read_stays_inside_the_signal_namespace():
    for rule in _user_block("backend"):
        assert rule.split()[2].startswith("oilguard/signals")


def test_feeder_user_may_publish_but_never_subscribe():
    assert _user_block("feeder") == ["topic write oilguard/signals/#"]


def test_gitignore_excludes_the_generated_password_file():
    entries = (ROOT / ".gitignore").read_text().splitlines()

    assert "mosquitto/config/passwd" in entries
    assert "mosquitto/config/passwd.*" in entries


def test_compose_wires_the_backend_credentials_to_the_service():
    compose = (ROOT / "docker-compose.yml").read_text()

    assert "MQTT_USERNAME: ${MQTT_BACKEND_USER:-}" in compose
    assert "MQTT_PASSWORD: ${MQTT_BACKEND_PASSWORD:-}" in compose


def test_env_example_documents_the_mqtt_credentials_as_placeholders():
    example = (ROOT / ".env.example").read_text()

    assert "MQTT_BACKEND_USER=<change-me>" in example
    assert "MQTT_FEEDER_USER=<change-me>" in example
    assert "MQTT_BACKEND_PASSWORD=<change-me>" in example
    assert "MQTT_FEEDER_PASSWORD=<change-me>" in example


def test_password_script_follows_the_dev_certificate_script_shape():
    body = SCRIPT.read_text()

    assert body.startswith("#!/usr/bin/env bash\n")
    assert "set -euo pipefail" in body
    assert 'output_file="mosquitto/config/passwd"' in body


def test_password_script_never_prints_a_credential():
    for line in SCRIPT.read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        if re.search(r"\b(echo|printf)\b", stripped):
            assert "PASSWORD" not in stripped, stripped


@pytest.mark.skipif(shutil.which("mosquitto_passwd") is None, reason="mosquitto_passwd is not installed")
def test_password_script_hashes_both_users_and_is_idempotent(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "MQTT_BACKEND_USER=backend\n"
        "MQTT_BACKEND_PASSWORD=alpha-secret\n"
        "MQTT_FEEDER_USER=feeder\n"
        "MQTT_FEEDER_PASSWORD=beta-secret\n"
    )
    output = tmp_path / "passwd"

    for _ in range(2):
        subprocess.run(
            [str(SCRIPT), "--output", str(output), "--env-file", str(env_file)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )

    body = output.read_text()
    users = [line.split(":", 1)[0] for line in body.splitlines() if line.strip()]
    assert users == ["backend", "feeder"]
    assert "alpha-secret" not in body
    assert "beta-secret" not in body


def test_password_script_refuses_to_write_without_credentials(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("MQTT_BACKEND_USER=backend\n")
    output = tmp_path / "passwd"

    result = subprocess.run(
        [str(SCRIPT), "--output", str(output), "--env-file", str(env_file)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode != 0
    assert "MQTT_BACKEND_PASSWORD" in result.stderr
    assert not output.exists()
