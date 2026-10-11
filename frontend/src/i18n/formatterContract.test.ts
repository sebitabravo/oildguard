import { describe, expect, test } from "bun:test";
import { dict, dictKeys, t, type DictKey, type DictParams } from "./index";

const exampleValues: Readonly<Record<string, string | number>> = {
  trucks: 5,
  queued: 0,
  truck: "OG-03",
  state: "Hauling",
  cycle: 2,
  oil: "66.5 L · 70%",
  mode: "MOVING",
  seed: 7,
  length: 15.6,
  width: 8.69,
  height: 7.37,
  bodyUp: 14.02,
  brochureLength: 15.6,
  brochureWidth: 8.69,
  brochureHeight: 7.37,
  brochureBodyUp: 14.02,
  empty: 237000,
  emptyFront: 92000,
  emptyRear: 145000,
  loaded: 527000,
  loadedFront: 154000,
  loadedRear: 373000,
  payload: 290000,
  volume: 211,
  max: 527,
  overload: 1.2,
  gridSeconds: 0.7,
  frontRatio: 12.92,
  rearRatio: 9.4,
  angle: 6.5,
  milliseconds: 3000,
  value: "1.80",
  litres: "66.5",
  percent: 70,
  label: "degraded",
  highSpeed: 1.2,
  lowSpeed: 1.3,
  overall: 1.56,
  number: 1,
  model: "synthetic-proxy",
  qualifier: "UNPROVEN until calibration",
  labNote: "demo rate",
  leakRate: 128.5,
  rateMultiplier: 257,
  specRate: 0.5,
  lossLiters: 4,
  durationSeconds: 120,
  url: "http://localhost:8000",
  message: "backend unavailable",
  rows: 0,
  influx: "unknown (no ingest yet)",
  count: 0,
  hours: 1.2,
  cycles: 5,
  shifts: 0.25,
  confidence: "0.90",
  slope: -0.5,
  r2: 0.8,
  level: 80,
  points: 300,
  pressure: 2.6,
  liters: 47.5,
  window: 2,
  zone: "Dumping",
  windows: "0+1",
  votes: 2,
  warning_hours: 1.2,
  shift_hours: 8,
  from_l: 94.7,
  to_l: 88.6,
  threshold_l: 5,
  level_pct: 28.4,
  critical_pct: 30,
  z: -10.2,
  kurtosis: 5.8,
  sigma_l: 2.1,
  max_sigma_l: 2,
  slope_l_per_h: -0.5,
  minimum_r2: 0.3,
  minimum: 10,
};

function placeholderNames(copy: string): string[] {
  return [...new Set([...copy.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map((match) => match[1]))].sort();
}

function exampleParams(key: DictKey): { params: DictParams; missing: string[] } {
  const names = placeholderNames(dict[key]);
  const missing = names.filter((name) => !Object.prototype.hasOwnProperty.call(exampleValues, name));
  const params = Object.fromEntries(names.map((name) => [name, exampleValues[name]])) as DictParams;
  return { params, missing };
}

describe("dictionary formatter contract", () => {
  test("example parameters render every dictionary value without placeholders", () => {
    const unresolved: string[] = [];

    for (const key of dictKeys()) {
      const { params, missing } = exampleParams(key);
      unresolved.push(...missing.map((name) => `${key}: no example value for {${name}}`));
      if (placeholderNames(dict[key]).length === 0) continue;

      if (/\{[A-Za-z][A-Za-z0-9_]*\}/.test(t(key, params))) {
        unresolved.push(`${key}: ${t(key, params)}`);
      }
    }

    expect(unresolved).toEqual([]);
  });
});
