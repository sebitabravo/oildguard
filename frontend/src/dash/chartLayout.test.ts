import { describe, expect, test } from "bun:test";
import { chartLayoutForWidth, inlineLayoutForWidth } from "./chartLayout";

describe("level chart layout", () => {
  test("matches the rendered SVG width while preserving fixed-pixel text scale", () => {
    const wide = chartLayoutForWidth(990);
    expect(wide.width).toBe(990);
    expect(wide.scale).toBeCloseTo(990 / 640);
    expect(wide.height).toBeCloseTo(340.3125);
    expect(wide.padding.left).toBeCloseTo(68.0625);
    expect(wide.padding.right).toBeCloseTo(321.75);

    const narrow = chartLayoutForWidth(320);
    expect(narrow.width).toBe(320);
    expect(narrow.height).toBe(110);
    expect(narrow.scale).toBe(0.5);
  });

  test("inline layout keeps text at fixed size and bounds the height", () => {
    expect(inlineLayoutForWidth(1000).height).toBe(320);
    expect(inlineLayoutForWidth(1000).scale).toBe(1);
    expect(inlineLayoutForWidth(300).height).toBe(200);
    expect(inlineLayoutForWidth(800).padding.right).toBe(16);
  });
});
