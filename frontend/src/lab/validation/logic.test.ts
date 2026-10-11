import { describe, expect, test } from "bun:test";
import {
  SCATTER_BAND_SIGMAS,
  computeMetrics,
  evaluate,
  evaluationPairs,
  fixtureScenarios,
  fixtureSeries,
  liveSeries,
  pairSeries,
  scatterDomain,
  scatterTicks,
  scatterPosition,
  windowRows,
  type SeriesPoint,
} from "./logic";

const point = (t_s: number, level_l: number | null, truth_liters: number, recal_window: number): SeriesPoint => ({
  t_s, level_l, truth_liters, recal_window, sigma_l: 0.5,
});

describe("error metrics", () => {
  test("computes MAE, bias, max error and the share inside the band", () => {
    const metrics = computeMetrics([-1, 2, 0.5, -3], 1.5);
    expect(metrics.n).toBe(4);
    expect(metrics.mae).toBeCloseTo(1.625, 10);
    expect(metrics.bias).toBeCloseTo(-0.375, 10);
    expect(metrics.maxAbs).toBe(3);
    expect(metrics.rmse).toBeCloseTo(Math.sqrt((1 + 4 + 0.25 + 9) / 4), 10);
    expect(metrics.withinShare).toBe(0.5);
  });

  test("counts a point exactly on the band edge as inside", () => {
    expect(computeMetrics([1.5, -1.5, 1.6], 1.5).withinShare).toBeCloseTo(2 / 3, 10);
  });

  test("reports nulls instead of zeros when there are no points or no band", () => {
    expect(computeMetrics([], 1)).toEqual({ n: 0, mae: null, bias: null, maxAbs: null, rmse: null, withinShare: null });
    expect(computeMetrics([1, 2], null).withinShare).toBe(null);
    expect(computeMetrics([1, 2], null).n).toBe(2);
  });
});

describe("pairing and windows", () => {
  const series: SeriesPoint[] = [
    point(0, 95, 95, 1), point(0.1, 94, 95, 1),
    point(1, null, 95, 0),
    point(2, 96, 95, 1), point(2.1, 93, 95, 1),
    point(3, null, 95, 0),
    point(4, 90, 95, 1),
  ];

  test("keeps only rows that carry both a fused estimate and the truth", () => {
    const pairs = pairSeries(series, "clean");
    expect(pairs.length).toBe(5);
    expect(pairs.map((pair) => pair.errorL)).toEqual([0, -1, 1, -2, -5]);
    expect(pairs.map((pair) => pair.windowId)).toEqual([1, 1, 2, 2, 3]);
  });

  test("drops points whose truth is missing instead of inventing one", () => {
    const pairs = pairSeries([{ t_s: 0, level_l: 95, truth_liters: null, recal_window: 1 }], "live");
    expect(pairs).toEqual([]);
  });

  test("marks the first rest window as the in-sample baseline and excludes it from evaluation", () => {
    const pairs = pairSeries(series, "clean");
    expect(pairs.filter((pair) => pair.baseline).length).toBe(2);
    expect(evaluationPairs(pairs).map((pair) => pair.windowId)).toEqual([2, 2, 3]);
  });

  test("summarises each rest window", () => {
    const rows = windowRows(pairSeries(series, "clean"));
    expect(rows.length).toBe(3);
    expect([rows[0].scenario, rows[0].windowId, rows[0].n, rows[0].baseline]).toEqual(["clean", 1, 2, true]);
    expect(rows[1].startS).toBe(2);
    expect(rows[1].endS).toBeCloseTo(2.1, 10);
    expect(rows[1].bias).toBeCloseTo(-0.5, 10);
    expect(rows[1].mae).toBeCloseTo(1.5, 10);
    expect(rows[1].maxAbs).toBe(2);
    expect(rows[1].truthMeanL).toBe(95);
    expect(rows[1].estimateMeanL).toBeCloseTo(94.5, 10);
  });
});

describe("live backend series", () => {
  test("detects whether the backend returned the generator truth", () => {
    const withTruth = liveSeries({ series: [{ t_s: 0, level_l: 95, sigma_l: 0.5, moving: 0, recal_window: 1, truth_liters: 95 }] });
    expect(withTruth.hasTruth).toBe(true);
    expect(withTruth.sigmaL).toBe(0.5);
    const withoutTruth = liveSeries({ series: [{ t_s: 0, level_l: 95, sigma_l: 0.5, moving: 0, recal_window: 1 }] });
    expect(withoutTruth.hasTruth).toBe(false);
    expect(liveSeries({ series: [] }).hasTruth).toBe(false);
  });
});

