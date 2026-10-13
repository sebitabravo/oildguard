"""Geometría de la cavidad de aceite del reductor GDY106 (piscina en un anillo horizontal).

MODELO: la caja de engranajes se aproxima como un anillo horizontal concéntrico
(eje de la rueda horizontal). El aceite forma una piscina cuya sección es un
segmento circular del radio exterior menos la parte del cubo interior
(torque tube / buje del portaplanetas) que queda sumergida.

ASSUMPTION: GE no publica las dimensiones de la cavidad. Los valores por defecto
son una reconstrucción paramétrica para que 95 L (capacidad VERIFIED) ocupe una
altura de decímetros. Cuando el banco entregue h(V) medido, basta editar el
único objeto ``GearCase`` (``DEFAULT_GEAR_CASE``); todo el pipeline y el gemelo
3D leen de él.

Unidades: metros para longitudes y alturas, litros para volumen.
Stdlib únicamente.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# Tolerancia de la bisección: 1e-6 m = 1 micra, muy por debajo de cualquier sensor.
HEAD_TOL_M = 1e-6
EFFECTIVE_HEAD_TOL_M = HEAD_TOL_M * 1e-3


@dataclass(frozen=True)
class GearCase:
    """Parámetros de la cavidad anular (ASSUMPTION, ver docstring del módulo)."""

    r_out: float = 0.60   # m, radio exterior de la cavidad
    r_in: float = 0.22    # m, radio del cubo interior concéntrico
    length: float = 0.42  # m, longitud axial de la cavidad

    def __post_init__(self) -> None:
        if not (self.r_out > 0.0 and 0.0 <= self.r_in < self.r_out and self.length > 0.0):
            raise ValueError("require r_out > 0, 0 <= r_in < r_out and length > 0")

    @property
    def volume_full_l(self) -> float:
        """Volumen del anillo completo en litros."""
        return math.pi * (self.r_out**2 - self.r_in**2) * self.length * 1000.0


DEFAULT_GEAR_CASE = GearCase()


def segment_area(radius: float, h: float) -> float:
    """Área (m²) del círculo bajo la altura ``h`` medida desde su punto más bajo.

    ``h`` se satura a 0..2R.
    """
    if radius <= 0.0 or h <= 0.0:
        return 0.0
    if h >= 2.0 * radius:
        return math.pi * radius * radius
    d = radius - h
    return radius * radius * math.acos(d / radius) - d * math.sqrt(max(0.0, 2.0 * radius * h - h * h))


def _chord(radius: float, h: float) -> float:
    """Ancho (m) de la superficie libre de un círculo a la altura ``h`` desde su fondo."""
    if radius <= 0.0 or h <= 0.0 or h >= 2.0 * radius:
        return 0.0
    return 2.0 * math.sqrt(max(0.0, 2.0 * radius * h - h * h))


def wetted_area(h: float, gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Sección mojada (m²): segmento exterior menos el cubo interior sumergido."""
    hub_bottom = gc.r_out - gc.r_in
    return segment_area(gc.r_out, h) - segment_area(gc.r_in, h - hub_bottom)


def volume_from_head(h: float, gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Volumen de aceite (L) para una altura de piscina ``h`` (m)."""
    return wetted_area(h, gc) * gc.length * 1000.0


def head_from_volume(volume_l: float, gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Altura de piscina (m) para un volumen (L). Inversa por bisección.

    ``volume_from_head`` es monótona creciente, así que la bisección converge
    siempre. El volumen se satura a 0..volumen del anillo completo.
    """
    if volume_l <= 0.0:
        return 0.0
    if volume_l >= gc.volume_full_l:
        return 2.0 * gc.r_out
    lo, hi = 0.0, 2.0 * gc.r_out
    while hi - lo > EFFECTIVE_HEAD_TOL_M:
        mid = 0.5 * (lo + hi)
        if volume_from_head(mid, gc) < volume_l:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def dV_dh(h: float, gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Sensibilidad del volumen a la altura, en litros por milímetro.

    Es el ancho de la superficie libre por la longitud axial. Donde es grande,
    un milímetro de columna equivale a muchos litros: ahí la presión resuelve
    peor el nivel.
    """
    hub_bottom = gc.r_out - gc.r_in
    width = _chord(gc.r_out, h) - _chord(gc.r_in, h - hub_bottom)
    return max(0.0, width) * gc.length  # m² * m = m³ por m = L por mm
