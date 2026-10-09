"""Literature physics priors for the 930E/GDY106 thesis scope (docs-first).

SCOPE: Komatsu 930E with GDY106 final drive (32.62:1) ONLY. The Komatsu
980E-5 uses the GDY108-C final drive (35.02:1) and stays FUTURE WORK without
validation — no 980E claim in this file is validated.

STATUS — READ FIRST
-------------------
The running demo pipeline (``sim/generate.py`` anchor ``28 kPa at 95 L``,
``ai/level.py`` ``KPA_PER_L = 28/95``) is a SYNTHETIC-PROXY (field-anchor
pending h(L) bench). It is KEPT RUNNING unchanged so the N1–N4 demo keeps
working; it is NOT rescaled here. The functions below are the bench-ready
literature anchor referenced by ``docs/calibration.md`` and
``docs/thesis-annex.md``: real physics with VERIFIED constants and explicit
ASSUMPTION/GAP marks. No bench data is invented in this file.

Hydrostatic correction (why the proxy is flagged)
-------------------------------------------------
``p = rho * g * h`` with SAE 85W-140 ``rho ≈ 890–912 kg/m³`` (VERIFIED PDS
set, see thesis annex) gives for the synthetic 28 kPa anchor at 95 L::

    h = 28000 / (901 * 9.81) ≈ 3.2 m

A 3.2 m oil head inside a wheel-motor housing is ABSURD (housing scale is
decimetres). A realistic 0.3–0.5 m head gives only ≈ 2.6–4.4 kPa. The bench
must therefore measure the true ``h(L)`` mapping (head vs weighed litres)
before any field-accuracy claim; see ``absurdity_check()`` smoke below.

Stdlib only (no extra deps).
"""

from __future__ import annotations

import math

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

# Synthetic-proxy anchor kept by the demo pipeline (NOT physics):
SYNTHETIC_PROXY_KPA_AT_FULL = 28.0  # field-anchor pending h(L) bench


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
