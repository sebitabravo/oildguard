#!/usr/bin/env bash
set -euo pipefail

# Los servicios y datos locales siguen intactos para repetir la demo con seguridad.
docker compose --profile sim up -d --build

printf '%s\n' 'Monitoring: http://localhost:5173/monitoring'
