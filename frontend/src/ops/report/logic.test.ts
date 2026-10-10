import { describe, expect, test } from "bun:test";
import { assembleSyntheticReport } from "./logic";

describe("synthetic incident report", () => {
  test("assembles the canonical N1 to N4 simulated walk", () => {
    const report = assembleSyntheticReport("unknown-alert");
    expect(report.synthetic).toBe(true);
    expect(report.timeline.map((event) => event.level)).toEqual(["N1", "N2", "N3", "N4"]);
    expect(report.alertId).toBe("demo-alert-gdy106");
    expect(report.channels).toBe(3);
    expect(report.levelAtDetection).toBe(94.7);
    expect(report.litresLost).toBe(14.7);
    expect(report.timeToN4Minutes).toBe(90);
  });
});
