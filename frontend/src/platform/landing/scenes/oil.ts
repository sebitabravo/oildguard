import * as THREE from "three";
import type { DictKey } from "../../../i18n";
import {
  CAPACITY_L,
  DEFAULT_GEAR_CASE,
  G,
  dVdh,
  headFromVolume,
  oilDensityKgM3,
  pressureKpaFromMass,
  pressureKpaFromVolume,
  volumeFullL,
  type GearCase,
} from "../../../twin/physics";
import { createStage } from "../../../twin/render/stage";

// Escena de aceite en corte para el landing (B07): la piscina sale de la
// geometría importada y la sensibilidad presión/volumen de la física de solo
// lectura. La cavidad es SUPUESTO P13; ningún número pintado nace de un
// literal: todo valor viene de physics.ts o de docs/thesis-annex.md §2.

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

// Corte de aceite: carcasa anular translúcida (cotas importadas) y piscina
// extruida a la altura h(V); el montaje usa el stage compartido sin tocarlo.
const OIL_SHELL_OPACITY = 0.22;
const OIL_POOL_OPACITY = 0.85;

function oilPoolGeometry(volumeL: number, gc: GearCase): THREE.BufferGeometry {
  const h = headFromVolume(Math.min(volumeFullL(gc), Math.max(0, volumeL)), gc);
  const y = h - gc.rOut;
  const halfChord = Math.sqrt(Math.max(0, gc.rOut * gc.rOut - y * y));
  if (!(halfChord > 0)) return new THREE.BufferGeometry();
  const asin = Math.asin(Math.min(1, Math.max(-1, y / gc.rOut)));
  const shape = new THREE.Shape();
  shape.moveTo(-halfChord, y);
  for (let i = 0; i <= 36; i++) {
    const angle = Math.PI - asin + ((Math.PI + 2 * asin) * i) / 36;
    shape.lineTo(gc.rOut * Math.cos(angle), gc.rOut * Math.sin(angle));
  }
  shape.closePath();
  if (y > -gc.rIn) {
    const hole = new THREE.Path();
    if (y >= gc.rIn) {
      hole.absellipse(0, 0, gc.rIn, gc.rIn, 0, Math.PI * 2, true, 0);
    } else {
      const innerChord = Math.sqrt(Math.max(0, gc.rIn * gc.rIn - y * y));
      const innerAsin = Math.asin(Math.min(1, Math.max(-1, y / gc.rIn)));
      hole.moveTo(-innerChord, y);
      for (let i = 0; i <= 24; i++) {
        const angle = Math.PI - innerAsin + ((Math.PI + 2 * innerAsin) * i) / 24;
        hole.lineTo(gc.rIn * Math.cos(angle), gc.rIn * Math.sin(angle));
      }
      hole.closePath();
    }
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: gc.length, bevelEnabled: false, curveSegments: 24 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-gc.length / 2, 0, 0);
  return geometry;
}

export interface BuiltOilScene {
  readonly group: THREE.Group;
  readonly pool: THREE.Mesh;
  readonly headM: number;
  readonly volumeL: number;
}

export function buildOilScene(volumeL: number = OIL_REFERENCE_L): BuiltOilScene {
  if (!Number.isFinite(volumeL)) throw new Error("Oil scene needs a finite volume");
  const gc = DEFAULT_GEAR_CASE;
  const volume = Math.min(volumeFullL(gc), Math.max(0, volumeL));
  const headM = headFromVolume(volume, gc);
  const group = new THREE.Group();
  group.name = "gdy106-oil-cutaway";

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x5b7ba6,
    metalness: 0.55,
    roughness: 0.42,
    transparent: true,
    opacity: OIL_SHELL_OPACITY,
  });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(gc.rOut, gc.rOut, gc.length, 48, 1, true), shellMat);
  shell.rotation.z = Math.PI / 2;
  shell.name = "oil-shell";
  group.add(shell);

  const hubMat = new THREE.MeshStandardMaterial({ color: 0x6f7886, metalness: 0.85, roughness: 0.4 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(gc.rIn, gc.rIn, gc.length, 32), hubMat);
  hub.rotation.z = Math.PI / 2;
  hub.name = "oil-hub";
  group.add(hub);

  const poolMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.1,
    roughness: 0.35,
    transparent: true,
    opacity: OIL_POOL_OPACITY,
  });
  const pool = new THREE.Mesh(oilPoolGeometry(volume, gc), poolMat);
  pool.name = "oil-pool";
  pool.userData.volumeL = volume;
  pool.userData.headM = headM;
  group.add(pool);

  return { group, pool, headM, volumeL: volume };
}

export function mountOilScene(host: HTMLElement, volumeL: number = OIL_REFERENCE_L): { pause(): void; resume(): void; dispose(): void } {
  host.style.display = "block";
  host.style.position = "relative";
  host.style.width = "100%";
  host.style.minHeight = "320px";
  host.style.aspectRatio = "16 / 9";
  const stage = createStage(host, {
    preset: "studio",
    cameraPosition: [1.9, 1.3, 2.3],
    cameraTarget: [0, 0, 0],
    sun: { shadowBox: 3, target: [0, 0, 0] },
  });
  const built = buildOilScene(volumeL);
  stage.scene.add(built.group);
  stage.renderer.domElement.setAttribute("role", "img");
  stage.renderer.domElement.setAttribute(
    "aria-label",
    "GDY106 oil cutaway: annular gear case with the settling pool at the reference level",
  );
  return {
    pause() {
      stage.pause();
    },
    resume() {
      stage.resume();
    },
    dispose() {
      stage.dispose();
    },
  };
}
