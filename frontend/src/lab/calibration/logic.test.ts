import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { t } from "../../i18n";
import { CalibrationVerdictPanel } from "./CalibrationPage";
import { calibrationVerdictEvidence, classifyCalibrationVerdict, fitSettlingTau, sampleSettlingCurve } from "./logic";

describe("pause calibration logic", () => {
  test("classifies nominal, slow and invalid settling windows", () => {
    expect(classifyCalibrationVerdict(0.75, 0.001)).toBe("nominal");
    expect(classifyCalibrationVerdict(0.9, 0.001)).toBe("slow");
    expect(classifyCalibrationVerdict(0.75, 7)).toBe("invalid");
    expect(classifyCalibrationVerdict(0.75, 0, "waiting")).toBe("waiting");
    expect(classifyCalibrationVerdict(0.75, 0, "motion")).toBe("invalid");
  });

  test("samples pressure in kPa on seconds after stop with a steady asymptote", () => {
    const samples = sampleSettlingCurve({ viscosityProxy: 1, baseVolumeL: 93.4, temperatureC: 75 });
    const lastSample = samples[samples.length - 1];
    expect(samples.length).toBeGreaterThan(2);
    expect(samples[0].timeS).toBe(0);
    expect(lastSample.timeS).toBe(4);
    expect(lastSample.pressureKpa).toBeCloseTo(lastSample.asymptoteKpa, 2);
  });

  test("fits tau from sampled relaxation without changing its seconds scale", () => {
    const samples = sampleSettlingCurve({ viscosityProxy: 1, baseVolumeL: 93.4, temperatureC: 75 });
    expect(fitSettlingTau(samples)).toBeCloseTo(0.75, 1);
    expect(classifyCalibrationVerdict(fitSettlingTau(samples), 0)).toBe("nominal");
  });

  test("marks model classifications synthetic while physical bench evaluation stays absent", () => {
    for (const [tau, residual, window, verdict] of [
      [0.75, 0.001, "available", "nominal"],
      [0.9, 0.001, "available", "slow"],
      [0.75, 0, "motion", "invalid"],
      [0.75, 0, "waiting", "waiting"],
    ] as const) {
      expect(calibrationVerdictEvidence(tau, residual, window)).toEqual({
        verdict,
        source: "synthetic-model",
        physicalBench: "not-evaluated",
      });
    }
  });

  test("renders a synthetic model verdict and physical NOT EVALUATED in Spanish", () => {
    // Solo español (S05): el encabezado sale de la copia del diccionario,
    // nunca de una cadena suelta.
    const verdictTitles = {
      nominal: "calibration.verdict.nominal",
      slow: "calibration.verdict.slow",
      invalid: "calibration.verdict.invalid",
      waiting: "calibration.verdict.waiting",
    } as const;
    for (const [tau, residual, window] of [
      [0.75, 0.001, "available"],
      [0.9, 0.001, "available"],
      [0.75, 0, "motion"],
      [0.75, 0, "waiting"],
    ] as const) {
      const evidence = calibrationVerdictEvidence(tau, residual, window);
      const html = renderToString(h(CalibrationVerdictPanel, { evidence, tauS: tau, residualL: residual }));
      expect(html).toContain("Resultado del modelo sintético");
      expect(html).toContain("Banco físico: No evaluado");
      expect(html.includes(`<h3>${t(verdictTitles[evidence.verdict])}</h3>`)).toBe(true);
    }
  });
});
