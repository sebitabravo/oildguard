import { describe, expect, test } from "bun:test";
import { classifyCalibrationVerdict, fitSettlingTau, sampleSettlingCurve } from "./logic";

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
});
