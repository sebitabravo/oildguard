import validation from "../fixtures/validation.json";

/** Banda de ±2σ de la guía de aceptación de docs/calibration.md §2. */
export const SCATTER_BAND_SIGMAS = 2;

export interface SeriesPoint {
  t_s: number;
  level_l: number | null;
  truth_liters: number | null;
  recal_window: number;
  sigma_l?: number | null;
}

export interface Pair {
  scenario: string;
  windowId: number;
  tS: number;
  estimateL: number;
  truthL: number;
  /** Estimación menos verdad del generador. */
  errorL: number;
  /** Semiancho de la banda ±2σ con el σ que reporta el backend; null si no lo trae. */
  bandL: number | null;
  /** Primera ventana de reposo: ancla los 95 L por construcción (ai/level.py), no es una prueba independiente. */
  baseline: boolean;
}

export interface Metrics {
  n: number;
  mae: number | null;
  bias: number | null;
  maxAbs: number | null;
  rmse: number | null;
  withinShare: number | null;
}

export interface WindowRow {
  scenario: string;
  windowId: number;
  startS: number;
  endS: number;
  n: number;
  truthMeanL: number;
  estimateMeanL: number;
  bias: number;
  mae: number;
  maxAbs: number;
  baseline: boolean;
}

export function computeMetrics(errors: readonly number[], bandL: number | null): Metrics {
  const n = errors.length;
  if (n === 0) return { n: 0, mae: null, bias: null, maxAbs: null, rmse: null, withinShare: null };
  const sum = errors.reduce((total, error) => total + error, 0);
  const absSum = errors.reduce((total, error) => total + Math.abs(error), 0);
  const squares = errors.reduce((total, error) => total + error * error, 0);
  return {
    n,
    mae: absSum / n,
    bias: sum / n,
    maxAbs: errors.reduce((max, error) => Math.max(max, Math.abs(error)), 0),
    rmse: Math.sqrt(squares / n),
    withinShare: bandL === null ? null : errors.filter((error) => Math.abs(error) <= bandL).length / n,
  };
}

/** Une estimación y verdad por fila de reposo; las filas sin verdad medida se descartan, nunca se inventan. */
export function pairSeries(points: readonly SeriesPoint[], scenario: string): Pair[] {
  const pairs: Pair[] = [];
  let windowId = 0;
  let inWindow = false;
  for (const point of points) {
    const rest = point.recal_window === 1;
    if (rest && !inWindow) windowId += 1;
    inWindow = rest;
    if (point.level_l === null || point.truth_liters === null) continue;
    pairs.push({
      scenario,
      windowId,
      tS: point.t_s,
      estimateL: point.level_l,
      truthL: point.truth_liters,
      errorL: point.level_l - point.truth_liters,
      bandL: point.sigma_l === null || point.sigma_l === undefined ? null : SCATTER_BAND_SIGMAS * point.sigma_l,
      baseline: windowId === 1,
    });
  }
  return pairs;
}

/** Métricas del conjunto, cada punto contra su propia banda; `bandL` es el semiancho medio. */
export function evaluate(pairs: readonly Pair[]): { metrics: Metrics; bandL: number | null } {
  const metrics = computeMetrics(pairs.map((pair) => pair.errorL), null);
  const banded = pairs.filter((pair): pair is Pair & { bandL: number } => pair.bandL !== null);
  if (banded.length === 0) return { metrics, bandL: null };
  const inside = banded.filter((pair) => Math.abs(pair.errorL) <= pair.bandL).length;
  return {
    metrics: { ...metrics, withinShare: inside / banded.length },
    bandL: banded.reduce((total, pair) => total + pair.bandL, 0) / banded.length,
  };
}

export function evaluationPairs(pairs: readonly Pair[]): Pair[] {
  return pairs.filter((pair) => !pair.baseline);
}

