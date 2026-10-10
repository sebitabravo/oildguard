import { describe, expect, test } from "bun:test";
import { loadWithTimeout, stateAfterLoad } from "./backendOrDemo";

describe("backend/demo state machine", () => {
  test("moves loading to live on success", () => {
    expect(stateAfterLoad({ rows: 1 }, null, { rows: 0 })).toEqual({
      source: "live",
      data: { rows: 1 },
      error: null,
    });

  });

  test("resolves a never-ending backend request as a timeout", async () => {
    try {
      await loadWithTimeout(() => new Promise(() => undefined), 1);
      throw new Error("expected timeout");
    } catch (error) {
      expect((error as Error).message).toBe("backend request timed out");
    }
  });

  test("moves loading to explicitly labelled demo on error", () => {
    const error = new Error("offline");
    expect(stateAfterLoad({ rows: 0 }, error, { rows: 0 })).toEqual({
      source: "demo",
      data: { rows: 0 },
      error,
    });
  });
});
