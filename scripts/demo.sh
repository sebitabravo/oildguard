#!/usr/bin/env bash
set -euo pipefail

# La demo necesita una clave maestra local para las filas simuladas.
if [[ ! -f .env ]]; then
  umask 077
  device_master_key=$(openssl rand -hex 32)
  if [[ ! "$device_master_key" =~ ^[[:xdigit:]]{64}$ ]]; then
    printf '%s\n' 'Error: no se pudo generar OILGUARD_DEVICE_MASTER_KEY.' >&2
    exit 1
  fi
  printf 'OILGUARD_DEVICE_MASTER_KEY=%s\n' "$device_master_key" > .env
fi

# Los servicios y datos locales siguen intactos para repetir la demo con seguridad.
docker compose --profile sim up -d --build

printf '%s\n' 'Monitoring: http://localhost:5173/monitoring'
