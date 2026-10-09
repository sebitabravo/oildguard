import { describe, expect, test } from "bun:test";
import { localizeDashboardBackendText } from "./backendNotes";

describe("dashboard backend note localization", () => {
  test("localizes known alert and fallback notes in Spanish", () => {
    expect(localizeDashboardBackendText("No T10 evaluation available for the current store.", "es"))
      .toBe("No hay una evaluación disponible para el almacenamiento actual.");
    expect(localizeDashboardBackendText(
      "no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder.",
      "es",
    )).toBe("Aún no se han ingerido filas; envía lotes de SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4.");
    expect(localizeDashboardBackendText("default (no rows ingested yet)", "es"))
      .toBe("predeterminado (aún no se han ingerido filas)");
  });

  test("preserves known English notes and passes unknown backend text through verbatim", () => {
    const known = "No T10 evaluation available for the current store.";
    const unknown = "Backend extension note: keep exact casing and punctuation!";
    expect(localizeDashboardBackendText(known, "en")).toBe("No evaluation is available for the current data store.");
    expect(localizeDashboardBackendText(unknown, "es")).toBe(unknown);
  });

  test("preserves prototype property names as unknown backend text", () => {
    expect(localizeDashboardBackendText("constructor", "es")).toBe("constructor");
    expect(localizeDashboardBackendText("toString", "es")).toBe("toString");
  });
});
