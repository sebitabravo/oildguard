import { describe, expect, test } from "bun:test";
import { modeFromHash } from "./routes";

describe("modeFromHash", () => {
  test("canonical hashes", () => {
    expect(modeFromHash("#mine")).toBe("mine");
    expect(modeFromHash("#wheel")).toBe("wheel");
    expect(modeFromHash("#monitoring")).toBe("monitoring");
  });

  test("legacy aliases keep working", () => {
    expect(modeFromHash("#truck")).toBe("mine");
    expect(modeFromHash("#bench")).toBe("wheel");
    expect(modeFromHash("#dash")).toBe("monitoring");
    expect(modeFromHash("#dash-demo")).toBe("monitoring");
  });

  test("empty and unknown hashes fall back to the wheel view", () => {
    expect(modeFromHash("")).toBe("wheel");
    expect(modeFromHash("#stub")).toBe("wheel");
  });
});
