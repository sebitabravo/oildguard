import { describe, expect, test } from "bun:test";
import { benchLevelAt } from "./buildPit";
import { P, benchRunM, pitDepthM } from "./pitSpec";

describe("pit build helpers", () => {
  test("exposes theoretical bench levels without constructing Three.js geometry", () => {
    expect(benchLevelAt(0)).toBe(0);
    expect(benchLevelAt(benchRunM())).toBeCloseTo(-P.bench.height, 4);
    expect(benchLevelAt(P.bench.count * benchRunM())).toBe(-pitDepthM());
  });
});
