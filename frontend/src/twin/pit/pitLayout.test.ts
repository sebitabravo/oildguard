import { describe, expect, test } from "bun:test";
import { createPitWorld } from "./pitLayout";
import { P } from "./pitSpec";

describe("pit layout", () => {
  test("keeps route and terrain deterministic for a seed", () => {
    const a = createPitWorld({ seed: 41 });
    const b = createPitWorld({ seed: 41 });
    expect(Array.from(a.route.x.slice(0, 32))).toEqual(Array.from(b.route.x.slice(0, 32)));
    expect(a.terrain.heightAt(31, -47)).toBe(b.terrain.heightAt(31, -47));
  });

  test("provides a graded ramp and full bench depth", () => {
    const world = createPitWorld({ seed: 7 });
    const grades = world.ramp.slice(20, -20).map((sample) => Math.abs(sample.grade));
    expect(Math.max(...grades)).toBeCloseTo(P.ramp.grade, 2);
    expect(world.ramp[world.ramp.length - 1]?.h).toBeCloseTo(-P.bench.count * P.bench.height, 1);
    expect(world.route.length).toBeGreaterThan(1000);
  });
});
