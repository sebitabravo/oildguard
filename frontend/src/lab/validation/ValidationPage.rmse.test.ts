import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { dictKeys, t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import {
  computeMetrics,
  evaluationPairs,
  fixtureScenarios,
  fixtureSeries,
  pairSeries,
} from "./logic";
import ValidationPage from "./ValidationPage";

// Métricas agrupadas que carga la página: trazadas, no inventadas.
function pooledMetrics() {
  const pooled = fixtureScenarios().flatMap((scenario) =>
    evaluationPairs(pairSeries(fixtureSeries(scenario).points, scenario)),
  );
  return { pooled, metrics: computeMetrics(pooled.map((pair) => pair.errorL), null) };
}

// Solo español (S05): la página siempre sale en español.
function renderValidation(): string {
  return renderToString(h(ValidationPage, {}));
}

describe("validation pooled fixture metrics", () => {
  test("pooled RMSE matches the exact recomputed fixture value with n=350", () => {
    const { pooled, metrics } = pooledMetrics();
    expect(pooled.length).toBe(350);
    expect(metrics.n).toBe(350);
    expect(metrics.rmse).toBeCloseTo(2.5152846440114875, 10);
    expect(metrics.bias).toBeCloseTo(-0.19371885714285692, 10);
    expect(metrics.mae).toBeCloseTo(1.7956234285714283, 10);
  });
});

describe("validation RMSE tile dictionary", () => {
  test("the RMSE label, meta and falsifier note exist in Spanish", () => {
    for (const key of [
      "lab.validation.metric.rmse",
      "lab.validation.metric.rmseMeta",
      "lab.validation.rmseNote",
    ] as const) {
      expect(dictKeys().includes(key)).toBe(true);
      expect(t(key).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("validation RMSE display", () => {
  test("fixture RMSE tile with n, bias, MAE, fixture path and non-bench note in Spanish", () => {
    const { metrics } = pooledMetrics();
    const html = renderValidation();
    // Etiqueta agrupada: ausente antes del arreglo (el banco menciona RMSE guía, nunca agrupado).
    expect(html.includes("RMSE agrupado")).toBe(true);
    expect(html.includes(t("lab.validation.metric.rmse"))).toBe(true);
    // Valor calculado, no copiado a mano: 2.515... se muestra con 2 decimales.
    expect(html.includes(formatNumber(metrics.rmse ?? 0, 2))).toBe(true);
    expect(html.includes("2,52")).toBe(true);
    // Contexto exigido por el plan: n, sesgo, EAM, ruta del fixture y nota de no banco.
    expect(html.includes(formatNumber(350, 0))).toBe(true);
    expect(html.includes(formatNumber(metrics.bias ?? 0, 2))).toBe(true);
    expect(html.includes(formatNumber(metrics.mae ?? 0, 2))).toBe(true);
    expect(html.includes("frontend/src/lab/fixtures/validation.json")).toBe(true);
    expect(html.includes(t("lab.validation.bench.status"))).toBe(true);
    expect(html.includes(t("lab.validation.rmseNote"))).toBe(true);
  });

  test("negative: without the RMSE display the pooled value never reaches the page", () => {
    // Sin la baldosa, el valor agrupado 2,52 no aparece aunque la lógica lo
    // calcule; si esta aserción pasara sin el arreglo, la cobertura mentiría.
    const { metrics } = pooledMetrics();
    expect(metrics.rmse).toBeCloseTo(2.5152846440114875, 10);
    const html = renderValidation();
    expect(html.includes("frontend/src/lab/fixtures/validation.json")).toBe(true);
    expect(html.includes(formatNumber(metrics.rmse ?? 0, 2))).toBe(true);
    expect(html.includes(t("lab.validation.metric.rmse"))).toBe(true);
  });
});
