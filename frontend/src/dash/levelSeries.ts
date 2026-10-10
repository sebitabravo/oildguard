export interface LevelSeriesChartPoint {
  t_s: number;
  liters: number;
}

export function mergeLevelSeries(
  existing: readonly LevelSeriesChartPoint[],
  incoming: readonly LevelSeriesChartPoint[],
): LevelSeriesChartPoint[] {
  const pointsByTimestamp = new Map<number, LevelSeriesChartPoint>();
  for (const point of existing) pointsByTimestamp.set(point.t_s, point);
  for (const point of incoming) pointsByTimestamp.set(point.t_s, point);
  return [...pointsByTimestamp.values()].sort((a, b) => a.t_s - b.t_s);
}
