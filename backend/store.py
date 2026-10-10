"""Almacén de telemetría por dispositivo (R2).

Una lista global no sobrevive a miles de dispositivos: mezcla flujos, no
puede responder "¿cuánto retiene este equipo?" y obliga a un lock largo por
lote. Aquí cada dispositivo tiene su propio ``deque`` con ``maxlen``, así
que la retención es O(1) por fila y el aislamiento es estructural.

El set antireplay se acota con la misma ventana que las filas: si la fila
evictada olvida su identidad, un lote retrasado del broker vuelve a aceptarse
en vez de descartarse para siempre. Un set global sin evictar convierte cada
replay legítimo (store-and-forward del edge) en memoria permanente.
"""

from __future__ import annotations

import math
import os
import threading
import time
from collections import Counter, OrderedDict, deque
from typing import Any, Iterable, Sequence

RETENTION_ROWS = int(os.getenv("OILGUARD_RETENTION_ROWS", "36000"))
DEFAULT_DEVICE = os.getenv("OILGUARD_DEFAULT_DEVICE", "wheel-RH-01")

# Metadatos privados que la fila transporta dentro del deque: tenerlos en la
# propia fila mantiene alineados el deque de filas y el de identidades sin
# una segunda estructura que pueda desincronizarse al evictar.
ARRIVAL_KEY = "_arrival"
IDENTITY_KEY = "_rid"

# Columnas numéricas que las agregaciones de flota necesitan en una sola pasada.
NUMERIC_COLUMNS = (
    "pressure_kpa",
    "temperature_c",
    "vib_rms_g",
    "vib_kurtosis",
    "level_liters",
    "level_pct",
)


