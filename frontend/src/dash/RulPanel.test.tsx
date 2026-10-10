import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import type { RulDataOk, RulDataSuppressed, RulDataUnavailable } from "../sim/api";
import { t, type Lang } from "../i18n";
import RulPanel from "./RulPanel";

function renderSuppressedNote(lang: Lang, note: string, evaluationReason?: string): string {
  const defaultStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => lang },
  });
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
  try {
    return renderToString(h(RulPanel, { rul, evaluationReason }));
  } finally {
    if (defaultStorage) Object.defineProperty(globalThis, "localStorage", defaultStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

function renderOkRul(
  lang: Lang,
  horizons: Partial<Pick<RulDataOk, "hours_to_warning" | "hours_to_critical">> = {},
): string {
  const defaultStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => lang },
  });
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
  try {
    return renderToString(h(RulPanel, { rul }));
  } finally {
    if (defaultStorage) Object.defineProperty(globalThis, "localStorage", defaultStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

describe("RUL suppression explanation", () => {
  test("formats RUL metrics with the selected language's decimal separator", () => {
    const english = renderOkRul("en");
    const spanish = renderOkRul("es");

    expect(english).toContain("0.51 h to critical");
    expect(english).toContain("warn in 0.36 h");
    expect(english).toContain("62.2 haul cycles");
    expect(english).toContain("0.06 shifts");
    expect(english).toContain("confidence 0.822");
    expect(english).toContain("slope -1.235 L/h · R² 0.369 · level 92.102 L");
    expect(spanish).toContain("0,51 h hasta crítico");
    expect(spanish).toContain("advertencia en 0,36 h");
    expect(spanish).toContain("62,2 ciclos");
    expect(spanish).toContain("0,06 turnos");
    expect(spanish).toContain("confianza 0,822");
    expect(spanish).toContain("pendiente -1,235 L/h · R² 0,369 · nivel 92,102 L");
  });

  test("uses critical, warning, then normal colors by the eight-hour horizon with localized text", () => {
    const critical = renderOkRul("es", { hours_to_warning: 0.04, hours_to_critical: 0.07 });
    expect(critical).toContain("var(--og-red)");
    expect(critical).toContain("Horizonte crítico dentro del turno");

    const warning = renderOkRul("en", { hours_to_warning: 7.99, hours_to_critical: 8 });
    expect(warning).toContain("var(--og-amber)");
    expect(warning).toContain("Warning horizon within shift");

    const normal = renderOkRul("es", { hours_to_warning: 8, hours_to_critical: 9 });
    expect(normal).toContain("var(--og-green)");
    expect(normal.includes("dentro del turno")).toBe(false);
  });

  test("renders the clean-baseline reason in English and Spanish", () => {
    expect(renderSuppressedNote("en", t("dash.demo.rul.cleanNote", "en")))
      .toContain("RUL suppressed: no leak trend");
    expect(renderSuppressedNote("es", t("dash.demo.rul.cleanNote", "es")))
      .toContain("RUL suprimido: no hay tendencia de fuga");
  });

  test("keeps an unknown backend suppression reason verbatim", () => {
    const reason = "RUL unavailable: unknown calibration reason; inspect backend evidence.";
    expect(renderSuppressedNote("es", reason)).toContain(reason);
  });

  test("localizes the known no-rows backend reason and preserves its English wording", () => {
    const reason = "RUL unavailable: no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder. Surface anomaly-only alerts instead.";
    expect(renderSuppressedNote("en", reason)).toContain(reason);
    expect(renderSuppressedNote("es", reason)).toContain(
      "RUL no disponible: aún no se han ingerido filas; envía lotes de SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4. En su lugar, muestra solo alertas de anomalías.",
    );
  });

  test("uses the structured localized reason instead of a raw backend diagnostic", () => {
    const diagnostic = "RUL unavailable: insufficient rest samples (n=0 < 10); anomaly-only";
    const html = renderSuppressedNote("es", diagnostic, "insufficient_rest_samples");
    expect(html).toContain("Muestras de reposo insuficientes; no se han evaluado las alertas ni el RUL.");
    expect(html.includes("insufficient rest samples")).toBe(false);
  });

  test("keeps analyzer import diagnostics out of the unavailable panel", () => {
    const diagnostic = "RUL unavailable: ModuleNotFoundError: private internal path";
    const defaultStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => "es" },
    });
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
    try {
      const html = renderToString(h(RulPanel, {
        rul,
        evaluationReason: "analysis_unavailable",
      }));
      expect(html).toContain("Analizador no disponible: no se pueden calcular alertas ni RUL");
      expect(html.includes("ModuleNotFoundError")).toBe(false);
      expect(html.includes("private internal path")).toBe(false);
    } finally {
      if (defaultStorage) Object.defineProperty(globalThis, "localStorage", defaultStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });

  test("prioritizes analyzer-unavailable copy over structured notes in both languages", () => {
    const defaultStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
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

    try {
      for (const lang of ["en", "es"] as const) {
        Object.defineProperty(globalThis, "localStorage", {
          configurable: true,
          value: { getItem: () => lang },
        });
        const html = renderToString(h(RulPanel, {
          rul,
          analyzerUnavailable: true,
          evaluationReason: "analysis_unavailable",
        }));

        expect(html).toContain(t("dash.analyzer.unavailable", lang));
        expect(html.includes(lang === "en" ? "RUL is suppressed" : "El RUL está suprimido")).toBe(false);
      }
    } finally {
      if (defaultStorage) Object.defineProperty(globalThis, "localStorage", defaultStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });

  test("renders structured RUL note and reason messages in both languages", () => {
    const defaultStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
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

    try {
      for (const lang of ["en", "es"] as const) {
        Object.defineProperty(globalThis, "localStorage", {
          configurable: true,
          value: { getItem: () => lang },
        });
        const html = renderToString(h(RulPanel, { rul }));
        expect(html).toContain(lang === "en" ? "RUL is suppressed" : "El RUL está suprimido");
        expect(html).toContain(lang === "en" ? "Insufficient rest samples: 6" : "Muestras de reposo insuficientes: 6");
        expect(html.includes("Raw legacy note")).toBe(false);
      }
    } finally {
      if (defaultStorage) Object.defineProperty(globalThis, "localStorage", defaultStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
