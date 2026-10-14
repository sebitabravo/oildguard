"""Credenciales MQTT del backend: se aplican al cliente y avisan si faltan.

Reproduce el corte de ingesta: sin `password_file` en el broker y sin soporte
de `MQTT_USERNAME`/`MQTT_PASSWORD` en el cliente, el backend se suscribe como
anonimo y el ACL solo le concede escritura.
"""

from __future__ import annotations

import logging
import sys
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from backend import ingest_mqtt


BRIDGE_LOGGER = "oilguard-mqtt-bridge"


def _fake_paho(*, with_api_version: bool) -> tuple[SimpleNamespace, Mock]:
    """Modulo paho falso; `with_api_version` distingue 1.x de 2.x."""
    client = Mock()
    module = SimpleNamespace(Client=Mock(return_value=client))
    if with_api_version:
        module.CallbackAPIVersion = SimpleNamespace(VERSION1="version-1")
    return module, client


def _install_fake_paho(monkeypatch, module: SimpleNamespace) -> None:
    """Sustituye el arbol `paho.mqtt.client` completo para el import interno."""
    mqtt_package = SimpleNamespace(client=module)
    paho_package = SimpleNamespace(mqtt=mqtt_package)
    monkeypatch.setitem(sys.modules, "paho", paho_package)
    monkeypatch.setitem(sys.modules, "paho.mqtt", mqtt_package)
    monkeypatch.setitem(sys.modules, "paho.mqtt.client", module)


def test_client_factory_pins_version1_callbacks_on_paho_2x():
    module, client = _fake_paho(with_api_version=True)

    assert ingest_mqtt.build_mqtt_client(module) is client
    module.Client.assert_called_once_with(module.CallbackAPIVersion.VERSION1)


def test_client_factory_keeps_the_paho_1x_signature():
    module, client = _fake_paho(with_api_version=False)

    assert ingest_mqtt.build_mqtt_client(module) is client
    module.Client.assert_called_once_with()


def test_configured_credentials_are_applied_to_the_client(monkeypatch):
    monkeypatch.setenv("MQTT_USERNAME", "backend")
    monkeypatch.setenv("MQTT_PASSWORD", "s3cret-from-env")
    client = Mock()

    ingest_mqtt.apply_mqtt_credentials(client)

    client.username_pw_set.assert_called_once_with("backend", "s3cret-from-env")


def test_without_username_the_connection_stays_anonymous(monkeypatch):
    monkeypatch.delenv("MQTT_USERNAME", raising=False)
    monkeypatch.setenv("MQTT_PASSWORD", "orphan-password")
    client = Mock()

    ingest_mqtt.apply_mqtt_credentials(client)

    client.username_pw_set.assert_not_called()


def test_username_without_password_warns_and_never_downgrades_to_anonymous(monkeypatch, caplog):
    """Bajar a anonimo en silencio reproduciria justo el bug que se arregla."""
    monkeypatch.setenv("MQTT_USERNAME", "backend")
    monkeypatch.setenv("MQTT_PASSWORD", "")
    client = Mock()

    with caplog.at_level(logging.WARNING, logger=BRIDGE_LOGGER):
        ingest_mqtt.apply_mqtt_credentials(client)

    assert "MQTT_PASSWORD" in caplog.text
    client.username_pw_set.assert_called_once_with("backend", "")


def test_run_forever_authenticates_with_the_configured_credentials(monkeypatch):
    monkeypatch.delenv("OILGUARD_MQTT_CA", raising=False)
    monkeypatch.setenv("MQTT_USERNAME", "backend")
    monkeypatch.setenv("MQTT_PASSWORD", "s3cret-from-env")
    module, client = _fake_paho(with_api_version=True)
    client.connect.side_effect = KeyboardInterrupt
    _install_fake_paho(monkeypatch, module)

    with pytest.raises(KeyboardInterrupt):
        ingest_mqtt.run_forever(host="broker", port=1883)

    module.Client.assert_called_once_with(module.CallbackAPIVersion.VERSION1)
    client.username_pw_set.assert_called_once_with("backend", "s3cret-from-env")


def test_run_forever_without_credentials_leaves_the_client_anonymous(monkeypatch):
    monkeypatch.delenv("OILGUARD_MQTT_CA", raising=False)
    monkeypatch.delenv("MQTT_USERNAME", raising=False)
    monkeypatch.delenv("MQTT_PASSWORD", raising=False)
    module, client = _fake_paho(with_api_version=True)
    client.connect.side_effect = KeyboardInterrupt
    _install_fake_paho(monkeypatch, module)

    with pytest.raises(KeyboardInterrupt):
        ingest_mqtt.run_forever(host="broker", port=1883)

    client.username_pw_set.assert_not_called()


def test_subscription_topics_cover_the_legacy_and_the_per_device_wildcard():
    assert ingest_mqtt.subscription_topics("oilguard/signals") == (
        "oilguard/signals",
        "oilguard/signals/+",
    )
