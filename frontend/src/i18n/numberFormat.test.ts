import { describe, expect, test } from "bun:test";
import { formatNumber } from "./numberFormat";

describe("locale-aware number formatting", () => {
  test("uses a decimal point in English and a decimal comma in Spanish", () => {
    expect(formatNumber(0.369, "en", 3)).toBe("0.369");
    expect(formatNumber(0.369, "es", 3)).toBe("0,369");
  });

  test("preserves the requested fractional precision and rounds consistently", () => {
    expect(formatNumber(92.1024, "en", 2)).toBe("92.10");
    expect(formatNumber(92.1024, "es", 2)).toBe("92,10");
    expect(formatNumber(12.345, "es", 2)).toBe("12,35");
    expect(formatNumber(12.345, "en", 0)).toBe("12");
  });

  test("does not introduce grouping separators into measurements", () => {
    expect(formatNumber(92102, "en", 0)).toBe("92102");
    expect(formatNumber(92102, "es", 0)).toBe("92102");
  });
});
