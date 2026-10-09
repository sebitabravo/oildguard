// T11 local demo fallback (S6 slice).
//
// Clearly-labeled DEMO data used when the backend is unreachable. Values
// mirror the real T10 demo excerpts (docs/t10-rul-ladder.md, seed 7,
// 120 s stages) so the fallback walk clean -> N1/N2/N3 -> N4 matches the
// documented logic. Model stays `synthetic-proxy` (UNPROVEN until S7).
//
// LAB-RATE NOTE: the slow-leak rate below is LAB-ACCELERATED
// (~128.5 %/h, x257 vs the 0.5 %/h spec truth) so a ~4 L drop is visible
// inside a short demo. The field rate drops ~0.008 L in 120 s by design.

import type { DashAlert } from "../sim/api";
import type { RestWindow } from "../sim/signals";

export const DEMO_MODEL = "synthetic-proxy";

export interface DemoPoint {
  t_s: number;
  liters: number;
}

/** Full synthetic level trace: clean 95 L -> slow-leak to ~91 L -> step to ~80 L. */
export const DEMO_SERIES: DemoPoint[] = (() => {
  const pts: DemoPoint[] = [];
  // clean: flat 95 L with tiny noise (0..30 s)
  for (let t = 0; t <= 30; t += 1) {
    pts.push({ t_s: t, liters: 95 + (t % 3 === 0 ? -0.15 : 0.1) });
  }
  // slow-leak LAB-ACCELERATED: 95 -> ~91 L (30..90 s)
  for (let t = 31; t <= 90; t += 1) {
    const k = (t - 30) / 60;
    pts.push({ t_s: t, liters: 95 - 4 * k + (t % 4 === 0 ? -0.2 : 0.1) });
  }
  // abrupt-drop step at t=90: -11 L, then flat ~80 L (91..120 s)
  for (let t = 91; t <= 120; t += 1) {
    pts.push({ t_s: t, liters: 80 + (t % 3 === 0 ? -0.15 : 0.1) });
  }
  return pts;
})();

export const DEMO_SIGMA_L = 0.46;
export const DEMO_CONFIDENCE = 0.908;

export const DEMO_WINDOWS: RestWindow[] = [
  {
    window_id: 0,
    state: "rest",
    start_t_s: 8,
    end_t_s: 14,
    start_iso: "",
    end_iso: "",
    duration_s: 6,
    zone: "LOAD",
    reason: "DEMO rest window (LOAD)",
  },
  {
    window_id: 1,
    state: "rest",
    start_t_s: 37,
    end_t_s: 43,
    start_iso: "",
    end_iso: "",
    duration_s: 6,
    zone: "LOAD",
    reason: "DEMO rest window (LOAD)",
  },
  {
    window_id: 2,
    state: "rest",
    start_t_s: 50,
    end_t_s: 56,
    start_iso: "",
    end_iso: "",
    duration_s: 6,
    zone: "DUMP",
    reason: "DEMO rest window (DUMP, N1/N2/N3 fire here)",
  },
  {
    window_id: 3,
    state: "rest",
    start_t_s: 96,
    end_t_s: 102,
    start_iso: "",
    end_iso: "",
    duration_s: 6,
    zone: "LOAD",
    reason: "DEMO rest window (LOAD, N4 abrupt step here)",
  },
];

function demoAlert(
  level: string,
  severity: string,
  t_s: number,
  window_id: number,
  zone: string,
  reason: string,
  lvl: number
): DashAlert {
  return {
    alert_id: `${level}-w${String(window_id).padStart(2, "0")}`,
    level,
    severity,
    t_s,
    window_id,
    zone,
    reason,
    model: DEMO_MODEL,
    inputs: {
      z_med: level === "N4" ? -32.437 : -3.402,
      level_med_L: lvl,
      level_med_pct: Math.round((10000 * lvl) / 95) / 100,
      rul_hours_to_warning: level === "N4" ? 0.04 : 0.35,
      rul_status: "ok",
    },
    thresholds: {
      z_thr: 3.0,
      warn_pct: 50.0,
      crit_pct: 30.0,
      abrupt_step_L: 5.0,
      shift_h: 8.0,
    },
    channels: {
      pressure_drop: true,
      level_trend: true,
      vib_impact: level === "N4",
      temp_drift_veto: false,
    },
    baseline: "first-rest-window n=31",
  };
}

/** Demo alerts by stage (cumulative walk N1 -> N2 -> N3 -> N4). */
export function demoAlertsUpTo(stage: string): DashAlert[] {
  const n1 = demoAlert(
    "N1",
    "watch",
    52.9,
    2,
    "DUMP",
    "N1 trend (persistence entry)",
    93.43
  );
  const n2 = demoAlert(
    "N2",
    "warning",
    52.9,
    2,
    "DUMP",
    "N2 confirmed leak: 2-of-3 channels same window 2",
    93.43
  );
  const n3 = demoAlert(
    "N3",
    "warning",
    52.9,
    2,
    "DUMP",
    "N3 shift-window: RUL-to-warning 0.35 h < 8.0 h shift",
    93.43
  );
  const n4 = demoAlert(
    "N4",
    "critical",
    96.5,
    3,
    "LOAD",
    "N4 critical: abrupt window-to-window drop 95.0->80.0 L (>5.0 L)",
    79.97
  );
  if (stage === "clean") return [];
  if (stage === "slow-leak") return [n1, n2, n3];
  if (stage === "abrupt-drop" || stage === "done") return [n1, n2, n3, n4];
  return [n1, n2, n3, n4];
}

/** Stage fill fraction for the linked 3D oil fill (95 L reference). */
export function demoFracFor(stage: string, tickS: number): number {
  if (stage === "clean") return 1.0;
  if (stage === "slow-leak") {
    const k = Math.min(1, Math.max(0, tickS / 15));
    return 1.0 - (4 / 95) * k;
  }
  if (stage === "abrupt-drop") {
    const k = Math.min(1, Math.max(0, tickS / 4));
    return 0.9579 - (0.9579 - 80 / 95) * k;
  }
  return 80 / 95;
}
