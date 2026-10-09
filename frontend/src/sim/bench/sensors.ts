export interface BenchSensor {
  id: "pressure" | "temperature" | "vibration" | "current";
  item: string;
  color: number;
  cssColor: string;
  position: [number, number, number];
}

// Las anclas geométricas se mantienen aquí; el texto visible vive en el diccionario i18n.
export const BENCH_SENSORS: BenchSensor[] = [
  {
    id: "pressure",
    item: "56",
    color: 0xff3b30,
    cssColor: "#ff3b30",
    position: [-1.4, 1.28, 0.42],
  },
  {
    id: "temperature",
    item: "41",
    color: 0xff9f0a,
    cssColor: "#ff9f0a",
    position: [0.45, 1.4, 0.36],
  },
  {
    id: "vibration",
    item: "39/36",
    color: 0x22d3ee,
    cssColor: "#22d3ee",
    position: [-2.14, 2.3, 0.34],
  },
  {
    id: "current",
    item: "cable",
    color: 0xa78bfa,
    cssColor: "#a78bfa",
    position: [1.0, 2.34, 0.5],
  },
];
