import { describe, expect, test } from "bun:test";
import fixture from "../../../tests/fixtures/physics_parity.json";
import {
  DEFAULT_GEAR_CASE,
  GDY106_TRAIN,
  dVdh,
  headFromVolume,
  pressureKpaFromMass,
  pressureKpaFromVolume,
  stageSpeeds,
  trainRatio,
  volumeFromHead,
  volumeFromPressureKpa,
  volumeFullL,
} from "./physics";

const gc = DEFAULT_GEAR_CASE;

describe("gear case defaults mirror python", () => {
  test("same parameters as the fixture", () => {
    expect(gc.rOut).toBe(fixture.gear_case.r_out);
    expect(gc.rIn).toBe(fixture.gear_case.r_in);
    expect(gc.length).toBe(fixture.gear_case.length);
  });
});

describe("geometry", () => {
  test("zero volume gives zero head and full annulus gives the outer diameter", () => {
    expect(headFromVolume(0)).toBe(0);
    expect(headFromVolume(volumeFullL())).toBeCloseTo(2 * gc.rOut, 9);
  });

  test("round trip volume -> head -> volume within 1e-6 L", () => {
    for (let v = 0; v <= 95; v += 0.5) {
      expect(Math.abs(volumeFromHead(headFromVolume(v)) - v)).toBeLessThan(1e-6);
    }
  });

  test("95 L head is decimetres", () => {
    const h = headFromVolume(95);
    expect(h).toBeGreaterThan(0.15);
    expect(h).toBeLessThan(0.5);
  });
});

describe("python parity", () => {
  test("head from volume", () => {
    for (const r of fixture.heads) expect(headFromVolume(r.volume_l)).toBeCloseTo(r.head_m, 7);
  });

  test("volume and sensitivity from head", () => {
    for (const r of fixture.volumes) {
      expect(volumeFromHead(r.head_m)).toBeCloseTo(r.volume_l, 7);
      expect(dVdh(r.head_m)).toBeCloseTo(r.dv_dh_l_per_mm, 9);
    }
  });

  test("pressure from volume and its inverse", () => {
    for (const r of fixture.pressures) {
      expect(pressureKpaFromVolume(r.volume_l, r.temp_c)).toBeCloseTo(r.pressure_kpa, 7);
      expect(volumeFromPressureKpa(r.pressure_kpa, r.temp_c)).toBeCloseTo(r.volume_back_l, 6);
    }
  });

  test("pressure from fixed mass", () => {
    for (const r of fixture.mass_pressures) {
      expect(pressureKpaFromMass(r.mass_kg, r.temp_c)).toBeCloseTo(r.pressure_kpa, 7);
    }
  });

  test("gear train teeth, ratio and stage speeds", () => {
    expect(GDY106_TRAIN.hs).toEqual(fixture.train.hs);
    expect(GDY106_TRAIN.ls).toEqual(fixture.train.ls);
    expect(trainRatio()).toBeCloseTo(fixture.train.ratio, 9);
    for (const r of fixture.speeds) {
      const s = stageSpeeds(r.rotor_rpm);
      expect(s.hsCarrierRpm).toBeCloseTo(r.hs_carrier_rpm, 9);
      expect(s.wheelRpm).toBeCloseTo(r.wheel_rpm, 9);
      expect(s.hsPlanetRelRpm).toBeCloseTo(r.hs_planet_rel_rpm, 9);
      expect(s.lsPlanetRelRpm).toBeCloseTo(r.ls_planet_rel_rpm, 9);
    }
  });

  test("3000 rpm rotor gives about 92 wheel rpm", () => {
    expect(stageSpeeds(3000).wheelRpm).toBeGreaterThan(91);
    expect(stageSpeeds(3000).wheelRpm).toBeLessThan(93);
  });
});
