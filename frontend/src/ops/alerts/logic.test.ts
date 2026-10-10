import { describe, expect, test } from "bun:test";
import { DEMO_REFERENCE_MS, createDemoDataset } from "../../demo/dataset";
import type { DashAlert } from "../../sim/api";
import {
  LEVELS, ROUTING, ageParts, applyLocalActions, availableActions, buildDemoAlerts, countActiveByLevel,
  distribution7d, evaluateChannel, filterAlerts, formatTimestampUtc, hasPartialData, liveToRecord,
  appendLocalAction, mergeAlerts, parseAlertId, parseLocalActions, parseWheelParam, recurrenceRanking,
  reduceLifecycle, sortAlerts, type AlertFilters, type AlertRecord,
} from "./logic";
import { RULES } from "./rules";

const dataset = createDemoDataset();
const NOW = DEMO_REFERENCE_MS;
const records = buildDemoAlerts(dataset);
const noFilters: AlertFilters = { level: "all", lifecycle: "all", truck: "all", role: "all", query: "" };

function liveAlert(overrides: Partial<DashAlert> = {}): DashAlert {
  return {
    alert_id: "N2-w01",
    level: "N2",
    severity: "warning",
    t_s: 42,
    window_id: 1,
    zone: "LOAD",
    reason: "N2 confirmed leak: 2-of-3 channels same window 1",
    reason_message: { code: "ladder_n2_same_window_confirmation", params: { votes: 2, window: 1 } },
    model: "synthetic-proxy",
    inputs: { z_med: -4.1, level_med_L: 80.2, level_med_pct: 84.4, kurt_max: null, rms_med: 0.3, temp_drift_c: 0.2, trend_slope_L_per_h: -0.4 },
    thresholds: { z_thr: 3 },
    channels: { pressure_drop: true, level_trend: true, vib_impact: false, temp_drift_veto: false },
    ...overrides,
  };
}

describe("parseAlertId", () => {
  test("reads a plain id from the query string", () => {
    expect(parseAlertId("?id=alert-wheel-LH-01&lang=es")).toBe("alert-wheel-LH-01");
    expect(parseAlertId("id=N2-w01")).toBe("N2-w01");
  });
  test("rejects missing, empty, oversized or odd ids", () => {
    expect(parseAlertId("")).toBe(null);
    expect(parseAlertId("?id=")).toBe(null);
    expect(parseAlertId("?id=%3Cscript%3E")).toBe(null);
    expect(parseAlertId(`?id=${"a".repeat(200)}`)).toBe(null);
  });
});

describe("demo alert records", () => {
  test("cover every dataset alert plus a deterministic history, with unique ids", () => {
    expect(records.length).toBeGreaterThan(dataset.alerts.length);
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
    for (const alert of dataset.alerts) {
      const record = records.find((r) => r.id === alert.id);
      expect(record?.level).toBe(alert.level);
      expect(record?.recipient).toBe(alert.recipient);
      expect(record?.wheelId).toBe(alert.wheelId);
      expect(record?.source).toBe("demo");
    }
    expect(buildDemoAlerts(createDemoDataset())).toEqual(records);
  });

  test("never opens in the future and routes recipients by level", () => {
    for (const record of records) {
      expect(record.openedAt).toBeLessThanOrEqual(NOW);
      expect(record.audit.every((entry) => entry.at <= NOW)).toBe(true);
      expect(record.audit[0].action).toBe("created");
      expect(record.recipient).toBe(ROUTING[record.level]);
    }
  });

  test("audit trail agrees with the lifecycle", () => {
    for (const record of records) {
      const actions = record.audit.map((entry) => entry.action);
      expect(actions.includes("acknowledged")).toBe(record.lifecycle === "acknowledged" || record.lifecycle === "closed");
      expect(actions.includes("escalated")).toBe(record.lifecycle === "escalated");
      expect(actions.includes("closed")).toBe(record.lifecycle === "closed");
    }
  });

  test("displayed channel states are what the mirrored rules compute from the inputs", () => {
    for (const record of records) {
      for (const name of ["pressure_drop", "level_trend", "vib_impact", "temp_drift_veto"] as const) {
        expect(evaluateChannel(name, record.inputs)).toBe(record.channels[name]);
      }
    }
  });

  test("stays inside the seven-day window", () => {
    expect(records.every((r) => NOW - r.openedAt < 7 * 24 * 3_600_000)).toBe(true);
    expect(new Set(records.map((r) => r.level))).toEqual(new Set(LEVELS));
  });

  test("at least one record has missing inputs and is flagged partial", () => {
    expect(records.some(hasPartialData)).toBe(true);
    expect(hasPartialData(records.find((r) => !hasPartialData(r)) as AlertRecord)).toBe(false);
  });
});

