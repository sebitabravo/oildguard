import { describe, expect, test } from "bun:test";
import { assembleSyntheticReport, localizeReport } from "./logic";

const ENGLISH_ROLES = ["Reliability", "Planning", "Dispatch", "Operator"];

describe("report Spanish localization", () => {
  const report = assembleSyntheticReport();
  const es = localizeReport(report);

  test("renders role names in Spanish", () => {
    expect(es.timeline.map((step) => step.role)).toEqual(["Confiabilidad", "Planificación", "Despacho y supervisor", "Operador"]);
    for (const step of es.timeline) {
      for (const word of ENGLISH_ROLES) expect(step.role.includes(word)).toBe(false);
    }
  });

  test("renders the simulated window, escalation texts and checklist in Spanish", () => {
    expect(es.window).toBe("SIMULADO · 120 min");
    for (const step of es.timeline) expect(step.detail.length).toBeGreaterThan(0);
    for (const item of es.checklist) expect(item.length).toBeGreaterThan(0);
    expect(es.window.includes("SIMULATED")).toBe(false);
  });

  test("exposes minute ticks for the chart axes", () => {
    expect(es.minuteTicks).toEqual(["0 min", "30 min", "60 min", "90 min"]);
  });
});
