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
  domain?: readonly [number, number],
) {
  const upperValues = values.map((value, index) => value + (sigma[index] ?? 0));
  const lowerValues = values.map((value, index) => value - (sigma[index] ?? 0));
  // La banda debe usar el mismo dominio que la línea; si no, se desalinean.
  const min = domain?.[0] ?? Math.min(...lowerValues);
  const max = domain?.[1] ?? Math.max(...upperValues);
  const upper = scaledPointsInDomain(upperValues, width, height, padding, min, max);
  const lower = scaledPointsInDomain(lowerValues, width, height, padding, min, max).reverse();
  return [...upper, ...lower];
}

const NICE_STEPS = [1, 2, 2.5, 5, 10];

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  if (max === min) return [min];
  const raw = (max - min) / Math.max(1, count - 1);
  const exponent = Math.floor(Math.log10(raw));
  const magnitude = 10 ** exponent;
  const step = (NICE_STEPS.find((candidate) => candidate * magnitude >= raw * 0.75) ?? 10) * magnitude;
  const first = Math.ceil(min / step - 1e-9);
  const ticks: number[] = [];
  for (let index = first; index * step <= max + step * 1e-9; index += 1) {
    ticks.push(Math.round(index * step * 1e6) / 1e6 + 0);
  }
  return ticks;
}

export function percentFromTop(value: number, min: number, max: number): number {
  return 100 - ((value - min) / (max - min || 1)) * 100;
}

export function percentAlong(index: number, length: number): number {
  return length <= 1 ? 0 : (index / (length - 1)) * 100;
}

export function evenPositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => percentAlong(index, count));
}
