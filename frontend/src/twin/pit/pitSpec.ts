import { S, type Provenance } from "../truck930e/spec";

// Parámetros de diseño del foso a cielo abierto para un camión de 290 t.
//
// Cada cifra lleva su procedencia (VERIFIED / DERIVED / ASSUMPTION) y remite a
// docs/research/twin-reference.md §3. Lo que la investigación no pudo verificar
// con una fuente primaria queda rotulado ASSUMPTION; no se presenta como dato de
// campo. Todo en metros, grados o m/s salvo que la unidad diga otra cosa.

export type PitUnit = "m" | "deg" | "ratio" | "kmh" | "m3" | "count" | "t" | "m/s2" | "s";

export interface PitDim {
  value: number;
  unit: PitUnit;
  tag: Provenance;
  source: string;
}

const dim = (value: number, unit: PitUnit, tag: Provenance, source: string): PitDim => ({ value, unit, tag, source });

const IC = "Haul road design guide, IC 8758 (twin-reference §3)";
const SHOVEL = "Komatsu 4100XPC page (twin-reference §3)";

const W = S.chassis.overallWidth;
const BENCH_H = 15;

export const PIT = {
  bench: {
    count: dim(3, "count", "ASSUMPTION", "3 benches keep the scene manageable; real pits are deeper"),
    height: dim(BENCH_H, "m", "ASSUMPTION", `typical 12-15 m for this fleet; shovel cut limit 16.8 m (${SHOVEL})`),
    faceAngle: dim(65, "deg", "ASSUMPTION", "typical bench face angle 60-75 deg; no primary source fetched"),
    catchWidth: dim(0.2 * BENCH_H + 4.5, "m", "DERIVED", "modified Ritchie W = 0.2 H + 4.5 (Call 1986), H = 15 m"),
  },
  road: {
    truckWidth: dim(W, "m", "VERIFIED", "brochure AESS778-02 overall width"),
    laneMultiple: dim(3.5, "ratio", "VERIFIED", `two lanes = 3.5 x vehicle width (${IC} Table 9)`),
    width: dim(3.5 * W, "m", "DERIVED", "3.5 x 8.69 m two-lane running surface"),
    crossSlope: dim(0.03, "ratio", "ASSUMPTION", `${IC}: 2.1-4.2 %; 3 % picked`),
    shoulder: dim(2, "m", "ASSUMPTION", "visual shoulder between running surface and berm"),
  },
  berm: {
    height: dim(1.9, "m", "VERIFIED", `>= rolling radius of the largest tire (${IC} p.29; 30 CFR 56.9300(b) mid-axle)`),
    sideSlope: dim(1.5, "ratio", "VERIFIED", `normal berm side slope 1.5:1 H:V (${IC} p.28)`),
  },
  ramp: {
    grade: dim(0.1, "ratio", "ASSUMPTION", "design 8-10 % (Tannant & Regensburg survey via search snippet); 10 % picked"),
    minRadius: dim(25, "m", "ASSUMPTION", "centreline >= 1.7 x outer-wheel turning radius; no verified number"),
    turningCircle: dim(29.7, "m", "VERIFIED", "SAE turning circle, brochure (OM 30.4 m is a conversion error)"),
    cutSlope: dim(1.7, "ratio", "ASSUMPTION", "dV/dH of the ramp cut in rock (about 60 deg)"),
    fillSlope: dim(0.75, "ratio", "ASSUMPTION", "dV/dH of compacted road fill (about 37 deg)"),
  },
  // Velocidades de acarreo. Las derivadas salen de P = eta x 2495 kW, RR 2 %.
  speed: {
    loadedUphill: dim(12.5, "kmh", "DERIVED", "10 % grade, RR 2 %: 12-13 km/h (twin-reference §3)"),
    emptyUphill: dim(29, "kmh", "DERIVED", "10 % grade, RR 2 %: 28-30 km/h (twin-reference §3)"),
    loadedFlat: dim(40, "kmh", "ASSUMPTION", "site speed limit on flat haul roads; truck max is 64.5 km/h"),
    emptyFlat: dim(50, "kmh", "ASSUMPTION", "site speed limit on flat haul roads"),
    emptyDownhill: dim(25, "kmh", "ASSUMPTION", "retarding-limited, conservative for a 10 % ramp"),
    reverse: dim(8, "kmh", "ASSUMPTION", "backing into the dump pocket"),
    spot: dim(5, "kmh", "ASSUMPTION", "final approach to the shovel"),
    lateralAccel: dim(0.8, "m/s2", "ASSUMPTION", "comfort limit used to cap curve speed"),
    accel: dim(0.7, "m/s2", "ASSUMPTION", "mean traction-limited acceleration, loaded"),
    brake: dim(1.4, "m/s2", "ASSUMPTION", "service deceleration used for queueing"),
  },
  shovel: {
    reach: dim(23.9, "m", "VERIFIED", `radius of cut, P&H 4100XPC (${SHOVEL})`),
    dumpHeight: dim(9.5, "m", "VERIFIED", `dumping height (${SHOVEL}); body loading height is 7.06 m`),
    cutHeight: dim(16.8, "m", "VERIFIED", `height of cut (${SHOVEL})`),
    dipperPayload: dim(96.8, "t", "DERIVED", "290.3 t rated payload / 3 passes (nominal 99.8-108.9 t)"),
    passes: dim(3, "count", "DERIVED", "290.3 t / 108.9 t = 2.67 -> 3 passes (AC-90 variant: 4)"),
    passSeconds: dim(28, "s", "ASSUMPTION", "swing-dig-swing-dump cycle, seconds per pass"),
  },
  crusher: {
    pocketWidth: dim(11.4, "m", "ASSUMPTION", "1.4 x body interior width 8.15 m; no primary source for 290 t"),
    clearHeight: dim(15, "m", "DERIVED", "body-up 14.02 m + margin"),
    wheelStopHeight: dim(1.9, "m", "VERIFIED", "wheel-stop berm >= tire radius (MSHA rule)"),
    pocketVolume: dim(380, "m3", "ASSUMPTION", "1.5-2 truckloads of 211 m3 heaped"),
    tailOverlap: dim(0.9, "m", "ASSUMPTION", "body tail over the pocket lip at the dump spot"),
  },
} as const;

