import { describe, expect, test } from "bun:test";
import { t } from "../../i18n";
import { oilStateLabel } from "./oil";

describe("oil state labels", () => {
  test("uses the bilingual dictionary for each threshold state", () => {
    expect(oilStateLabel("normal", "en")).toBe(t("oil.normal", "en"));
    expect(oilStateLabel("normal", "es")).toBe(t("oil.normal", "es"));
    expect(oilStateLabel("warning", "en")).toBe(t("oil.warning", "en"));
    expect(oilStateLabel("warning", "es")).toBe(t("oil.warning", "es"));
    expect(oilStateLabel("critical", "en")).toBe(t("oil.critical", "en"));
    expect(oilStateLabel("critical", "es")).toBe(t("oil.critical", "es"));
  });
});
