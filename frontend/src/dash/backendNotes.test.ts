import { describe, expect, test } from "bun:test";
import { localizeDashboardBackendText } from "./backendNotes";

describe("dashboard backend note localization", () => {
  test("localizes known alert and fallback notes in Spanish", () => {
    expect(localizeDashboardBackendText("No T10 evaluation available for the current store."))
      .toBe("No hay una evaluación disponible para el almacenamiento actual.");
    expect(localizeDashboardBackendText(
      "no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder.",
    )).toBe("Aún no se han ingerido filas; envía lotes de SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4.");
    expect(localizeDashboardBackendText("default (no rows ingested yet)"))
      .toBe("predeterminado (aún no se han ingerido filas)");
  });

  test("localizes the known suppressed-RUL backend explanation in Spanish", () => {
    const note = "RUL unavailable: no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder. Surface anomaly-only alerts instead.";
    expect(localizeDashboardBackendText(note)).toBe(
      "RUL no disponible: aún no se han ingerido filas; envía lotes de SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4. En su lugar, muestra solo alertas de anomalías.",
    );
  });

  test("localizes known legacy notes and passes unknown backend text through verbatim", () => {
    const known = "No T10 evaluation available for the current store.";
    const unknown = "Backend extension note: keep exact casing and punctuation!";
    expect(localizeDashboardBackendText(known)).toBe("No hay una evaluación disponible para el almacenamiento actual.");
    expect(localizeDashboardBackendText(unknown)).toBe(unknown);
  });

  test("preserves prototype property names as unknown backend text", () => {
    expect(localizeDashboardBackendText("constructor")).toBe("constructor");
    expect(localizeDashboardBackendText("toString")).toBe("toString");
  });
});
