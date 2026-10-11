import { settlingTau, VISC_MAX, VISC_MIN } from "../../sim/bench/settling";
import { V_HOLDUP_MAX_L } from "../../sim/signals";
import { pressureKpaFromVolume } from "../../twin/physics";

const SAMPLE_END_S = 4;
const SAMPLE_COUNT = 41;

export type CalibrationVerdict = "nominal" | "slow" | "invalid" | "waiting";
export type CalibrationWindowState = "available" | "waiting" | "motion";
export interface CalibrationVerdictEvidence {
  verdict: CalibrationVerdict;
  source: "synthetic-model";
  physicalBench: "not-evaluated";
}

export interface SettlingSample {
  timeS: number;
  pressureKpa: number;
  volumeL: number;
  asymptoteVolumeL: number;
  asymptoteKpa: number;
}

export function classifyCalibrationVerdict(
  tauS: number,
  residualL: number,
  windowState: CalibrationWindowState = "available",
): CalibrationVerdict {
  if (windowState === "waiting") return "waiting";
  if (windowState === "motion") return "invalid";
  if (!Number.isFinite(tauS) || !Number.isFinite(residualL) || residualL < 0 || residualL > V_HOLDUP_MAX_L) {
    return "invalid";
  }
  if (tauS < settlingTau(VISC_MIN) || tauS > settlingTau(VISC_MAX)) return "invalid";
  return tauS > settlingTau(1) + 1e-9 ? "slow" : "nominal";
}

export function calibrationVerdictEvidence(
  tauS: number,
  residualL: number,
  windowState: CalibrationWindowState = "available",
): CalibrationVerdictEvidence {
  // Una entrada viva no valida físicamente la curva sintética ni el veredicto derivado de ella.
  return {
    verdict: classifyCalibrationVerdict(tauS, residualL, windowState),
    source: "synthetic-model",
    physicalBench: "not-evaluated",
  };
}

export function sampleSettlingCurve({
  viscosityProxy,
  baseVolumeL,
  temperatureC,
}: {
  viscosityProxy: number;
  baseVolumeL: number;
  temperatureC: number;
}): SettlingSample[] {
  const tauS = settlingTau(viscosityProxy);
  const asymptoteKpa = pressureKpaFromVolume(baseVolumeL, temperatureC);
  return Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const timeS = SAMPLE_END_S * index / (SAMPLE_COUNT - 1);
    const holdUpL = V_HOLDUP_MAX_L * Math.exp(-timeS / tauS);
    const volumeL = baseVolumeL - holdUpL;
    return {
      timeS,
      volumeL,
      asymptoteVolumeL: baseVolumeL,
      pressureKpa: pressureKpaFromVolume(volumeL, temperatureC),
      asymptoteKpa,
    };
  });
}

export function fitSettlingTau(samples: SettlingSample[]): number {
  const asymptoteL = samples[0]?.asymptoteVolumeL;
  if (asymptoteL === undefined || samples.length < 3) return Number.NaN;
  const points = samples
    .filter((sample) => sample.timeS > 0)
    .map((sample) => ({ time: sample.timeS, logRemaining: Math.log(Math.max(Number.EPSILON, asymptoteL - sample.volumeL)) }));
  const meanTime = points.reduce((sum, point) => sum + point.time, 0) / points.length;
  const meanLog = points.reduce((sum, point) => sum + point.logRemaining, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.time - meanTime) * (point.logRemaining - meanLog), 0);
  const denominator = points.reduce((sum, point) => sum + (point.time - meanTime) ** 2, 0);
  const slope = numerator / denominator;
  return slope < 0 ? -1 / slope : Number.NaN;
}

export function settlingFitResidualL(samples: SettlingSample[], tauS: number): number {
  const asymptoteVolumeL = samples[0]?.asymptoteVolumeL;
  if (asymptoteVolumeL === undefined || !Number.isFinite(tauS) || tauS <= 0) return Number.NaN;
  const squaredErrors = samples.map((sample) => {
    const predicted = asymptoteVolumeL - V_HOLDUP_MAX_L * Math.exp(-sample.timeS / tauS);
    return (sample.volumeL - predicted) ** 2;
  });
  return Math.sqrt(squaredErrors.reduce((sum, error) => sum + error, 0) / squaredErrors.length);
}
