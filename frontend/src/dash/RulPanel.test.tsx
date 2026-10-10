import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import type { RulDataSuppressed, RulDataUnavailable } from "../sim/api";
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

describe("RUL suppression explanation", () => {
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
});
