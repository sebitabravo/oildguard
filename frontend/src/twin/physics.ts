// Espejo TypeScript de sim/geometry.py + sim/physics.py + sim/geartrain.py.
//
// Funciones puras, sin three.js. El banco 3D dibuja la superficie del aceite
// desde headFromVolume: misma fuente de verdad que el pipeline de señales.
// La paridad con Python la fija tests/fixtures/physics_parity.json.
//
// ASSUMPTION: dimensiones de la cavidad y números de dientes no son
// publicados por GE; ver docs/thesis-annex.md.

import rawDemoData from "../demo/demo-data.json";

/** Cavidad anular horizontal del reductor (m). */
export interface GearCase {
  rOut: number;
  rIn: number;
  length: number;
}

const constants = rawDemoData.physics.constants;

export const DEFAULT_GEAR_CASE: GearCase = constants.defaultGearCase;

// Constantes del aceite SAE 85W-140 (mismas que sim/physics.py).
export const RHO_REF = constants.rhoRef;
export const RHO_T_REF_C = constants.rhoTRefC;
export const BETA_RHO_PER_C = constants.betaRhoPerC;
export const G = constants.gravity;
export const CAPACITY_L = constants.capacityL;

/** Research geometry for rotating-output sensors; ASSUMPTION, not calibrated. */
export const RESEARCH_ROTATING_CAVITY: GearCase = constants.researchRotatingCavity;
// Regime thresholds and slosh envelope are ASSUMPTIONS pending bench data.
export const ROTATING_STATIC_FROUDE_MAX = constants.rotatingStaticFroudeMax;
export const ROTATING_RIMMING_FROUDE_MIN = constants.rotatingRimmingFroudeMin;
export const ROTATING_RPM_MAX = constants.rotatingRpmMax;

export const HEAD_TOL_M = constants.headToleranceM;
export const ROTATING_SAMPLES_DEFAULT = constants.rotatingSamplesDefault;
export const ROTATING_SAMPLES_MIN = constants.rotatingSamplesMin;
export const ROTATING_SAMPLES_MAX = constants.rotatingSamplesMax;
export const SLOSH_FROUDE_FACTOR = constants.sloshFroudeFactor;
export const SLOSH_HEIGHT_CAP_FACTOR = constants.sloshHeightCapFactor;

export function volumeFullL(gc: GearCase = DEFAULT_GEAR_CASE): number {
  return Math.PI * (gc.rOut ** 2 - gc.rIn ** 2) * gc.length * 1000;
}

/** Área (m²) del círculo bajo la altura h medida desde su punto más bajo. */
export function segmentArea(radius: number, h: number): number {
  if (radius <= 0 || h <= 0) return 0;
  if (h >= 2 * radius) return Math.PI * radius * radius;
  const d = radius - h;
  return radius * radius * Math.acos(d / radius) - d * Math.sqrt(Math.max(0, 2 * radius * h - h * h));
}

function chord(radius: number, h: number): number {
  if (radius <= 0 || h <= 0 || h >= 2 * radius) return 0;
  return 2 * Math.sqrt(Math.max(0, 2 * radius * h - h * h));
}

export function wettedArea(h: number, gc: GearCase = DEFAULT_GEAR_CASE): number {
  const hubBottom = gc.rOut - gc.rIn;
  return segmentArea(gc.rOut, h) - segmentArea(gc.rIn, h - hubBottom);
}

export function volumeFromHead(h: number, gc: GearCase = DEFAULT_GEAR_CASE): number {
  return wettedArea(h, gc) * gc.length * 1000;
}

