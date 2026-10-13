import type { DemoWheel } from "../../demo/demoData";
import type { RestWindow } from "../../sim/signals";
import type { ChartPoint } from "../../dash/LevelChart";
import type { Severity } from "../../ui/foundation";

export const LIVE_WHEEL_ID = "wheel-RH-01";

type ChannelName = "pressure_drop" | "level_trend" | "vib_impact" | "temp_drift_veto";
type ChannelState = "fired" | "quiet" | "no-data";

const LEVELS: Severity[] = ["N1", "N2", "N3", "N4"];

export function resolveWheel(wheelId: string | null | undefined, wheels: DemoWheel[]): DemoWheel {
  return wheels.find((wheel) => wheel.id === wheelId)
    ?? wheels.find((wheel) => wheel.id === LIVE_WHEEL_ID)
    ?? wheels[0];
}

export function isLiveWheel(wheelId: string): boolean {
  return wheelId === LIVE_WHEEL_ID;
}

export function latestSensorReadings(rows: ReadonlyArray<{
  t_s: number;
  pressure_kpa?: number | null;
  temperature_c?: number | null;
  vib_rms_g?: number | null;
}>): { pressureKpa?: number; temperatureC?: number; vibrationG?: number } {
  const values: { pressureKpa?: number; temperatureC?: number; vibrationG?: number } = {};
  const times = { pressureKpa: Number.NEGATIVE_INFINITY, temperatureC: Number.NEGATIVE_INFINITY, vibrationG: Number.NEGATIVE_INFINITY };
  for (const row of rows) {
    if (!Number.isFinite(row.t_s)) continue;
    if (typeof row.pressure_kpa === "number" && Number.isFinite(row.pressure_kpa) && row.t_s >= times.pressureKpa) {
      values.pressureKpa = row.pressure_kpa;
      times.pressureKpa = row.t_s;
    }
    if (typeof row.temperature_c === "number" && Number.isFinite(row.temperature_c) && row.t_s >= times.temperatureC) {
      values.temperatureC = row.temperature_c;
      times.temperatureC = row.t_s;
    }
    if (typeof row.vib_rms_g === "number" && Number.isFinite(row.vib_rms_g) && row.t_s >= times.vibrationG) {
      values.vibrationG = row.vib_rms_g;
      times.vibrationG = row.t_s;
    }
  }
  return values;
}

export function wheelLinks(wheelId: string): { history: string; alerts: string } {
  const query = `wheel=${encodeURIComponent(wheelId)}`;
  return { history: `/wheel/history?${query}`, alerts: `/alerts?${query}` };
}

export function highestLevel(alerts: ReadonlyArray<{ level: string }>): Severity | null {
  let best = -1;
  for (const alert of alerts) best = Math.max(best, LEVELS.indexOf(alert.level as Severity));
  return best < 0 ? null : LEVELS[best];
}

export function ladderRows(active: Severity | null): Array<{ level: Severity; active: boolean }> {
  return LEVELS.map((level) => ({ level, active: level === active }));
}

export function alertBannerKey(level: Severity) {
  return `wheel.banner.${level}` as const;
}

export function channelStatesFrom(
  alerts: ReadonlyArray<{ channels: Record<string, boolean> | null }>,
): Record<ChannelName, ChannelState> {
  const channels = alerts[alerts.length - 1]?.channels ?? null;
  const state = (name: ChannelName): ChannelState => {
    const value = channels?.[name];
    return value === undefined ? "no-data" : value ? "fired" : "quiet";
  };
  return {
    pressure_drop: state("pressure_drop"),
    level_trend: state("level_trend"),
    vib_impact: state("vib_impact"),
    temp_drift_veto: state("temp_drift_veto"),
  };
}

// La viscosidad del 85W-140 cae con la temperatura y el tiempo de asentamiento
// escala con ella (tau0 = 0.75 s a la referencia de 60 °C). Es un sustituto, no una medición.
export function settlingTauSeconds(temperatureC: number): number {
  const temperature = Number.isFinite(temperatureC) ? Math.min(120, Math.max(0, temperatureC)) : 60;
  return 0.75 * Math.exp(-0.03 * (temperature - 60));
}

export type LevelValidity = "valid" | "estimate" | "stale" | "invalid";

export function levelValidity(input: { moving: boolean; confidence: number; stale: boolean }): LevelValidity {
  if (!(input.confidence > 0)) return "invalid";
  if (input.stale) return "stale";
  return input.moving ? "estimate" : "valid";
}

export function formatUtcTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  return `${new Date(ms).toISOString().slice(11, 19)} UTC`;
}

export function rawTelemetryText(rows: ReadonlyArray<object>): string {
  return rows.map((row) => JSON.stringify(row)).join("\n");
}

function seededNoise(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296 - 0.5;
  };
}

// Traza determinista de 60 min (un punto por minuto) para ruedas sin backend:
// ciclos de 12 min con 8 min de movimiento y 4 min de reposo.
export function demoWheelTrace(wheel: DemoWheel): { points: ChartPoint[]; windows: RestWindow[]; sigmaL: number } {
  const noise = seededNoise([...wheel.id].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7));
  const lossPerHour = wheel.lossRateLPer100h / 100;
  const points = Array.from({ length: 61 }, (_, minute) => {
    const trend = lossPerHour * ((60 - minute) / 60);
    const jitter = minute === 60 ? 0 : noise() * 0.3;
    return { t_s: minute * 60, liters: Math.min(95, Math.round((wheel.levelL + trend + jitter) * 100) / 100) };
  });
  const windows: RestWindow[] = Array.from({ length: 5 }, (_, cycle) => ({
    window_id: cycle,
    state: "rest" as const,
    start_t_s: cycle * 720 + 480,
    end_t_s: cycle * 720 + 720,
    start_iso: "",
    end_iso: "",
    duration_s: 240,
    zone: cycle % 2 === 0 ? "LOAD" as const : "DUMP" as const,
    reason: "DEMO rest window",
  }));
  return { points, windows, sigmaL: wheel.sigmaL };
}
