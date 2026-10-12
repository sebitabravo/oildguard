#!/usr/bin/env bash
set -euo pipefail

output_dir="mosquitto/certs"
device_ids=()
while (($#)); do
  case "$1" in
    --output-dir)
      (($# >= 2)) || { echo "--output-dir requires a path" >&2; exit 64; }
      output_dir="$2"
      shift 2
      ;;
    --)
      shift
      device_ids+=("$@")
      break
      ;;
    -*)
      echo "unknown option: $1" >&2
      exit 64
      ;;
    *)
      device_ids+=("$1")
      shift
      ;;
  esac
done

if ((${#device_ids[@]} == 0)); then
  echo "usage: $0 [--output-dir DIR] DEVICE_ID [DEVICE_ID ...]" >&2
  exit 64
fi
for device_id in "${device_ids[@]}"; do
  [[ "$device_id" =~ ^[A-Za-z0-9._-]+$ ]] || {
    echo "invalid device id: $device_id" >&2
    exit 64
  }
done

mkdir -p "$output_dir"
umask 077

openssl genrsa -out "$output_dir/ca.key" 4096
openssl req -x509 -new -nodes -key "$output_dir/ca.key" \
  -sha256 -days 3650 -out "$output_dir/ca.crt" \
  -subj "/CN=OilGuard Local Development CA"

openssl genrsa -out "$output_dir/server.key" 2048
openssl req -new -key "$output_dir/server.key" \
  -out "$output_dir/server.csr" -subj "/CN=localhost"

extensions="$(mktemp)"
trap 'rm -f "$extensions"' EXIT
cat > "$extensions" <<'EOF'
subjectAltName=DNS:localhost,DNS:mqtt,IP:127.0.0.1
extendedKeyUsage=serverAuth
keyUsage=digitalSignature,keyEncipherment
EOF
openssl x509 -req -in "$output_dir/server.csr" \
  -CA "$output_dir/ca.crt" -CAkey "$output_dir/ca.key" \
  -CAcreateserial -out "$output_dir/server.crt" -days 825 -sha256 \
  -extfile "$extensions"
rm -f "$output_dir/server.csr" "$output_dir/ca.srl"
chmod 644 "$output_dir/ca.crt" "$output_dir/server.crt"
chmod 600 "$output_dir/ca.key" "$output_dir/server.key"

generate_client_certificate() {
  local identity="$1"
  local key="$output_dir/$identity.key"
  local csr="$output_dir/$identity.csr"
  local cert="$output_dir/$identity.crt"
  openssl genrsa -out "$key" 2048
  openssl req -new -key "$key" -out "$csr" -subj "/CN=$identity"
  printf 'extendedKeyUsage=clientAuth\nkeyUsage=digitalSignature,keyEncipherment\n' > "$extensions"
  openssl x509 -req -in "$csr" -CA "$output_dir/ca.crt" -CAkey "$output_dir/ca.key" \
    -CAcreateserial -out "$cert" -days 825 -sha256 -extfile "$extensions"
  rm -f "$csr" "$output_dir/ca.srl"
  chmod 644 "$cert"
  chmod 600 "$key"
  printf 'Generated MQTT client certificate for %s\n' "$identity"
}

generate_client_certificate backend
for device_id in "${device_ids[@]}"; do
  generate_client_certificate "$device_id"
done
printf 'Generated local MQTT certificates in %s\n' "$output_dir"
