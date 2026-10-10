import { describe, expect, test } from "bun:test";
import { createDemoDataset } from "../../demo/dataset";
import { dictKeys } from "../../i18n";
import { ageLabel, lifecycleLabel, localizeReason, roleLabel } from "./localize";
import { LIFECYCLES, REASON_CODES, ROLES, buildDemoAlerts, liveToRecord, type AlertRecord } from "./logic";

const records = buildDemoAlerts(createDemoDataset());

describe("localizeReason", () => {
  test("never leaves a placeholder behind in either language", () => {
    for (const record of records) {
      for (const lang of ["en", "es"] as const) {
        const text = localizeReason(record, lang);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/[{}]/);
      }
    }
  });

  test("formats decimals with the language separator", () => {
    const n4 = records.find((r) => r.level === "N4") as AlertRecord;
    expect(localizeReason(n4, "en")).toMatch(/\d\.\d/);
    expect(localizeReason(n4, "es")).toMatch(/\d,\d/);
    expect(localizeReason(n4, "es")).not.toMatch(/\d\.\d/);
  });

  test("uses the backend fallback text when the code is unknown", () => {
    const live = liveToRecord({
      alert_id: "x", level: "N2", severity: "warning", t_s: 1, window_id: 0, zone: "LOAD", reason: "Plain reason",
      reason_message: { code: "something_else", params: {} }, model: "m", inputs: {}, thresholds: {}, channels: null,
    }, 0) as AlertRecord;
    expect(localizeReason(live, "en")).toBe("Plain reason");
  });

  test("covers every ladder reason code with a dictionary entry", () => {
    const keys = new Set<string>(dictKeys());
    for (const code of REASON_CODES) expect(keys.has(code)).toBe(true);
  });
});

describe("labels", () => {
  test("localize roles and lifecycle states in both languages", () => {
    expect(roleLabel("Planning", "es")).toBe("Planificación");
    expect(roleLabel("Reliability", "es")).toBe("Confiabilidad");
    expect(roleLabel("Dispatch & supervisor", "es")).toBe("Despacho y supervisor");
    expect(roleLabel("Operator", "es")).toBe("Operador");
    for (const role of ROLES) expect(roleLabel(role, "en")).toBe(role);
    for (const state of LIFECYCLES) {
      expect(lifecycleLabel(state, "en").length).toBeGreaterThan(0);
      expect(lifecycleLabel(state, "es")).not.toBe(lifecycleLabel(state, "en"));
    }
  });

  test("age uses the language units", () => {
    expect(ageLabel({ unit: "now", value: 0 }, "en")).toBe("just now");
    expect(ageLabel({ unit: "min", value: 5 }, "es")).toBe("hace 5 min");
    expect(ageLabel({ unit: "h", value: 3 }, "en")).toBe("3 h ago");
    expect(ageLabel({ unit: "d", value: 2 }, "es")).toBe("hace 2 d");
  });
});