export function windowRows(pairs: readonly Pair[]): WindowRow[] {
  const groups = new Map<string, Pair[]>();
  for (const pair of pairs) {
    const key = `${pair.scenario}#${pair.windowId}`;
    groups.set(key, [...(groups.get(key) ?? []), pair]);
  }
  return [...groups.values()].map((group) => {
    const metrics = computeMetrics(group.map((pair) => pair.errorL), null);
    const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
    return {
      scenario: group[0].scenario,
      windowId: group[0].windowId,
      startS: group[0].tS,
      endS: group[group.length - 1].tS,
      n: group.length,
      truthMeanL: mean(group.map((pair) => pair.truthL)),
      estimateMeanL: mean(group.map((pair) => pair.estimateL)),
      bias: metrics.bias ?? 0,
      mae: metrics.mae ?? 0,
      maxAbs: metrics.maxAbs ?? 0,
      baseline: group[0].baseline,
    };
  });
}

export interface LiveSeriesPoint {
  t_s: number;
  level_l: number | null;
  sigma_l: number | null;
  moving?: number;
  recal_window: number;
  truth_liters?: number | null;
}

export function liveSeries(response: { series: readonly LiveSeriesPoint[] }): {
  points: SeriesPoint[];
  hasTruth: boolean;
  sigmaL: number | null;
} {
  const points = response.series.map((item) => ({
    t_s: item.t_s,
    level_l: item.level_l,
    truth_liters: item.truth_liters ?? null,
    recal_window: item.recal_window,
    sigma_l: item.sigma_l,
  }));
  return {
    points,
    hasTruth: points.some((item) => item.truth_liters !== null),
    sigmaL: points.find((item) => item.sigma_l !== null && item.sigma_l !== undefined)?.sigma_l ?? null,
  };
}

export type FixtureScenario = keyof typeof validation.scenarios;

export function fixtureScenarios(): FixtureScenario[] {
  return Object.keys(validation.scenarios) as FixtureScenario[];
}

export function fixtureSeries(scenario: FixtureScenario): { points: SeriesPoint[]; sigmaL: number; seed: number } {
  const item = validation.scenarios[scenario];
  return {
    seed: item.seed,
    sigmaL: item.sigma_l,
    points: (item.points as Array<[number, number | null, number, number]>).map(
      ([t_s, level_l, truth_liters, recal_window]) => ({
        t_s,
        level_l,
        truth_liters,
        recal_window,
        sigma_l: item.sigma_l,
      }),
    ),
  };
}

/** Dominio cuadrado común a ambos ejes: así la identidad es la diagonal. */
export function scatterDomain(pairs: readonly Pair[]): [number, number] {
  if (pairs.length === 0) return [0, 100];
  const values = pairs.flatMap((pair) => [pair.estimateL, pair.truthL]);
  return [Math.floor(Math.min(...values) / 5) * 5, Math.ceil(Math.max(...values) / 5) * 5];
}

/** Porcentajes dentro del recuadro: x = verdad, y = estimación medida desde arriba (convención SVG). */
export function scatterPosition(pair: Pair, domain: readonly [number, number]): { x: number; y: number } {
  const span = domain[1] - domain[0] || 1;
  return {
    x: ((pair.truthL - domain[0]) / span) * 100,
    y: 100 - ((pair.estimateL - domain[0]) / span) * 100,
  };
}

const TICK_STEPS_L = [5, 10, 20, 25, 50] as const;

/** Marcas enteras alineadas al dominio (múltiplo de 5): nunca etiquetas redondeadas como 92,5 a 93. */
export function scatterTicks(domain: readonly [number, number]): number[] {
  const span = domain[1] - domain[0];
  const step = TICK_STEPS_L.find((candidate) => span / candidate <= 5) ?? TICK_STEPS_L[TICK_STEPS_L.length - 1];
  const ticks: number[] = [];
  for (let value = domain[0]; value <= domain[1]; value += step) ticks.push(value);
  return ticks;
}
