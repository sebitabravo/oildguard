import { describe, expect, test } from "bun:test";
import { t } from "../../i18n";
import { viscosityLabel } from "./settling";

describe("viscosity proxy labels", () => {
  test("uses bilingual dictionary copy for each proxy range", () => {
    expect(viscosityLabel(0.7, "en")).toBe(t("bench.viscosity.dilute", "en"));
    expect(viscosityLabel(0.7, "es")).toBe(t("bench.viscosity.dilute", "es"));
    expect(viscosityLabel(1, "en")).toBe(t("bench.viscosity.nominal", "en"));
    expect(viscosityLabel(1, "es")).toBe(t("bench.viscosity.nominal", "es"));
    expect(viscosityLabel(1.8, "en")).toBe(t("bench.viscosity.degraded", "en"));
    expect(viscosityLabel(1.8, "es")).toBe(t("bench.viscosity.degraded", "es"));
  });
});
