#!/usr/bin/env bash
# Genera el password file de mosquitto (mosquitto/config/passwd) a partir de
# las variables de .env. Es idempotente: se puede volver a ejecutar sin
# duplicar usuarios ni dejar entradas a medias.
set -euo pipefail

output_file="mosquitto/config/passwd"
env_file=".env"
while (($#)); do
  case "$1" in
    --output)
      (($# >= 2)) || { echo "--output requires a path" >&2; exit 64; }
      output_file="$2"
      shift 2
      ;;
    --env-file)
      (($# >= 2)) || { echo "--env-file requires a path" >&2; exit 64; }
      env_file="$2"
      shift 2
      ;;
    -*)
      echo "unknown option: $1" >&2
      exit 64
      ;;
    *)
      echo "unexpected argument: $1" >&2
      echo "usage: $0 [--output FILE] [--env-file FILE]" >&2
      exit 64
      ;;
  esac
done

# .env se lee como datos, nunca como codigo: `source` ejecutaria su contenido y
# una linea mal formada se convertiria en un comando inesperado.
dotenv_value() {
  local key="$1"
  local line value
  [[ -r "$env_file" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == '#'* ]] && continue
    line="${line#export }"
    line="${line#"${line%%[![:space:]]*}"}"
    [[ "$line" == "$key="* ]] || continue
    value="${line#"$key="}"
    value="${value%$'\r'}"
    if [[ ${#value} -ge 2 && "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ ${#value} -ge 2 && "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi
    printf '%s' "$value"
    return 0
  done <"$env_file"
  return 1
}

# El entorno ya exportado manda sobre .env: quien define la variable en la shell
# sabe mas que el archivo, y asi el mismo script sirve para produccion.
secret_value() {
  local key="$1"
  local value="${!key-}"
  if [[ -z "$value" ]]; then
    value="$(dotenv_value "$key" || true)"
  fi
  printf '%s' "$value"
}

require_secret() {
  local key="$1"
  local value
  value="$(secret_value "$key")"
  if [[ -z "$value" ]]; then
    echo "missing $key in the environment or in $env_file" >&2
    exit 78
  fi
  # mosquitto_passwd -b toma la contrasena en argv: un guion inicial la
  # confundiria con una opcion y el usuario se guardaria con otra contrasena.
  if [[ "$value" == -* ]]; then
    echo "$key must not start with '-'" >&2
    exit 78
  fi
  printf '%s' "$value"
}

require_username() {
  local key="$1"
  local fallback="$2"
  local value
  value="$(secret_value "$key")"
  value="${value:-$fallback}"
  [[ "$value" =~ ^[A-Za-z0-9._-]+$ ]] || {
    echo "invalid $key: $value" >&2
    exit 78
  }
  printf '%s' "$value"
}

# Todo se valida antes de tocar el disco: un fallo a mitad dejaria usuarios sin
# contrasena, que es peor que no escribir nada.
backend_user="$(require_username MQTT_BACKEND_USER backend)"
backend_password="$(require_secret MQTT_BACKEND_PASSWORD)"
feeder_user="$(require_username MQTT_FEEDER_USER feeder)"
feeder_password="$(require_secret MQTT_FEEDER_PASSWORD)"

mkdir -p "$(dirname "$output_file")"
umask 077

# mosquitto_passwd edita el archivo in situ, asi que se reconstruye entero en un
# temporal y se mueve de una vez: o queda el archivo entero, o no queda nada.
tmp="$(mktemp "$output_file.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

# El generador de contrasenas viene con la propia imagen del broker. Si no esta en
# el PATH del host se usa la imagen que docker-compose ya necesita, en vez de
# obligar a instalar mosquitto aparte para levantar un stack que es docker.
out_dir="$(cd "$(dirname "$output_file")" && pwd)"
out_name="$(basename "$tmp")"

# passwd_run <crear 1|0> <archivo> <usuario> <contrasena>
if command -v mosquitto_passwd >/dev/null 2>&1; then
  passwd_run() {
    local flags=(-b)
    [[ "$1" == "1" ]] && flags=(-c -b)
    mosquitto_passwd "${flags[@]}" "$2" "$3" "$4"
  }
elif command -v docker >/dev/null 2>&1; then
  # Dentro del contenedor el temporal se ve en /work, montado desde su directorio.
  passwd_run() {
    local flags=(-b)
    [[ "$1" == "1" ]] && flags=(-c -b)
    docker run --rm \
      -v "$out_dir:/work" -w /work \
      --entrypoint mosquitto_passwd \
      eclipse-mosquitto:2.0.18 \
      "${flags[@]}" "/work/$2" "$3" "$4"
  }
else
  echo "neither mosquitto_passwd nor docker is available" >&2
  exit 69
fi

passwd_run 1 "$out_name" "$backend_user" "$backend_password"
passwd_run 0 "$out_name" "$feeder_user" "$feeder_password"

entries="$(grep -c ':' "$tmp" || true)"
if [[ "$entries" != "2" ]]; then
  echo "expected 2 entries in the generated password file, found $entries" >&2
  exit 70
fi
if grep -qF -e "$backend_password" -e "$feeder_password" "$tmp"; then
  echo "refusing to install a password file that stores a credential in clear text" >&2
  exit 70
fi

mv -f "$tmp" "$output_file"
chmod 600 "$output_file"
trap - EXIT
printf 'Generated MQTT password file for %s and %s in %s\n' "$backend_user" "$feeder_user" "$output_file"