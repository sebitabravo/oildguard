"""Los vectores de firma committeados deben coincidir con shared/signing.py."""

import json

import make_signing_vectors as msv
from shared.signing import canonical_bytes, verify_row


def _load() -> dict:
    with open(msv.FIXTURE_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def test_committed_vectors_match_current_signing_module():
    assert _load() == json.loads(json.dumps(msv.build_fixture(), ensure_ascii=False))


def test_every_vector_verifies_with_the_test_key():
    data = _load()
    key = bytes.fromhex(data["key_hex"])
    for vector in data["vectors"]:
        row = dict(vector["row"], sig_v=data["sig_version"], sig=vector["sig"])
        assert canonical_bytes(vector["row"]).decode("utf-8") == vector["canonical"], vector["name"]
        assert verify_row(row, key), vector["name"]


def test_typed_and_csv_forms_share_canonical_bytes():
    vectors = _load()["vectors"]
    by_name = {v["name"]: v for v in vectors}
    for name, vector in by_name.items():
        if name.endswith("-typed"):
            twin = by_name[name.replace("-typed", "-csv_strings")]
            assert vector["canonical"] == twin["canonical"], name
            assert vector["sig"] == twin["sig"], name
