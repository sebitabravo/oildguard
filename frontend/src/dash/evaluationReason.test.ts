import { describe, expect, test } from "bun:test";
import { localizeUnevaluatedReason } from "./evaluationReason";

describe("unevaluated analysis reason localization", () => {
  test("localizes every stable backend reason code", () => {
    expect(localizeUnevaluatedReason("no_rows", "en"))
      .toBe("No rows yet; alerts and RUL have not been evaluated.");
    expect(localizeUnevaluatedReason("no_rows", "es"))
      .toBe("Aún no hay filas; no se han evaluado las alertas ni el RUL.");
    expect(localizeUnevaluatedReason("insufficient_rest_samples", "en"))
      .toBe("Insufficient rest samples; alerts and RUL have not been evaluated.");
    expect(localizeUnevaluatedReason("insufficient_rest_samples", "es"))
      .toBe("Muestras de reposo insuficientes; no se han evaluado las alertas ni el RUL.");
    expect(localizeUnevaluatedReason("analysis_unavailable", "en"))
      .toBe("Analyzer unavailable: alerts and RUL cannot be computed");
    expect(localizeUnevaluatedReason("analysis_unavailable", "es"))
      .toBe("Analizador no disponible: no se pueden calcular alertas ni RUL");
  });

  test("does not expose an unknown backend diagnostic", () => {
    const diagnostic = "ModuleNotFoundError: private internal path";
    const message = localizeUnevaluatedReason(diagnostic, "es") ?? "";
    expect(message).toBe("La evaluación no está disponible; se ocultan los detalles técnicos.");
    expect(message.includes(diagnostic)).toBe(false);
  });
});
