import { describe, expect, test } from "bun:test";
import { t } from "../../i18n";
import { formatOilText, oilStateLabel } from "./oil";

describe("oil state labels", () => {
  test("uses the bilingual dictionary for each threshold state", () => {
    expect(oilStateLabel("normal", "en")).toBe(t("oil.normal", "en"));
    expect(oilStateLabel("normal", "es")).toBe(t("oil.normal", "es"));
    expect(oilStateLabel("warning", "en")).toBe(t("oil.warning", "en"));
    expect(oilStateLabel("warning", "es")).toBe(t("oil.warning", "es"));
    expect(oilStateLabel("critical", "en")).toBe(t("oil.critical", "en"));
    expect(oilStateLabel("critical", "es")).toBe(t("oil.critical", "es"));
  });

  test("formats the oil HUD number in English and Spanish", () => {
    expect(formatOilText(0.7, "en")).toBe("66.5 L · 70%");
    expect(formatOilText(0.7, "es")).toBe("66,5 L · 70%");
  });
});
