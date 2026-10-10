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

  test("both dashboard consumers use the shared map instead of local copies", async () => {
    for (const consumer of ["Dashboard.tsx", "LevelChart.tsx"]) {
      const source = await (globalThis as unknown as {
        Bun: { file(path: URL): { text(): Promise<string> } };
      }).Bun.file(new URL(`./${consumer}`, import.meta.url)).text();
      expect(source).toContain("ALERT_SEVERITY_COLORS");
      expect(/const ALERT_CSS\s*:/.test(source)).toBe(false);
    }
  });
});