describe("evaluateChannel", () => {
  const base = { z_med: -0.5, level_med_L: 90, level_med_pct: 94.7, kurt_max: 2, rms_med: 0.2, temp_drift_c: 0.1, trend_slope_L_per_h: 0, rul_hours_to_warning: null };
  test("applies the ladder thresholds", () => {
    expect(evaluateChannel("pressure_drop", { ...base, z_med: -(RULES.zThr + 0.1) })).toBe("fired");
    expect(evaluateChannel("pressure_drop", { ...base, z_med: -RULES.zThr })).toBe("quiet");
    expect(evaluateChannel("level_trend", { ...base, trend_slope_L_per_h: -0.01 })).toBe("fired");
    expect(evaluateChannel("level_trend", { ...base, level_med_pct: 49 })).toBe("fired");
    expect(evaluateChannel("vib_impact", { ...base, kurt_max: RULES.kurtSpike + 0.1 })).toBe("fired");
    expect(evaluateChannel("vib_impact", { ...base, rms_med: RULES.rmsHighG + 0.1 })).toBe("fired");
    expect(evaluateChannel("vib_impact", base)).toBe("quiet");
  });
  test("the temperature veto needs drift and a pressure that is not falling", () => {
    expect(evaluateChannel("temp_drift_veto", { ...base, temp_drift_c: 2 })).toBe("fired");
    expect(evaluateChannel("temp_drift_veto", { ...base, temp_drift_c: 2, z_med: -5 })).toBe("quiet");
    expect(evaluateChannel("temp_drift_veto", { ...base, temp_drift_c: 1.5 })).toBe("quiet");
  });
  test("reports no-data when the inputs are missing", () => {
    expect(evaluateChannel("pressure_drop", { ...base, z_med: null })).toBe("no-data");
    expect(evaluateChannel("vib_impact", { ...base, kurt_max: null, rms_med: null })).toBe("no-data");
  });
});

describe("liveToRecord", () => {
  test("maps backend channels, reason message and routing", () => {
    const record = liveToRecord(liveAlert(), NOW);
    expect(record?.source).toBe("live");
    expect(record?.id).toBe("N2-w01");
    expect(record?.channels).toEqual({ pressure_drop: "fired", level_trend: "fired", vib_impact: "quiet", temp_drift_veto: "quiet" });
    expect(record?.votes).toBe(2);
    expect(record?.recipient).toBe("Planning");
    expect(record?.reason.code).toBe("ladder_n2_same_window_confirmation");
    expect(record?.wheelId).toBe(null);
    expect(record?.lifecycle).toBe("open");
    expect(record?.tS).toBe(42);
  });
  test("keeps null inputs and marks channels as no-data when the backend sent none", () => {
    const record = liveToRecord(liveAlert({ channels: null }), NOW);
    expect(record?.channels.pressure_drop).toBe("no-data");
    expect(record && hasPartialData(record)).toBe(true);
    expect(liveToRecord(liveAlert({ level: "N9" }), NOW)).toBe(null);
  });
  test("joins array message params and falls back to the English reason for unknown codes", () => {
    const joined = liveToRecord(liveAlert({
      reason_message: { code: "ladder_n2_confirmed_persistence", params: { windows: [0, 1] } },
    }), NOW);
    expect(joined?.reason.params.windows).toBe("0+1");
    const unknown = liveToRecord(liveAlert({ reason_message: { code: "other", params: {} } }), NOW);
    expect(unknown?.reason.code).toBe(null);
    expect(unknown?.reason.fallback).toContain("N2 confirmed leak");
  });
});

