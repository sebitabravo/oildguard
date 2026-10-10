import { describe, expect, test } from "bun:test";
import { RULES } from "./rules";

declare const Bun: { file(path: URL): { text(): Promise<string> } };

const root = new URL("../../../../", import.meta.url);

async function python(file: string): Promise<string> {
  return Bun.file(new URL(`ai/${file}`, root)).text();
}

// Lee `NOMBRE = 1.5` o `NOMBRE: float = 1.5` de un archivo Python.
function constant(source: string, name: string): number {
  const match = source.match(new RegExp(`^${name}\\s*(?::[^=]+)?=\\s*(-?[0-9]+(?:\\.[0-9]+)?)`, "m"));
  if (!match) throw new Error(`constant ${name} not found`);
  return Number(match[1]);
}

describe("rule mirror stays in sync with the Python analyzer", () => {
  test("level.py thresholds", async () => {
    const level = await python("level.py");
    expect(RULES.capacityL).toBe(constant(level, "CAPACITY_L"));
    expect(RULES.warnPct).toBe(constant(level, "WARN_PCT"));
    expect(RULES.critPct).toBe(constant(level, "CRIT_PCT"));
    expect(RULES.minBaselineN).toBe(constant(level, "MIN_BASELINE_N"));
    expect(RULES.maxSigmaL).toBe(constant(level, "SIGMA_L_SUPPRESS_L"));
  });

  test("ladder.py thresholds", async () => {
    const ladder = await python("ladder.py");
    expect(RULES.zThr).toBe(constant(ladder, "Z_THR"));
    expect(RULES.warnPct).toBe(constant(ladder, "WARN_PCT"));
    expect(RULES.critPct).toBe(constant(ladder, "CRIT_PCT"));
    expect(RULES.abruptStepL).toBe(constant(ladder, "ABRUPT_STEP_L"));
    expect(RULES.zExtreme).toBe(constant(ladder, "Z_EXTREME"));
    expect(RULES.kurtSpike).toBe(constant(ladder, "KURT_SPIKE"));
    expect(RULES.rmsHighG).toBe(constant(ladder, "RMS_HIGH_G"));
    expect(RULES.tempDriftC).toBe(constant(ladder, "TEMP_DRIFT_C"));
    expect(RULES.shiftH).toBe(constant(ladder, "SHIFT_H"));
    expect(ladder).toContain("confirm_votes >= 2");
    expect(RULES.minVotes).toBe(2);
    expect(ladder).toContain('LADDER = ["N1", "N2", "N3", "N4"]');
  });

  test("rul.py thresholds", async () => {
    const rul = await python("rul.py");
    expect(RULES.capacityL).toBe(constant(rul, "CAPACITY_L"));
    expect(RULES.shiftH).toBe(constant(rul, "SHIFT_H"));
    expect(RULES.cycleS).toBe(constant(rul, "CYCLE_S"));
    expect(RULES.minScoredN).toBe(constant(rul, "MIN_SCORED_N"));
    expect(RULES.minR2).toBe(constant(rul, "MIN_R2"));
    expect(RULES.maxSigmaL).toBe(constant(rul, "MAX_SIGMA_L"));
    expect(RULES.warnL).toBe(RULES.capacityL * constant(rul.replace("WARN_L = CAPACITY_L * ", "WARN_L_FACTOR = "), "WARN_L_FACTOR"));
    expect(RULES.critL).toBe(RULES.capacityL * constant(rul.replace("CRIT_L = CAPACITY_L * ", "CRIT_L_FACTOR = "), "CRIT_L_FACTOR"));
  });

  test("derived litre levels agree with the percentages", () => {
    expect(RULES.warnL).toBe((RULES.warnPct / 100) * RULES.capacityL);
    expect(RULES.critL).toBe((RULES.critPct / 100) * RULES.capacityL);
  });
});
