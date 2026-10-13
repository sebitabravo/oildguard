import { describe, expect, test } from "bun:test";
import { h, type ComponentType } from "preact";
import renderToString from "preact-render-to-string";

describe("reference truck model preflight", () => {
  test("a failed asset fetch shows the procedural fallback without mounting a model", async () => {
    const exports = await import("./BenchView") as unknown as Record<string, unknown>;
    expect(typeof exports.preflightReferenceTruckAsset).toBe("function");

    const preflight = exports.preflightReferenceTruckAsset as (
      fetchAsset: typeof fetch,
      mount: () => void,
    ) => Promise<boolean>;
    let mountCalls = 0;
    const mount = () => { mountCalls += 1; };
    const available = await preflight(async () => {
      throw new TypeError("Failed to fetch");
    }, mount);

    expect(available).toBe(false);
    expect(mountCalls).toBe(0);
    const Fallback = exports.ReferenceTruckError as ComponentType;
    const html = renderToString(h(Fallback, {}));
    expect(html).toContain("Modelo no incluido en el repositorio; la vista usa el montaje procedural.");
    expect(html).not.toContain("<canvas");
  });
});
