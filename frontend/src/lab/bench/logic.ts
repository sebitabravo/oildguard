import { estimateSettlingMs, settlingTau, VISC_MAX, VISC_MIN } from "../../sim/bench/settling";
import { CAPACITY_L, V_HOLDUP_MAX_L, WHEEL_RPM_MAX } from "../../sim/signals";
import {
  headFromVolume,
  oilDensityKgM3,
  pressureKpaFromVolume,
  rotatingSensorRegime,
  type RotatingSensorRegime,
} from "../../twin/physics";

export const BENCH_LIMITS = {
  fillL: { min: 20, max: CAPACITY_L, step: 0.5 },
  temperatureC: { min: 20, max: 110, step: 1 },
  wheelRpm: { min: 0, max: 92, step: 1 },
} as const;

export const BENCH_DEFAULTS = { fillL: CAPACITY_L, temperatureC: 75, wheelRpm: 60 } as const;

/** Temperatura de referencia de banco (docs/calibration.md: operación ≈ 75 °C). */
const REFERENCE_TEMPERATURE_C = 75;
/** ASSUMPTION: pendiente lineal del proxy por °C; no es una viscosidad medida. */
const PROXY_PER_C = 0.02;

const CURVE_SAMPLES = 41;
const CURVE_END_S = 4;

export interface BenchInput {
  fillL: number;
  temperatureC: number;
  wheelRpm: number;
}

export interface BenchReading {
  input: BenchInput;
  /** Presión del reposo, kPa: la asíntota hidrostática. */
  restPressureKpa: number;
  /** Presión con el aceite retenido por la rueda girando, kPa. */
  pressureNowKpa: number;
  headMm: number;
  densityKgM3: number;
  holdUpL: number;
  viscosityProxy: number;
  tauS: number;
  settleMs: number;
  regime: RotatingSensorRegime;
  /** Solo en reposo (0 rpm) se admite una lectura de nivel; en marcha se descarta. */
  restGate: boolean;
}

export interface TransientSample {
  timeS: number;
  pressureKpa: number;
  asymptoteKpa: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampInput(input: BenchInput): BenchInput {
  return {
    fillL: clamp(input.fillL, BENCH_LIMITS.fillL.min, BENCH_LIMITS.fillL.max),
    temperatureC: clamp(input.temperatureC, BENCH_LIMITS.temperatureC.min, BENCH_LIMITS.temperatureC.max),
    wheelRpm: clamp(input.wheelRpm, BENCH_LIMITS.wheelRpm.min, BENCH_LIMITS.wheelRpm.max),
  };
}

/** Más frío, más lento: 1 a 75 °C, acotado al rango 0,5 a 2,0 del proxy del banco 3D. */
export function viscosityProxyFromTemperature(temperatureC: number): number {
  return clamp(1 - PROXY_PER_C * (temperatureC - REFERENCE_TEMPERATURE_C), VISC_MIN, VISC_MAX);
}

/** Aceite fuera de la piscina estática; lineal en rpm como sim/generate.py. */
export function holdUpL(wheelRpm: number): number {
  return V_HOLDUP_MAX_L * clamp(wheelRpm / WHEEL_RPM_MAX, 0, 1);
}

export function benchReading(raw: BenchInput): BenchReading {
  const input = clampInput(raw);
  const held = holdUpL(input.wheelRpm);
  const viscosityProxy = viscosityProxyFromTemperature(input.temperatureC);
  return {
    input,
    restPressureKpa: pressureKpaFromVolume(input.fillL, input.temperatureC),
    pressureNowKpa: pressureKpaFromVolume(input.fillL - held, input.temperatureC),
    headMm: headFromVolume(input.fillL) * 1000,
    densityKgM3: oilDensityKgM3(input.temperatureC),
    holdUpL: held,
    viscosityProxy,
    tauS: settlingTau(viscosityProxy),
    settleMs: estimateSettlingMs(viscosityProxy),
    regime: rotatingSensorRegime(input.wheelRpm),
    restGate: input.wheelRpm === 0,
  };
}

/** Presión tras detener la rueda desde las rpm elegidas: el aceite retenido vuelve con tau del proxy. */
export function stopTransient(raw: BenchInput): TransientSample[] {
  const input = clampInput(raw);
  const tauS = settlingTau(viscosityProxyFromTemperature(input.temperatureC));
  const held = holdUpL(input.wheelRpm);
  const asymptoteKpa = pressureKpaFromVolume(input.fillL, input.temperatureC);
  return Array.from({ length: CURVE_SAMPLES }, (_, index) => {
    const timeS = (CURVE_END_S * index) / (CURVE_SAMPLES - 1);
    return {
      timeS,
      pressureKpa: pressureKpaFromVolume(input.fillL - held * Math.exp(-timeS / tauS), input.temperatureC),
      asymptoteKpa,
    };
  });
}

/** Escalones de pesaje del paso 5 de docs/calibration.md §1. */
const PROTOCOL_LEVELS_L = [95, 90, 80, 70, 47.5, 28.5] as const;

export function protocolLevelSteps(temperatureC: number): Array<{ volumeL: number; percent: number; pressureKpa: number }> {
  return PROTOCOL_LEVELS_L.map((volumeL) => ({
    volumeL,
    percent: (volumeL * 100) / CAPACITY_L,
    pressureKpa: pressureKpaFromVolume(volumeL, temperatureC),
  }));
}

/** Los ocho pasos del procedimiento de docs/calibration.md §1, en orden. */
export const PROTOCOL_STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
