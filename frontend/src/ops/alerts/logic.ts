import { DEMO_REFERENCE_MS, NOMINAL_LITERS } from "../../demo/dataset";
import type { AlertLifecycle, DemoAlert, DemoDataset, DemoWheel, Recipient } from "../../demo/dataset";
import type { DashAlert } from "../../sim/api";
import { RULES } from "./rules";

export type Level = "N1" | "N2" | "N3" | "N4";
export type Lifecycle = AlertLifecycle;
export type Role = Recipient;
export type ChannelName = "pressure_drop" | "level_trend" | "vib_impact" | "temp_drift_veto";
export type ChannelState = "fired" | "quiet" | "no-data";
export type AlertSource = "live" | "demo";
export type LifecycleAction = "acknowledge" | "escalate" | "close";
export type AuditAction = "created" | "reviewed" | "acknowledged" | "escalated" | "closed";

export const LEVELS: readonly Level[] = ["N1", "N2", "N3", "N4"];
export const LIFECYCLES: readonly Lifecycle[] = ["open", "acknowledged", "escalated", "closed"];
export const ROLES: readonly Role[] = ["Reliability", "Planning", "Dispatch & supervisor", "Operator"];
export const CHANNELS: readonly ChannelName[] = ["pressure_drop", "level_trend", "vib_impact", "temp_drift_veto"];
export const VOTING_CHANNELS: readonly ChannelName[] = ["pressure_drop", "level_trend", "vib_impact"];

export const ROUTING: Readonly<Record<Level, Role>> = {
  N1: "Reliability",
  N2: "Planning",
  N3: "Dispatch & supervisor",
  N4: "Operator",
};

// Cadena de escalamiento solo para la demo local; el supervisor es el tope.
const ESCALATION_TARGET: Readonly<Record<Role, Role>> = {
  Reliability: "Planning",
  Planning: "Dispatch & supervisor",
  "Dispatch & supervisor": "Dispatch & supervisor",
  Operator: "Dispatch & supervisor",
};

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const WEEK_MS = 7 * 24 * HOUR_MS;

export const REASON_CODES = [
  "ladder_n1_trend_persistence",
  "ladder_n2_same_window_confirmation",
  "ladder_n2_confirmed_persistence",
  "ladder_n3_shift_window",
  "ladder_n4_critical_level",
  "ladder_n4_abrupt_drop",
  "ladder_n4_extreme_collapse",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface AlertInputs {
  z_med: number | null;
  level_med_L: number | null;
  level_med_pct: number | null;
  trend_slope_L_per_h: number | null;
  kurt_max: number | null;
  rms_med: number | null;
  temp_drift_c: number | null;
  rul_hours_to_warning: number | null;
}

export interface AuditItem {
  actor: Role;
  action: AuditAction;
  at: number;
  local?: boolean;
}

export interface AlertRecord {
  id: string;
  source: AlertSource;
  level: Level;
  lifecycle: Lifecycle;
  wheelId: string | null;
  truckId: string | null;
  reason: { code: ReasonCode | null; params: Record<string, number | string>; fallback: string };
  channels: Record<ChannelName, ChannelState>;
  votes: number;
  recipient: Role;
  owner: Role;
  openedAt: number;
  tS?: number;
  inputs: AlertInputs;
  audit: AuditItem[];
}

export interface AlertFilters {
  level: Level | "all";
  lifecycle: Lifecycle | "all";
  truck: string;
  role: Role | "all";
  query: string;
  wheel?: string;
}

export interface LocalAction {
  action: LifecycleAction;
  at: number;
}
export type LocalActionMap = Record<string, LocalAction[]>;

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,120}$/;

export function parseAlertId(search: string): string | null {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("id")?.trim() ?? "";
  return ID_PATTERN.test(raw) ? raw : null;
}

export function parseWheelParam(search: string): string | null {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("wheel")?.trim() ?? "";
  return ID_PATTERN.test(raw) ? raw : null;
}

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function countVotes(channels: Record<ChannelName, ChannelState>): number {
  return VOTING_CHANNELS.filter((name) => channels[name] === "fired").length;
}

