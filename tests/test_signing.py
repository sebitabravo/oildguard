import hashlib
import hmac
import secrets

import pytest

from shared.signing import (
    FLOAT_PRECISION,
    SIG_VERSION,
    SIGNED_FIELDS,
    canonical_bytes,
    parse_device_keys,
    sign_row,
    verify_row,
)
from sim.generate import HEADER, iter_rows


INT_FIELDS = {"seq", "moving", "recal_window", "engine_on", "link_down"}


def generated_row():
    return next(iter_rows("clean", 0.1, "wheel-RH-01", 7))


def typed_row(row):
    return {
        field: int(float(value)) if field in INT_FIELDS else float(value) if field in FLOAT_PRECISION else value
        for field, value in row.items()
    }


def test_signed_fields_follow_generator_header_and_precision():
    assert SIGNED_FIELDS == tuple(field for field in HEADER if field not in {"sig_v", "sig"})

    generated = generated_row()
    for field, precision in FLOAT_PRECISION.items():
        assert len(generated[field].partition(".")[2]) == precision


def test_csv_strings_and_typed_floats_have_the_same_canonical_bytes():
    row = generated_row()
    assert canonical_bytes(row) == canonical_bytes(typed_row(row))


def test_signing_is_deterministic_non_mutating_and_uses_hmac_sha256():
    row = generated_row()
    original = dict(row)
    key = secrets.token_bytes(32)

    signed = sign_row(row, key)
    assert row == original
    assert signed is not row
    assert signed["sig_v"] == SIG_VERSION
    assert signed["sig"] == sign_row(row, key)["sig"]
    assert signed["sig"] == hmac.new(key, canonical_bytes(row), hashlib.sha256).hexdigest()
    assert verify_row(signed, key)


def test_mutating_any_signed_field_breaks_verification():
    row = typed_row(generated_row())
    key = secrets.token_bytes(32)
    signed = sign_row(row, key)

    for field in SIGNED_FIELDS:
        changed = dict(signed)
        if field in FLOAT_PRECISION:
            changed[field] = float(changed[field]) + 2 * (10 ** -FLOAT_PRECISION[field])
        elif field in INT_FIELDS:
            changed[field] = int(changed[field]) + 1
        else:
            changed[field] = f"{changed[field]}-changed"
        assert not verify_row(changed, key), field


def test_signature_metadata_is_not_canonicalized_and_wrong_version_fails():
    row = typed_row(generated_row())
    key = secrets.token_bytes(32)
    signed = sign_row(row, key)
    altered_metadata = {**signed, "sig_v": "wrong", "sig": "not-canonical"}

    assert canonical_bytes(row) == canonical_bytes(altered_metadata)
    assert not verify_row(altered_metadata, key)
    assert not verify_row({**signed, "sig_v": "wrong"}, key)
    assert not verify_row({key: value for key, value in signed.items() if key != "sig_v"}, key)


def test_missing_signed_field_raises_key_error():
    row = typed_row(generated_row())
    del row["submerged_fraction_per_revolution"]
    with pytest.raises(KeyError):
        canonical_bytes(row)


def test_device_key_parser_accepts_empty_and_valid_specs():
    first_key = secrets.token_bytes(32)
    second_key = secrets.token_bytes(32)

    assert parse_device_keys("") == {}
    assert parse_device_keys(f"wheel-RH-01:{first_key.hex()},wheel-LH-01:{second_key.hex()}") == {
        "wheel-RH-01": first_key,
        "wheel-LH-01": second_key,
    }


def test_device_key_parser_reports_device_without_leaking_invalid_key_material():
    key_material = secrets.token_bytes(32).hex()

    with pytest.raises(ValueError) as error:
        parse_device_keys(f"wheel-RH-01:{key_material}z")

    assert "wheel-RH-01" in str(error.value)
    assert key_material not in str(error.value)
