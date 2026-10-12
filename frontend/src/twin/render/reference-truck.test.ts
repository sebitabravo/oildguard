import { describe, expect, test } from "bun:test";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { t } from "../../i18n";

describe("reference truck", () => {
  test("does not request the model when the module is imported", async () => {
    const originalLoad = GLTFLoader.prototype.load;
    let calls = 0;
    Object.defineProperty(GLTFLoader.prototype, "load", {
      configurable: true,
      value: function (this: GLTFLoader, ...args: Parameters<typeof originalLoad>) {
        calls += 1;
        return originalLoad.apply(this, args);
      },
    });
    try {
      await import("./reference-truck");
      expect(calls).toBe(0);
    } finally {
      Object.defineProperty(GLTFLoader.prototype, "load", { configurable: true, value: originalLoad });
    }
  });

  test("labels the model as an HD465-7EO, not a 930E", async () => {
    expect(t("bench.referenceTruck.button")).toContain("no es 930E");
  });

  test("exposes the CC-BY-4.0 attribution", async () => {
    const { REFERENCE_TRUCK_ATTRIBUTION } = await import("./reference-truck");
    expect(REFERENCE_TRUCK_ATTRIBUTION.license).toContain("CC-BY-4.0");
  });
});
