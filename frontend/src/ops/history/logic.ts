import type { DemoWheel, HistoryPoint, HistoryWindow } from "../../demo/demoData";
import { formatNumber } from "../../i18n/numberFormat";

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

const AXIS_HOURS: Record<"250h", number> = { "250h": 250 };

export function timeAxisLabels(window: HistoryWindow, points: HistoryPoint[], nowLabel: string): string[] {
  if (window === "250h") {
    const steps = 5;
    return [
      ...Array.from({ length: steps }, (_, step) => `−${formatNumber(AXIS_HOURS["250h"] * (1 - step / steps), 0)} h`),
      nowLabel,
    ];
  }
  if (!points.length) return [];
  const format = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", timeZone: "UTC" });
  return Array.from({ length: 5 }, (_, step) => {
    const index = Math.round((step / 4) * (points.length - 1));
    return format.format(new Date(points[index].at)).replace(".", "");
  });
}