// Réplica de ai/ladder.py:channels() sobre las entradas que la interfaz muestra.
export function evaluateChannel(name: ChannelName, inputs: AlertInputs): ChannelState {
  const pick = (cond: boolean): ChannelState => (cond ? "fired" : "quiet");
  switch (name) {
    case "pressure_drop":
      return inputs.z_med === null ? "no-data" : pick(inputs.z_med < -RULES.zThr);
    case "level_trend": {
      if (inputs.trend_slope_L_per_h === null && inputs.level_med_pct === null) return "no-data";
      const falling = inputs.trend_slope_L_per_h !== null && inputs.trend_slope_L_per_h < 0;
      const low = inputs.level_med_pct !== null && inputs.level_med_pct < RULES.warnPct;
      return pick(falling || low);
    }
    case "vib_impact": {
      if (inputs.kurt_max === null && inputs.rms_med === null) return "no-data";
      const spike = inputs.kurt_max !== null && inputs.kurt_max > RULES.kurtSpike;
      const rms = inputs.rms_med !== null && inputs.rms_med > RULES.rmsHighG;
      return pick(spike || rms);
    }
    case "temp_drift_veto":
      if (inputs.temp_drift_c === null || inputs.z_med === null) return "no-data";
      return pick(Math.abs(inputs.temp_drift_c) > RULES.tempDriftC && inputs.z_med > -RULES.zThr);
  }
}

const PARTIAL_KEYS: ReadonlyArray<keyof AlertInputs> = [
  "z_med", "level_med_pct", "trend_slope_L_per_h", "kurt_max", "rms_med", "temp_drift_c",
];

export function hasPartialData(record: AlertRecord): boolean {
  return CHANNELS.some((name) => record.channels[name] === "no-data")
    || PARTIAL_KEYS.some((key) => record.inputs[key] === null);
}

