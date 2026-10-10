export interface ChartPoint { x: number; y: number; }

export function scaledPoints(values: readonly number[], width: number, height: number): ChartPoint[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
    y: height - ((value - min) / span) * height,
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
) {
  const upper = scaledPoints(values.map((value, index) => value + (sigma[index] ?? 0)), width, height);
  const lower = scaledPoints(values.map((value, index) => value - (sigma[index] ?? 0)), width, height).reverse();
  return [...upper, ...lower];
}
