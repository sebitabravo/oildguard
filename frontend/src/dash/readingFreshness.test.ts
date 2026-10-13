import { describe, expect, test } from "bun:test";
import {
  READING_STALE_AFTER_MS,
  isReadingStale,
  resolveReadingStale,
} from "./readingFreshness";
import { levelValidity } from "../ops/wheel/logic";

// Marca temporal fija: la frescura siempre recibe el "ahora" inyectado,
// nunca el reloj mural dentro del assert (sin pruebas frágiles).
const NOW = Date.parse("2026-10-10T12:00:00.000Z");
// Edades espejo de los fixtures DEMO (demo/demoData.ts, desde demo/demo-data.json): rueda fresca a -8 s,
// rueda "stale" a -180 s, separadas por el corte de 120 s.
const FRESH_AGE_MS = 8_000;
const STALE_AGE_MS = 180_000;

describe("reading freshness cutoff", () => {
  test("matches the device-inventory staleness threshold (120 s, not physics tuning)", () => {
    expect(READING_STALE_AFTER_MS).toBe(120_000);
  });
});

describe("isReadingStale", () => {
  test("treats the DEMO fresh-fixture age (8 s) as fresh", () => {
    expect(isReadingStale(NOW - FRESH_AGE_MS, NOW)).toBe(false);
  });

  test("treats the DEMO stale-fixture age (180 s) as stale", () => {
    expect(isReadingStale(NOW - STALE_AGE_MS, NOW)).toBe(true);
  });

  test("keeps the exact cutoff fresh and stales anything past it", () => {
    expect(isReadingStale(NOW - READING_STALE_AFTER_MS, NOW)).toBe(false);
    expect(isReadingStale(NOW - READING_STALE_AFTER_MS - 1, NOW)).toBe(true);
  });

  test("treats a missing or unparsable timestamp as stale without inventing an age", () => {
    expect(isReadingStale(null, NOW)).toBe(true);
    expect(isReadingStale(undefined, NOW)).toBe(true);
    expect(isReadingStale(Number.NaN, NOW)).toBe(true);
  });

  test("treats a future timestamp as fresh", () => {
    expect(isReadingStale(NOW + 60_000, NOW)).toBe(false);
  });
});

describe("resolveReadingStale production path", () => {
  test("reaches stale for the live wheel with an aged backend timestamp", () => {
    expect(resolveReadingStale({
      live: true,
      demoActive: false,
      lastUpdateMs: NOW - STALE_AGE_MS,
      nowMs: NOW,
    })).toBe(true);
  });

  test("stays fresh for the live wheel with a recent backend timestamp", () => {
    expect(resolveReadingStale({
      live: true,
      demoActive: false,
      lastUpdateMs: NOW - FRESH_AGE_MS,
      nowMs: NOW,
    })).toBe(false);
  });

  test("never flags the demo walk or DEMO wheels against the wall clock", () => {
    expect(resolveReadingStale({
      live: true,
      demoActive: true,
      lastUpdateMs: NOW - STALE_AGE_MS,
      nowMs: NOW,
    })).toBe(false);
    expect(resolveReadingStale({
      live: false,
      demoActive: false,
      lastUpdateMs: NOW - STALE_AGE_MS,
      nowMs: NOW,
    })).toBe(false);
  });

  test("negative: the pre-A02 constant-false path reports valid for aged data", () => {
    const aged = NOW - STALE_AGE_MS;
    expect(isReadingStale(aged, NOW)).toBe(true);
    expect(levelValidity({ moving: false, confidence: 0.9, stale: false })).toBe("valid");
    expect(levelValidity({ moving: false, confidence: 0.9, stale: isReadingStale(aged, NOW) })).toBe("stale");
  });
});
