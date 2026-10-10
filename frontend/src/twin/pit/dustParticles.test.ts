import { describe, expect, test } from "bun:test";
import { normalizeDustParameters, shouldAdvanceDust, stepDustParticle } from "./dustParticles";

describe("dust particle logic", () => {
  test("clamps emitter and frame parameters to the simulation bounds", () => {
    expect(normalizeDustParameters(700, -4, -2, -0.5)).toEqual({
      capacity: 700,
      count: 0,
      strength: 0,
      dt: 0,
    });
    expect(normalizeDustParameters(4, 9.8, 2, 0.5)).toEqual({
      capacity: 4,
      count: 4,
      strength: 1,
      dt: 0.1,
    });
    expect(normalizeDustParameters(0, 2, 0.5, Number.NaN).capacity).toBe(1);
  });

  test("fades particles in and out, then marks expired particles invisible", () => {
    const initial = stepDustParticle(0, 4, 0.8, 0);
    expect(initial).toEqual({ age: 0, size: 4, alpha: 0 });

    const visible = stepDustParticle(0.5, 4, 0.8, 0.1);
    expect(visible.age).toBeCloseTo(0.6);
    expect(visible.size).toBeGreaterThan(4);
    expect(visible.alpha).toBeGreaterThan(0);

    expect(stepDustParticle(4, 4, 0.8, 0.1).alpha).toBe(0);
    expect(stepDustParticle(5, 4, 0.8, 0.1).alpha).toBe(0);
  });

  test("pause gating freezes particle age and suppresses new dust without changing active frames", () => {
    const dt = 0.05;
    const initialAge = 0.5;
    const speedMps = 10;
    const runFrame = (paused: boolean) => {
      let age = initialAge;
      let emissions = 0;
      if (shouldAdvanceDust(paused)) {
        if (speedMps > 2) emissions = Math.max(1, Math.floor(dt * 7));
        age = stepDustParticle(age, 4, 0.8, dt).age;
      }
      return { age, emissions };
    };

    expect(runFrame(true)).toEqual({ age: initialAge, emissions: 0 });
    expect(runFrame(false)).toEqual({ age: 0.55, emissions: 1 });
  });
});
