export interface BenchSensor {
  id: "pressure" | "temperature" | "vibration" | "current";
  item: string;
  identityCue: string;
  color: number;
  cssColor: string;
  position: [number, number, number];
}

const SENSOR_IDENTITY_COLOR = 0x9db0cc;
const SENSOR_IDENTITY_CSS_COLOR = "var(--og-muted)";

// Las anclas geométricas se mantienen aquí; el texto visible vive en el diccionario i18n.
export const BENCH_SENSORS: BenchSensor[] = [
  {
    id: "pressure",
    item: "56",
    identityCue: "56",
    color: SENSOR_IDENTITY_COLOR,
    cssColor: SENSOR_IDENTITY_CSS_COLOR,
    position: [-1.4, 1.28, 0.42],
  },
  {
    id: "temperature",
    item: "41",
    identityCue: "41",
    color: SENSOR_IDENTITY_COLOR,
    cssColor: SENSOR_IDENTITY_CSS_COLOR,
    position: [0.45, 1.4, 0.36],
  },
  {
    id: "vibration",
    item: "39/36",
    identityCue: "39",
    color: SENSOR_IDENTITY_COLOR,
    cssColor: SENSOR_IDENTITY_CSS_COLOR,
    position: [-2.14, 2.3, 0.34],
  },
  {
    id: "current",
    item: "cable",
    identityCue: "A",
    color: SENSOR_IDENTITY_COLOR,
    cssColor: SENSOR_IDENTITY_CSS_COLOR,
    position: [1.0, 2.34, 0.5],
  },
];
