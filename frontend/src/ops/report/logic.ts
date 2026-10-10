export interface SyntheticReportEvent {
  level: "N1" | "N2" | "N3" | "N4";
  atMinutes: number;
  roleKey: "reliability" | "planning" | "dispatch" | "operator";
  detailKey: "persistence" | "channels" | "rul" | "drop";
}

export interface SyntheticReport {
  synthetic: true;
  alertId: string;
  wheelId: string;
  window: string;
  levelAtDetection: number;
  levelAtN4: number;
  litresLost: number;
  timeToN4Minutes: number;
  channels: number;
  timeline: SyntheticReportEvent[];
  levelSeries: number[];
  pressureSeries: number[];
  checklist: Array<"identity" | "lubricant" | "instrumentation" | "findings">;
}

export function assembleSyntheticReport(alertId?: string): SyntheticReport {
  return {
    synthetic: true,
    alertId: alertId && alertId !== "unknown-alert" ? alertId : "demo-alert-gdy106",
    wheelId: "wheel-RH-01",
    window: "SIMULATED · 120 min",
    levelAtDetection: 94.7,
    levelAtN4: 80,
    litresLost: 14.7,
    timeToN4Minutes: 90,
    channels: 3,
    timeline: [
      { level: "N1", atMinutes: 0, roleKey: "reliability", detailKey: "persistence" },
      { level: "N2", atMinutes: 30, roleKey: "planning", detailKey: "channels" },
      { level: "N3", atMinutes: 60, roleKey: "dispatch", detailKey: "rul" },
      { level: "N4", atMinutes: 90, roleKey: "operator", detailKey: "drop" },
    ],
    levelSeries: [94.7, 94.2, 93.5, 92.8, 91.6, 90.3, 88.7, 86.4, 83.5, 80],
    pressureSeries: [2.7, 2.7, 2.65, 2.6, 2.55, 2.45, 2.35, 2.2, 2.05, 1.9],
    checklist: ["identity", "lubricant", "instrumentation", "findings"],
  };
}
