import { describe, expect, test } from "bun:test";
import {
  CAPACITY_L,
  GEAR_RATIO,
  ROTOR_MAX_RPM,
  SIGNAL_CSV_HEADER,
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
