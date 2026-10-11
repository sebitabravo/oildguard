import { describe, expect, test } from "bun:test";
import {
  LANDING_SENSOR_IDS,
  LANDING_SENSORS,
  LANDING_SENSORS_SOURCE,
  SENSOR_ANCHOR_HOST,
  assertSensorsComplete,
  createSensorSelection,
  isLandingSensorId,
  sensorById,
  type LandingSensorId,
} from "./sensors";

// Cuatro selectores del landing (B05): la tabla trazada manda, sin montajes inventados.
const EXPECTED_IDS: readonly LandingSensorId[] = ["pressure", "temperature", "vibration", "current"];

const EXPECTED_ITEMS: Record<LandingSensorId, string> = {
  pressure: "56",
  temperature: "41",
  vibration: "39/36",
  current: "cable",
};

describe("landing sensors source table", () => {
  test("exposes exactly the four B01-traced sensors", () => {
    expect([...LANDING_SENSOR_IDS].sort()).toEqual([...EXPECTED_IDS].sort());
    expect(LANDING_SENSORS.length).toBe(4);
    expect(new Set(LANDING_SENSOR_IDS).size).toBe(4);
    assertSensorsComplete([...LANDING_SENSOR_IDS]);
  });

  test("matches the B01 service-point items 56/41/39-cable", () => {
    for (const sensor of LANDING_SENSORS) {
      expect(sensor.item).toBe(EXPECTED_ITEMS[sensor.id]);
    }
    expect(sensorById("pressure").item).toBe("56");
    expect(sensorById("temperature").item).toBe("41");
    expect(sensorById("vibration").item).toBe("39/36");
    expect(sensorById("current").item).toBe("cable");
  });

  test("declares assembly.ts as the anchor host for mount markers", () => {
    expect(SENSOR_ANCHOR_HOST).toContain("scenes/assembly.ts");
    expect(SENSOR_ANCHOR_HOST).toBe("frontend/src/platform/landing/scenes/assembly.ts");
  });

  test("keeps the rotating-output correction with no stationary mount claim", () => {
    expect(sensorById("pressure").rotatingOutput).toBe(true);
    expect(sensorById("temperature").rotatingOutput).toBe(true);
    expect(sensorById("vibration").rotatingOutput).toBe(true);
    expect(sensorById("current").rotatingOutput).toBe(false);
    expect(LANDING_SENSORS_SOURCE).toContain("landing-claims");
    expect(LANDING_SENSORS_SOURCE).toContain("rotating");
    // La fuente nunca presenta las anclas como montajes físicos medidos.
    expect(LANDING_SENSORS_SOURCE).toContain("UNPROVEN");
  });

  test("every sensor carries dict keys and traced provenance", () => {
    for (const sensor of LANDING_SENSORS) {
      expect(sensor.titleKey.length).toBeGreaterThan(0);
      expect(sensor.serviceKey.length).toBeGreaterThan(0);
      expect(sensor.serviceProvenance).toBe("TRACED");
      expect(isLandingSensorId(sensor.id)).toBe(true);
    }
    expect(isLandingSensorId("turbo")).toBe(false);
  });

  test("selection opens the requested sensor", () => {
    const selection = createSensorSelection("pressure");
    expect(selection.getSelected()).toBe("pressure");
    for (const id of EXPECTED_IDS) {
      selection.select(id);
      expect(selection.getSelected()).toBe(id);
      expect(sensorById(selection.getSelected()).id).toBe(id);
    }
  });

  test("negative: a wrong service-point item breaks the source gate", () => {
    // Si la presión apuntara a otro ítem, la tabla ya no trazaría a B01.
    expect(sensorById("pressure").item).not.toBe("99");
    expect(sensorById("temperature").item).not.toBe("56");
    expect(sensorById("vibration").item).not.toBe("cable");
  });

  test("negative: an unknown sensor throws instead of resolving silently", () => {
    expect(() => sensorById("turbo")).toThrow();
    expect(() => sensorById("")).toThrow();
  });

  test("negative: an unselectable sensor cannot be selected", () => {
    const selection = createSensorSelection("pressure");
    expect(() => selection.select("turbo" as unknown as LandingSensorId)).toThrow();
    expect(selection.getSelected()).toBe("pressure");
  });

  test("negative: a missing sensor fails the completeness gate", () => {
    const withoutCurrent = [...LANDING_SENSOR_IDS].filter((id) => id !== "current");
    expect(() => assertSensorsComplete(withoutCurrent)).toThrow();
    expect(() => assertSensorsComplete([])).toThrow();
  });
});
