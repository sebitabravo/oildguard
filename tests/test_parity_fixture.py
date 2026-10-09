"""El fixture de paridad committeado debe coincidir con el modelo Python actual."""

import json

import pytest

import make_parity_fixture as mpf


def _walk(a, b, path=""):
    if isinstance(a, dict):
        assert set(a) == set(b), path
        for k in a:
            _walk(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list):
        assert len(a) == len(b), path
        for i, (x, y) in enumerate(zip(a, b)):
            _walk(x, y, f"{path}[{i}]")
    elif isinstance(a, float) or isinstance(b, float):
        assert a == pytest.approx(b, rel=1e-9, abs=1e-9), path
    else:
        assert a == b, path


def test_committed_fixture_matches_current_python_model():
    with open(mpf.FIXTURE_PATH) as f:
        committed = json.load(f)
    _walk(mpf.build_fixture(), committed)
