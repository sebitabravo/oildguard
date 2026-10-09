#!/usr/bin/env bash
# Corre toda la suite: pytest (sim/ai/backend) y bun test (lógica pura del frontend).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

python3 -m pytest -q tests
(cd frontend && bun test src)
