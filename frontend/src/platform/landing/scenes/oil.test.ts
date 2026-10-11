import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import {
  CAPACITY_L,
  DEFAULT_GEAR_CASE,
  dVdh,
  G,
  headFromVolume,
  oilDensityKgM3,
  pressureKpaFromMass,
  pressureKpaFromVolume,
} from "../../../twin/physics";
import {
  OIL_CRITICAL_L,
  OIL_CUTAWAY_SOURCE,
  OIL_FIXED_MASS_KG,
  OIL_GATE_LEVELS_L,
  OIL_MASS_FROM_C,
  OIL_MASS_TO_C,
  OIL_PLOT_TEMPS_C,
  OIL_PLOT_VOLUMES_L,
  OIL_PRESSURE_SOURCE,
  OIL_REFERENCE_L,
  OIL_SENSITIVITY_SOURCE,
  OIL_TABLE_TEMP_C,
  OIL_WARNING_L,
  assertOilPointsTraced,
  buildOilScene,
  oilCurve,
  oilDvdhLPerMm,
  oilGateLabelKey,
  oilHeadM,
  oilMassPressureKpa,
  oilPoint,
  oilPressureKpa,
  oilSensitivityKpaPerL,
} from "./oil";
import { sceneImporterFor } from "../sceneHost";

// Escena de aceite en corte (B07): piscina y sensibilidad desde la física
// importada, con compuerta contra números sin traza.
describe("oil traced levels and temperatures", () => {
  test("derives the gate levels from the imported capacity, never a literal", () => {
    expect(OIL_REFERENCE_L).toBe(CAPACITY_L);
    expect(OIL_REFERENCE_L).toBe(95);
    expect(OIL_WARNING_L).toBe(CAPACITY_L * 0.5);
    expect(OIL_WARNING_L).toBe(47.5);
    expect(OIL_CRITICAL_L).toBe(CAPACITY_L * 0.3);
    expect(OIL_CRITICAL_L).toBe(28.5);
    expect([...OIL_GATE_LEVELS_L].sort((a, b) => a - b)).toEqual([28.5, 47.5, 95]);
  });

  test("uses the annex §2 temperature rows and table temperature", () => {
    expect([...OIL_PLOT_TEMPS_C]).toEqual([40, 60, 80]);
    expect(OIL_TABLE_TEMP_C).toBe(60);
    expect(OIL_FIXED_MASS_KG).toBe(80);
    expect(OIL_MASS_FROM_C).toBe(40);
    expect(OIL_MASS_TO_C).toBe(100);
  });

  test("samples the traced gates plus intermediate curve points", () => {
    expect(OIL_PLOT_VOLUMES_L).toContain(OIL_CRITICAL_L);
    expect(OIL_PLOT_VOLUMES_L).toContain(OIL_WARNING_L);
    expect(OIL_PLOT_VOLUMES_L).toContain(OIL_REFERENCE_L);
    expect(OIL_PLOT_VOLUMES_L.length).toBeGreaterThan(3);
  });

  test("labels every gate level and rejects an unknown one", () => {
    expect(oilGateLabelKey(OIL_REFERENCE_L)).toBe("landing.oil.nominal");
    expect(oilGateLabelKey(OIL_WARNING_L)).toBe("landing.oil.warning");
    expect(oilGateLabelKey(OIL_CRITICAL_L)).toBe("landing.oil.critical");
    expect(() => oilGateLabelKey(63.7)).toThrow();
  });
});

describe("oil sensitivity matches the read-only physics", () => {
  test("wrappers equal the physics functions on every gate and temp", () => {
    for (const volumeL of OIL_GATE_LEVELS_L) {
      expect(oilHeadM(volumeL)).toBe(headFromVolume(volumeL));
      expect(oilDvdhLPerMm(volumeL)).toBe(dVdh(headFromVolume(volumeL)));
      for (const tempC of OIL_PLOT_TEMPS_C) {
        expect(oilPressureKpa(volumeL, tempC)).toBe(pressureKpaFromVolume(volumeL, tempC));
        expect(oilSensitivityKpaPerL(volumeL, tempC)).toBeCloseTo(
          oilDensityKgM3(tempC) * G / 1000 / (dVdh(headFromVolume(volumeL)) * 1000),
          12,
        );
      }
    }
    expect(oilMassPressureKpa(80, 40)).toBe(pressureKpaFromMass(80, 40));
  });

  test("negative: an altered physics import would fail on an off-gate volume", () => {
    // 63.7 L a 22 °C no está en ninguna tabla: solo la física viva lo clava.
    expect(oilPoint(63.7, 22).pressureKpa).toBe(pressureKpaFromVolume(63.7, 22));
    expect(oilPoint(63.7, 22).headM).toBe(headFromVolume(63.7));
    expect(oilPoint(12.4, 95).pressureKpa).toBe(pressureKpaFromVolume(12.4, 95));
  });

  test("reproduces the annex §2 numeric provenance", () => {
    expect(oilHeadM(95)).toBeCloseTo(0.305, 3);
    expect(oilHeadM(47.5)).toBeCloseTo(0.188, 3);
    expect(oilHeadM(28.5)).toBeCloseTo(0.132, 3);
    expect(oilPressureKpa(95, 40)).toBeCloseTo(2.648, 3);
    expect(oilPressureKpa(95, 60)).toBeCloseTo(2.61, 3);
    expect(oilPressureKpa(95, 80)).toBeCloseTo(2.572, 3);
    expect(oilPressureKpa(47.5, 60)).toBeCloseTo(1.607, 3);
    expect(oilPressureKpa(28.5, 60)).toBeCloseTo(1.132, 3);
    expect(oilDvdhLPerMm(95)).toBeCloseTo(0.439, 3);
    expect(oilSensitivityKpaPerL(95, 60)).toBeCloseTo(0.0195, 4);
    expect(oilSensitivityKpaPerL(47.5, 60)).toBeCloseTo(0.0234, 4);
    expect(oilSensitivityKpaPerL(28.5, 60)).toBeCloseTo(0.0271, 4);
    expect(oilMassPressureKpa(80, 40)).toBeCloseTo(2.555, 3);
    expect(oilMassPressureKpa(80, 100)).toBeCloseTo(2.523, 3);
  });

  test("keeps the physics and docs provenance on every source string", () => {
    for (const source of [OIL_PRESSURE_SOURCE, OIL_SENSITIVITY_SOURCE, OIL_CUTAWAY_SOURCE]) {
      expect(source).toContain("frontend/src/twin/physics.ts");
      expect(source).toContain("thesis-annex");
    }
    expect(OIL_PRESSURE_SOURCE).toContain("SYNTHETIC-PROXY");
    expect(OIL_SENSITIVITY_SOURCE).toContain("P13");
    expect(OIL_CUTAWAY_SOURCE).toContain("headFromVolume");
  });
});

