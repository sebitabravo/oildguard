#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

choose_demo_backend_port() {
  python3 - "$1" "$2" <<'PY'
import errno
import socket
import sys

override_supplied, override_value = sys.argv[1:]

def port_is_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        try:
            probe.bind(("127.0.0.1", port))
        except OSError as error:
            if error.errno == errno.EADDRINUSE:
                return False
            raise
    return True

try:
    if not port_is_free(4321):
        print("Error: preview port 4321 is already in use; nothing was stopped.", file=sys.stderr)
        sys.exit(1)

    if override_supplied:
        if not override_value.isascii() or not override_value.isdecimal():
            print("Error: OILGUARD_DEMO_BACKEND_PORT must be an integer from 1 to 65535.", file=sys.stderr)
            sys.exit(1)
        backend_port = int(override_value)
        if not 1 <= backend_port <= 65535:
            print("Error: OILGUARD_DEMO_BACKEND_PORT must be an integer from 1 to 65535.", file=sys.stderr)
            sys.exit(1)
        if backend_port == 4321:
            print("Error: backend port cannot use preview port 4321.", file=sys.stderr)
            sys.exit(1)
        if not port_is_free(backend_port):
            print("Error: requested backend port is already in use; nothing was stopped.", file=sys.stderr)
            sys.exit(1)
    elif port_is_free(8001):
        backend_port = 8001
    else:
        for _ in range(10):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
                probe.bind(("127.0.0.1", 0))
                backend_port = probe.getsockname()[1]
            if backend_port != 4321:
                break
        else:
            print("Error: unable to select a free backend port; nothing was stopped.", file=sys.stderr)
            sys.exit(1)
except OSError:
    print("Error: unable to verify demo ports; no processes were started.", file=sys.stderr)
    sys.exit(1)

print(backend_port)
PY
}
backend_port=$(choose_demo_backend_port \
  "${OILGUARD_DEMO_BACKEND_PORT+x}" "${OILGUARD_DEMO_BACKEND_PORT-}")
export OILGUARD_DEMO_BACKEND_PORT="$backend_port"

# La demo necesita una clave maestra local para las filas simuladas.
if [[ -z "${OILGUARD_DEVICE_MASTER_KEY+x}" ]]; then
  if [[ ! -f .env ]]; then
    umask 077
    device_master_key=$(openssl rand -hex 32)
    if [[ ! "$device_master_key" =~ ^[[:xdigit:]]{64}$ ]]; then
      printf '%s\n' 'Error: no se pudo generar OILGUARD_DEVICE_MASTER_KEY.' >&2
      exit 1
    fi
    printf 'OILGUARD_DEVICE_MASTER_KEY=%s\n' "$device_master_key" > .env
  fi

  env_key=''
  key_count=0
  while IFS= read -r env_line || [[ -n "$env_line" ]]; do
    if [[ "$env_line" == OILGUARD_DEVICE_MASTER_KEY=* ]]; then
      if [[ ! "$env_line" =~ ^OILGUARD_DEVICE_MASTER_KEY=([[:xdigit:]]{64})$ ]]; then
        printf '%s\n' 'Error: invalid OILGUARD_DEVICE_MASTER_KEY assignment in .env.' >&2
        exit 1
      fi
      key_count=$((key_count + 1))
      if [[ "$key_count" -gt 1 ]]; then
        printf '%s\n' 'Error: duplicate OILGUARD_DEVICE_MASTER_KEY assignments in .env.' >&2
        exit 1
      fi
      env_key=${BASH_REMATCH[1]}
    fi
  done < .env
  if [[ "$key_count" -ne 1 ]]; then
    printf '%s\n' 'Error: OILGUARD_DEVICE_MASTER_KEY is missing from .env.' >&2
    exit 1
  fi
  OILGUARD_DEVICE_MASTER_KEY=$env_key
fi
if [[ ! "${OILGUARD_DEVICE_MASTER_KEY:-}" =~ ^[[:xdigit:]]{64}$ ]]; then
  printf '%s\n' 'Error: OILGUARD_DEVICE_MASTER_KEY must contain 64 hex characters.' >&2
  exit 1
fi
export OILGUARD_DEVICE_MASTER_KEY

export OILGUARD_REQUIRE_SIGNATURE=1
export OILGUARD_INFLUX_WRITE=0
export OILGUARD_CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://127.0.0.1:4174,http://localhost:4321,http://127.0.0.1:4321"

children=()
cleanup() {
  local pid
  trap - EXIT INT TERM
  for pid in "${children[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  for pid in "${children[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

python3 -m uvicorn backend.main:app --host 127.0.0.1 --port "$backend_port" &
backend_pid=$!
children+=("$backend_pid")

backend_ready=0
for _ in {1..60}; do
  if curl --silent --fail "http://127.0.0.1:${backend_port}/health" >/dev/null; then
    backend_ready=1
    break
  fi
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done
if [[ "$backend_ready" -ne 1 ]]; then
  printf 'Error: el backend no inició en http://127.0.0.1:%s.\n' "$backend_port" >&2
  exit 1
fi

python3 sim/feeder.py &
feeder_pid=$!
children+=("$feeder_pid")

(
  cd frontend
  PUBLIC_BACKEND_URL="http://127.0.0.1:${backend_port}" bun run build
)
(
  cd frontend
  bunx astro preview --host 127.0.0.1 --port 4321 --ignore-lock
) &
preview_pid=$!
children+=("$preview_pid")

preview_ready=0
for _ in {1..60}; do
  if curl --silent --fail http://127.0.0.1:4321/ >/dev/null; then
    preview_ready=1
    break
  fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done
if [[ "$preview_ready" -ne 1 ]]; then
  printf '%s\n' 'Error: la vista previa no inició en http://127.0.0.1:4321.' >&2
  exit 1
fi

printf '%s\n' \
  "Backend: http://127.0.0.1:${backend_port}" \
  'Monitoring: http://127.0.0.1:4321/monitoring' \
  'Press Ctrl-C to stop the backend, feeder, and UI preview.'

while true; do
  for pid in "${children[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      printf '%s\n' 'Error: demo process exited unexpectedly.' >&2
      exit 1
    fi
  done
  sleep 1
done