describe("filters, sorting and counters", () => {
  test("filters by level, lifecycle, truck, role and text", () => {
    expect(filterAlerts(records, { ...noFilters, level: "N4" }).every((r) => r.level === "N4")).toBe(true);
    expect(filterAlerts(records, { ...noFilters, lifecycle: "closed" }).every((r) => r.lifecycle === "closed")).toBe(true);
    expect(filterAlerts(records, { ...noFilters, truck: "OG-03" }).every((r) => r.truckId === "OG-03")).toBe(true);
    expect(filterAlerts(records, { ...noFilters, role: "Operator" }).every((r) => r.owner === "Operator")).toBe(true);
    const one = records[0];
    expect(filterAlerts(records, { ...noFilters, query: ` ${one.id.toUpperCase()} ` }).map((r) => r.id)).toContain(one.id);
    expect(filterAlerts(records, { ...noFilters, query: "no-such-thing" })).toEqual([]);
    expect(filterAlerts(records, noFilters)).toEqual(records);
  });

  test("sorts active alerts first, worst level first, newest first", () => {
    const sorted = sortAlerts(records);
    const firstClosed = sorted.findIndex((r) => r.lifecycle === "closed");
    expect(sorted.slice(firstClosed).every((r) => r.lifecycle === "closed")).toBe(true);
    const active = sorted.slice(0, firstClosed);
    for (let i = 1; i < active.length; i += 1) {
      const a = LEVELS.indexOf(active[i - 1].level);
      const b = LEVELS.indexOf(active[i].level);
      expect(a >= b).toBe(true);
      if (a === b) expect(active[i - 1].openedAt >= active[i].openedAt).toBe(true);
    }
  });

  test("counts active (not closed) alerts per level", () => {
    const counts = countActiveByLevel(records);
    for (const level of LEVELS) {
      expect(counts[level]).toBe(records.filter((r) => r.level === level && r.lifecycle !== "closed").length);
    }
  });

  test("seven-day distribution counts every level and shares add up", () => {
    const dist = distribution7d(records, NOW);
    expect(dist.total).toBe(records.length);
    expect(LEVELS.reduce((sum, level) => sum + dist.byLevel[level].count, 0)).toBe(dist.total);
    expect(LEVELS.reduce((sum, level) => sum + dist.byLevel[level].share, 0)).toBeCloseTo(1, 6);
    const old = { ...records[0], id: "old", openedAt: NOW - 8 * 24 * 3_600_000 };
    expect(distribution7d([old], NOW).total).toBe(0);
    expect(distribution7d([], NOW).byLevel.N1.share).toBe(0);
  });

  test("recurrence ranking orders wheels by alert count and skips live rows", () => {
    const ranking = recurrenceRanking(records, 5);
    expect(ranking.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < ranking.length; i += 1) expect(ranking[i - 1].count >= ranking[i].count).toBe(true);
    const wheel = ranking[0];
    expect(wheel.count).toBe(records.filter((r) => r.wheelId === wheel.wheelId).length);
    expect(wheel.levels.every((level) => LEVELS.includes(level))).toBe(true);
    const live = liveToRecord(liveAlert(), NOW) as AlertRecord;
    expect(recurrenceRanking([live], 5)).toEqual([]);
  });
});

describe("age and timestamps", () => {
  test("uses now, minutes, hours and days", () => {
    expect(ageParts(NOW - 20_000, NOW)).toEqual({ unit: "now", value: 0 });
    expect(ageParts(NOW - 5 * 60_000, NOW)).toEqual({ unit: "min", value: 5 });
    expect(ageParts(NOW - 3 * 3_600_000 - 1000, NOW)).toEqual({ unit: "h", value: 3 });
    expect(ageParts(NOW - 50 * 3_600_000, NOW)).toEqual({ unit: "d", value: 2 });
    expect(ageParts(NOW + 5000, NOW)).toEqual({ unit: "now", value: 0 });
  });
  test("formats UTC timestamps", () => {
    expect(formatTimestampUtc(DEMO_REFERENCE_MS)).toBe("2026-01-15 12:00 UTC");
  });
});

