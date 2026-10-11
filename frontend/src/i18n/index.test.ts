import { describe, expect, test } from "bun:test";
import { dict, dictKeys, t, type DictKey } from "./index";
import { formatNumber } from "./numberFormat";

// Son medidas y relaciones técnicas citadas literalmente, no números de estado de la interfaz.
const factualSpanishDecimalExceptions: Partial<Record<DictKey, readonly string[]>> = {
  "app.scope": ["32.62"],
  "bench.inspection.step.5": ["0.869", "0.824"],
  "bench.inspection.step.6": ["0.558", "0.513"],
  "bench.inspection.step.7": ["0.100", "0.125"],
};

// El diccionario ya es solo español (S02): sus valores son la copia final.
function collectSpanishStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectSpanishStrings);
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(collectSpanishStrings);
}

describe("i18n dictionary", () => {
  test("every key has non-empty Spanish copy", () => {
    for (const key of dictKeys()) {
      expect(t(key).trim().length).toBeGreaterThan(0);
    }
  });

  test("no sprint or task codes leak into UI copy", () => {
    const codes = /\b(S[0-9]+|T[0-9]{1,2})\b/;
    for (const key of dictKeys()) {
      expect(codes.test(t(key))).toBe(false);
    }
  });

  test("Spanish dictionary copy keeps required accents", () => {
    const unaccentedForms = [
      /presion/i,
      /\btapon\b/i,
      /traccion/i,
      /inspeccion/i,
      /electrico/i,
      /vibracion/i,
      /\bcamion\b/i,
      /rotacion/i,
      /calibracion/i,
      /posicion/i,
      /\baceite\s+ok\b/i,
    ];
    const copy = collectSpanishStrings(dict);
    const violations = copy.flatMap((value) =>
      unaccentedForms.filter((pattern) => pattern.test(value)).map((pattern) => ({ pattern: pattern.source, value })),
    );

    expect(violations).toEqual([]);
  });

  test("Spanish dictionary copy uses decimal commas outside factual specifications", () => {
    const violations = dictKeys().flatMap((key) => {
      const copy = t(key);
      const allowed = factualSpanishDecimalExceptions[key] ?? [];
      return [...copy.matchAll(/\d+\.\d+/g)]
        .map((match) => match[0])
        .filter((decimal) => !allowed.includes(decimal))
        .map((decimal) => `${key}: ${decimal}`);
    });

    expect(violations).toEqual([]);
  });

  test("the demo lab note formats every displayed number in Spanish", () => {
    const note = t("dash.demo.labNote", {
      leakRate: formatNumber(128.5, 1),
      rateMultiplier: formatNumber(257, 0),
      specRate: formatNumber(0.5, 1),
      lossLiters: formatNumber(4, 1),
      durationSeconds: formatNumber(120, 0),
    });

    expect(note).toBe("Fuga LAB-ACELERADA ~128,5 %/h x257 vs espec 0,5 %/h (~4,0 L en 120 s)");
  });

  test("the dashboard footnote reflects the geometry-derived pressure", () => {
    const pressure = formatNumber(2.6, 1);
    const text = t("dash.footnote", { pressure });
    expect(text.includes("28 kPa")).toBe(false);
    expect(text.includes(`≈${pressure} kPa`)).toBe(true);
    expect(text.includes("≈2.6 kPa")).toBe(false);
  });

  test("navigation exposes the three product sections", () => {
    expect(t("nav.mine")).toBe("Mina y flota");
    expect(t("nav.wheel")).toBe("Rueda GDY106");
    expect(t("nav.monitoring")).toBe("Monitoreo");
  });
});
