import { describe, expect, test } from "bun:test";
import { levelSeriesPath } from "./api";

describe("level series query", () => {
  test("keeps existing request URLs and optionally serializes requested signals", () => {
    expect(levelSeriesPath()).toBe("/level/series?limit=300");
    expect(levelSeriesPath(25, "wheel-RH-01")).toBe("/level/series?limit=25&device_id=wheel-RH-01");
    expect(levelSeriesPath(25, "wheel RH", ["pressure_kpa", "temperature_c", "vib_rms_g"]))
      .toBe("/level/series?limit=25&device_id=wheel%20RH&signals=pressure_kpa%2Ctemperature_c%2Cvib_rms_g");
  });
});
