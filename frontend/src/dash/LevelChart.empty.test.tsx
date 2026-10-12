import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import LevelChart from "./LevelChart";

function renderChart(points: Array<{ t_s: number; liters: number | null }>): string {
  return renderToString(h(LevelChart, {
    points: points as Array<{ t_s: number; liters: number }>,
    sigmaL: 1,
    windows: [],
    alerts: [],
  }));
}

describe("LevelChart empty state", () => {
  test("shows the empty state without a level line or band when there are no rows", () => {
    const html = renderChart([]);

    expect(html).toContain("Sin filas ingeridas: no hay historial que dibujar.");
    expect(html).not.toContain("og-sync__line");
    expect(html).not.toContain("og-sync__band");
  });

  test("shows the empty state without a level line or band when no level is present", () => {
    const html = renderChart([{ t_s: 0, liters: null }]);

    expect(html).toContain("Sin filas ingeridas: no hay historial que dibujar.");
    expect(html).not.toContain("og-sync__line");
    expect(html).not.toContain("og-sync__band");
  });
});
