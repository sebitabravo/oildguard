"""Genera tests/fixtures/signing_vectors.json: vectores de firma ogs1 de referencia.

Uso: ``python3 tests/make_signing_vectors.py``. El simulador de borde en Rust y
cualquier otra implementación deben producir exactamente los mismos bytes
canónicos y la misma firma para estas filas; así el contrato entre lenguajes
vive en un solo archivo revisable.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)

from shared.signing import SIG_VERSION, SIGNED_FIELDS, canonical_bytes, sign_row  # noqa: E402
from sim.generate import iter_rows  # noqa: E402

FIXTURE_PATH = os.path.join(ROOT, "tests", "fixtures", "signing_vectors.json")

# Llave de vector de prueba pública y obviamente no secreta (bytes 0x00..0x1f),
# al estilo de los vectores de los RFC; nunca se usa fuera de los tests.
TEST_KEY_HEX = bytes(range(32)).hex()
T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _as_csv_strings(row: dict) -> dict:
    return {k: str(v) for k, v in row.items()}


def build_fixture() -> dict:
    key = bytes.fromhex(TEST_KEY_HEX)
    vectors = []
    for scenario, seed in (("clean", 7), ("slow-leak", 11), ("abrupt-drop", 13)):
        rows = list(iter_rows(scenario, 0.5, "wheel-RH-01", seed, start=T0))
        for row in rows[:2]:
            for form, value in (("typed", row), ("csv_strings", _as_csv_strings(row))):
                signed = sign_row(value, key)
                vectors.append(
                    {
                        "name": f"{scenario}-seq{row['seq']}-{form}",
                        "row": value,
                        "canonical": canonical_bytes(value).decode("utf-8"),
                        "sig": signed["sig"],
                    }
                )
    return {
        "sig_version": SIG_VERSION,
        "key_hex": TEST_KEY_HEX,
        "signed_fields": list(SIGNED_FIELDS),
        "vectors": vectors,
    }


def main() -> None:
    with open(FIXTURE_PATH, "w", encoding="utf-8") as fh:
        json.dump(build_fixture(), fh, indent=2, ensure_ascii=False)
        fh.write("\n")


if __name__ == "__main__":
    main()
