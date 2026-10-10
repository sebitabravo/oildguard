import { describe, expect, test } from "bun:test";
import { GEAR_RATIO } from "../../twin/physics";
import { t, type Lang } from "../../i18n";
import { buildGearRatioDisplay } from "./gearRatioDisplay";

function numberFromDisplay(value: string, lang: Lang): number {
  return Number(lang === "es" ? value.replace(",", ".") : value);
}

describe("GDY106 gear ratio display", () => {
  test("formats the English manual total and rounded stages", () => {
    const display = buildGearRatioDisplay("en");

    expect(`${display.highSpeed}:1 × ${display.lowSpeed}:1 ≈ ${display.overall}:1`).toBe(
      "6.750:1 × 4.833:1 ≈ 32.62:1",
    );
    expect(t("bench.readout.train", "en", display)).toBe(
      "Planetary train: 6.750:1 × 4.833:1 ≈ 32.62:1 (Komatsu manual; stage values rounded to three decimals)",
    );
    expect(t("bench.notes.train", "en", display)).toBe(
      "Manual-validated overall ratio: 6.750:1 × 4.833:1 ≈ 32.62:1 (Komatsu manual; stage values rounded to three decimals).",
    );
    expect(numberFromDisplay(display.overall, "en")).toBe(GEAR_RATIO);
    expect(
      Number((numberFromDisplay(display.highSpeed, "en") * numberFromDisplay(display.lowSpeed, "en")).toFixed(2)),
    ).toBe(GEAR_RATIO);
  });

  test("formats the Spanish manual total with comma decimals", () => {
    const display = buildGearRatioDisplay("es");

    expect(`${display.highSpeed}:1 × ${display.lowSpeed}:1 ≈ ${display.overall}:1`).toBe(
      "6,750:1 × 4,833:1 ≈ 32,62:1",
    );
    expect(t("bench.readout.train", "es", display)).toBe(
      "Tren planetario: 6,750:1 × 4,833:1 ≈ 32,62:1 (manual Komatsu; valores de etapa redondeados a tres decimales)",
    );
    expect(t("bench.notes.train", "es", display)).toBe(
      "Relación total validada manualmente: 6,750:1 × 4,833:1 ≈ 32,62:1 (manual Komatsu; valores de etapa redondeados a tres decimales).",
    );
    expect(numberFromDisplay(display.overall, "es")).toBe(GEAR_RATIO);
    expect(
      Number((numberFromDisplay(display.highSpeed, "es") * numberFromDisplay(display.lowSpeed, "es")).toFixed(2)),
    ).toBe(GEAR_RATIO);
  });
});
