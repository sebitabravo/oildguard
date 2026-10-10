import { describe, expect, test } from "bun:test";
import { classifyRulHorizon } from "./rulHorizon";

describe("RUL threshold horizon", () => {
  test("critical horizon takes priority when both thresholds are within the shift", () => {
    expect(classifyRulHorizon(0.07, 0.04)).toBe("critical");
    expect(classifyRulHorizon(7.99, 0.01)).toBe("critical");
  });

  test("uses the warning horizon when critical is not within the shift", () => {
    expect(classifyRulHorizon(8, 7.99)).toBe("warning");
    expect(classifyRulHorizon(9, 0.04)).toBe("warning");
  });

  test("uses the normal horizon when neither threshold is within the shift", () => {
    expect(classifyRulHorizon(9, 8)).toBe("beyond");
    expect(classifyRulHorizon(8, 8)).toBe("beyond");
  });

  test("accepts an explicit shift length", () => {
    expect(classifyRulHorizon(6, 5, 6)).toBe("warning");
    expect(classifyRulHorizon(5.99, 1, 6)).toBe("critical");
  });
});
