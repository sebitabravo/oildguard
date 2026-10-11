import { describe, expect, test } from "bun:test";
import { formatNumber } from "./numberFormat";

describe("formato numérico solo español", () => {
  test("usa coma decimal es-CL", () => {
    expect(formatNumber(0.369, 3)).toBe("0,369");
  });

  test("preserves the requested fractional precision and rounds consistently", () => {
    expect(formatNumber(92.1024, 2)).toBe("92,10");
    expect(formatNumber(12.345, 2)).toBe("12,35");
    expect(formatNumber(12.345, 0)).toBe("12");
  });

  test("does not introduce grouping separators into measurements", () => {
    expect(formatNumber(92102, 0)).toBe("92102");
  });
});
