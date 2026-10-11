import { describe, expect, test } from "bun:test";
import { localizeUnevaluatedReason } from "./evaluationReason";

describe("unevaluated analysis reason localization", () => {
  test("localizes every stable backend reason code in Spanish", () => {
    expect(localizeUnevaluatedReason("no_rows"))
      .toBe("Aún no hay filas; no se han evaluado las alertas ni el RUL.");
    expect(localizeUnevaluatedReason("insufficient_rest_samples"))
      .toBe("Muestras de reposo insuficientes; no se han evaluado las alertas ni el RUL.");
    expect(localizeUnevaluatedReason("analysis_unavailable"))
      .toBe("Analizador no disponible: no se pueden calcular alertas ni RUL");
  });

  test("does not expose an unknown backend diagnostic", () => {
    const diagnostic = "ModuleNotFoundError: private internal path";
    const message = localizeUnevaluatedReason(diagnostic) ?? "";
    expect(message).toBe("La evaluación no está disponible; se ocultan los detalles técnicos.");
    expect(message.includes(diagnostic)).toBe(false);
  });
});
