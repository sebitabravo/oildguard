import type { DictKey } from "../../../i18n";

// Cuatro selectores de sensores del landing (B05): solo la identidad de
// punto de servicio trazada a B01; los montajes siguen como insumo de diseño.
export const LANDING_SENSOR_IDS = ["pressure", "temperature", "vibration", "current"] as const;

export type LandingSensorId = (typeof LANDING_SENSOR_IDS)[number];

export type LandingSensorProvenance = "TRACED";

export interface LandingSensor {
  readonly id: LandingSensorId;
  readonly item: string;
  readonly titleKey: DictKey;
  readonly serviceKey: DictKey;
  readonly detailKey: DictKey | null;
  readonly rotatingOutput: boolean;
  readonly serviceProvenance: LandingSensorProvenance;
}

export const LANDING_SENSORS: readonly LandingSensor[] = [
  {
    id: "pressure",
    item: "56",
    titleKey: "landing.sensors.pressure.title",
    serviceKey: "landing.sensors.pressure.service",
    detailKey: "landing.sensors.procedure56",
    rotatingOutput: true,
    serviceProvenance: "TRACED",
  },
  {
    id: "temperature",
    item: "41",
    titleKey: "landing.sensors.temperature.title",
    serviceKey: "landing.sensors.temperature.service",
    detailKey: "landing.sensors.procedure41",
    rotatingOutput: true,
    serviceProvenance: "TRACED",
  },
  {
    id: "vibration",
    item: "39/36",
    titleKey: "landing.sensors.vibration.title",
    serviceKey: "landing.sensors.vibration.service",
    detailKey: "landing.sensors.ductNote",
    rotatingOutput: true,
    serviceProvenance: "TRACED",
  },
  {
    id: "current",
    item: "cable",
    titleKey: "landing.sensors.current.title",
    serviceKey: "landing.sensors.current.service",
    detailKey: null,
    rotatingOutput: false,
    serviceProvenance: "TRACED",
  },
];

// Huésped de anclaje declarado: si los marcadores se montan en 3D, viven en
// el corte del conjunto, no en una escena propia con coordenadas inventadas.
export const SENSOR_ANCHOR_HOST = "frontend/src/platform/landing/scenes/assembly.ts" as const;

// Trazabilidad B01 §1: puntos de servicio 56/41/39/cable y corrección de
// salida giratoria; las anclas BENCH_SENSORS quedan como escena, sin medida.
export const LANDING_SENSORS_SOURCE =
  "Service points traced in docs/research/landing-claims.md §1 from " +
  "docs/thesis-annex.md:51-55 (T10 rotating-output correction) and :207-212 " +
  "(Fig.95 items 56/41/39/cable); procedures docs/inspection.md:20-25; " +
  "BENCH_SENSORS anchors are scene-only, UNPROVEN as physical mounts.";

export function isLandingSensorId(value: string): value is LandingSensorId {
  return (LANDING_SENSOR_IDS as readonly string[]).includes(value);
}

export function sensorById(id: string): LandingSensor {
  const sensor = LANDING_SENSORS.find((entry) => entry.id === id);
  if (!sensor) throw new Error(`Unknown landing sensor: ${String(id)}`);
  return sensor;
}

export function assertSensorsComplete(ids: readonly string[]): void {
  const missing = LANDING_SENSOR_IDS.filter((id) => !ids.includes(id));
  if (missing.length > 0) throw new Error(`Landing sensors are missing: ${missing.join(", ")}`);
}

export interface SensorSelection {
  getSelected(): LandingSensorId;
  select(id: LandingSensorId): void;
}

export function createSensorSelection(initial: LandingSensorId = "pressure"): SensorSelection {
  let selected = sensorById(initial).id;
  return {
    getSelected: () => selected,
    select(id) {
      selected = sensorById(id).id;
    },
  };
}
