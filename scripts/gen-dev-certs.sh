#!/usr/bin/env bash
set -euo pipefail

output_dir="${1:-mosquitto/certs}"
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
printf 'Generated local MQTT certificates in %s\n' "$output_dir"
