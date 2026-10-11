import { describe, expect, test } from "bun:test";
import { createDemoDataset } from "../../demo/dataset";
import { dictKeys } from "../../i18n";
import { ageLabel, lifecycleLabel, localizeReason, roleLabel } from "./localize";
import { LIFECYCLES, REASON_CODES, buildDemoAlerts, liveToRecord, type AlertRecord } from "./logic";

const records = buildDemoAlerts(createDemoDataset());

describe("localizeReason", () => {
  test("never leaves a placeholder behind", () => {
    for (const record of records) {
      const text = localizeReason(record);
      expect(text.length).toBeGreaterThan(0);
      expect(/[{}]/.test(text)).toBe(false);
    }
  });

  test("formats decimals with the Spanish separator", () => {
    const n4 = records.find((r) => r.level === "N4") as AlertRecord;
    expect(/\d,\d/.test(localizeReason(n4))).toBe(true);
    expect(/\d\.\d/.test(localizeReason(n4))).toBe(false);
  });

  test("uses the backend fallback text when the code is unknown", () => {
    const live = liveToRecord({
      alert_id: "x", level: "N2", severity: "warning", t_s: 1, window_id: 0, zone: "LOAD", reason: "Plain reason",
      reason_message: { code: "something_else", params: {} }, model: "m", inputs: {}, thresholds: {}, channels: null,
    }, 0) as AlertRecord;
    expect(localizeReason(live)).toBe("Plain reason");
  });

  test("covers every ladder reason code with a dictionary entry", () => {
    const keys = new Set<string>(dictKeys());
    for (const code of REASON_CODES) expect(keys.has(code)).toBe(true);
  });
});

describe("labels", () => {
  test("localizes roles and lifecycle states in Spanish", () => {
    expect(roleLabel("Planning")).toBe("Planificación");
    expect(roleLabel("Reliability")).toBe("Confiabilidad");
    expect(roleLabel("Dispatch & supervisor")).toBe("Despacho y supervisor");
    expect(roleLabel("Operator")).toBe("Operador");
    const states = LIFECYCLES.map((state) => lifecycleLabel(state));
    for (const label of states) expect(label.length).toBeGreaterThan(0);
    expect(new Set(states).size).toBe(LIFECYCLES.length);
  });

  test("age uses the Spanish units", () => {
    expect(ageLabel({ unit: "now", value: 0 })).toBe("ahora mismo");
    expect(ageLabel({ unit: "min", value: 5 })).toBe("hace 5 min");
    expect(ageLabel({ unit: "h", value: 3 })).toBe("hace 3 h");
    expect(ageLabel({ unit: "d", value: 2 })).toBe("hace 2 d");
  });
});
