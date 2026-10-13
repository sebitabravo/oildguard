import { describe, expect, test } from "bun:test";
import { createDemoDataset } from "../../demo/demoData";
import { channelEvidence, inspectionSteps, liveSignalWindow, signalWindow } from "./detail";
import { buildDemoAlerts, evaluateChannel, type AlertRecord } from "./logic";
import { RULES } from "./rules";

const records = buildDemoAlerts(createDemoDataset());
const byLevel = (level: string) => records.find((r) => r.level === level) as AlertRecord;

describe("channelEvidence", () => {
  test("lists the three voting channels and the veto separately, each against its threshold", () => {
    for (const record of records) {
      const rows = channelEvidence(record);
      expect(rows.map((row) => row.channel)).toEqual(["pressure_drop", "level_trend", "vib_impact", "temp_drift_veto"]);
      expect(rows.every((row) => row.metrics.length > 0)).toBe(true);
      for (const row of rows) expect(row.state).toBe(record.channels[row.channel]);
    }
  });

  test("thresholds come from the mirrored rules", () => {
    const rows = channelEvidence(byLevel("N2"));
    const metric = (channel: string, key: string) =>
      rows.find((row) => row.channel === channel)?.metrics.find((m) => m.key === key);
    expect(metric("pressure_drop", "z_med")?.threshold).toBe(-RULES.zThr);
    expect(metric("level_trend", "level_med_pct")?.threshold).toBe(RULES.warnPct);
    expect(metric("vib_impact", "kurt_max")?.threshold).toBe(RULES.kurtSpike);
    expect(metric("vib_impact", "rms_med")?.threshold).toBe(RULES.rmsHighG);
    expect(metric("temp_drift_veto", "temp_drift_c")?.threshold).toBe(RULES.tempDriftC);
  });

  test("a metric is marked as crossing when the input passes the threshold", () => {
    const base = byLevel("N2");
    const record = { ...base, inputs: { ...base.inputs, z_med: -5, kurt_max: 1 } };
    const rows = channelEvidence(record);
    expect(rows[0].metrics.find((m) => m.key === "z_med")?.crossed).toBe(true);
    expect(rows[2].metrics.find((m) => m.key === "kurt_max")?.crossed).toBe(false);
  });

  test("missing inputs stay null instead of becoming zero", () => {
    const base = byLevel("N2");
    const record = { ...base, inputs: { ...base.inputs, z_med: null } };
    const metric = channelEvidence(record)[0].metrics.find((m) => m.key === "z_med");
    expect(metric?.value).toBe(null);
    expect(metric?.crossed).toBe(null);
    expect(evaluateChannel("pressure_drop", record.inputs)).toBe("no-data");
  });
});

describe("signalWindow", () => {
  test("is deterministic and ends at the trigger level", () => {
    const record = byLevel("N2");
    const window = signalWindow(record);
    expect(signalWindow(record)).toEqual(window);
    expect(window.levelL.length).toBeGreaterThan(10);
    expect(window.levelL[window.triggerIndex]).toBe(record.inputs.level_med_L as number);
    expect(window.zScore[window.triggerIndex]).toBe(record.inputs.z_med as number);
    expect(window.triggerIndex).toBeGreaterThan(0);
    expect(window.triggerIndex).toBeLessThan(window.levelL.length - 1);
  });

  test("level never rises on the way into the trigger", () => {
    const window = signalWindow(byLevel("N4"));
    for (let i = 1; i <= window.triggerIndex; i += 1) {
      expect(window.levelL[i]).toBeLessThanOrEqual(window.levelL[i - 1] + 1e-9);
    }
  });

  test("has no pressure series when the input is missing", () => {
    const base = byLevel("N2");
    const window = signalWindow({ ...base, inputs: { ...base.inputs, z_med: null } });
    expect(window.zScore).toEqual([]);
    expect(window.levelL.length).toBeGreaterThan(0);
  });
});

describe("liveSignalWindow", () => {
  const series = Array.from({ length: 40 }, (_, i) => ({
    t_s: i * 2, level_l: i === 5 ? null : 90 - i * 0.1, sigma_l: 0.3, moving: 0, recal_window: 0,
  }));

  test("centres on the alert time and fills gaps with the previous value", () => {
    const window = liveSignalWindow(series, 40);
    expect(window).not.toBe(null);
    expect(window?.levelL.every((value) => Number.isFinite(value))).toBe(true);
    expect(window?.levelL[window.triggerIndex]).toBeCloseTo(90 - 20 * 0.1, 5);
  });

  test("returns null without usable points", () => {
    expect(liveSignalWindow([], 10)).toBe(null);
    expect(liveSignalWindow([{ t_s: 1, level_l: null, sigma_l: null, moving: 0, recal_window: 0 }], 1)).toBe(null);
  });
});

describe("inspectionSteps", () => {
  test("every level has distinct steps and N4 asks for an inspection before dispatch", () => {
    for (const level of ["N1", "N2", "N3", "N4"] as const) {
      const steps = inspectionSteps(level);
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(new Set(steps).size).toBe(steps.length);
    }
    expect(inspectionSteps("N4")).toContain("beforeDispatch");
  });
});
