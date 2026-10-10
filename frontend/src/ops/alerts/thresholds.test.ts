import { describe, expect, test } from "bun:test";
import { dictKeys } from "../../i18n";
import { RULES, RULE_SOURCES } from "./rules";
import { resolveThresholds, thresholdRows } from "./thresholds";

const livePayload = {
  status: "ok", kind: "config-thresholds", model: "synthetic-proxy", capacity_l: 95, warn_pct: 50, crit_pct: 30,
  warn_l: 47.5, crit_l: 28.5, min_scored_n: 10, min_baseline_n: 10, min_r2: 0.3, max_sigma_l: 2, z_thr: 3,
  z_extreme: 10, kurt_spike: 5, rms_high_g: 0.6, temp_drift_c: 1.5, abrupt_step_l: 5, shift_h: 8, cycle_s: 29,
  min_channels: 2, n2_votes_of: 3, channels: ["pressure_drop", "level_trend", "vib_impact"], temp_veto: true,
};

describe("resolveThresholds", () => {
  test("falls back to the mirrored constant when the backend did not answer", () => {
    for (const bad of [null, undefined, "x", 4, {}, { status: "ok" }]) {
      const resolved = resolveThresholds(bad);
      expect(resolved.source).toBe("constant");
      expect(resolved.values).toEqual(RULES);
    }
  });

  test("uses the backend values when the payload is complete", () => {
    const resolved = resolveThresholds({ ...livePayload, z_thr: 3.5, shift_h: 12 });
    expect(resolved.source).toBe("live");
    expect(resolved.values.zThr).toBe(3.5);
    expect(resolved.values.shiftH).toBe(12);
    expect(resolved.values.minVotes).toBe(2);
  });

  test("the payload from the documented contract equals the mirrored constant", () => {
    expect(resolveThresholds(livePayload).values).toEqual(RULES);
  });

  test("rejects a payload with a non-numeric or missing threshold", () => {
    expect(resolveThresholds({ ...livePayload, z_thr: "3" }).source).toBe("constant");
    const { shift_h: _omit, ...partial } = livePayload;
    expect(resolveThresholds(partial).source).toBe("constant");
    expect(resolveThresholds({ ...livePayload, kurt_spike: Number.NaN }).source).toBe("constant");
  });
});

describe("thresholdRows", () => {
  const rows = thresholdRows(RULES);

  test("shows every threshold of the mirror once", () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    const shown = rows.map((row) => row.value);
    for (const key of ["capacityL", "warnPct", "critPct", "zThr", "zExtreme", "kurtSpike", "rmsHighG", "tempDriftC",
      "abruptStepL", "minVotes", "shiftH", "cycleS", "minScoredN", "minR2", "maxSigmaL"] as const) {
      expect(shown).toContain(RULES[key]);
    }
  });

  test("carries live values, litres for the percentage rows and a known source file", () => {
    const live = thresholdRows({ ...RULES, warnPct: 55, warnL: 52.25 });
    const warn = live.find((row) => row.id === "warn");
    expect(warn?.value).toBe(55);
    expect(warn?.litres).toBe(52.25);
    for (const row of rows) expect(Object.keys(RULE_SOURCES)).toContain(row.source);
  });

  test("labels exist in both languages", () => {
    const keys = new Set<string>(dictKeys());
    for (const row of rows) {
      expect(keys.has(row.labelKey)).toBe(true);
      expect(keys.has(row.usedKey)).toBe(true);
    }
  });
});