def as_float(value: Any) -> float | None:
    """float utilizable o None; NaN e infinitos se tratan como ausentes."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def device_of(row: dict[str, Any]) -> str:
    device_id = row.get("device_id")
    return device_id if isinstance(device_id, str) else str(device_id or "")


# Bloque "latest" que consumen las tarjetas de la UI de flota.
LATEST_SIGNAL_FIELDS = (
    "temperature_c",
    "vib_rms_g",
    "pressure_kpa",
    "fsm_state",
    "moving",
    "link_down",
    "t_iso",
)


def latest_signals(row: dict[str, Any]) -> dict[str, Any]:
    """Ultima lectura de un dispositivo, con los numeros ya tipados."""
    block: dict[str, Any] = {}
    for name in LATEST_SIGNAL_FIELDS:
        value = row.get(name)
        block[name] = as_float(value) if name in NUMERIC_COLUMNS or name == "moving" or name == "link_down" else value
    return block


def row_ts(row: dict[str, Any]) -> float:
    """``t_s`` del simulador; si falta o no es numérico, la hora de llegada.

    El ``is None`` es deliberado: ``t_s`` vale 0.0 en la primera muestra de
    cada stream, y un ``or`` aquí no la distinguiría de "ausente", mezclando
    el reloj del simulador con el de llegada.
    """
    simulated = row.get("t_s")
    # Atajo: el decoder JSON ya devuelve float, y evitar la llamada a as_float
    # en la ruta mas caliente es la mayor parte del ahorro aqui.
    if type(simulated) is float:  # noqa: E721 - type() es el atajo deliberado
        return simulated
    simulated = as_float(simulated)
    if simulated is not None:
        return simulated
    return float(row.get(ARRIVAL_KEY) or 0.0)


class TelemetryStore:
    """Filas retenidas por dispositivo con retención acotada y antireplay."""

    def __init__(
        self,
        retention_rows: int = RETENTION_ROWS,
        default_device: str = DEFAULT_DEVICE,
    ) -> None:
        self.retention_rows = max(1, int(retention_rows))
        self.default_device = default_device
        self.lock = threading.RLock()
        self._rows: dict[str, deque[dict[str, Any]]] = {}
        self._seen: dict[str, OrderedDict[tuple, None]] = {}
        self._updated: dict[str, float] = {}
        self._latest_ts: dict[str, float] = {}
        self._accepted: Counter[str] = Counter()
        self._verified: Counter[str] = Counter()
        self._rejected: dict[str, Counter[str]] = {}
        self._clear_hooks: list[Any] = []

    # -- escritura ---------------------------------------------------------

    def commit(
        self,
        prepared: Sequence[tuple[dict[str, Any], tuple | None]],
        rejections: Sequence[tuple[str, str]] = (),
        arrival: float | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Inserta filas ya verificadas y descuenta replays, todo bajo el lock.

        ``prepared`` son pares ``(fila, identidad)``; la identidad ``None``
        marca filas sin firma, que nunca participan del control antireplay.
        ``rejections`` son pares ``(device_id, motivo)`` ya contabilizados por
        el verificador de firmas. ``arrival`` es la hora de recepcion del lote:
        el perfil mostraba ``time.time()`` por fila como un coste medible, y un
        lote entero llego en el mismo instante.

        Devuelve ``(filas_insertadas, replays_descontados)``.
        """
        accepted: list[dict[str, Any]] = []
        append = accepted.append
        replays = 0
        # Contadores acumulados del lote y fusionados una vez: miles de
        # incrementos por fila son millones de operaciones de dict.
        accepted_counts: Counter[str] = Counter()
        verified_counts: Counter[str] = Counter()
        latest_ts: dict[str, float] = {}
        with self.lock:
            if arrival is None:
                arrival = time.time()
            rows_by_device = self._rows
            seen_by_device = self._seen
            for row, identity in prepared:
                device = device_of(row)
                if identity is not None:
                    seen = seen_by_device.get(device)
                    if seen is None:
                        seen = OrderedDict()
                        seen_by_device[device] = seen
                    if identity in seen:
                        replays += 1
                        self._rejected.setdefault(device, Counter())["replay"] += 1
                        continue
                    row[IDENTITY_KEY] = identity
                    seen[identity] = None

                bucket = rows_by_device.get(device)
                if bucket is None:
                    bucket = deque(maxlen=self.retention_rows)
                    rows_by_device[device] = bucket
                # deque(maxlen=) descarta por la izquierda al insertar: hay que
                # leer la fila saliente ANTES de anadir para liberar su identidad.
                if len(bucket) == bucket.maxlen:
                    evicted = bucket[0]
                    evicted_identity = evicted.get(IDENTITY_KEY)
                    if evicted_identity is not None:
                        expired = seen_by_device.get(device)
                        if expired is not None:
                            expired.pop(evicted_identity, None)
                row[ARRIVAL_KEY] = arrival
                bucket.append(row)

                stamp = row_ts(row)
                current_batch = latest_ts.get(device)
                if current_batch is None or stamp > current_batch:
                    latest_ts[device] = stamp
                accepted_counts[device] += 1
                if row.get("sig_verified"):
                    verified_counts[device] += 1
                append(row)

            # Un solo volcado por dispositivo en vez de uno por fila.
            for device, stamp in latest_ts.items():
                current = self._latest_ts.get(device)
                if current is None or stamp > current:
                    self._latest_ts[device] = stamp
            self._accepted.update(accepted_counts)
            self._verified.update(verified_counts)
            if accepted_counts:
                stamp = arrival
                for device in accepted_counts:
                    current = self._updated.get(device)
                    if current is None or stamp > current:
                        self._updated[device] = stamp

            for device, reason in rejections:
                self._rejected.setdefault(device, Counter())[reason] += 1
        return accepted, replays

    def clear_seen(self) -> None:
        with self.lock:
            self._seen.clear()

    def tracked_identities(self) -> int:
        with self.lock:
            return sum(len(seen) for seen in self._seen.values())

    def append_row(self, row: dict[str, Any]) -> None:
        """Inserta una fila suelta sin antireplay (firma de compatibilidad)."""
        self.commit([(row, None)])

    def on_clear(self, hook: Any) -> None:
        """Registra un callback que se dispara en cada ``clear()``.

        Las estructuras que derivan del almacen (agregados incrementales de
        flota) tienen que emptiedarse con el, o siguen respondiendo con datos
        de una prueba o de una sesion anterior.
        """
        self._clear_hooks.append(hook)

    def clear(self) -> None:
        with self.lock:
            self._rows.clear()
            self._seen.clear()
            self._updated.clear()
            self._latest_ts.clear()
            self._accepted.clear()
            self._verified.clear()
            self._rejected.clear()
        for hook in list(self._clear_hooks):
            hook()

    # -- lectura -----------------------------------------------------------

    def rows(self, device_id: str) -> list[dict[str, Any]]:
        with self.lock:
            bucket = self._rows.get(device_id)
            return list(bucket) if bucket else []

    def devices(self) -> list[str]:
        with self.lock:
            return sorted(self._rows)

    def latest(self, device_id: str) -> dict[str, Any] | None:
        """Fila de mayor ``seq`` del dispositivo (null si no hay)."""
        with self.lock:
            bucket = self._rows.get(device_id)
            if not bucket:
                return None
            best = bucket[-1]
            best_seq = as_float(best.get("seq"))
            if best_seq is None:
                return best
            for row in reversed(bucket):
                seq = as_float(row.get("seq"))
                if seq is not None and seq > best_seq:
                    best, best_seq = row, seq
            return best

    def default_device_id(self) -> str | None:
        """Configurado si está presente; si no, el actualizado más recientemente."""
        with self.lock:
            if self.default_device in self._rows:
                return self.default_device
            if not self._updated:
                return None
            return max(self._updated, key=lambda device: self._updated[device])

    def total_rows(self) -> int:
        with self.lock:
            return sum(len(bucket) for bucket in self._rows.values())

    def replay_tracked(self, device_id: str) -> int:
        with self.lock:
            seen = self._seen.get(device_id)
            return len(seen) if seen else 0

    def snapshot_window(self, seconds: float, *, as_rows: bool = False) -> Any:
        """Filas de los últimos ``seconds`` segundos de todos los dispositivos.

        Por defecto devuelve columnas (``dict[str, list]``): el motor de
        agregaciones las consume tal cual y evita copiar miles de dicts por
        tick. ``as_rows=True`` da la vista de filas para quien la necesite.
        """
        window = max(0.0, float(seconds))
        with self.lock:
            per_device: list[tuple[str, list[dict[str, Any]]]] = []
            for device, bucket in self._rows.items():
                if not bucket:
                    continue
                cutoff = self._latest_ts.get(device, 0.0) - window
                recent: list[dict[str, Any]] = []
                for row in reversed(bucket):
                    if row_ts(row) < cutoff:
                        break
                    recent.append(row)
                if recent:
                    per_device.append((device, recent[::-1]))

            if as_rows:
                return [row for _, rows in per_device for row in rows]

            columns: dict[str, list[Any]] = {"device_id": [], "t_s": [], "t_iso": []}
            for name in NUMERIC_COLUMNS:
                columns[name] = []
            for device, rows in per_device:
                for row in rows:
                    columns["device_id"].append(device)
                    columns["t_s"].append(row_ts(row))
                    columns["t_iso"].append(str(row.get("t_iso", "")))
                    for name in NUMERIC_COLUMNS:
                        columns[name].append(as_float(row.get(name)))
            return columns

    def device_stats(self) -> dict[str, dict[str, Any]]:
        """Retención y contadores por dispositivo para ``GET /fleet/devices``."""
        with self.lock:
            stats: dict[str, dict[str, Any]] = {}
            # Un equipo cuyas filas se rechazan todas nunca entra al almacen;
            # sin unionarlo aqui desapareceria del reporte de flota, que es
            # justo el equipo que mas falta por ver.
            for device in set(self._rows) | set(self._rejected):
                bucket = self._rows.get(device, ())
                rejected = self._rejected.get(device, Counter())
                latest_row = bucket[-1] if bucket else None
                accepted = self._accepted.get(device, 0)
                rejected_total = sum(rejected.values())
                verified = self._verified.get(device, 0)
                # Sobre todo lo ofrecido, no solo lo aceptado: si el denominador
                # fuera solo lo aceptado, un equipo que manda Rows manipulados
                # seguiria marcadas 1.0 porque sus rechazos serian invisibles.
                offered = accepted + rejected_total
                stats[device] = {
                    "device_id": device,
                    "rows_retained": len(bucket),
                    "retention_rows": self.retention_rows,
                    "last_t_iso": str(latest_row.get("t_iso")) if latest_row else None,
                    "last_t_s": row_ts(latest_row) if latest_row else None,
                    "rows_accepted": accepted,
                    "rows_verified": verified,
                    "rows_rejected": rejected_total,
                    "rows_offered": offered,
                    "verified_ratio": (verified / offered) if offered else 0.0,
                    "rejected_reasons": dict(rejected),
                    "latest_level_liters": as_float(latest_row.get("level_liters")) if latest_row else None,
                    "latest_level_pct": as_float(latest_row.get("level_pct")) if latest_row else None,
                    "latest": latest_signals(latest_row) if latest_row else None,
                }
            return stats


    def reverse(self, device_id: str) -> None:
        """Invierte el orden de un dispositivo (superficie de compatibilidad)."""
        with self.lock:
            bucket = self._rows.get(device_id)
            if bucket:
                ordered = list(bucket)
                ordered.reverse()
                bucket.clear()
                bucket.extend(ordered)

    def reverse_all(self) -> None:
        with self.lock:
            for device in list(self._rows):
                self.reverse(device)


