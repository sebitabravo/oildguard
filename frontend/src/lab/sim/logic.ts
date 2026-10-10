import { SIGNAL_CSV_HEADER, type ScenarioName, type SignalLabel, type SignalRow } from "../../sim/signals";
import fixture from "../fixtures/scenarios.json";

export const SCENARIOS: readonly ScenarioName[] = ["clean", "slow-leak", "abrupt-drop", "sensor-drift", "link-outage"];
export const SIGNAL_LABELS: readonly SignalLabel[] = [
  "normal",
  "slow-leak",
  "abrupt-drop",
  "sensor-drift",
  "link-outage-buffered",
];

/** Etiqueta de verdad que produce cada escenario (sim/generate.py, columna `label`). */
export const SCENARIO_LABEL: Record<ScenarioName, SignalLabel> = {
  clean: "normal",
  "slow-leak": "slow-leak",
  "abrupt-drop": "abrupt-drop",
  "sensor-drift": "sensor-drift",
  "link-outage": "link-outage-buffered",
};

export const FIXTURE_SECONDS = fixture.source.seconds;
export const FIXTURE_RATE_HZ = fixture.source.rate_hz;
export const DEFAULT_DURATION_S = 30;
export const DEFAULT_RATE_HZ = 10;

export interface SimParams {
  scenario: ScenarioName;
  seed: number;
  durationS: number;
  rateHz: number;
}

// Decimales con que el generador escribe cada columna flotante (sim/SCHEMA.md).
const DECIMALS: Record<string, number> = {
  t_s: 1,
  slope_deg: 2,
  rotor_rpm: 1,
  wheel_rpm: 2,
  submerged_fraction_per_revolution: 4,
  pressure_kpa: 3,
  temperature_c: 2,
  vib_rms_g: 3,
  vib_kurtosis: 3,
  level_liters: 4,
  level_pct: 3,
};

const startMs = Date.parse(fixture.source.start);
const cache = new Map<ScenarioName, SignalRow[]>();

export function fixtureSeed(scenario: ScenarioName): number {
  return fixture.scenarios[scenario].seed;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

// Mismo formato que `datetime.isoformat()`: sin fracción si los microsegundos son cero.
function isoFromSeconds(tS: number): string {
  const ms = startMs + Math.round(tS * 1000);
  const date = new Date(ms);
  const base = `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`
    + `T${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}`;
  const micros = date.getUTCMilliseconds() * 1000;
  return `${base}${micros === 0 ? "" : `.${pad(micros, 6)}`}+00:00`;
}

export function scenarioRows(scenario: ScenarioName): SignalRow[] {
  const cached = cache.get(scenario);
  if (cached) return cached;
  const columns = fixture.columns;
  const rows = fixture.scenarios[scenario].rows.map((raw) => {
    const row: Record<string, string | number> = {};
    columns.forEach((column, index) => { row[column] = raw[index]; });
    row.t_iso = isoFromSeconds(Number(row.t_s));
    row.device_id = fixture.source.device_id;
    return row as unknown as SignalRow;
  });
  cache.set(scenario, rows);
  return rows;
}

export function countLabels(rows: readonly SignalRow[], limit: number = rows.length): Record<SignalLabel, number> {
  const counts = Object.fromEntries(SIGNAL_LABELS.map((label) => [label, 0])) as Record<SignalLabel, number>;
  for (const row of rows.slice(0, Math.max(0, limit))) counts[row.label] += 1;
  return counts;
}

export function linkDownRanges(rows: readonly SignalRow[]): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  rows.forEach((row, index) => {
    if (row.link_down !== 1) return;
    const last = ranges[ranges.length - 1];
    if (last && last.end === index - 1) last.end = index;
    else ranges.push({ start: index, end: index });
  });
  return ranges;
}

function csvValue(column: string, value: string | number): string {
  const decimals = DECIMALS[column];
  if (decimals === undefined || typeof value === "string") return String(value);
  // El generador escribe "-0.00"; toFixed(-0) lo perdería.
  return `${Object.is(value, -0) ? "-" : ""}${value.toFixed(decimals)}`;
}

export function rowsToCsv(rows: readonly SignalRow[]): string {
  const lines = rows.map((row) =>
    SIGNAL_CSV_HEADER.map((column) => csvValue(column, row[column as keyof SignalRow])).join(","),
  );
  return `${[SIGNAL_CSV_HEADER.join(","), ...lines].join("\n")}\n`;
}

function integer(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function normalizeParams(params: SimParams): SimParams {
  return {
    scenario: params.scenario,
    seed: integer(params.seed, fixtureSeed(params.scenario), 0, 2_147_483_647),
    durationS: integer(params.durationS, DEFAULT_DURATION_S, 1, 3600),
    rateHz: integer(params.rateHz, DEFAULT_RATE_HZ, 1, 1000),
  };
}

/** La vista previa es siempre el fixture fijado; solo coincide con una corrida real si los parámetros son los mismos. */
export function previewMatchesFixture(params: SimParams): boolean {
  return params.seed === fixtureSeed(params.scenario)
    && params.durationS === FIXTURE_SECONDS
    && params.rateHz === FIXTURE_RATE_HZ;
}

export function buildCommands(params: SimParams): { python: string; rust: string } {
  const { scenario, seed, durationS, rateHz } = params;
  return {
    python: `python3 sim/generate.py --scenario ${scenario} --seconds ${durationS} --seed ${seed} --out /tmp/oilguard-${scenario}.csv`,
    rust: `cargo run --release --manifest-path edge-sim/Cargo.toml -- --devices 1 --scenario ${scenario} --seconds ${durationS} --seed ${seed} --rate-hz ${rateHz} --output csv:/tmp/oilguard-${scenario}-edge.csv`,
  };
}

export function nextIndex(index: number, step: number, total: number): number {
  return total <= 0 ? 0 : (index + step) % total;
}

/** Las filas del laboratorio nunca se envían con el id de la rueda en vivo. */
export function rowsForIngest(rows: readonly SignalRow[], deviceId: string): SignalRow[] {
  return rows.map((row) => ({ ...row, device_id: deviceId }));
}
