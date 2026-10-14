"""Persisted Influx point-count probe helpers delegated from backend.main."""
from __future__ import annotations

import sys

try:
    from . import main as _main_module
except ImportError:
    import main as _main_module

def _main():
    return _main_module

def _count_influx_points() -> int | None:
    main = _main()
    if not main.INFLUXDB_URL or not main.INFLUXDB_ORG or not main.INFLUXDB_BUCKET or not main.INFLUXDB_TOKEN:
        return None

    client = None
    try:
        from influxdb_client import InfluxDBClient  # type: ignore

        client = InfluxDBClient(
            url=main.INFLUXDB_URL,
            token=main.INFLUXDB_TOKEN,
            org=main.INFLUXDB_ORG,
            timeout=1200,
        )
        query = (
            f'from(bucket: "{main.INFLUXDB_BUCKET}") '
            '|> range(start: 0) '
            '|> filter(fn: (r) => r._measurement == "oilguard_signals" '
            'and r._field == "seq") '
            "|> count()"
        )
        tables = client.query_api().query(query, org=main.INFLUXDB_ORG)
        return sum(
            int(record.get_value())
            for table in tables
            for record in table.records
        )
    except Exception as exc:  # noqa: BLE001 - la salud debe seguir disponible si Influx no responde
        # Un 401 por token invalido es la senal de que la persistencia esta rota:
        # en debug quedaba enterrada y /health seguia diciendo verde.
        main.log.warning("InfluxDB persisted point count unavailable: %s", exc)
        return None
    finally:
        if client is not None:
            try:
                client.close()
            except Exception as exc:  # noqa: BLE001 - el cierre es complementario a la consulta
                main.log.debug("InfluxDB count client close failed: %s", exc)


def _influx_probe_key() -> tuple:
    main = _main()
    """Identidad de la instalacion que produce el conteo cacheado.

    Si cambian las credenciales, el cliente instalado o la propia funcion que
    cuenta, el numero cacheado pertenece a otra instalacion: servirlo seria
    mentir sobre la persistencia.
    """
    return (
        main.INFLUXDB_URL,
        main.INFLUXDB_ORG,
        main.INFLUXDB_BUCKET,
        main.INFLUXDB_TOKEN,
        sys.modules.get("influxdb_client"),
        main._count_influx_points,
    )
