import { describe, expect, test } from "bun:test";
import { GEAR_RATIO } from "../../twin/physics";
import { t } from "../../i18n";
import { buildGearRatioDisplay } from "./gearRatioDisplay";

// Solo español (S05): la coma decimal se normaliza para recomputar la física.
function numberFromDisplay(value: string): number {
  return Number(value.replace(",", "."));
}

describe("GDY106 gear ratio display", () => {
  test("formats the Spanish manual total with comma decimals", () => {
    const display = buildGearRatioDisplay();

    expect(`${display.highSpeed}:1 × ${display.lowSpeed}:1 ≈ ${display.overall}:1`).toBe(
      "6,750:1 × 4,833:1 ≈ 32,62:1",
    );
    expect(t("bench.readout.train", display)).toBe(
      "Tren planetario: 6,750:1 × 4,833:1 (supuesto de diseño) ≈ 32,62:1 (total publicado, fuente citada en anexo P2; sin revisión nueva aquí; valores de etapa redondeados a tres decimales)",
    );
    expect(t("bench.notes.train", display)).toBe(
      "Etapas (supuesto de diseño): 6,750:1 × 4,833:1 ≈ 32,62:1 (total publicado, fuente citada en anexo P2; sin revisión nueva aquí; valores de etapa redondeados a tres decimales).",
    );
    expect(numberFromDisplay(display.overall)).toBe(GEAR_RATIO);
    expect(
      Number((numberFromDisplay(display.highSpeed) * numberFromDisplay(display.lowSpeed)).toFixed(2)),
    ).toBe(GEAR_RATIO);
  });
});
