#!/usr/bin/env bash
# Corre toda la suite: pytest (sim/ai/backend) y bun test (lógica pura del frontend).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Usa el entorno fijado del proyecto (.venv) cuando existe: trae pytest-cov y las versiones pinneadas.
PY="python3"
if [ -x "$ROOT/.venv/bin/python" ]; then PY="$ROOT/.venv/bin/python"; fi

# tests/conftest.py configura valores seguros para los fixtures sin alterar el default de producción.
# El default estricto se prueba en tests/test_p0_security_defaults.py, que elimina la variable.
"$PY" -m pytest -q tests \
  --cov=backend --cov=ai --cov=sim --cov-fail-under=75
"$PY" sim/export_demo_json.py --copy-to frontend/src/demo/demo-data.json
(cd frontend && bun test src)