describe("local demo lifecycle", () => {
  test("reducer allows only meaningful transitions", () => {
    expect(reduceLifecycle("open", "acknowledge")).toBe("acknowledged");
    expect(reduceLifecycle("open", "escalate")).toBe("escalated");
    expect(reduceLifecycle("acknowledged", "close")).toBe("closed");
    expect(reduceLifecycle("escalated", "acknowledge")).toBe("acknowledged");
    expect(reduceLifecycle("closed", "acknowledge")).toBe(null);
    expect(reduceLifecycle("open", "close")).toBe(null);
    expect(availableActions("open")).toEqual(["acknowledge", "escalate"]);
    expect(availableActions("closed")).toEqual([]);
  });

  test("applies stored actions to a demo record and extends the audit trail", () => {
    const base = records.find((r) => r.lifecycle === "open") as AlertRecord;
    const next = applyLocalActions(base, [{ action: "escalate", at: NOW + 60_000 }, { action: "acknowledge", at: NOW + 120_000 }]);
    expect(next.lifecycle).toBe("acknowledged");
    expect(next.audit.slice(-2).map((e) => e.action)).toEqual(["escalated", "acknowledged"]);
    expect(next.audit.slice(-2).every((e) => e.local === true)).toBe(true);
    expect(next.owner).not.toBe(base.owner);
    expect(base.lifecycle).toBe("open");
  });

  test("ignores invalid stored actions and never touches live records", () => {
    const base = records.find((r) => r.lifecycle === "closed") as AlertRecord;
    expect(applyLocalActions(base, [{ action: "acknowledge", at: NOW }])).toEqual(base);
    const live = liveToRecord(liveAlert(), NOW) as AlertRecord;
    expect(applyLocalActions(live, [{ action: "acknowledge", at: NOW }])).toEqual(live);
  });

  test("parses persisted actions defensively", () => {
    expect(parseLocalActions(null)).toEqual({});
    expect(parseLocalActions("not json")).toEqual({});
    expect(parseLocalActions("[]")).toEqual({});
    expect(parseLocalActions(JSON.stringify({
      a: [{ action: "acknowledge", at: 5 }, { action: "explode", at: 1 }, { action: "close" }],
      b: "nope",
    }))).toEqual({ a: [{ action: "acknowledge", at: 5 }] });
  });
});

describe("wheel pre-filter and merging", () => {
  test("reads the wheel query parameter defensively", () => {
    expect(parseWheelParam("?wheel=wheel-LH-01")).toBe("wheel-LH-01");
    expect(parseWheelParam("?wheel=%3Cb%3E")).toBe(null);
    expect(parseWheelParam("")).toBe(null);
  });

  test("filters by wheel id", () => {
    const wheelId = records[0].wheelId as string;
    const filtered = filterAlerts(records, { ...noFilters, wheel: wheelId });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.wheelId === wheelId)).toBe(true);
  });

  test("live rows come first and win over demo rows with the same id", () => {
    const live = liveToRecord(liveAlert({ alert_id: records[0].id }), NOW) as AlertRecord;
    const merged = mergeAlerts([live], records);
    expect(merged.length).toBe(records.length);
    expect(merged.filter((r) => r.id === live.id)).toEqual([live]);
    expect(mergeAlerts([], records)).toEqual(records);
  });

  test("appends a local action without mutating the stored map", () => {
    const stored = { x: [{ action: "acknowledge" as const, at: 1 }] };
    const next = appendLocalAction(stored, "x", "close", 2);
    expect(next.x).toEqual([{ action: "acknowledge", at: 1 }, { action: "close", at: 2 }]);
    expect(stored.x.length).toBe(1);
    expect(appendLocalAction({}, "y", "escalate", 3)).toEqual({ y: [{ action: "escalate", at: 3 }] });
  });

  test("trend alerts carry the zone their message needs", () => {
    for (const record of records) {
      expect(record.reason.code).not.toBe(null);
      if (record.level === "N1") expect(typeof record.reason.params.zone).toBe("string");
    }
  });
});
