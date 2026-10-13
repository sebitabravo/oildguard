import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import BenchView from "./BenchView";

describe("reference truck attribution caveat", () => {
  test("renders the Spanish reuse and landing-page caveat in the BenchView", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
    const html = renderToString(h(BenchView, {}));

    expect(html).toContain("El uso fuera de este repositorio NO ESTÁ VERIFICADO.");
    expect(html).toContain("Este modelo no se utiliza en la página de inicio.");
  });
});
