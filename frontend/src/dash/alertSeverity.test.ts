import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { ALERT_SEVERITY_COLORS } from "./alertSeverity";

describe("alert severity colors", () => {
  test("preserves the shared N1–N4 palette", () => {
    expect(ALERT_SEVERITY_COLORS).toEqual({
      N1: "var(--og-amber)",
      N2: "var(--og-orange)",
      N3: "var(--og-orange)",
      N4: "var(--og-red)",
    });
  });

  test("both dashboard consumers use the shared map instead of local copies", () => {
    for (const consumer of ["Dashboard.tsx", "LevelChart.tsx"]) {
      const source = readFileSync(new URL(`./${consumer}`, import.meta.url), "utf8");
      expect(source).toContain("ALERT_SEVERITY_COLORS");
      expect(source).not.toMatch(/const ALERT_CSS\s*:/);
    }
  });
});