def outage_runs(rows: Iterable[dict[str, Any]], device_id: str) -> list[dict[str, Any]]:
    """Rachas de filas con ``link_down`` dentro de las filas ya ordenadas.

    ``forwarded`` se deja en None a proposito: el backend no entrega nada
    durante un corte (no hay MQTT), asi que afirmar un numero de filas
    entregadas seria inventar una medida. La UI lo trata como desconocido.
    """
    runs: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []

    def close(group: list[dict[str, Any]]) -> None:
        if not group:
            return
        start, end = group[0], group[-1]
        runs.append({
            "device_id": device_id,
            "start_t_iso": start.get("t_iso"),
            "end_t_iso": end.get("t_iso"),
            "start_t_s": row_ts(start),
            "end_t_s": row_ts(end),
            "duration_s": round(row_ts(end) - row_ts(start), 3),
            "rows_buffered": len(group),
            "forwarded": None,
        })

    for row in rows:
        if int(as_float(row.get("link_down")) or 0) == 1:
            current.append(row)
        else:
            close(current)
            current = []
    close(current)
    return runs


class StoreView:
    """Vista compatible con la lista global que sustituye a ``_store_rows``.

    Las pruebas históricas llaman ``clear/extend/append/reverse`` e indexan el
    contenedor; esta vista los traduce al almacén por dispositivo para que el
    contrato viejo siga verificando el comportamiento nuevo.
    """

    __slots__ = ("_store",)

    def __init__(self, store: TelemetryStore) -> None:
        self._store = store

    def _default(self) -> str | None:
        return self._store.default_device_id()

    def _rows(self) -> list[dict[str, Any]]:
        device = self._default()
        if device is not None:
            return self._store.rows(device)
        return []

    def __len__(self) -> int:
        return self._store.total_rows()

    def __iter__(self) -> Iterable[dict[str, Any]]:
        return iter(self._rows())

    def __getitem__(self, index: Any) -> Any:
        return self._rows()[index]

    def __eq__(self, other: object) -> bool:
        if isinstance(other, StoreView):
            return self._rows() == other._rows()
        if isinstance(other, (list, tuple)):
            return self._rows() == list(other)
        return NotImplemented

    def clear(self) -> None:
        self._store.clear()

    def append(self, row: dict[str, Any]) -> None:
        self._store.append_row(row)

    def extend(self, rows: Iterable[dict[str, Any]]) -> None:
        for row in rows:
            self._store.append_row(row)

    def reverse(self) -> None:
        self._store.reverse_all()


def iter_prepared(rows: Iterable[dict[str, Any]]) -> Iterable[tuple[dict[str, Any], tuple | None]]:
    """Atajo para preparar filas cuya identidad ya es derivable de la fila."""
    for row in rows:
        seq = as_float(row.get("seq"))
        if seq is None:
            yield row, None
        else:
            yield row, (device_of(row), int(seq), str(row.get("t_iso", "")))