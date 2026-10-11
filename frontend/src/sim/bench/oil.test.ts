import { describe, expect, test } from "bun:test";
import { t } from "../../i18n";
import { formatOilText, oilStateLabel } from "./oil";

// Solo español (S05): etiquetas y cifras en español con coma decimal.
describe("oil state labels", () => {
  test("uses the Spanish dictionary for each threshold state", () => {
    expect(oilStateLabel("normal")).toBe(t("oil.normal"));
    expect(oilStateLabel("warning")).toBe(t("oil.warning"));
    expect(oilStateLabel("critical")).toBe(t("oil.critical"));
  });

  test("formats the oil HUD number in Spanish", () => {
    expect(formatOilText(0.7)).toBe("66,5 L · 70%");
  });
});
