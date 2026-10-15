import { describe, expect, test } from "bun:test";
import { h, type ComponentType } from "preact";
import renderToString from "preact-render-to-string";

describe("removed reference truck viewer", () => {
  test("does not expose the removed model preflight or error UI", async () => {
    const exports = await import("./BenchView") as unknown as Record<string, unknown>;
    expect(exports.preflightReferenceTruckAsset).toBe(undefined);
    expect(exports.ReferenceTruckError).toBe(undefined);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
    const html = renderToString(h(exports.default as ComponentType, {}));
    expect(html).not.toContain("HD465-7EO");
    expect(html).not.toContain("Camión de referencia");
  });
});
