import { describe, expect, test } from "bun:test";
import { analyzerUnavailableNotice } from "./analyzerAvailability";

describe("analyzer availability notice", () => {
  test("returns the exact localized generic notice without exposing diagnostics", () => {
    const diagnostic = "ModuleNotFoundError: ai.ladder missing secret-path";
    const unavailable = {
      analysisAvailable: false,
      alertStatus: "unavailable",
      rulStatus: "unavailable",
      reason: diagnostic,
      note: "RUL unavailable: " + diagnostic,
    };

    const spanish = analyzerUnavailableNotice(unavailable);

    expect(spanish).toBe("Analizador no disponible: no se pueden calcular alertas ni RUL");
    expect(spanish?.includes(diagnostic)).toBe(false);
  });

  test("does not classify a healthy empty store or precision-suppressed RUL as an outage", () => {
    expect(analyzerUnavailableNotice({
      analysisAvailable: true,
      alertStatus: "ok",
      rulStatus: "suppressed",
      alertsEvaluated: false,
      rulEvaluated: false,
    })).toBe(null);
  });

  test("recognizes an unavailable endpoint even when health is not yet available", () => {
    expect(analyzerUnavailableNotice({ alertStatus: "unavailable" }))
      .toBe("Analizador no disponible: no se pueden calcular alertas ni RUL");
  });
});
