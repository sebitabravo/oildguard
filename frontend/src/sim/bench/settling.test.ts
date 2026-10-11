import { describe, expect, test } from "bun:test";
import { t } from "../../i18n";
import { viscosityLabel } from "./settling";

// Solo español (S05): la etiqueta sale del diccionario español.
describe("viscosity proxy labels", () => {
  test("uses Spanish dictionary copy for each proxy range", () => {
    expect(viscosityLabel(0.7)).toBe(t("bench.viscosity.dilute"));
    expect(viscosityLabel(1)).toBe(t("bench.viscosity.nominal"));
    expect(viscosityLabel(1.8)).toBe(t("bench.viscosity.degraded"));
  });
});