type Groups = typeof PIT;
type ValueMap = { [G in keyof Groups]: { [K in keyof Groups[G]]: number } };

function valuesOf(spec: Groups): ValueMap {
  const out: Record<string, Record<string, number>> = {};
  for (const [g, fields] of Object.entries(spec)) {
    out[g] = {};
    for (const [k, d] of Object.entries(fields as Record<string, PitDim>)) out[g][k] = d.value;
  }
  return out as unknown as ValueMap;
}

/** Valores planos: `P.bench.height` -> 15. */
export const P: ValueMap = valuesOf(PIT);

export interface PitSpecRow extends PitDim {
  group: string;
  name: string;
}

export function pitSpecRows(): PitSpecRow[] {
  const rows: PitSpecRow[] = [];
  for (const [group, fields] of Object.entries(PIT)) {
    for (const [name, d] of Object.entries(fields as Record<string, PitDim>)) rows.push({ group, name, ...d });
  }
  return rows;
}

const RAD = Math.PI / 180;

/** Pendiente de rampa (m/m) a inclinación del chasis en grados. */
export const gradeToPitchDeg = (grade: number): number => Math.atan(grade) / RAD;

/** Largo de rampa (m) para salvar `depth` m a pendiente `grade`, medido a lo largo del plano. */
export const rampLengthM = (depth: number, grade: number): number => depth / grade;

/** Profundidad total del foso: bancos x altura. */
export const pitDepthM = (): number => P.bench.count * P.bench.height;

/** Avance horizontal de un banco: cara inclinada + banco de captura. */
export const benchRunM = (): number => P.bench.height / Math.tan(P.bench.faceAngle * RAD) + P.bench.catchWidth;

/** Base del bermellón con talud 1.5:1 por lado (m). */
export const bermBaseM = (): number => 2 * P.berm.height * P.berm.sideSlope;

/** Velocidad (km/h) a m/s. */
export const kmhToMps = (kmh: number): number => kmh / 3.6;
export const mpsToKmh = (mps: number): number => mps * 3.6;
