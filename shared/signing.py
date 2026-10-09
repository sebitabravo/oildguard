"""Canonical per-row HMAC signing for OilGuard measurements."""

from __future__ import annotations

import hashlib
import hmac
import json
from collections.abc import Mapping

SIG_VERSION = "ogs1"

SIGNED_FIELDS = (
    "t_iso",
    "t_s",
    "seq",
    "device_id",
    "fsm_state",
    "moving",
    "recal_window",
    "engine_on",
    "slope_deg",
    "rotor_rpm",
    "wheel_rpm",
    "rotating_sensor_regime",
    "submerged_fraction_per_revolution",
    "pressure_kpa",
    "temperature_c",
    "vib_rms_g",
    "vib_kurtosis",
    "level_liters",
    "level_pct",
    "link_down",
    "label",
)

FLOAT_PRECISION = {
    "t_s": 1,
    "slope_deg": 2,
    "rotor_rpm": 1,
    "wheel_rpm": 2,
    "submerged_fraction_per_revolution": 4,
    "pressure_kpa": 3,
    "temperature_c": 2,
    "vib_rms_g": 3,
    "vib_kurtosis": 3,
    "level_liters": 4,
    "level_pct": 3,
}

_INT_FIELDS = {"seq", "moving", "recal_window", "engine_on", "link_down"}


def canonical_bytes(row: Mapping[str, object]) -> bytes:
    values: list[str] = []
    for field in SIGNED_FIELDS:
        value = row[field]
        if field in FLOAT_PRECISION:
            rendered = format(float(value), f".{FLOAT_PRECISION[field]}f")
        elif field in _INT_FIELDS:
            rendered = str(int(float(value)))
        else:
            rendered = str(value)
        values.append(rendered)
    payload = json.dumps([SIG_VERSION, *values], separators=(",", ":"), ensure_ascii=False)
    return payload.encode("utf-8")


def sign_row(row: Mapping[str, object], key: bytes) -> dict[str, object]:
    signed = dict(row)
    signed["sig_v"] = SIG_VERSION
    signed["sig"] = hmac.new(key, canonical_bytes(row), hashlib.sha256).hexdigest()
    return signed


def verify_row(row: Mapping[str, object], key: bytes) -> bool:
    if row.get("sig_v") != SIG_VERSION:
        return False
    signature = row.get("sig")
    if not isinstance(signature, str):
        return False
    try:
        payload = canonical_bytes(row)
    except (KeyError, TypeError, ValueError, OverflowError):
        return False
    expected = hmac.new(key, payload, hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(signature, expected)
    except TypeError:
        return False


def parse_device_keys(spec: str) -> dict[str, bytes]:
    if not spec.strip():
        return {}

    devices: dict[str, bytes] = {}
    for entry in spec.split(","):
        device_id, separator, material = entry.strip().partition(":")
        device_id = device_id.strip()
        material = material.strip()
        if not separator or not device_id or not material:
            raise ValueError(f"malformed key entry for device {device_id or '<unknown>'}")
        try:
            key = bytes.fromhex(material)
        except ValueError:
            raise ValueError(f"invalid hex key for device {device_id}") from None
        if not key:
            raise ValueError(f"empty key for device {device_id}")
        if device_id in devices:
            raise ValueError(f"duplicate key entry for device {device_id}")
        devices[device_id] = key
    return devices
