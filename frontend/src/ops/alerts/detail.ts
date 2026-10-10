import type { LevelSeriesPoint } from "../../sim/api";
import type { AlertInputs, AlertRecord, ChannelName, ChannelState, Level } from "./logic";
import { CHANNELS } from "./logic";
import { RULES } from "./rules";

export type MetricKey =
  | "z_med" | "trend_slope_L_per_h" | "level_med_pct" | "kurt_max" | "rms_med" | "temp_drift_c";
export type Comparator = "below" | "above" | "beyond";

export interface EvidenceMetric {
  key: MetricKey;
  value: number | null;
  threshold: number;
  comparator: Comparator;
  unit: string;
  decimals: number;
  crossed: boolean | null;
}

export interface EvidenceRow {
  channel: ChannelName;
  state: ChannelState;
  metrics: EvidenceMetric[];
}

interface MetricSpec {
  key: MetricKey;
  threshold: number;
  comparator: Comparator;
  unit: string;
  decimals: number;
}

// Qué entradas alimentan cada canal y contra qué umbral se comparan (ai/ladder.py:channels).
const CHANNEL_METRICS: Readonly<Record<ChannelName, readonly MetricSpec[]>> = {
  pressure_drop: [{ key: "z_med", threshold: -RULES.zThr, comparator: "below", unit: "σ", decimals: 1 }],
  level_trend: [
    { key: "trend_slope_L_per_h", threshold: 0, comparator: "below", unit: "L/h", decimals: 3 },
    { key: "level_med_pct", threshold: RULES.warnPct, comparator: "below", unit: "%", decimals: 1 },
  ],
  vib_impact: [
    { key: "kurt_max", threshold: RULES.kurtSpike, comparator: "above", unit: "", decimals: 1 },
    { key: "rms_med", threshold: RULES.rmsHighG, comparator: "above", unit: "g", decimals: 2 },
  ],
  temp_drift_veto: [
    { key: "temp_drift_c", threshold: RULES.tempDriftC, comparator: "beyond", unit: "°C", decimals: 1 },
  ],
};

function crosses(value: number | null, spec: MetricSpec): boolean | null {
  if (value === null) return null;
  if (spec.comparator === "below") return value < spec.threshold;
  if (spec.comparator === "above") return value > spec.threshold;
  return Math.abs(value) > spec.threshold;
}

export function channelEvidence(record: AlertRecord): EvidenceRow[] {
  return CHANNELS.map((channel) => ({
    channel,
    state: record.channels[channel],
    metrics: CHANNEL_METRICS[channel].map((spec) => {
      const value = record.inputs[spec.key as keyof AlertInputs];
      return { ...spec, value, crossed: crosses(value, spec) };
    }),
  }));
}

export interface SignalWindow {
  levelL: number[];
  zScore: number[];
  triggerIndex: number;
  unit: "min" | "s";
  before: number;
  after: number;
}

const WINDOW_POINTS = 31;
const TRIGGER_INDEX = 20;
const STEP_MINUTES = 3;

function seedFrom(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

function wobble(seed: number, index: number): number {
  return (((Math.imul(seed + index * 31 + 1, 2654435761) >>> 0) % 1000) / 1000) - 0.5;
}

const round = (value: number, digits: number): number => Math.round(value * 10 ** digits) / 10 ** digits;

// Reconstrucción determinista de la ventana (-60 a +30 min) a partir de las entradas de la alerta:
// la demo no guarda trazas, así que la pantalla la rotula como DEMO y no como registro.
export function signalWindow(record: AlertRecord): SignalWindow {
  const seed = seedFrom(record.id);
  const triggerLevel = record.inputs.level_med_L;
  const triggerZ = record.inputs.z_med;
  const abrupt = record.level === "N4";
  const dropTotal = abrupt ? RULES.abruptStepL + 0.4 : 2.4 + (seed % 7) * 0.2;
  const slope = dropTotal / TRIGGER_INDEX;

  const levelL = triggerLevel === null ? [] : Array.from({ length: WINDOW_POINTS }, (_, index) => {
    if (index === TRIGGER_INDEX) return triggerLevel;
    if (index > TRIGGER_INDEX) return round(Math.max(0, triggerLevel - slope * (index - TRIGGER_INDEX)), 2);
    // El escalón abrupto es plano hasta la ventana anterior y cae de golpe en el disparo.
    const before = abrupt ? dropTotal : dropTotal * (1 - index / TRIGGER_INDEX);
    return round(triggerLevel + before + (abrupt ? 0 : wobble(seed, index) * 0.02), 2);
  });

  const zScore = triggerZ === null ? [] : Array.from({ length: WINDOW_POINTS }, (_, index) => {
    if (index === TRIGGER_INDEX) return triggerZ;
    const ramp = index < TRIGGER_INDEX ? (index / TRIGGER_INDEX) ** 2 : 1;
    return round(-0.3 + (triggerZ + 0.3) * ramp + wobble(seed, index + 50) * 0.3, 2);
  });

  return {
    levelL, zScore, triggerIndex: TRIGGER_INDEX, unit: "min",
    before: TRIGGER_INDEX * STEP_MINUTES, after: (WINDOW_POINTS - 1 - TRIGGER_INDEX) * STEP_MINUTES,
  };
}

// Ventana en vivo: la serie de nivel del backend alrededor de t_s de la alerta.
export function liveSignalWindow(series: readonly LevelSeriesPoint[], tS: number): SignalWindow | null {
  if (!series.some((point) => point.level_l !== null)) return null;
  let nearest = 0;
  series.forEach((point, index) => {
    if (Math.abs(point.t_s - tS) < Math.abs(series[nearest].t_s - tS)) nearest = index;
  });
  const start = Math.max(0, nearest - TRIGGER_INDEX);
  const end = Math.min(series.length - 1, nearest + (WINDOW_POINTS - 1 - TRIGGER_INDEX));
  const slice = series.slice(start, end + 1);
  const firstValue = slice.find((point) => point.level_l !== null)?.level_l;
  if (firstValue === undefined || firstValue === null) return null;
  let previous = firstValue;
  const levelL = slice.map((point) => {
    if (point.level_l !== null) previous = point.level_l;
    return previous;
  });
  return {
    levelL, zScore: [], triggerIndex: nearest - start, unit: "s",
    before: Math.round(series[nearest].t_s - slice[0].t_s),
    after: Math.round(slice[slice.length - 1].t_s - series[nearest].t_s),
  };
}

export type InspectionStep =
  | "watch" | "planStop" | "thisShift" | "beforeDispatch" | "identity" | "lubricant"
  | "instrumentation" | "compareHistory" | "findings";

const STEPS: Readonly<Record<Level, readonly InspectionStep[]>> = {
  N1: ["watch", "identity", "compareHistory"],
  N2: ["planStop", "lubricant", "instrumentation", "findings"],
  N3: ["thisShift", "lubricant", "identity", "findings"],
  N4: ["beforeDispatch", "lubricant", "instrumentation", "findings"],
};

export const inspectionSteps = (level: Level): readonly InspectionStep[] => STEPS[level];
