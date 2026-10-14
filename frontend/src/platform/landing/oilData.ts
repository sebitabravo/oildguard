import type { DictKey } from "../../i18n";
import {
  CAPACITY_L,
  G,
  dVdh,
  headFromVolume,
  oilDensityKgM3,
  pressureKpaFromMass,
  pressureKpaFromVolume,
} from "../../twin/physics";

// Temperaturas de la tabla del anexo §2: el mismo aceite a 40/60/80 °C.
export const OIL_PLOT_TEMPS_C = [40, 60, 80] as const;
export type OilPlotTempC = (typeof OIL_PLOT_TEMPS_C)[number];

// Temperatura de la tabla de puertas: la fila de 60 °C del anexo §2.
export const OIL_TABLE_TEMP_C = 60;

// Referencia nominal reexportada para no fijar el 95 en la UI.
export const OIL_REFERENCE_L = CAPACITY_L;

// Niveles de puerta desde la referencia importada: nominal, advertencia
// 50 % y crítico 30 % (anexo §2, ai/rul.py).
export const OIL_WARNING_L = CAPACITY_L * 0.5;
export const OIL_CRITICAL_L = CAPACITY_L * 0.3;
export const OIL_GATE_LEVELS_L = [OIL_CRITICAL_L, OIL_WARNING_L, OIL_REFERENCE_L] as const;

// Muestreo de la curva: las puertas trazadas más puntos intermedios para
// leer la forma no lineal; cada presión se calcula, nunca se fija.
export const OIL_PLOT_VOLUMES_L = [
  20,
  OIL_CRITICAL_L,
  40,
  OIL_WARNING_L,
  60,
  80,
  OIL_REFERENCE_L,
  110,
] as const;

// Masa fija del anexo §2 para mostrar por qué la temperatura compensa.
export const OIL_FIXED_MASS_KG = 80;
export const OIL_MASS_FROM_C = 40;
export const OIL_MASS_TO_C = 100;

// Trazabilidad física: p = rho(T)·g·h(V) con la cavidad importada; los
// números del anexo §2 salen de estos mismos símbolos.
export const OIL_PRESSURE_SOURCE =
  "p = rho(T)·g·h(V) from frontend/src/twin/physics.ts:pressureKpaFromVolume " +
  "(rho 901 kg/m³ @15 °C, beta 7e-4/°C, g 9.81; cavity rOut 0.60 m, rIn 0.22 m, " +
  "length 0.42 m); values in docs/thesis-annex.md §2; cavity ASSUMPTION P13, " +
  "SYNTHETIC-PROXY until the bench measures h(V).";

// Sensibilidad local con la misma composición que sim/physics.py; la tabla
// del anexo §2 fija la procedencia numérica.
export const OIL_SENSITIVITY_SOURCE =
  "dV/dh from frontend/src/twin/physics.ts:dVdh; dp/dV = (rho·g/1000)/(dV/dh·1000) " +
  "at docs/thesis-annex.md §2 (0.439 L/mm; 0.0195/0.0234/0.0271 kPa/L at 60 °C); " +
  "same ASSUMPTION P13.";

// Corte de aceite: la altura de la piscina sale de headFromVolume con la
// cavidad importada (P13 SUPUESTO, P17 corte no CAD).
export const OIL_CUTAWAY_SOURCE =
  "Cutaway pool height from frontend/src/twin/physics.ts:headFromVolume with " +
  "DEFAULT_GEAR_CASE (docs/thesis-annex.md P13 ASSUMPTION, P17 non-CAD cutaway; " +
  "sim/geometry.py:DEFAULT_GEAR_CASE); SYNTHETIC-PROXY until bench h(V).";

export interface OilSensitivityPoint {
  readonly volumeL: number;
  readonly tempC: number;
  readonly headM: number;
  readonly pressureKpa: number;
  readonly dvdhLPerMm: number;
  readonly dpdvKpaPerL: number;
}

export function oilHeadM(volumeL: number): number {
  return headFromVolume(volumeL);
}

export function oilPressureKpa(volumeL: number, tempC: number): number {
  return pressureKpaFromVolume(volumeL, tempC);
}

export function oilDvdhLPerMm(volumeL: number): number {
  return dVdh(headFromVolume(volumeL));
}

// Sensibilidad local dp/dV (kPa por litro): misma composición que
// sim/physics.py:kpa_per_liter, solo con símbolos importados.
export function oilSensitivityKpaPerL(volumeL: number, tempC: number): number {
  const dvdhLPerM = dVdh(headFromVolume(volumeL)) * 1000;
  if (!(dvdhLPerM > 0)) return Number.POSITIVE_INFINITY;
  return (oilDensityKgM3(tempC) * G) / 1000 / dvdhLPerM;
}

export function oilMassPressureKpa(massKg: number, tempC: number): number {
  return pressureKpaFromMass(massKg, tempC);
}

export function oilPoint(volumeL: number, tempC: number): OilSensitivityPoint {
  if (!Number.isFinite(volumeL) || !Number.isFinite(tempC)) {
    throw new Error("Oil sensitivity point needs finite volume and temperature");
  }
  return {
    volumeL,
    tempC,
    headM: oilHeadM(volumeL),
    pressureKpa: oilPressureKpa(volumeL, tempC),
    dvdhLPerMm: oilDvdhLPerMm(volumeL),
    dpdvKpaPerL: oilSensitivityKpaPerL(volumeL, tempC),
  };
}

export function oilCurve(tempC: number, volumes: readonly number[] = OIL_PLOT_VOLUMES_L): OilSensitivityPoint[] {
  if (!Number.isFinite(tempC)) throw new Error("Oil curve needs a finite temperature");
  return volumes.map((volumeL) => oilPoint(volumeL, tempC));
}

// Compuerta de procedencia: cada número del punto debe coincidir con la
// física importada; un número sin traza (fijado a mano) falla.
export function assertOilPointsTraced(points: readonly OilSensitivityPoint[], tolerance = 1e-9): void {
  for (const point of points) {
    const expected = oilPoint(point.volumeL, point.tempC);
    for (const field of ["headM", "pressureKpa", "dvdhLPerMm", "dpdvKpaPerL"] as const) {
      const actual = point[field];
      const wanted = expected[field];
      if (!Number.isFinite(actual) || Math.abs(actual - wanted) > tolerance) {
        throw new Error(
          `Untraced oil number at ${point.volumeL} L/${point.tempC} °C: ${field} ${actual} != physics ${wanted}`,
        );
      }
    }
  }
}

export function oilGateLabelKey(volumeL: number): DictKey {
  if (volumeL === OIL_REFERENCE_L) return "landing.oil.nominal";
  if (volumeL === OIL_WARNING_L) return "landing.oil.warning";
  if (volumeL === OIL_CRITICAL_L) return "landing.oil.critical";
  throw new Error(`Unknown oil gate level: ${String(volumeL)}`);
}

