import { describe, expect, test } from "bun:test";
import { HAUL_DURATIONS } from "./cycle";
import { MAX_STEER, dumpTiltDeg, payloadFor, steerFor } from "./motion";

const D = HAUL_DURATIONS.DUMP;

describe("dump tilt profile", () => {
  test("starts and ends flat, peaks at 45 degrees mid-phase", () => {
    expect(dumpTiltDeg(0, D)).toBe(0);
    expect(dumpTiltDeg(D, D)).toBe(0);
    expect(dumpTiltDeg(D * 0.5, D)).toBe(45);
  });

  test("rises monotonically then falls monotonically", () => {
    let prev = 0;
    for (let t = 0; t <= D * 0.4; t += 0.1) {
      const v = dumpTiltDeg(t, D);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    prev = 45;
    for (let t = D * 0.6; t <= D; t += 0.1) {
      const v = dumpTiltDeg(t, D);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("payload per phase", () => {
  test("empty at the start of LOAD, full from the end of LOAD through HAUL", () => {
    expect(payloadFor("LOAD", 0, 6)).toBe(0);
    expect(payloadFor("LOAD", 6, 6)).toBe(1);
    expect(payloadFor("HAUL", 5, 12)).toBe(1);
  });

  test("drains during DUMP and stays empty on WAIT", () => {
    expect(payloadFor("DUMP", 0, D)).toBe(1);
    expect(payloadFor("DUMP", D, D)).toBe(0);
    expect(payloadFor("WAIT", 2, 5)).toBe(0);
  });
});

describe("steering", () => {
  test("straight travel keeps the wheels straight", () => {
    expect(steerFor(0, 12)).toBe(0);
  });

  test("turns toward the yaw direction and clamps at the stop", () => {
    expect(steerFor(0.3, 8)).toBeGreaterThan(0);
    expect(steerFor(-0.3, 8)).toBeLessThan(0);
    expect(steerFor(5, 2)).toBe(MAX_STEER);
  });
});
