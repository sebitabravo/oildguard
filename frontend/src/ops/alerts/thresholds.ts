import { BACKEND_URL } from "../../sim/api";
import type { DictKey } from "../../i18n";
import { RULES, RULE_SOURCES } from "./rules";

export type ThresholdValues = { [K in keyof typeof RULES]: number };
export type ThresholdSource = "live" | "constant";

export interface ResolvedThresholds {
  source: ThresholdSource;
  values: ThresholdValues;
}

// Campo del payload de GET /config/thresholds para cada valor espejado en rules.ts.
const PAYLOAD_FIELDS: Readonly<Record<keyof typeof RULES, string>> = {
  capacityL: "capacity_l",
  warnPct: "warn_pct",
  critPct: "crit_pct",
  warnL: "warn_l",
  critL: "crit_l",
  zThr: "z_thr",
  zExtreme: "z_extreme",
  kurtSpike: "kurt_spike",
  rmsHighG: "rms_high_g",
  tempDriftC: "temp_drift_c",
  abruptStepL: "abrupt_step_l",
  minVotes: "min_channels",
  shiftH: "shift_h",
  cycleS: "cycle_s",
  minBaselineN: "min_baseline_n",
  minScoredN: "min_scored_n",
  minR2: "min_r2",
  maxSigmaL: "max_sigma_l",
};

// Un payload incompleto no se mezcla con la constante: o se usa entero o se descarta,
// para no mostrar una tabla mitad backend, mitad espejo.
export function resolveThresholds(payload: unknown): ResolvedThresholds {
  const fallback: ResolvedThresholds = { source: "constant", values: { ...RULES } };
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  const entries = Object.entries(PAYLOAD_FIELDS).map(([key, field]) => [key, record[field]] as const);
  if (!entries.every(([, value]) => typeof value === "number" && Number.isFinite(value))) return fallback;
  return { source: "live", values: Object.fromEntries(entries) as ThresholdValues };
}

export async function fetchThresholds(signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${BACKEND_URL}/config/thresholds`, { signal });
  if (!response.ok) throw new Error(`GET /config/thresholds -> ${response.status}`);
  return response.json();
}

export interface ThresholdRow {
  id: string;
  labelKey: DictKey;
  usedKey: DictKey;
  source: keyof typeof RULE_SOURCES;
  value: number;
  unit: "L" | "%" | "σ" | "g" | "°C" | "h" | "s" | "votes" | "";
  decimals: number;
  prefix?: "±";
  litres?: number;
}

// Una fila por umbral; el formato (idioma, decimales) lo decide la vista.
export function thresholdRows(v: ThresholdValues): ThresholdRow[] {
  return [
    { id: "capacity", labelKey: "alerts.rules.th.capacity", usedKey: "alerts.rules.use.all", source: "level", value: v.capacityL, unit: "L", decimals: 0 },
    { id: "warn", labelKey: "alerts.rules.th.warn", usedKey: "alerts.rules.use.n1", source: "ladder", value: v.warnPct, unit: "%", decimals: 0, litres: v.warnL },
    { id: "crit", labelKey: "alerts.rules.th.crit", usedKey: "alerts.rules.use.n4", source: "ladder", value: v.critPct, unit: "%", decimals: 0, litres: v.critL },
    { id: "z", labelKey: "alerts.rules.th.z", usedKey: "alerts.rules.use.n2", source: "ladder", value: v.zThr, unit: "σ", decimals: 1 },
    { id: "zExtreme", labelKey: "alerts.rules.th.zExtreme", usedKey: "alerts.rules.use.n4", source: "ladder", value: v.zExtreme, unit: "σ", decimals: 1 },
    { id: "kurt", labelKey: "alerts.rules.th.kurt", usedKey: "alerts.rules.use.n2", source: "ladder", value: v.kurtSpike, unit: "", decimals: 1 },
    { id: "rms", labelKey: "alerts.rules.th.rms", usedKey: "alerts.rules.use.n2", source: "ladder", value: v.rmsHighG, unit: "g", decimals: 1 },
    { id: "temp", labelKey: "alerts.rules.th.temp", usedKey: "alerts.rules.use.veto", source: "ladder", value: v.tempDriftC, unit: "°C", decimals: 1, prefix: "±" },
    { id: "abrupt", labelKey: "alerts.rules.th.abrupt", usedKey: "alerts.rules.use.n4", source: "ladder", value: v.abruptStepL, unit: "L", decimals: 1 },
    { id: "votes", labelKey: "alerts.rules.th.votes", usedKey: "alerts.rules.use.n2", source: "ladder", value: v.minVotes, unit: "votes", decimals: 0 },
    { id: "shift", labelKey: "alerts.rules.th.shift", usedKey: "alerts.rules.use.n3", source: "rul", value: v.shiftH, unit: "h", decimals: 0 },
    { id: "cycle", labelKey: "alerts.rules.th.cycle", usedKey: "alerts.rules.use.rul", source: "rul", value: v.cycleS, unit: "s", decimals: 0 },
    { id: "samples", labelKey: "alerts.rules.th.samples", usedKey: "alerts.rules.use.rul", source: "rul", value: v.minScoredN, unit: "", decimals: 0 },
    { id: "r2", labelKey: "alerts.rules.th.r2", usedKey: "alerts.rules.use.rul", source: "rul", value: v.minR2, unit: "", decimals: 1 },
    { id: "sigma", labelKey: "alerts.rules.th.sigma", usedKey: "alerts.rules.use.rul", source: "level", value: v.maxSigmaL, unit: "L", decimals: 1 },
  ];
}
