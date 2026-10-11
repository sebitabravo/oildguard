import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import LevelChart from "./LevelChart";

// Solo español (S05): el gráfico siempre sale en español, sin idioma por localStorage.
function renderChart(): string {
  return renderToString(h(LevelChart, {
    points: [{ t_s: 0, liters: 50 }, { t_s: 10, liters: 30 }],
    sigmaL: 1,
    windows: [],
    alerts: [],
  }));
}

describe("LevelChart locale formatting", () => {
  test("threshold labels use the Spanish decimal separator", () => {
    const spanish = renderChart();
    expect(spanish).toContain("advertencia 50% (47,5 L)");
    expect(spanish).toContain("crítico 30% (28,5 L)");
    expect(spanish.includes("47.5 L")).toBe(false);
    expect(spanish.includes("28.5 L")).toBe(false);
  });
});
