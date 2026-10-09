import { describe, expect, test } from "bun:test";
import { S } from "../truck930e/spec";
import {
  P,
  PIT,
  benchRunM,
  bermBaseM,
  gradeToPitchDeg,
  kmhToMps,
  mpsToKmh,
  pitDepthM,
  pitSpecRows,
  rampLengthM,
} from "./pitSpec";

describe("pit spec: safety rules", () => {
  test("the safety berm is at least the rolling radius of the largest tire", () => {
    expect(P.berm.height).toBeGreaterThanOrEqual(S.tire.freeRadius);
    expect(P.berm.height).toBeGreaterThanOrEqual(S.tire.staticLoadedRadius);
  });

  test("the berm base follows the 1.5:1 side slope (about 5.7 m for 1.9 m)", () => {
    expect(bermBaseM()).toBeCloseTo(5.7, 1);
  });

  test("a two-lane road is at least 3.5 times the widest vehicle", () => {
    expect(P.road.width).toBeGreaterThanOrEqual(3.5 * S.chassis.overallWidth - 1e-9);
    expect(P.road.width).toBeCloseTo(30.4, 1);
  });

  test("the curve radius clears the turning circle of the truck", () => {
    expect(P.ramp.minRadius).toBeGreaterThanOrEqual(P.ramp.turningCircle / 2);
    expect(P.ramp.minRadius).toBeGreaterThanOrEqual(1.7 * (P.ramp.turningCircle / 2) - 1);
  });

  test("the dump pocket is wider than the body and clears the raised body", () => {
    expect(P.crusher.pocketWidth).toBeGreaterThan(S.body.interiorWidth);
    expect(P.crusher.clearHeight).toBeGreaterThan(S.chassis.bodyUpHeight);
    expect(P.crusher.wheelStopHeight).toBeGreaterThanOrEqual(S.tire.freeRadius);
  });
});

describe("pit spec: geometry", () => {
  test("grade converts to a chassis pitch angle: 10 % is 5.71 degrees", () => {
    expect(gradeToPitchDeg(0.1)).toBeCloseTo(5.71, 2);
    expect(gradeToPitchDeg(0)).toBe(0);
    expect(gradeToPitchDeg(P.ramp.grade)).toBeGreaterThan(2);
  });

  test("ramp length follows from depth and grade", () => {
    expect(rampLengthM(45, 0.1)).toBeCloseTo(450, 6);
    expect(rampLengthM(pitDepthM(), P.ramp.grade)).toBeCloseTo(450, 6);
    expect(rampLengthM(60, 0.08)).toBeCloseTo(750, 6);
  });

  test("bench run is the face projection plus the catch bench (modified Ritchie)", () => {
    expect(P.bench.catchWidth).toBeCloseTo(0.2 * P.bench.height + 4.5, 6);
    const face = P.bench.height / Math.tan((P.bench.faceAngle * Math.PI) / 180);
    expect(benchRunM()).toBeCloseTo(face + P.bench.catchWidth, 6);
    expect(pitDepthM()).toBe(P.bench.count * P.bench.height);
  });

  test("the bench height stays within the shovel cutting height", () => {
    expect(P.bench.height).toBeLessThanOrEqual(P.shovel.cutHeight);
    // Pila + 7.06 m de la tolva quedan bajo la altura de descarga del cucharón.
    expect(S.body.loadingHeight).toBeLessThan(P.shovel.dumpHeight);
  });

  test("shovel passes follow from payload: 290.3 t over the dipper payload", () => {
    expect(P.shovel.passes * P.shovel.dipperPayload).toBeGreaterThan(285);
    expect(P.shovel.passes * P.shovel.dipperPayload).toBeLessThan(295);
  });
});

describe("pit spec: speeds and provenance", () => {
  test("speed ordering: loaded uphill < empty uphill < flat limits", () => {
    expect(P.speed.loadedUphill).toBeLessThan(P.speed.emptyUphill);
    expect(P.speed.emptyUphill).toBeLessThan(P.speed.loadedFlat);
    expect(P.speed.loadedFlat).toBeLessThan(P.speed.emptyFlat);
    expect(P.speed.emptyFlat).toBeLessThanOrEqual(64.5);
  });

  test("km/h <-> m/s conversions round-trip", () => {
    expect(mpsToKmh(kmhToMps(36))).toBeCloseTo(36, 9);
    expect(kmhToMps(36)).toBeCloseTo(10, 9);
  });

  test("every parameter carries a provenance tag and a source", () => {
    const rows = pitSpecRows();
    expect(rows.length).toBeGreaterThan(30);
    for (const r of rows) {
      expect(["VERIFIED", "DERIVED", "ASSUMPTION"].includes(r.tag)).toBe(true);
      expect(r.source.length).toBeGreaterThan(5);
    }
    expect(PIT.bench.faceAngle.tag).toBe("ASSUMPTION");
    expect(PIT.berm.height.tag).toBe("VERIFIED");
  });
});
