import { describe, expect, test } from "bun:test";
import {
  CAPACITY_L,
  GEAR_RATIO,
  PRESSURE_NOISE_MOVING_KPA,
  PRESSURE_NOISE_REST_KPA,
  ROTOR_MAX_RPM,
  SETTLE_TAU0_S,
  SIGNAL_CSV_HEADER,
  V_HOLDUP_MAX_L,
  WHEEL_RPM_MAX,
  isRestWindow,
  type RestWindow,
} from "./signals";

describe("signals contract", () => {
  test("rotor max over gear ratio is about 92 wheel rpm", () => {
    expect(ROTOR_MAX_RPM / GEAR_RATIO).toBeCloseTo(91.97, 1);
  });

  test("capacity matches the GDY106 nominal fill", () => {
    expect(CAPACITY_L).toBe(95);
  });

  test("csv header keeps the pressure and ground-truth level columns", () => {
    expect(SIGNAL_CSV_HEADER).toContain("pressure_kpa");
    expect(SIGNAL_CSV_HEADER).toContain("level_liters");
    expect(SIGNAL_CSV_HEADER).toContain("rotating_sensor_regime");
    expect(SIGNAL_CSV_HEADER).toContain("submerged_fraction_per_revolution");
  });

  test("isRestWindow is true only for rest windows", () => {
    const base = {
      window_id: 0, start_t_s: 0, end_t_s: 1, start_iso: "", end_iso: "",
      duration_s: 1, zone: "LOAD", reason: "",
    } as const;
    expect(isRestWindow({ ...base, state: "rest" } as RestWindow)).toBe(true);
    expect(isRestWindow({ ...base, state: "moving" } as RestWindow)).toBe(false);
  });
});

describe("pipeline constants mirror sim/generate.py", () => {
  test("hold-up and drain-back parameters", () => {
    expect(V_HOLDUP_MAX_L).toBe(6);
    expect(SETTLE_TAU0_S).toBe(0.75);
    expect(WHEEL_RPM_MAX).toBeCloseTo(91.97, 1);
  });

  test("noise is sized for a 0-10 kPa class transducer", () => {
    expect(PRESSURE_NOISE_REST_KPA).toBe(0.01);
    expect(PRESSURE_NOISE_MOVING_KPA).toBe(4 * PRESSURE_NOISE_REST_KPA);
  });
});
