import { describe, expect, it } from "bun:test";

import { liveLevelValue } from "./liveLevelValue";

describe("liveLevelValue", () => {
  it("keeps a missing estimate absent instead of coercing null to zero", () => {
    expect(liveLevelValue(null)).toBeNull();
    expect(liveLevelValue(undefined)).toBeNull();
  });

  it("accepts finite numeric estimates only", () => {
    expect(liveLevelValue(72.5)).toBe(72.5);
    expect(liveLevelValue(Number.NaN)).toBeNull();
    expect(liveLevelValue(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
