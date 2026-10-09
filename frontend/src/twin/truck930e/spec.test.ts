import { describe, expect, test } from "bun:test";
import { stageSpeeds } from "../physics";
import { S, SPEC, specRows, tireCircumference, wheelRpmAtKmh } from "./spec";

describe("930E-4SE spec provenance", () => {
  test("every field carries a tag, a unit and a source", () => {
    const rows = specRows();
    expect(rows.length).toBeGreaterThan(60);
    for (const r of rows) {
      expect(["VERIFIED", "DERIVED", "ASSUMPTION"].includes(r.tag)).toBe(true);
      expect(r.unit.length).toBeGreaterThan(0);
      expect(r.source.trim().length).toBeGreaterThan(5);
      expect(Number.isFinite(r.value)).toBe(true);
    }
  });

  test("field names are unique within their group and the three tags all appear", () => {
    const rows = specRows();
    const keys = new Set(rows.map((r) => `${r.group}.${r.name}`));
    expect(keys.size).toBe(rows.length);
    for (const tag of ["VERIFIED", "DERIVED", "ASSUMPTION"]) {
      expect(rows.some((r) => r.tag === tag)).toBe(true);
    }
  });

  test("brochure chassis dimensions match the published values", () => {
    expect(S.chassis.wheelbase).toBe(6.35);
    expect(S.chassis.frontTrack).toBe(6.15);
    expect(S.chassis.rearTrack).toBe(5.36);
    expect(S.body.interiorWidth).toBe(8.15);
    expect(S.body.interiorDepth).toBe(3.2);
    expect(S.body.loadingHeight).toBe(7.06);
    expect(S.body.dumpAngle).toBe(45);
    expect(SPEC.chassis.wheelbase.tag).toBe("VERIFIED");
  });

  test("course envelope is kept as a labelled alternative, not mixed with the brochure", () => {
    expect(S.envelopeCourse.length).toBe(15.29);
    expect(S.envelopeCourse.width).toBe(8.89);
    expect(S.envelopeCourse.height).toBe(8.1);
    expect(S.envelopeCourse.bodyUp).toBe(14.8);
    expect(S.chassis.overallLength).toBe(15.6);
    expect(SPEC.envelopeCourse.length.source.includes("alternative")).toBe(true);
  });
});

describe("derived quantities", () => {
  test("tire OD sits in the 3.75-3.84 m range and the rim is 63 in", () => {
    expect(S.tire.overallDiameter).toBeGreaterThanOrEqual(3.75);
    expect(S.tire.overallDiameter).toBeLessThanOrEqual(3.84);
    expect(S.tire.rimDiameter).toBeCloseTo(63 * 0.0254, 1);
  });

  test("rolling circumference is consistent with the free radius", () => {
    expect(tireCircumference()).toBeGreaterThan(11.0);
    expect(tireCircumference()).toBeLessThan(11.9);
    expect(S.tire.rollingRadius / S.tire.freeRadius).toBeGreaterThan(0.95);
    expect(S.tire.rollingRadius / S.tire.freeRadius).toBeLessThan(1.0);
  });

  test("wheel RPM at 64.5 km/h matches the GDY106 chain at 3000 rotor RPM", () => {
    const fromTrain = stageSpeeds(3000).wheelRpm;
    expect(Math.abs(wheelRpmAtKmh(64.5) - fromTrain) / fromTrain).toBeLessThan(0.02);
    expect(wheelRpmAtKmh(64.5)).toBeGreaterThan(88);
    expect(wheelRpmAtKmh(64.5)).toBeLessThan(96);
  });

  test("dual tire spacing reproduces the width over duals and the inner gap", () => {
    const overDuals = S.chassis.rearTrack + S.tire.dualSpacing + S.tire.sectionWidthRear;
    expect(Math.abs(overDuals - S.chassis.widthOverRearTires)).toBeLessThan(0.1);
    const innerGap = S.chassis.rearTrack - S.tire.dualSpacing - S.tire.sectionWidthRear;
    expect(Math.abs(innerGap - S.chassis.rearInnerGap)).toBeLessThan(0.1);
  });

  test("front track minus the tire width gives the brochure clear gap", () => {
    expect(Math.abs(S.chassis.frontTrack - S.tire.sectionWidthFront - 4.78)).toBeLessThan(0.02);
  });

  test("overhangs and wheelbase add up to the brochure overall length", () => {
    const total = S.chassis.rearOverhang + S.chassis.wheelbase + S.chassis.frontOverhang;
    expect(Math.abs(total - S.chassis.overallLength)).toBeLessThan(0.05);
  });

  test("axle height stays below the free radius by the visual sag only", () => {
    expect(S.tire.axleHeight).toBeCloseTo(S.tire.freeRadius - S.tire.visualSag, 3);
    expect(S.tire.staticLoadedRadius).toBeLessThan(S.tire.axleHeight);
  });
});
