"""Tren planetario de dos etapas del GDY106 (Komatsu 930E, relación 32.62:1).

Topología (GE GEK-91680A, Fig. 95): eje del motor -> sol de la etapa de alta
velocidad (HS) -> portaplanetas HS, que acciona el piñón sol de la etapa de
baja velocidad (LS, item 33) -> portaplanetas LS (item 25) -> torque tube
(item 29) -> cubo de la rueda (item 14). La corona (item 24) está sujeta al
bastidor. Por etapa: sol de entrada, corona fija, portaplanetas de salida, así
que ``ratio = 1 + Zr/Zs``.

ASSUMPTION: GE no publica los números de dientes. ``GDY106_TRAIN`` es una
solución ilustrativa que cumple las condiciones de montaje y la relación
publicada dentro de 0.5 %; el banco o el manual de servicio la reemplazan con
un único cambio en este archivo.

Stdlib únicamente.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

TARGET_RATIO = 32.62       # VERIFIED, GDY106
RATIO_TOL_PCT = 0.5        # tolerancia de la búsqueda
MIN_SUN_TEETH = 13         # sin socavado para engranes rectos estándar
ZR_RANGE = (40, 140)       # rango de coronas de la búsqueda por fuerza bruta


@dataclass(frozen=True)
class PlanetaryStage:
    """Una etapa planetaria: sol ``zs``, planetas ``zp`` (``planets`` unidades), corona ``zr``."""

    zs: int
    zp: int
    zr: int
    planets: int

    @property
    def ratio(self) -> float:
        return 1.0 + self.zr / self.zs


@dataclass(frozen=True)
class GearTrain:
    hs: PlanetaryStage
    ls: PlanetaryStage

    @property
    def ratio(self) -> float:
        return self.hs.ratio * self.ls.ratio


@dataclass(frozen=True)
class TrainSolution:
    hs: PlanetaryStage
    ls: PlanetaryStage
    ratio: float
    error_pct: float


def neighbour_clearance_ok(stage: PlanetaryStage) -> bool:
    """Los planetas vecinos no se tocan: ``sin(pi/N) > (zp + 2) / (zs + zp)`` (adendo = 1 módulo)."""
    return math.sin(math.pi / stage.planets) > (stage.zp + 2) / (stage.zs + stage.zp)


def _stages_for_ring(zr: int, planets_options: tuple[int, ...]) -> list[PlanetaryStage]:
    stages = []
    for n in planets_options:
        for zs in range(MIN_SUN_TEETH, zr):
            if (zr - zs) % 2:
                continue
            if (zs + zr) % n:
                continue
            st = PlanetaryStage(zs=zs, zp=(zr - zs) // 2, zr=zr, planets=n)
            if neighbour_clearance_ok(st):
                stages.append(st)
    return stages


def search_tooth_counts(target: float = TARGET_RATIO,
                        planets: tuple[int, ...] = (3, 4),
                        shared_ring: bool = False) -> list[TrainSolution]:
    """Búsqueda por fuerza bruta de trenes de dos etapas con ``|error| <= 0.5 %``.

    Restricciones: ``Zr = Zs + 2*Zp``; ``(Zs + Zr) / N`` entero; ``Zs >= 13``;
    planetas vecinos sin interferencia. Con ``shared_ring`` ambas etapas usan la
    misma corona (la Fig. 95 muestra una sola corona, item 24). Devuelve las
    soluciones ordenadas por error absoluto, HS con el sol más chico.
    """
    out: list[TrainSolution] = []
    lo, hi = ZR_RANGE
    if shared_ring:
        for zr in range(lo, hi + 1):
            stages = _stages_for_ring(zr, planets)
            for hs in stages:
                for ls in stages:
                    out.extend(_candidate(hs, ls, target))
    else:
        by_ring = {zr: _stages_for_ring(zr, planets) for zr in range(lo, hi + 1)}
        all_stages = [st for sts in by_ring.values() for st in sts]
        for hs in all_stages:
            for ls in all_stages:
                out.extend(_candidate(hs, ls, target))
    out.sort(key=lambda s: (abs(s.error_pct), s.hs.zr, s.hs.zs, s.ls.zs, s.hs.planets, s.ls.planets))
    return out


def _candidate(hs: PlanetaryStage, ls: PlanetaryStage, target: float) -> list[TrainSolution]:
    # Cada par no ordenado se reporta una sola vez, con el sol HS más chico.
    if hs.zs > ls.zs or (hs.zs == ls.zs and hs.planets > ls.planets):
        return []
    ratio = hs.ratio * ls.ratio
    err = (ratio - target) / target * 100.0
    if abs(err) > RATIO_TOL_PCT:
        return []
    return [TrainSolution(hs=hs, ls=ls, ratio=ratio, error_pct=err)]


# Solución con corona compartida de 92 dientes: error 0.015 %. ILUSTRATIVA (ASSUMPTION).
# Con módulo ~10 mm la corona mide ~0.92 m de diámetro primitivo, dentro de la caja de 1.2 m.
GDY106_TRAIN = GearTrain(
    hs=PlanetaryStage(zs=16, zp=38, zr=92, planets=3),
    ls=PlanetaryStage(zs=24, zp=34, zr=92, planets=4),
)


def stage_speeds(rotor_rpm: float, train: GearTrain = GDY106_TRAIN) -> dict[str, float]:
    """Velocidades (rpm) para animar el tren; corona fija, sol de entrada.

    ``planet_rel`` es el giro propio del planeta respecto de su portaplanetas:
    ``-(Zr/Zp) * w_carrier`` (signo negativo = opuesto al giro del portaplanetas).
    """
    hs_carrier = rotor_rpm / train.hs.ratio
    wheel = hs_carrier / train.ls.ratio
    return {
        "shaft_rpm": rotor_rpm,
        "hs_carrier_rpm": hs_carrier,
        "ls_sun_rpm": hs_carrier,
        "wheel_rpm": wheel,
        "hs_planet_rel_rpm": -(train.hs.zr / train.hs.zp) * hs_carrier,
        "ls_planet_rel_rpm": -(train.ls.zr / train.ls.zp) * wheel,
    }
