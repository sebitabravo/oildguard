import { describe, expect, test } from "bun:test";
import { labelClassName } from "./labels";

describe("labelClassName", () => {
  test("defaults to the neutral pill", () => {
    expect(labelClassName({})).toBe("og-label og-label--neutral");
  });

  test("composes tone, leader, interactive and extra classes in order", () => {
    expect(
      labelClassName({ tone: "warn", leader: true, interactive: true, className: "x" }),
    ).toBe("og-label og-label--warn og-label--leader og-label--interactive x");
  });

  test("omits leader and interactive when false", () => {
    const cls = labelClassName({ tone: "ok", leader: false, interactive: false });
    expect(cls).toBe("og-label og-label--ok");
  });
});
