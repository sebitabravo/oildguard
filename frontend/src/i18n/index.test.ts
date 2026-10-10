import { describe, expect, test } from "bun:test";
import { dict, dictKeys, t } from "./index";
import { formatNumber } from "./numberFormat";

function collectSpanishStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectSpanishStrings);
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, "es")) return collectSpanishStrings(record.es);
  return Object.values(record).flatMap(collectSpanishStrings);
}

describe("i18n dictionary", () => {
  test("every key has non-empty EN and ES copy", () => {
    for (const key of dictKeys()) {
      expect(t(key, "en").trim().length).toBeGreaterThan(0);
      expect(t(key, "es").trim().length).toBeGreaterThan(0);
    }
  });

  test("no sprint or task codes leak into UI copy", () => {
    const codes = /\b(S[0-9]+|T[0-9]{1,2})\b/;
    for (const key of dictKeys()) {
      expect(codes.test(t(key, "en"))).toBe(false);
      expect(codes.test(t(key, "es"))).toBe(false);
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

  test("the dashboard footnote reflects the geometry-derived pressure", () => {
    for (const lang of ["en", "es"] as const) {
      const pressure = formatNumber(2.6, lang, 1);
      const text = t("dash.footnote", lang, { pressure });
      expect(text.includes("28 kPa")).toBe(false);
      expect(text.includes(`≈${pressure} kPa`)).toBe(true);
      expect(text.includes(lang === "en" ? "≈2,6 kPa" : "≈2.6 kPa")).toBe(false);
    }
  });

  test("navigation exposes the three product sections", () => {
    expect(t("nav.mine", "en")).toBe("Mine & Fleet");
    expect(t("nav.wheel", "en")).toBe("GDY106 Wheel");
    expect(t("nav.monitoring", "en")).toBe("Monitoring");
  });
});
