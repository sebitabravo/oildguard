import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { SourcedValue } from "./AlertDetailPage";

describe("alert-detail per-field provenance", () => {
  test("labels observed demo inputs and configured trigger thresholds separately", () => {
    const observed = ["-0,038 L/h", "90,4 %", "0,18 g", "-0,4 °C"];
    const thresholds = ["por debajo de 0,000 L/h", "por debajo de 50,0 %", "por encima de 0,60 g", "fuera de ±1,5 °C"];
    for (const value of observed) {
      const markup = renderToString(h(SourcedValue, { value, source: "demo" }));
      expect(markup).toContain(value);
      expect(/og-badge--source-demo[\s\S]*?DEMO/.test(markup)).toBe(true);
    }
    for (const value of thresholds) {
      const markup = renderToString(h(SourcedValue, { value, source: "configuration" }));
      expect(markup).toContain(value);
      expect(/og-badge--source-configuration[\s\S]*?CONFIGURACIÓN/.test(markup)).toBe(true);
    }
  });
});
