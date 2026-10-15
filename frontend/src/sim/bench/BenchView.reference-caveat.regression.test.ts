import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import BenchView from "./BenchView";

describe("removed reference truck viewer", () => {
  test("does not render reference-model licensing copy in the BenchView", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
    const html = renderToString(h(BenchView, {}));

    expect(html).not.toContain("El uso fuera de este repositorio NO ESTÁ VERIFICADO.");
    expect(html).not.toContain("Este modelo no se utiliza en la página de inicio.");
  });
});
