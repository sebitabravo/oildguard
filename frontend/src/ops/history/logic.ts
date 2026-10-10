import type { DemoWheel, HistoryPoint, HistoryWindow } from "../../demo/dataset";

export interface HistoryKpiInput {
  points: HistoryPoint[];
  hoursPerWindow: number;
}

export interface HistoryKpis {
  levelChange: number | null;
  meanLossRate: number | null;
  alerts: number;
  completeness: number;
}

export function sliceHistory(wheel: DemoWheel, window: HistoryWindow): HistoryPoint[] {
  return wheel.history[window];
}

export function historyKpis({ points, hoursPerWindow }: HistoryKpiInput): HistoryKpis {
  const observed = points.filter((point) => point.liters !== null);
  const first = observed[0]?.liters ?? null;
  const last = observed[observed.length - 1]?.liters ?? null;
  const levelChange = first !== null && last !== null ? last - first : null;
  const meanLossRate = levelChange === null || hoursPerWindow <= 0 ? null : Math.abs(levelChange) / hoursPerWindow * 100;
  return {
    levelChange,
    meanLossRate,
    alerts: points.filter((point) => point.event === "alert").length,
    completeness: points.length ? observed.length / points.length * 100 : 0,
  };
}
