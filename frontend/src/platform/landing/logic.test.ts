import { describe, expect, test } from "bun:test";
import { makeTelemetrySeries, resolveLandingLang } from "./logic";

describe("landing pure logic", () => {
  test("URL language overrides stored language and normalizes supported codes", () => {
    expect(resolveLandingLang("?lang=ES", "en")).toBe("es");
    expect(resolveLandingLang("?lang=en", "es")).toBe("en");
    expect(resolveLandingLang("?lang=fr", "es")).toBe("es");
    expect(resolveLandingLang("", null)).toBe("en");
  });

  test("telemetry sampling is deterministic and preserves endpoints", () => {
    const rows = [0, 1, 2, 3, 4].map((i) => ({
      t_s: i,
      pressure_kpa: 10 + i,
      temperature_c: 20 + i,
      vib_rms_g: 0.1 * i,
      level_liters: 50 + i,
    }));
    expect(makeTelemetrySeries(rows, 3)).toEqual([rows[0], rows[2], rows[4]]);
  });
});
