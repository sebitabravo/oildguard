import { describe, expect, test } from "bun:test";
import { demoDataset } from "../../demo/dataset";
import {
  LIVE_WHEEL_ID,
  alertBannerKey,
  channelStatesFrom,
  demoWheelTrace,
  formatUtcTime,
  highestLevel,
  isLiveWheel,
  ladderRows,
  levelValidity,
  rawTelemetryText,
  resolveWheel,
  settlingTauSeconds,
  wheelLinks,
} from "./logic";

const wheels = demoDataset.wheels;

describe("wheel selection", () => {
  test("resolves a known wheel and falls back to the live RH-01 wheel", () => {
    expect(resolveWheel("wheel-LH-02", wheels).id).toBe("wheel-LH-02");
    expect(resolveWheel("wheel-ZZ-99", wheels).id).toBe(LIVE_WHEEL_ID);
    expect(resolveWheel(null, wheels).id).toBe(LIVE_WHEEL_ID);
  });

  test("only wheel-RH-01 is the live device", () => {
    expect(isLiveWheel("wheel-RH-01")).toBe(true);
    expect(isLiveWheel("wheel-LH-02")).toBe(false);
  });

  test("builds encoded links to history and alerts for the selected wheel", () => {
    expect(wheelLinks("wheel-RH-01")).toEqual({
      history: "/wheel/history?wheel=wheel-RH-01",
      alerts: "/alerts?wheel=wheel-RH-01",
    });
    expect(wheelLinks("a b").history).toBe("/wheel/history?wheel=a%20b");
  });
});

describe("escalation ladder state", () => {
  test("picks the highest known level and ignores unknown ones", () => {
    expect(highestLevel([{ level: "N1" }, { level: "N3" }, { level: "N2" }])).toBe("N3");
    expect(highestLevel([{ level: "N1" }, { level: "N4" }])).toBe("N4");
    expect(highestLevel([{ level: "X9" }])).toBe(null);
    expect(highestLevel([])).toBe(null);
  });

  test("marks exactly one ladder level active, or none when nominal", () => {
    const rows = ladderRows("N2");
    expect(rows.map((row) => row.level)).toEqual(["N1", "N2", "N3", "N4"]);
    expect(rows.filter((row) => row.active).map((row) => row.level)).toEqual(["N2"]);
    expect(ladderRows(null).some((row) => row.active)).toBe(false);
  });

  test("maps each level to its own banner copy", () => {
    expect(alertBannerKey("N2")).toBe("wheel.banner.N2");
    expect(alertBannerKey("N4")).toBe("wheel.banner.N4");
  });
});

describe("channel fusion", () => {
  test("derives real channel states from the latest alert", () => {
    const states = channelStatesFrom([
      { channels: { pressure_drop: true, level_trend: true, vib_impact: false, temp_drift_veto: false } },
      { channels: { pressure_drop: true, level_trend: true, vib_impact: true, temp_drift_veto: false } },
    ]);
    expect(states).toEqual({ pressure_drop: "fired", level_trend: "fired", vib_impact: "fired", temp_drift_veto: "quiet" });
  });

  test("reports no data when there is no alert or channel payload", () => {
    expect(channelStatesFrom([]).pressure_drop).toBe("no-data");
    expect(channelStatesFrom([{ channels: null }]).temp_drift_veto).toBe("no-data");
  });
});

describe("telemetry derivations", () => {
  test("settling tau is 0.75 s at the 60 C reference and shrinks as oil warms", () => {
    expect(settlingTauSeconds(60)).toBeCloseTo(0.75, 2);
    expect(settlingTauSeconds(80)).toBeLessThan(settlingTauSeconds(70));
    expect(settlingTauSeconds(40)).toBeGreaterThan(settlingTauSeconds(60));
    expect(settlingTauSeconds(Number.NaN)).toBeCloseTo(0.75, 2);
  });

  test("classifies level validity from regime, confidence and freshness", () => {
    expect(levelValidity({ moving: false, confidence: 0.9, stale: false })).toBe("valid");
    expect(levelValidity({ moving: true, confidence: 0.9, stale: false })).toBe("estimate");
    expect(levelValidity({ moving: false, confidence: 0.9, stale: true })).toBe("stale");
    expect(levelValidity({ moving: false, confidence: 0, stale: false })).toBe("invalid");
  });

  test("formats the last update as a UTC clock", () => {
    expect(formatUtcTime(Date.UTC(2026, 0, 15, 12, 4, 31))).toBe("12:04:31 UTC");
    expect(formatUtcTime(null)).toBe("—");
  });

  test("serializes raw rows as one compact JSON line each", () => {
    const text = rawTelemetryText([{ t_s: 1, level_l: 94.8 }, { t_s: 2, level_l: 94.7 }]);
    expect(text.split("\n")).toEqual(['{"t_s":1,"level_l":94.8}', '{"t_s":2,"level_l":94.7}']);
    expect(rawTelemetryText([])).toBe("");
  });
});

describe("demo wheel trace", () => {
  const wheel = resolveWheel("wheel-LH-02", wheels);
  const trace = demoWheelTrace(wheel);

  test("covers 60 minutes at one point per minute and ends near the wheel level", () => {
    expect(trace.points.length).toBe(61);
    expect(trace.points[0].t_s).toBe(0);
    expect(trace.points[60].t_s).toBe(3600);
    expect(Math.abs(trace.points[60].liters - wheel.levelL)).toBeLessThan(0.6);
    expect(trace.points.every((point) => point.liters <= 95.5 && point.liters > 0)).toBe(true);
  });

  test("alternates ordered, non-overlapping rest windows inside the span", () => {
    expect(trace.windows.length).toBeGreaterThan(2);
    trace.windows.forEach((window, index) => {
      expect(window.state).toBe("rest");
      expect(window.start_t_s).toBeLessThan(window.end_t_s);
      expect(window.end_t_s).toBeLessThanOrEqual(3600);
      if (index > 0) expect(window.start_t_s).toBeGreaterThan(trace.windows[index - 1].end_t_s);
    });
  });

  test("is deterministic per wheel", () => {
    expect(demoWheelTrace(wheel)).toEqual(trace);
  });
});
