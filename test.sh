#!/usr/bin/env bash
# Corre toda la suite: pytest (sim/ai/backend) y bun test (lógica pura del frontend).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Usa el entorno fijado del proyecto (.venv) cuando existe: trae pytest-cov y las versiones pinneadas.
PY="python3"
if [ -x "$ROOT/.venv/bin/python" ]; then PY="$ROOT/.venv/bin/python"; fi

# El backend exige INFLUXDB_TOKEN cuando la escritura a Influx está activa.
# Las pruebas usan un marcador obvio que no es una credencial.
# El backend exige firmas por defecto; los fixtures existentes son sin firma.
# El default de producción se prueba en tests/test_p0_security_defaults.py, que elimina esta variable.
export OILGUARD_REQUIRE_SIGNATURE=0
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-placeholder-para-pruebas}" "$PY" -m pytest -q tests \
  --cov=backend --cov=ai --cov=sim --cov-fail-under=75
"$PY" sim/export_demo_json.py --copy-to frontend/src/demo/demo-data.json
(cd frontend && bun test src)
