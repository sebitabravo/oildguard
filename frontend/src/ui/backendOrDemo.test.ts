import { describe, expect, test } from "bun:test";
import { stateAfterLoad } from "./backendOrDemo";

describe("backend/demo state machine", () => {
  test("moves loading to live on success", () => {
    expect(stateAfterLoad({ rows: 1 }, null, { rows: 0 })).toEqual({
      source: "live",
      data: { rows: 1 },
      error: null,
    });
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
