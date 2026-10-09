"""Literature physics priors for the 930E/GDY106 thesis scope (docs-first).

SCOPE: Komatsu 930E with GDY106 final drive (32.62:1) ONLY. The Komatsu
980E-5 uses the GDY108-C final drive (35.02:1) and stays FUTURE WORK without
validation — no 980E claim in this file is validated.

STATUS — READ FIRST
-------------------
The pipeline (``sim/generate.py``, ``ai/level.py``) derives pressure from the
oil volume through the gear-case geometry in ``sim/geometry.py`` and the
hydrostatics below: ``p = rho(T) * g * h(V)``. The former linear anchor
``28 kPa at 95 L`` implied a 3.2 m oil column inside a wheel motor (ABSURD);
it survives only as the historical record in :func:`absurdity_check`.

The cavity dimensions are an ASSUMPTION (GE does not publish them) and the
whole chain stays labeled SYNTHETIC-PROXY until the bench measures the true
``h(L)`` mapping (``docs/calibration.md``). Constants of the oil and the
drive are VERIFIED (see ``docs/thesis-annex.md``).

Why temperature compensation is physically needed
-------------------------------------------------
A fixed MASS of oil occupies ``V(T) = m / rho(T)``. In a vertical-walled tank
``p = rho*g*V/A = m*g/A`` is temperature invariant. In a horizontal annular
case the free surface widens with height, so the head grows less than
proportionally with the thermal expansion and ``p`` is NOT exactly invariant:
the residual is the signal the temperature compensation has to remove.

Stdlib only (no extra deps).
"""

from __future__ import annotations

import math
from typing import Callable

try:  # ejecución como paquete (pytest, backend) o como script (python3 sim/physics.py)
    from sim.geometry import DEFAULT_GEAR_CASE, GearCase, dV_dh, head_from_volume, volume_from_head
except ImportError:  # pragma: no cover
    from geometry import DEFAULT_GEAR_CASE, GearCase, dV_dh, head_from_volume, volume_from_head  # type: ignore

# --- Validated scope constants (VERIFIED: Komatsu spec PDFs, see annex) ---
CAPACITY_L = 95.0            # GDY106 oil capacity per wheel motor
GEAR_RATIO = 32.62           # GDY106 reduction; 3000 rpm -> ~92 rpm
ROTOR_MAX_RPM = 3000.0       # traction-motor max
WHEEL_RPM_AT_MAX = ROTOR_MAX_RPM / GEAR_RATIO  # ≈ 91.97
MAX_SPEED_KMH = 64.5         # 930E max travel speed
FUTURE_RATIO_GDY108C = 35.02  # 980E-5 GDY108-C — FUTURE WORK, not validated

# --- Lubricant literature priors (VERIFIED: SAE 85W-140 PDS set, J306) ---
RHO_MIN = 890.0              # kg/m³ @15 °C (PDS range low)
RHO_MAX = 912.0              # kg/m³ @15 °C (PDS range high)
RHO_REF = (RHO_MIN + RHO_MAX) / 2.0  # 901 kg/m³ midpoint prior
RHO_T_REF_C = 15.0
# Volumetric thermal coefficient prior, ASSUMPTION (typical mineral-gear-oil
# order of magnitude; bench must fit the true beta from weighed runs).
BETA_RHO_PER_C = 7e-4
VISC_40C_CST = (350.0, 420.0)    # VERIFIED PDS range @40 °C
VISC_100C_CST = (26.0, 28.6)     # VERIFIED PDS range @100 °C
VISC_VI = (95, 103)              # VERIFIED viscosity-index range
# SAE J306 limits for 85W-140 (VERIFIED): 85W => ≤150 000 cP @-12 °C;
# 140 => 24.0–41.0 cSt @100 °C. PDS 26–28.6 cSt sits inside the 140 band.

G = 9.81  # m/s²

# Ancla lineal histórica (NO física); solo la usa absurdity_check().
SYNTHETIC_PROXY_KPA_AT_FULL = 28.0


def oil_density_kg_m3(temp_c: float, rho_ref: float = RHO_REF,
                      t_ref_c: float = RHO_T_REF_C,
                      beta_per_c: float = BETA_RHO_PER_C) -> float:
    """Linear density prior ``rho(T) = rho_ref * (1 - beta*(T - T_ref))``.

    ASSUMPTION: linear form + ``beta = 7e-4 /°C`` prior. Bench fits beta.
    """
    return rho_ref * (1.0 - beta_per_c * (temp_c - t_ref_c))


def hydrostatic_kpa(rho_kg_m3: float, head_m: float) -> float:
    """Hydrostatic head pressure ``p = rho*g*h`` in kPa."""
    return rho_kg_m3 * G * head_m / 1000.0


def head_for_pressure_m(pressure_kpa: float, rho_kg_m3: float) -> float:
    """Invert ``p = rho*g*h`` → head in metres."""
    return pressure_kpa * 1000.0 / (rho_kg_m3 * G)


def absurdity_check() -> dict:
    """Show why 28 kPa @ 95 L cannot be a hydrostatic head (GAP record).

    Returns the implied-absurd head plus the realistic-head pressures so
    the thesis can cite numbers instead of adjectives.
    """
    absurd_h = head_for_pressure_m(SYNTHETIC_PROXY_KPA_AT_FULL, RHO_REF)
    realistic = {h: round(hydrostatic_kpa(RHO_REF, h), 2) for h in (0.3, 0.4, 0.5)}
    return {
        "proxy_kpa_at_95L": SYNTHETIC_PROXY_KPA_AT_FULL,
        "rho_prior": RHO_REF,
        "implied_head_m": round(absurd_h, 2),  # ≈ 3.17 m — ABSURD
        "realistic_head_kpa": realistic,        # ≈ 2.65 / 3.54 / 4.42 kPa
        "verdict": "SYNTHETIC-PROXY (field-anchor pending h(L) bench)",
    }


