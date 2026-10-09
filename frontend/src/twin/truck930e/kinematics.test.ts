import { describe, expect, test } from "bun:test";
import { ackermann, bodyUpHeight, hoistPose, hoistStageLength, payloadSag, tiltPoint } from "./kinematics";
import { S } from "./spec";

describe("body hoist kinematics", () => {
  test("body-up height at 45 degrees falls in the published 14.0-14.8 m range", () => {
    const h = bodyUpHeight(45);
    expect(h).toBeGreaterThanOrEqual(14.0);
    expect(h).toBeLessThanOrEqual(14.8);
  });

  test("rest height matches the brochure canopy tip", () => {
    expect(bodyUpHeight(0)).toBeCloseTo(S.chassis.overallHeight, 2);
  });

  test("tilt is clamped to 0..45 degrees", () => {
    expect(bodyUpHeight(90)).toBe(bodyUpHeight(45));
    expect(bodyUpHeight(-10)).toBe(bodyUpHeight(0));
  });

  test("the hinge point does not move", () => {
    const [x, y] = tiltPoint(S.body.hingeX, S.body.hingeY, 45);
    expect(x).toBeCloseTo(S.body.hingeX, 6);
    expect(y).toBeCloseTo(S.body.hingeY, 6);
  });

  test("hoist cylinder retracts to about 1.7 m and extends to a 3-stage stroke", () => {
    const retracted = hoistPose(0).length;
    const extended = hoistPose(45).length;
    expect(retracted).toBeGreaterThan(1.5);
    expect(retracted).toBeLessThan(1.9);
    expect(extended - retracted).toBeGreaterThan(3.0);
    expect(extended - retracted).toBeLessThan(4.0);
  });

  test("hoist cylinder grows monotonically with the tilt and rotates toward vertical", () => {
    let prev = hoistPose(0);
    for (let d = 5; d <= 45; d += 5) {
      const p = hoistPose(d);
      expect(p.length).toBeGreaterThan(prev.length);
      prev = p;
    }
  });

  test("three telescoping stages overlap so the sum equals the total length", () => {
    const L = hoistPose(30).length;
    const s = hoistStageLength(L);
    expect(3 * s - 2 * S.hoist.stageOverlap).toBeCloseTo(L, 6);
  });
});

describe("steering and suspension", () => {
  test("Ackermann: inner wheel turns more than the outer, mirrored for right turns", () => {
    const [l, r] = ackermann(0.3);
    expect(l).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(0);
    const [l2, r2] = ackermann(-0.3);
    expect(l2).toBeCloseTo(-r, 9);
    expect(r2).toBeCloseTo(-l, 9);
    expect(ackermann(0)).toEqual([0, 0]);
  });

  test("Ackermann wheels share the turn centre on the rear axle line", () => {
    const [l, r] = ackermann(0.25);
    const L = S.chassis.wheelbase;
    const half = S.chassis.frontTrack / 2;
    const rl = L / Math.tan(l) + half;
    const rr = L / Math.tan(r) - half;
    expect(rl).toBeCloseTo(rr, 6);
  });

  test("payload compresses the struts by a few centimetres", () => {
    expect(payloadSag(0)).toBe(0);
    expect(payloadSag(1)).toBeGreaterThan(0.03);
    expect(payloadSag(1)).toBeLessThan(0.1);
    expect(payloadSag(1)).toBeLessThan(S.suspension.rearStroke);
    expect(payloadSag(2)).toBe(payloadSag(1));
  });
});
