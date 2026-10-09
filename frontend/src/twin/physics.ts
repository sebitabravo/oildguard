// Espejo TypeScript de sim/geometry.py + sim/physics.py + sim/geartrain.py.
//
// Funciones puras, sin three.js. El banco 3D dibuja la superficie del aceite
// desde headFromVolume: misma fuente de verdad que el pipeline de señales.
// La paridad con Python la fija tests/fixtures/physics_parity.json.
//
// ASSUMPTION: dimensiones de la cavidad y números de dientes no son
// publicados por GE; ver docs/thesis-annex.md.

/** Cavidad anular horizontal del reductor (m). */
export interface GearCase {
  rOut: number;
  rIn: number;
  length: number;
}

export const DEFAULT_GEAR_CASE: GearCase = { rOut: 0.6, rIn: 0.22, length: 0.42 };

// Constantes del aceite SAE 85W-140 (mismas que sim/physics.py).
export const RHO_REF = 901.0;
export const RHO_T_REF_C = 15.0;
export const BETA_RHO_PER_C = 7e-4;
export const G = 9.81;
export const CAPACITY_L = 95;

const HEAD_TOL_M = 1e-9;

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

export const GDY106_TRAIN: GearTrain = {
  hs: { zs: 16, zp: 38, zr: 92, planets: 3 },
  ls: { zs: 24, zp: 34, zr: 92, planets: 4 },
};

export const GEAR_RATIO = 32.62;

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