def pressure_kpa_from_volume(volume_l: float, temp_c: float,
                             gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Presión hidrostática en el fondo ``rho(T) * g * h(V)`` en kPa.

    ``volume_l`` es el volumen real de aceite a la temperatura ``temp_c``.
    """
    return hydrostatic_kpa(oil_density_kg_m3(temp_c), head_from_volume(volume_l, gc))


def _pressure_kpa_from_mass(mass_kg: float, temp_c: float,
                            head_fn: Callable[[float], float]) -> float:
    rho = oil_density_kg_m3(temp_c)
    volume_l = mass_kg / rho * 1000.0
    return hydrostatic_kpa(rho, head_fn(volume_l))


def pressure_kpa_from_mass(mass_kg: float, temp_c: float,
                           gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Presión para una MASA fija de aceite: el volumen es ``m / rho(T)``.

    En un estanque de paredes verticales el resultado no depende de la
    temperatura; en la caja anular sí (poco pero no cero). Esa diferencia es
    la razón física de la compensación térmica del nivel.
    """
    return _pressure_kpa_from_mass(mass_kg, temp_c, lambda v: head_from_volume(v, gc))


def volume_from_pressure_kpa(pressure_kpa: float, temp_c: float,
                             gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Inversa de :func:`pressure_kpa_from_volume`: litros para una presión."""
    head = head_for_pressure_m(pressure_kpa, oil_density_kg_m3(temp_c))
    return volume_from_head(head, gc)


def sensor_resolution_l(fs_kpa: float, accuracy_pct_fs: float, volume_l: float,
                        temp_c: float, gc: GearCase = DEFAULT_GEAR_CASE) -> float:
    """Incertidumbre de nivel en litros de un transductor ``fs_kpa`` con ``accuracy_pct_fs``.

    ``error_kpa / (dp/dV)`` evaluado en el nivel ``volume_l``; dp/dV sale de la
    sensibilidad de la geometría, así que depende del nivel (peor donde la
    superficie libre es más ancha).
    """
    err_kpa = fs_kpa * accuracy_pct_fs / 100.0
    h = head_from_volume(volume_l, gc)
    dv_dh_l_per_m = dV_dh(h, gc) * 1000.0
    if dv_dh_l_per_m <= 0.0:
        return float("inf")
    dp_dv = oil_density_kg_m3(temp_c) * G / 1000.0 / dv_dh_l_per_m  # kPa por litro
    return err_kpa / dp_dv


def wheel_rpm(rotor_rpm: float, ratio: float = GEAR_RATIO) -> float:
    """Arithmetic reduction ``wheel = rotor / ratio`` (VERIFIED arithmetic).

    3000 / 32.62 ≈ 91.97 ≈ 92 rpm. For GDY108-C pass ratio=35.02 explicitly
    (future-work path; result NOT validated).
    """
    return rotor_rpm / ratio


def viscosity_mid_cst(temp_c: float) -> float:
    """Log-linear interpolation between the PDS midpoint anchors (40 °C and
    100 °C). ASSUMPTION: interpolation form is a placeholder; bench fits the
    true Walther/Vogel curve from measured settling-tau vs temperature.
    Clamped to the 15–120 °C operating span; outside returns the endpoint.
    """
    t = min(120.0, max(15.0, temp_c))
    lo = sum(VISC_40C_CST) / 2.0   # 385 cSt @40 °C
    hi = sum(VISC_100C_CST) / 2.0  # 27.3 cSt @100 °C
    frac = (t - 40.0) / (100.0 - 40.0)
    return math.exp(math.log(lo) + frac * (math.log(hi) - math.log(lo)))


def smoke() -> dict:
    """Unit smoke: VERIFIED arithmetic + proxy-flag sanity. Raises on fail."""
    checks = {}
    # 3000 -> ~92 rpm arithmetic (VERIFIED).
    w = wheel_rpm(ROTOR_MAX_RPM)
    assert abs(w - 91.97) < 0.05, f"gear arithmetic drift: {w}"
    checks["wheel_rpm_at_3000"] = round(w, 2)
    # Density prior midpoint sanity.
    rho75 = oil_density_kg_m3(75.0)
    assert RHO_MIN * 0.9 < rho75 < RHO_MAX, f"rho prior out of band: {rho75}"
    checks["rho_75C"] = round(rho75, 1)
    # Hydrostatic absurdity must reproduce: ~3.2 m implied, realistic kPa.
    ac = absurdity_check()
    assert ac["implied_head_m"] > 2.0, "absurdity check collapsed"
    assert ac["realistic_head_kpa"][0.3] < 5.0, "realistic head too large"
    checks.update(ac)
    # Viscosity interpolation must sit inside/near PDS bands at anchors.
    v40 = viscosity_mid_cst(40.0)
    v100 = viscosity_mid_cst(100.0)
    assert VISC_40C_CST[0] <= v40 <= VISC_40C_CST[1], f"v40: {v40}"
    assert VISC_100C_CST[0] <= v100 <= VISC_100C_CST[1], f"v100: {v100}"
    checks["visc_40C"] = round(v40, 1)
    checks["visc_100C"] = round(v100, 1)
    checks["status"] = "SMOKE_PASS"
    return checks


def main() -> int:
    import json

    print(json.dumps(smoke(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
