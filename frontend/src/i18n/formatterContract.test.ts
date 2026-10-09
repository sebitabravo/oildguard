import { describe, expect, test } from "bun:test";
import { dict, dictKeys, t, type DictKey, type DictParams } from "./index";

const exampleValues: Readonly<Record<string, string | number>> = {
  trucks: 5,
  queued: 0,
  seed: 7,
  length: 15.6,
  width: 8.69,
  height: 7.37,
  bodyUp: 14.02,
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
  milliseconds: 3000,
  value: "1.80",
  label: "degraded",
  highSpeed: 1.2,
  lowSpeed: 1.3,
  overall: 1.56,
  number: 1,
  model: "synthetic-proxy",
  qualifier: "UNPROVEN until calibration",
  labNote: "demo rate",
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
};

function placeholderNames(copy: string): string[] {
  return [...new Set([...copy.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map((match) => match[1]))].sort();
}

function exampleParams(key: DictKey): { params: DictParams; missing: string[] } {
  const names = placeholderNames(dict[key].en);
  const missing = names.filter((name) => !Object.prototype.hasOwnProperty.call(exampleValues, name));
  const params = Object.fromEntries(names.map((name) => [name, exampleValues[name]])) as DictParams;
  return { params, missing };
}

describe("dictionary formatter contract", () => {
  test("each English and Spanish translation uses the same placeholder names", () => {
    const mismatches = dictKeys().flatMap((key) => {
      const english = placeholderNames(dict[key].en);
      const spanish = placeholderNames(dict[key].es);
      return JSON.stringify(english) === JSON.stringify(spanish) ? [] : [`${key}: EN ${english}; ES ${spanish}`];
    });

    expect(mismatches).toEqual([]);
  });

  test("example parameters render every translated dictionary value without placeholders", () => {
    const unresolved: string[] = [];

    for (const key of dictKeys()) {
      const { params, missing } = exampleParams(key);
      unresolved.push(...missing.map((name) => `${key}: no example value for {${name}}`));
      if (placeholderNames(dict[key].en).length === 0) continue;

      for (const lang of ["en", "es"] as const) {
        if (/\{[A-Za-z][A-Za-z0-9_]*\}/.test(t(key, lang, params))) {
          unresolved.push(`${key} (${lang}): ${t(key, lang, params)}`);
        }
      }
    }

    expect(unresolved).toEqual([]);
  });
});