function jitter(seed: number, salt: number): number {
  return ((Math.imul(seed + 1, 2654435761) ^ Math.imul(salt + 7, 40503)) >>> 0) % 1000 / 1000;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function deriveInputs(
  channels: Record<ChannelName, ChannelState>,
  levelL: number,
  vibRms: number,
  seed: number,
  level: Level,
): AlertInputs {
  const pressure = channels.pressure_drop;
  const trend = channels.level_trend;
  const vib = channels.vib_impact;
  const temp = channels.temp_drift_veto;
  return {
    z_med: pressure === "no-data" ? null : round(pressure === "fired" ? -(3.6 + jitter(seed, 1) * 2.4) : -(0.3 + jitter(seed, 1) * 1.8), 1),
    level_med_L: round(levelL, 1),
    level_med_pct: round((levelL / NOMINAL_LITERS) * 100, 1),
    trend_slope_L_per_h: trend === "no-data" ? null : trend === "fired" ? round(-(0.012 + jitter(seed, 2) * 0.03), 3) : 0,
    kurt_max: vib === "no-data" ? null : round(vib === "fired" ? 5.6 + jitter(seed, 3) * 2.5 : 2.2 + jitter(seed, 3) * 1.5, 1),
    rms_med: vib === "no-data" ? null : round(Math.min(vibRms, vib === "fired" ? 0.5 : 0.55), 2),
    temp_drift_c: temp === "no-data" ? null : round(temp === "fired" ? 1.8 + jitter(seed, 4) : (jitter(seed, 4) - 0.5) * 1.6, 1),
    rul_hours_to_warning: level === "N3" ? round(3 + jitter(seed, 5) * 4.5, 1) : null,
  };
}

function deriveReason(level: Level, channels: Record<ChannelName, ChannelState>, levelL: number, seed: number): AlertRecord["reason"] {
  const window = 1 + Math.floor(jitter(seed, 6) * 5);
  switch (level) {
    case "N1":
      return { code: "ladder_n1_trend_persistence", params: { window, zone: "LOAD" }, fallback: "" };
    case "N2":
      return { code: "ladder_n2_same_window_confirmation", params: { votes: Math.max(2, countVotes(channels)), window }, fallback: "" };
    case "N3":
      return { code: "ladder_n3_shift_window", params: { warning_hours: round(3 + jitter(seed, 5) * 4.5, 1), shift_hours: RULES.shiftH }, fallback: "" };
    case "N4":
      return {
        code: "ladder_n4_abrupt_drop",
        params: { from_l: round(levelL + RULES.abruptStepL + 0.4 + jitter(seed, 7), 1), to_l: round(levelL, 1), threshold_l: RULES.abruptStepL },
        fallback: "",
      };
  }
}

function auditFor(openedAt: number, recipient: Role, lifecycle: Lifecycle): AuditItem[] {
  const trail: AuditItem[] = [
    { actor: recipient, action: "created", at: openedAt },
    { actor: recipient, action: "reviewed", at: openedAt + 30 * MINUTE_MS },
  ];
  if (lifecycle === "acknowledged" || lifecycle === "closed") {
    trail.push({ actor: recipient, action: "acknowledged", at: openedAt + 40 * MINUTE_MS });
  }
  if (lifecycle === "escalated") trail.push({ actor: recipient, action: "escalated", at: openedAt + 40 * MINUTE_MS });
  if (lifecycle === "closed") trail.push({ actor: recipient, action: "closed", at: openedAt + 50 * MINUTE_MS });
  return trail;
}

function recordFrom(
  id: string,
  level: Level,
  lifecycle: Lifecycle,
  wheel: DemoWheel,
  channels: Record<ChannelName, ChannelState>,
  openedAt: number,
  seed: number,
): AlertRecord {
  const recipient = ROUTING[level];
  // El escalón abrupto parte de un nivel previo por debajo de la capacidad nominal.
  const levelL = level === "N4" ? Math.min(wheel.levelL, 88 - jitter(seed, 8) * 4) : wheel.levelL;
  return {
    id,
    source: "demo",
    level,
    lifecycle,
    wheelId: wheel.id,
    truckId: wheel.truckId,
    reason: deriveReason(level, channels, levelL, seed),
    channels,
    votes: countVotes(channels),
    recipient,
    owner: lifecycle === "escalated" ? ESCALATION_TARGET[recipient] : recipient,
    openedAt,
    inputs: deriveInputs(channels, levelL, wheel.vibRms, seed, level),
    audit: auditFor(openedAt, recipient, lifecycle),
  };
}

function channelMap(entries: Partial<Record<ChannelName, ChannelState>>): Record<ChannelName, ChannelState> {
  return { pressure_drop: "quiet", level_trend: "quiet", vib_impact: "quiet", temp_drift_veto: "quiet", ...entries };
}

// Secuencia fija de historial: el dataset demo solo trae las alertas activas.
const HISTORY_LEVELS: readonly Level[] = [
  "N1", "N1", "N2", "N1", "N3", "N2", "N1", "N4", "N2", "N1", "N3", "N1", "N2", "N1", "N1", "N3",
];

function historyChannels(level: Level, index: number): Record<ChannelName, ChannelState> {
  switch (level) {
    case "N1":
      return channelMap(index % 2 === 0 ? { pressure_drop: "fired" } : { level_trend: "fired", ...(index === 3 ? { vib_impact: "no-data" as const } : {}) });
    case "N2":
      return channelMap({ pressure_drop: "fired", level_trend: "fired" });
    case "N3":
      return channelMap({ level_trend: "fired", pressure_drop: "fired" });
    case "N4":
      return channelMap({ level_trend: "fired", ...(index % 2 === 1 ? { vib_impact: "fired" as const } : {}) });
  }
}

export function buildDemoAlerts(dataset: DemoDataset): AlertRecord[] {
  const wheelById = new Map(dataset.wheels.map((wheel) => [wheel.id, wheel]));
  const current = dataset.alerts.flatMap((alert: DemoAlert, index) => {
    const wheel = wheelById.get(alert.wheelId);
    if (!wheel) return [];
    const channels = channelMap(Object.fromEntries(alert.channels.map((channel) => [channel.name, channel.state])));
    const openedAt = alert.audit[0].at - index * 5.5 * HOUR_MS;
    return [recordFrom(alert.id, alert.level, alert.lifecycle, wheel, channels, openedAt, index)];
  });
  const validated = dataset.wheels.filter((wheel) => wheel.validated);
  const history = HISTORY_LEVELS.map((level, index) => {
    const wheel = validated[(index * 7 + 3) % validated.length];
    const openedAt = dataset.referenceMs - (1.5 + index * 10.2) * HOUR_MS - 2 * HOUR_MS;
    return recordFrom(`alert-hist-${String(index + 1).padStart(2, "0")}-${wheel.id}`, level, "closed", wheel, historyChannels(level, index), openedAt, 100 + index);
  });
  return [...current, ...history];
}

const LIVE_INPUT_KEYS: ReadonlyArray<[keyof AlertInputs, string]> = [
  ["z_med", "z_med"], ["level_med_L", "level_med_L"], ["level_med_pct", "level_med_pct"],
  ["trend_slope_L_per_h", "trend_slope_L_per_h"], ["kurt_max", "kurt_max"], ["rms_med", "rms_med"],
  ["temp_drift_c", "temp_drift_c"], ["rul_hours_to_warning", "rul_hours_to_warning"],
];

export function liveToRecord(alert: DashAlert, observedAtMs: number): AlertRecord | null {
  if (!isLevel(alert.level)) return null;
  const level = alert.level;
  const inputs = Object.fromEntries(LIVE_INPUT_KEYS.map(([key, source]) => {
    const value = alert.inputs?.[source];
    return [key, typeof value === "number" && Number.isFinite(value) ? value : null];
  })) as unknown as AlertInputs;
  const channels = alert.channels
    ? channelMap(Object.fromEntries(CHANNELS.map((name) => [name, alert.channels?.[name] ? "fired" : "quiet"])))
    : { pressure_drop: "no-data", level_trend: "no-data", vib_impact: "no-data", temp_drift_veto: "no-data" } as const;
  const code = REASON_CODES.find((candidate) => candidate === alert.reason_message?.code) ?? null;
  const params = Object.fromEntries(Object.entries(alert.reason_message?.params ?? {}).flatMap(([key, value]) => {
    if (Array.isArray(value)) return [[key, value.join("+")]];
    return typeof value === "number" || typeof value === "string" ? [[key, value]] : [];
  }));
  return {
    id: alert.alert_id,
    source: "live",
    level,
    lifecycle: "open",
    wheelId: null,
    truckId: null,
    reason: { code, params, fallback: alert.reason },
    channels,
    votes: countVotes(channels),
    recipient: ROUTING[level],
    owner: ROUTING[level],
    openedAt: observedAtMs,
    tS: alert.t_s,
    inputs,
    audit: [],
  };
}

export function filterAlerts(records: readonly AlertRecord[], filters: AlertFilters): AlertRecord[] {
  const query = filters.query.trim().toLowerCase();
  return records.filter((record) =>
    (filters.level === "all" || record.level === filters.level)
    && (filters.lifecycle === "all" || record.lifecycle === filters.lifecycle)
    && (filters.truck === "all" || record.truckId === filters.truck)
    && (filters.role === "all" || record.owner === filters.role)
    && (!filters.wheel || record.wheelId === filters.wheel)
    && (!query || [record.id, record.wheelId, record.truckId].some((field) => field?.toLowerCase().includes(query))));
}

// Una alerta en vivo reemplaza a la demo con el mismo id: el backend manda sobre el conjunto etiquetado.
export function mergeAlerts(live: readonly AlertRecord[], demo: readonly AlertRecord[]): AlertRecord[] {
  const liveIds = new Set(live.map((record) => record.id));
  return [...live, ...demo.filter((record) => !liveIds.has(record.id))];
}

export function sortAlerts(records: readonly AlertRecord[]): AlertRecord[] {
  return [...records].sort((a, b) =>
    Number(a.lifecycle === "closed") - Number(b.lifecycle === "closed")
    || LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level)
    || b.openedAt - a.openedAt
    || a.id.localeCompare(b.id));
}

