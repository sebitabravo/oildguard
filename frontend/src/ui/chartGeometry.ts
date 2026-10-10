export interface ChartPoint { x: number; y: number; }

export interface ChartFrame {
  width: number;
  height: number;
  padding: { left: number; right: number; top: number; bottom: number };
}

export function chartFrame(width: number, height: number): ChartFrame {
  return {
    width,
    height,
    padding: { left: 38, right: 14, top: 12, bottom: 24 },
  };
}

export function scaledPoints(
  values: readonly number[],
  width: number,
  height: number,
  padding = { left: 0, right: 0, top: 0, bottom: 0 },
): ChartPoint[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const innerHeight = Math.max(1, height - padding.top - padding.bottom);
  return values.map((value, index) => ({
    x: padding.left + (values.length === 1 ? innerWidth / 2 : (index / (values.length - 1)) * innerWidth),
    y: padding.top + innerHeight - ((value - min) / span) * innerHeight,
  }));
}

export function scaledPointsInDomain(
  values: readonly number[],
  width: number,
  height: number,
  padding: { left: number; right: number; top: number; bottom: number },
  min: number,
  max: number,
): ChartPoint[] {
  if (!values.length) return [];
  const span = max - min || 1;
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const innerHeight = Math.max(1, height - padding.top - padding.bottom);
  return values.map((value, index) => ({
    x: padding.left + (values.length === 1 ? innerWidth / 2 : (index / (values.length - 1)) * innerWidth),
    y: padding.top + innerHeight - ((value - min) / span) * innerHeight,
  }));
}

export function linePath(points: readonly ChartPoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function confidenceBand(
  values: readonly number[],
  sigma: readonly number[],
  width: number,
  height: number,
  padding = { left: 0, right: 0, top: 0, bottom: 0 },
) {
  const upperValues = values.map((value, index) => value + (sigma[index] ?? 0));
  const lowerValues = values.map((value, index) => value - (sigma[index] ?? 0));
  const min = Math.min(...lowerValues);
  const max = Math.max(...upperValues);
  const upper = scaledPointsInDomain(upperValues, width, height, padding, min, max);
  const lower = scaledPointsInDomain(lowerValues, width, height, padding, min, max).reverse();
  return [...upper, ...lower];
}
