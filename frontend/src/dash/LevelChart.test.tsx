import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import LevelChart from "./LevelChart";

function renderChart(lang: "en" | "es"): string {
  const defaultStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => lang },
  });
  try {
    return renderToString(h(LevelChart, {
      points: [{ t_s: 0, liters: 50 }, { t_s: 10, liters: 30 }],
      sigmaL: 1,
      windows: [],
      alerts: [],
    }));
  } finally {
    if (defaultStorage) Object.defineProperty(globalThis, "localStorage", defaultStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

describe("LevelChart locale formatting", () => {
  test("threshold labels use the selected language decimal separator", () => {
    const english = renderChart("en");
    expect(english).toContain("warn 50% (47.5 L)");
    expect(english).toContain("critical 30% (28.5 L)");
    expect(english.includes("47,5 L")).toBe(false);
    expect(english.includes("28,5 L")).toBe(false);

    const spanish = renderChart("es");
    expect(spanish).toContain("advertencia 50% (47,5 L)");
    expect(spanish).toContain("crítico 30% (28,5 L)");
    expect(spanish.includes("47.5 L")).toBe(false);
    expect(spanish.includes("28.5 L")).toBe(false);
  });
});