export function countActiveByLevel(records: readonly AlertRecord[]): Record<Level, number> {
  const counts: Record<Level, number> = { N1: 0, N2: 0, N3: 0, N4: 0 };
  for (const record of records) if (record.lifecycle !== "closed") counts[record.level] += 1;
  return counts;
}

export interface Distribution {
  total: number;
  byLevel: Record<Level, { count: number; share: number }>;
}

export function distribution7d(records: readonly AlertRecord[], nowMs: number): Distribution {
  const recent = records.filter((record) => nowMs - record.openedAt < WEEK_MS);
  const total = recent.length;
  const byLevel = Object.fromEntries(LEVELS.map((level) => {
    const count = recent.filter((record) => record.level === level).length;
    return [level, { count, share: total ? count / total : 0 }];
  })) as Distribution["byLevel"];
  return { total, byLevel };
}

export interface RecurrenceEntry {
  wheelId: string;
  truckId: string | null;
  count: number;
  levels: Level[];
  worst: Level;
  lastOpenedAt: number;
}

export function recurrenceRanking(records: readonly AlertRecord[], limit = 5): RecurrenceEntry[] {
  const byWheel = new Map<string, AlertRecord[]>();
  for (const record of records) {
    if (!record.wheelId) continue;
    byWheel.set(record.wheelId, [...(byWheel.get(record.wheelId) ?? []), record]);
  }
  return [...byWheel.entries()].map(([wheelId, group]) => {
    const levels = LEVELS.filter((level) => group.some((record) => record.level === level));
    return {
      wheelId,
      truckId: group[0].truckId,
      count: group.length,
      levels,
      worst: levels[levels.length - 1],
      lastOpenedAt: Math.max(...group.map((record) => record.openedAt)),
    };
  }).sort((a, b) =>
    b.count - a.count
    || LEVELS.indexOf(b.worst) - LEVELS.indexOf(a.worst)
    || b.lastOpenedAt - a.lastOpenedAt
    || a.wheelId.localeCompare(b.wheelId)).slice(0, limit);
}