describe("oil provenance gate", () => {
  test("passes the computed curve at every traced temperature", () => {
    for (const tempC of OIL_PLOT_TEMPS_C) {
      const points = oilCurve(tempC);
      expect(points.length).toBe(OIL_PLOT_VOLUMES_L.length);
      expect(points.map((point) => point.volumeL)).toEqual([...OIL_PLOT_VOLUMES_L]);
      assertOilPointsTraced(points);
    }
  });

  test("negative: an untraced pressure fails the gate", () => {
    const points = oilCurve(60);
    const fake = points.map((point, index) =>
      index === 0 ? { ...point, pressureKpa: point.pressureKpa + 0.5 } : point,
    );
    expect(() => assertOilPointsTraced(fake)).toThrow();
  });

  test("negative: an untraced head or sensitivity fails the gate", () => {
    const points = oilCurve(60);
    const fakeHead = points.map((point, index) =>
      index === 1 ? { ...point, headM: point.headM + 0.01 } : point,
    );
    expect(() => assertOilPointsTraced(fakeHead)).toThrow();
    const fakeSlope = points.map((point, index) =>
      index === 2 ? { ...point, dpdvKpaPerL: point.dpdvKpaPerL * 2 } : point,
    );
    expect(() => assertOilPointsTraced(fakeSlope)).toThrow();
  });

  test("negative: non-finite inputs throw instead of painting silently", () => {
    expect(() => oilPoint(Number.NaN, 60)).toThrow();
    expect(() => oilCurve(Number.NaN)).toThrow();
    expect(() => buildOilScene(Number.NaN)).toThrow();
  });
});

describe("oil cutaway scene", () => {
  test("builds the annular case with the pool at the traced head", () => {
    const built = buildOilScene(95);
    expect(built.group instanceof THREE.Group).toBe(true);
    expect(built.group.name).toBe("gdy106-oil-cutaway");
    expect(built.group.children.length).toBe(3);
    expect(built.pool instanceof THREE.Mesh).toBe(true);
    expect(built.pool.name).toBe("oil-pool");
    expect(built.headM).toBe(headFromVolume(95));
    expect(built.pool.userData.headM).toBe(headFromVolume(95));
    expect(built.pool.userData.volumeL).toBe(95);
    expect(built.volumeL).toBe(95);
  });

  test("sizes the shell and hub from the imported cavity, never a literal", () => {
    const built = buildOilScene(47.5);
    const shell = built.group.getObjectByName("oil-shell") as THREE.Mesh;
    const hub = built.group.getObjectByName("oil-hub") as THREE.Mesh;
    const shellParams = (shell.geometry as THREE.CylinderGeometry).parameters;
    const hubParams = (hub.geometry as THREE.CylinderGeometry).parameters;
    expect(shellParams.radiusTop).toBe(DEFAULT_GEAR_CASE.rOut);
    expect(shellParams.height).toBe(DEFAULT_GEAR_CASE.length);
    expect(hubParams.radiusTop).toBe(DEFAULT_GEAR_CASE.rIn);
    expect(hubParams.height).toBe(DEFAULT_GEAR_CASE.length);
    expect(built.headM).toBe(headFromVolume(47.5));
  });

  test("clamps the volume to the physical annulus", () => {
    expect(buildOilScene(-5).volumeL).toBe(0);
    expect(buildOilScene(-5).headM).toBe(0);
    expect(buildOilScene(1e6).headM).toBeCloseTo(2 * DEFAULT_GEAR_CASE.rOut, 9);
  });
});

describe("oil deferred chunk", () => {
  test("loads the oil scene module instead of keeping the pending poster", async () => {
    const mod = (await sceneImporterFor("oil")()) as Record<string, unknown>;
    expect(typeof mod["buildOilScene"]).toBe("function");
    expect(typeof mod["oilCurve"]).toBe("function");
    expect(typeof mod["mountOilScene"]).toBe("function");
  });
});
