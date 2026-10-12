import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import type { RestWindow } from "../sim/signals";
import LevelChart from "./LevelChart";

const points = [0, 1, 2, 3, 4, 5].map((t_s) => ({ t_s, liters: 50 - t_s }));

function windowOf(window_id: number, state: RestWindow["state"], start_t_s: number, end_t_s: number): RestWindow {
  return { window_id, state, start_t_s, end_t_s, start_iso: "", end_iso: "", duration_s: end_t_s - start_t_s, zone: "LOAD", reason: "fixture" };
}

function renderChart(windows: RestWindow[]): string {
  return renderToString(h(LevelChart, { points, sigmaL: 1, windows, alerts: [] }));
}

describe("LevelChart regimes", () => {
  test("shows explicit rest and movement bands, merging contiguous rests and leaving unflagged samples unshaded", () => {
    const html = renderChart([
      windowOf(0, "rest", 0, 1),
      windowOf(1, "rest", 1, 2),
      windowOf(2, "moving", 2, 4),
    ]);

    expect(html.match(/class="og-sync__regime /g)).toHaveLength(2);
    expect(html).toContain("Reposo");
    expect(html).toContain("Movimiento");
  });

  test("does not infer bands for samples without a rest or movement flag", () => {
    const html = renderChart([]);
    expect(html).not.toContain("og-sync__regime");
  });
});