/** Altura de la piscina (m) para un volumen (L); bisección sobre una función monótona. */
export function headFromVolume(volumeL: number, gc: GearCase = DEFAULT_GEAR_CASE): number {
  if (volumeL <= 0) return 0;
  if (volumeL >= volumeFullL(gc)) return 2 * gc.rOut;
  let lo = 0;
  let hi = 2 * gc.rOut;
  while (hi - lo > HEAD_TOL_M) {
    const mid = 0.5 * (lo + hi);
    if (volumeFromHead(mid, gc) < volumeL) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Litros por milímetro de columna: donde es grande, la presión resuelve peor el nivel. */
export function dVdh(h: number, gc: GearCase = DEFAULT_GEAR_CASE): number {
  const hubBottom = gc.rOut - gc.rIn;
  const width = chord(gc.rOut, h) - chord(gc.rIn, h - hubBottom);
  return Math.max(0, width) * gc.length;
}

export function oilDensityKgM3(tempC: number): number {
  return RHO_REF * (1 - BETA_RHO_PER_C * (tempC - RHO_T_REF_C));
}

export function hydrostaticKpa(rho: number, headM: number): number {
  return (rho * G * headM) / 1000;
}

export function pressureKpaFromVolume(volumeL: number, tempC: number, gc: GearCase = DEFAULT_GEAR_CASE): number {
  return hydrostaticKpa(oilDensityKgM3(tempC), headFromVolume(volumeL, gc));
}

/** Masa fija de aceite: V = m / rho(T). En la caja anular la presión no es invariante con T. */
export function pressureKpaFromMass(massKg: number, tempC: number, gc: GearCase = DEFAULT_GEAR_CASE): number {
  const rho = oilDensityKgM3(tempC);
  return hydrostaticKpa(rho, headFromVolume((massKg / rho) * 1000, gc));
}

export function volumeFromPressureKpa(pressureKpa: number, tempC: number, gc: GearCase = DEFAULT_GEAR_CASE): number {
  const head = (pressureKpa * 1000) / (oilDensityKgM3(tempC) * G);
  return volumeFromHead(head, gc);
}

export type RotatingSensorRegime = "static_pool" | "slosh" | "centrifugal_rimming";

export function rotatingSensorRegime(wheelRpm: number, gc: GearCase = RESEARCH_ROTATING_CAVITY): RotatingSensorRegime {
  const rpm = Math.min(ROTATING_RPM_MAX, Math.max(0, Math.abs(wheelRpm)));
  const froude = (rpm * 2 * Math.PI / 60) ** 2 * gc.rOut / G;
  if (froude < ROTATING_STATIC_FROUDE_MAX) return "static_pool";
  if (froude < ROTATING_RIMMING_FROUDE_MIN) return "slosh";
  return "centrifugal_rimming";
}

/** Estimated wet fraction across one output revolution; assumptions need bench calibration. */
export function submergedFractionPerRevolution(
  volumeL: number,
  sensorRadiusM: number,
  wheelRpm: number,
  gc: GearCase = RESEARCH_ROTATING_CAVITY,
  samples = ROTATING_SAMPLES_DEFAULT,
): number {
  const fullL = volumeFullL(gc);
  const volume = Math.min(fullL, Math.max(0, volumeL));
  if (volume <= 0) return 0;
  if (volume >= fullL) return 1;
  const radius = Math.min(gc.rOut, Math.max(0, sensorRadiusM));
  const regime = rotatingSensorRegime(wheelRpm, gc);
  if (regime === "centrifugal_rimming") {
    const filmDepth = volume / 1000 / (2 * Math.PI * gc.rOut * gc.length);
    return radius >= gc.rOut - filmDepth ? 1 : 0;
  }

  let surfaceHeight = headFromVolume(volume, gc) - gc.rOut;
  if (regime === "slosh") {
    const rpm = Math.min(ROTATING_RPM_MAX, Math.max(0, Math.abs(wheelRpm)));
    const froude = (rpm * 2 * Math.PI / 60) ** 2 * gc.rOut / G;
    surfaceHeight += Math.min(SLOSH_HEIGHT_CAP_FACTOR * gc.rOut, SLOSH_FROUDE_FACTOR * gc.rOut * froude);
  }
  const count = Math.min(ROTATING_SAMPLES_MAX, Math.max(ROTATING_SAMPLES_MIN, Math.trunc(samples)));
  let wet = 0;
  for (let i = 0; i < count; i++) {
    if (radius * Math.sin(2 * Math.PI * i / count) <= surfaceHeight) wet++;
  }
  return wet / count;
}

// --- Tren planetario GDY106 (ASSUMPTION: dientes ilustrativos) ---

export interface PlanetaryStage {
  zs: number;
  zp: number;
  zr: number;
  planets: number;
}

export interface GearTrain {
  hs: PlanetaryStage;
  ls: PlanetaryStage;
}

export const GDY106_TRAIN: GearTrain = constants.gdy106Train;

export const GEAR_RATIO = constants.gearRatio;

export const stageRatio = (st: PlanetaryStage): number => 1 + st.zr / st.zs;
export const trainRatio = (tr: GearTrain = GDY106_TRAIN): number => stageRatio(tr.hs) * stageRatio(tr.ls);

export interface StageSpeeds {
  shaftRpm: number;
  hsCarrierRpm: number;
  lsSunRpm: number;
  wheelRpm: number;
  /** Giro propio del planeta respecto de su portaplanetas (negativo = opuesto). */
  hsPlanetRelRpm: number;
  lsPlanetRelRpm: number;
}

export function stageSpeeds(rotorRpm: number, tr: GearTrain = GDY106_TRAIN): StageSpeeds {
  const hsCarrier = rotorRpm / stageRatio(tr.hs);
  const wheel = hsCarrier / stageRatio(tr.ls);
  return {
    shaftRpm: rotorRpm,
    hsCarrierRpm: hsCarrier,
    lsSunRpm: hsCarrier,
    wheelRpm: wheel,
    hsPlanetRelRpm: -(tr.hs.zr / tr.hs.zp) * hsCarrier,
    lsPlanetRelRpm: -(tr.ls.zr / tr.ls.zp) * wheel,
  };
}
