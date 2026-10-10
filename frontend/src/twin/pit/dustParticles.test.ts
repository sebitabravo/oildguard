import { describe, expect, mock, test } from "bun:test";
import { normalizeDustParameters, shouldAdvanceDust, stepDustFrame, stepDustParticle, stepSceneFrame } from "./dustParticles";

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

  test("production frame gate skips emission and particle updates while paused", () => {
    const emitDust = mock(() => undefined);
    const updateDust = mock(() => undefined);

    stepDustFrame(true, emitDust, updateDust);

    expect(emitDust).not.toHaveBeenCalled();
    expect(updateDust).not.toHaveBeenCalled();
  });

  test("the production pause decision is false only while paused", () => {
    expect(shouldAdvanceDust(true)).toBe(false);
    expect(shouldAdvanceDust(false)).toBe(true);
  });

  test("production frame gate runs emission and particle updates while active", () => {
    const emitDust = mock(() => undefined);
    const updateDust = mock(() => undefined);

    stepDustFrame(false, emitDust, updateDust);

    expect(emitDust).toHaveBeenCalledTimes(1);
    expect(updateDust).toHaveBeenCalledTimes(1);
  });

  test("shared scene pause gate freezes wheel motion and advances it while active", () => {
    let wheelAngle = 0.5;
    const wheelOmega = 2;
    const dt = 0.1;
    const advanceModel = () => {
      wheelAngle += wheelOmega * dt;
    };

    stepSceneFrame(true, advanceModel);
    expect(wheelAngle).toBe(0.5);

    stepSceneFrame(false, advanceModel);
    expect(wheelAngle).toBeCloseTo(0.7);
  });
});
