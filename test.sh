#!/usr/bin/env bash
# Corre toda la suite: pytest (sim/ai/backend) y bun test (lógica pura del frontend).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# El backend exige INFLUXDB_TOKEN cuando la escritura a Influx está activa.
# Las pruebas usan un marcador obvio que no es una credencial.
# El backend exige firmas por defecto; los fixtures existentes son sin firma.
# El default de producción se prueba en tests/test_p0_security_defaults.py, que elimina esta variable.
export OILGUARD_REQUIRE_SIGNATURE=0
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-placeholder-para-pruebas}" python3 -m pytest -q tests
(cd frontend && bun test src)
