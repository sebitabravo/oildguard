import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import type { RulDataOk, RulDataSuppressed, RulDataUnavailable } from "../sim/api";
import { t } from "../i18n";
import RulPanel from "./RulPanel";

// Solo español (S05): el panel siempre sale en español, sin idioma por localStorage.
function renderSuppressedNote(note: string, evaluationReason?: string): string {
  const rul: RulDataSuppressed = {
    hours: null,
    haul_cycles: null,
    shifts: null,
    confidence: 0,
    status: "suppressed",
    anomaly_only: true,
    model: "synthetic-proxy",
    note,
    fallback: "local DEMO fallback (backend down or demo override)",
  };
  return renderToString(h(RulPanel, { rul, evaluationReason }));
}

function renderOkRul(
  horizons: Partial<Pick<RulDataOk, "hours_to_warning" | "hours_to_critical">> = {},
): string {
  const rul: RulDataOk = {
    hours: 0.51,
    hours_to_warning: horizons.hours_to_warning ?? 0.36,
    hours_to_critical: horizons.hours_to_critical ?? 0.51,
    haul_cycles: 62.2,
    shifts: 0.06,
    confidence: 0.822,
    status: "ok",
    anomaly_only: false,
    slope_L_per_h: -1.23456,
    r2: 0.369,
    current_level_L: 92.102,
    model: "synthetic-proxy",
    note: "",
    fallback: "",
  };
  return renderToString(h(RulPanel, { rul }));
}

describe("RUL suppression explanation", () => {
  test("formats RUL metrics with the Spanish decimal separator", () => {
    const spanish = renderOkRul();

    expect(spanish).toContain("0,51 h hasta crítico");
    expect(spanish).toContain("advertencia en 0,36 h");
    expect(spanish).toContain("62,2 ciclos");
    expect(spanish).toContain("0,06 turnos");
    expect(spanish).toContain("confianza 0,822");
    expect(spanish).toContain("pendiente -1,235 L/h · R² 0,369 · nivel 92,102 L");
  });

  test("uses critical, warning, then normal colors by the eight-hour horizon with Spanish text", () => {
    const critical = renderOkRul({ hours_to_warning: 0.04, hours_to_critical: 0.07 });
    expect(critical).toContain("var(--og-red)");
    expect(critical).toContain("Horizonte crítico dentro del turno");

    const warning = renderOkRul({ hours_to_warning: 7.99, hours_to_critical: 8 });
    expect(warning).toContain("var(--og-amber)");
    expect(warning).toContain("Horizonte de advertencia dentro del turno");

    const normal = renderOkRul({ hours_to_warning: 8, hours_to_critical: 9 });
    expect(normal).toContain("var(--og-green)");
    expect(normal.includes("dentro del turno")).toBe(false);
  });

  test("renders the clean-baseline reason in Spanish", () => {
    expect(renderSuppressedNote(t("dash.demo.rul.cleanNote")))
      .toContain("RUL suprimido: no hay tendencia de fuga");
  });

  test("keeps an unknown backend suppression reason verbatim", () => {
    const reason = "RUL unavailable: unknown calibration reason; inspect backend evidence.";
    expect(renderSuppressedNote(reason)).toContain(reason);
  });

  test("localizes the known no-rows backend reason in Spanish", () => {
    const reason = "RUL unavailable: no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder. Surface anomaly-only alerts instead.";
    expect(renderSuppressedNote(reason)).toContain(
      "RUL no disponible: aún no se han ingerido filas; envía lotes de SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4. En su lugar, muestra solo alertas de anomalías.",
    );
  });

  test("uses the structured localized reason instead of a raw backend diagnostic", () => {
    const diagnostic = "RUL unavailable: insufficient rest samples (n=0 < 10); anomaly-only";
    const html = renderSuppressedNote(diagnostic, "insufficient_rest_samples");
    expect(html).toContain("Muestras de reposo insuficientes; no se han evaluado las alertas ni el RUL.");
    expect(html.includes("insufficient rest samples")).toBe(false);
  });

  test("keeps analyzer import diagnostics out of the unavailable panel", () => {
    const diagnostic = "RUL unavailable: ModuleNotFoundError: private internal path";
    const rul: RulDataUnavailable = {
      hours: null,
      haul_cycles: null,
      shifts: null,
      confidence: 0,
      status: "unavailable",
      anomaly_only: true,
      model: "synthetic-proxy",
      note: diagnostic,
      fallback: diagnostic,
    };
    const html = renderToString(h(RulPanel, {
      rul,
      evaluationReason: "analysis_unavailable",
    }));
    expect(html).toContain("Analizador no disponible: no se pueden calcular alertas ni RUL");
    expect(html.includes("ModuleNotFoundError")).toBe(false);
    expect(html.includes("private internal path")).toBe(false);
  });

  test("prioritizes analyzer-unavailable copy over structured notes", () => {
    const rul: RulDataSuppressed = {
      hours: null,
      haul_cycles: null,
      shifts: null,
      confidence: 0,
      status: "suppressed",
      anomaly_only: true,
      model: "synthetic-proxy",
      note: "Structured note that must not replace analyzer status.",
      note_message: { code: "rul_suppressed_summary", params: {} },
      fallback: "",
    };

    const html = renderToString(h(RulPanel, {
      rul,
      analyzerUnavailable: true,
      evaluationReason: "analysis_unavailable",
    }));

    expect(html).toContain(t("dash.analyzer.unavailable"));
    expect(html.includes("El RUL está suprimido")).toBe(false);
  });

  test("renders structured RUL note and reason messages in Spanish", () => {
    const rul: RulDataSuppressed = {
      hours: null,
      haul_cycles: null,
      shifts: null,
      confidence: 0,
      status: "suppressed",
      anomaly_only: true,
      model: "synthetic-proxy",
      reason: "insufficient rest samples (n=6 < 10); anomaly-only",
      reason_message: {
        code: "rul_insufficient_rest_samples",
        params: { count: 6, minimum: 10 },
      },
      note: "Raw legacy note that must not render when structured copy exists.",
      note_message: { code: "rul_suppressed_summary", params: {} },
      fallback: "Raw fallback text.",
    };

    const html = renderToString(h(RulPanel, { rul }));
    expect(html).toContain("El RUL está suprimido");
    expect(html).toContain("Muestras de reposo insuficientes: 6");
    expect(html.includes("Raw legacy note")).toBe(false);
  });
});
