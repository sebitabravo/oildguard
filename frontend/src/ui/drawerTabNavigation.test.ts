import { describe, expect, test } from "bun:test";
import { drawerTabIndexForKey } from "./drawerTabNavigation";

describe("drawer tab keyboard navigation", () => {
  test("wraps arrows and supports Home and End", () => {
    expect(drawerTabIndexForKey("ArrowRight", 2, 3)).toBe(0);
    expect(drawerTabIndexForKey("ArrowLeft", 0, 3)).toBe(2);
    expect(drawerTabIndexForKey("Home", 2, 3)).toBe(0);
    expect(drawerTabIndexForKey("End", 0, 3)).toBe(2);
    expect(drawerTabIndexForKey("Escape", 1, 3)).toBe(null);
    expect(drawerTabIndexForKey("ArrowRight", 0, 0)).toBe(null);
  });
});
