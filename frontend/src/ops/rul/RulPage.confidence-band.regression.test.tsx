import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import type { RulDataOk, RulResponse } from "../../sim/api";
import { RulForecastPanel } from "./RulPage";

const evaluatedResponse: RulResponse = {
  status: "ok",
  kind: "rul",
  as_of: "2026-10-13T12:00:00Z",
  evaluated: true,
  data: {
    status: "ok",
    anomaly_only: false,
    hours: 0.54,
    hours_to_warning: 0.2,
    hours_to_critical: 0.54,
    haul_cycles: 67,
    shifts: 0.07,
    confidence: 0.95,
    confidence_band: {
      level: 0.95,
      slope_low_L_per_h: -130.1689,
      slope_high_L_per_h: -102.8869,
      hours_to_critical_low: 0.48,
      hours_to_critical_low_reason: null,
      hours_to_critical_high: 0.61,
      hours_to_critical_high_reason: null,
    },
    slope_L_per_h: -116.4,
    r2: 0.95,
    current_level_L: 90,
    model: "synthetic-proxy",
    note: "Modelo sintético.",
    note_message: { code: "rul_model_note", params: {} },
    reason_message: { code: "rul_significant_leak_trend", params: {} },
    fallback: "",
  },
};

const unavailableResponse: RulResponse = {
  status: "unavailable",
  kind: "rul",
  as_of: "2026-10-13T12:00:00Z",
  evaluated: false,
  reason: "analysis_unavailable",
  data: {
    status: "unavailable",
    anomaly_only: true,
    hours: null,
    haul_cycles: null,
    shifts: null,
    confidence: 0,
    model: "synthetic-proxy",
    reason: "analysis_unavailable",
    reason_message: { code: "rul_analyzer_unavailable_reason", params: {} },
    note: "Analyzer unavailable; no RUL estimate was generated.",
    fallback: "",
  },
};

const incompleteEvaluatedResponse: RulResponse = {
  ...evaluatedResponse,
  data: {
    ...evaluatedResponse.data,
    confidence_band: undefined,
    reason_message: { code: "rul_baseline_precision_insufficient", params: { sigma_l: 2, max_sigma_l: 1 } },
  } as RulDataOk,
};

describe("RUL confidence-band chart", () => {
  test("renders both backend intervals and the synthetic-estimate title", () => {
    const html = renderToString(h(RulForecastPanel, { response: evaluatedResponse }));

    expect(html).toContain("ESTIMACIÓN SINTÉTICA");
    expect(html).toContain("og-rul-band-chart");
    expect(html).toContain("og-rul-band-interval--hours");
    expect(html).toContain("og-rul-band-interval--slope");
    expect(html).toContain("0,48");
    expect(html).toContain("0,61");
    expect(html).toContain("0,54");
    expect(html).toContain("130,17");
    expect(html).toContain("102,89");
    expect(html).toContain("-116,4");
  });

  test("renders a localized unavailable reason without a chart", () => {
    const html = renderToString(h(RulForecastPanel, { response: unavailableResponse }));

    expect(html).toContain("El analizador no está disponible; no se generó una estimación de RUL.");
    expect(html).not.toContain("og-rul-band-chart");
  });

  test("prefers the localized response reason when an evaluated confidence band is incomplete", () => {
    const html = renderToString(h(RulForecastPanel, { response: incompleteEvaluatedResponse }));

    expect(html).toContain("La precisión de referencia es insuficiente: sigma es 2 L, sobre el límite de 1 L; solo se emiten anomalías.");
    expect(html).not.toContain("og-rul-band-chart");
  });
});