describe("synthetic fixture run", () => {
  test("evaluates 70 out-of-sample rest rows per scenario", () => {
    for (const scenario of fixtureScenarios()) {
      const pairs = pairSeries(fixtureSeries(scenario).points, scenario);
      expect(pairs.length).toBe(130);
      expect(evaluationPairs(pairs).length).toBe(70);
    }
  });

  test("matches the independently computed pooled error of the offline estimator", () => {
    const pooled = fixtureScenarios().flatMap((scenario) => evaluationPairs(pairSeries(fixtureSeries(scenario).points, scenario)));
    const metrics = computeMetrics(pooled.map((pair) => pair.errorL), 0.9);
    expect(metrics.n).toBe(350);
    // Valor agrupado que muestra la página: fijado para detectar derivas del fixture.
    expect(metrics.rmse).toBeCloseTo(2.5152846440114875, 10);
    expect(metrics.bias).toBeCloseTo(-0.1937, 3);
    expect(metrics.mae).toBeCloseTo(1.7956, 3);
    expect(metrics.maxAbs).toBeCloseTo(6.8014, 3);
  });

  test("the uncompensated sensor-drift scenario shows a positive bias", () => {
    const pairs = evaluationPairs(pairSeries(fixtureSeries("sensor-drift").points, "sensor-drift"));
    expect(computeMetrics(pairs.map((pair) => pair.errorL), 1).bias).toBeCloseTo(3.4811, 3);
  });

  test("uses a two sigma band as documented in docs/calibration.md", () => {
    expect(SCATTER_BAND_SIGMAS).toBe(2);
  });
});

describe("scatter geometry", () => {
  test("pads the domain to multiples of five and keeps it square", () => {
    const pairs = pairSeries([point(0, 99, 95, 1), point(0.1, 77, 80, 1)], "clean");
    expect(scatterDomain(pairs)).toEqual([75, 100]);
    expect(scatterDomain([])).toEqual([0, 100]);
  });

  test("maps truth to x and the estimate to a top-based y percentage", () => {
    const pair = pairSeries([point(0, 100, 85, 1)], "clean")[0];
    expect(scatterPosition(pair, [70, 100])).toEqual({ x: 50, y: 0 });
    const low = pairSeries([point(0, 70, 70, 1)], "clean")[0];
    expect(scatterPosition(low, [70, 100])).toEqual({ x: 0, y: 100 });
  });
});

describe("per-point band", () => {
  test("derives the two sigma band from the sigma the backend reports", () => {
    const [pair] = pairSeries([point(0, 95, 95, 1)], "clean");
    expect(pair.bandL).toBe(1);
    const [bare] = pairSeries([{ t_s: 0, level_l: 95, truth_liters: 95, recal_window: 1 }], "live");
    expect(bare.bandL).toBe(null);
  });

  test("scores each pair against its own band and reports the mean half-width", () => {
    const first = pairSeries([{ ...point(0, 96, 95, 1), sigma_l: 0.25 }], "a")[0];
    const second = pairSeries([{ ...point(0, 97, 95, 1), sigma_l: 1.5 }], "b")[0];
    const result = evaluate([first, second]);
    expect(result.metrics.n).toBe(2);
    expect(result.metrics.withinShare).toBe(0.5);
    expect(result.bandL).toBeCloseTo((0.5 + 3) / 2, 10);
  });

  test("leaves the share empty when no pair carries a band", () => {
    const [pair] = pairSeries([{ t_s: 0, level_l: 95, truth_liters: 95, recal_window: 1 }], "live");
    expect(evaluate([pair]).metrics.withinShare).toBe(null);
    expect(evaluate([pair]).bandL).toBe(null);
  });
});

describe("scatter ticks", () => {
  test("uses whole-litre steps that divide the padded domain", () => {
    expect(scatterTicks([90, 100])).toEqual([90, 95, 100]);
    expect(scatterTicks([70, 100])).toEqual([70, 80, 90, 100]);
    expect(scatterTicks([0, 100])).toEqual([0, 20, 40, 60, 80, 100]);
    expect(scatterTicks([75, 100])).toEqual([75, 80, 85, 90, 95, 100]);
  });
});