export interface AgeParts {
  unit: "now" | "min" | "h" | "d";
  value: number;
}

export function ageParts(openedAt: number, nowMs: number): AgeParts {
  const diff = nowMs - openedAt;
  if (diff < MINUTE_MS) return { unit: "now", value: 0 };
  if (diff < HOUR_MS) return { unit: "min", value: Math.floor(diff / MINUTE_MS) };
  if (diff < 48 * HOUR_MS) return { unit: "h", value: Math.floor(diff / HOUR_MS) };
  return { unit: "d", value: Math.floor(diff / (24 * HOUR_MS)) };
}

export function formatTimestampUtc(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

const TRANSITIONS: Readonly<Record<Lifecycle, Partial<Record<LifecycleAction, Lifecycle>>>> = {
  open: { acknowledge: "acknowledged", escalate: "escalated" },
  acknowledged: { escalate: "escalated", close: "closed" },
  escalated: { acknowledge: "acknowledged", close: "closed" },
  closed: {},
};

export function reduceLifecycle(state: Lifecycle, action: LifecycleAction): Lifecycle | null {
  return TRANSITIONS[state][action] ?? null;
}

export function availableActions(state: Lifecycle): LifecycleAction[] {
  return Object.keys(TRANSITIONS[state]) as LifecycleAction[];
}

const AUDIT_FOR_ACTION: Readonly<Record<LifecycleAction, AuditAction>> = {
  acknowledge: "acknowledged",
  escalate: "escalated",
  close: "closed",
};

export function applyLocalActions(record: AlertRecord, actions: readonly LocalAction[] | undefined): AlertRecord {
  if (record.source === "live" || !actions?.length) return record;
  let next = record;
  for (const { action, at } of actions) {
    const lifecycle = reduceLifecycle(next.lifecycle, action);
    if (!lifecycle) continue;
    next = {
      ...next,
      lifecycle,
      owner: action === "escalate" ? ESCALATION_TARGET[next.owner] : next.owner,
      audit: [...next.audit, { actor: next.owner, action: AUDIT_FOR_ACTION[action], at, local: true }],
    };
  }
  return next;
}

export function appendLocalAction(existing: LocalActionMap, id: string, action: LifecycleAction, at: number): LocalActionMap {
  return { ...existing, [id]: [...(existing[id] ?? []), { action, at }] };
}

export function parseLocalActions(raw: string | null): LocalActionMap {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const map: LocalActionMap = {};
  for (const [id, list] of Object.entries(parsed)) {
    if (!Array.isArray(list)) continue;
    const valid = list.flatMap((item): LocalAction[] =>
      item && typeof item === "object"
      && (item.action === "acknowledge" || item.action === "escalate" || item.action === "close")
      && typeof item.at === "number" && Number.isFinite(item.at)
        ? [{ action: item.action, at: item.at }]
        : []);
    if (valid.length) map[id] = valid;
  }
  return map;
}

export const DEMO_NOW_MS = DEMO_REFERENCE_MS;

// Reloj de la demo: cada acción local avanza un minuto desde la referencia del dataset.
export function nextLocalActionTime(existing: LocalActionMap): number {
  const count = Object.values(existing).reduce((sum, list) => sum + list.length, 0);
  return DEMO_REFERENCE_MS + (count + 1) * MINUTE_MS;
}
