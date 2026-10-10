import { describe, expect, test } from "bun:test";
import { clampPercentage, levelBarGeometry, severityColor, severityTone, buildDeviceQuery } from "./logic";

describe("shared UI logic", () => {
  test("maps the closed severity palette", () => {
    expect(severityTone("N1")).toBe("warning");
    expect(severityTone("N2")).toBe("warning");
    expect(severityTone("N3")).toBe("warning");
    expect(severityTone("N4")).toBe("critical");
    expect(severityColor("N2")).toBe("var(--og-orange)");
  });

  test("clamps level-bar percentages and exposes thresholds", () => {
    expect(clampPercentage(-2)).toBe(0);
    expect(clampPercentage(140)).toBe(100);
    const geometry = levelBarGeometry(47.5, 95, 2);
    expect(geometry.percent).toBe(50);
    expect(geometry.warningTick).toBe(50);
    expect(geometry.criticalTick).toBe(30);
  });

  test("builds optional device queries without corrupting existing queries", () => {
    expect(buildDeviceQuery("/level")).toBe("/level");
    expect(buildDeviceQuery("/level", "wheel-RH-01")).toBe("/level?device_id=wheel-RH-01");
    expect(buildDeviceQuery("/level/series?limit=5", "wheel RH")).toBe("/level/series?limit=5&device_id=wheel%20RH");
  });
});
