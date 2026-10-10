import { t, type DictKey, type Lang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import type { AgeParts, AlertRecord, Lifecycle, Role } from "./logic";

const ROLE_KEYS: Readonly<Record<Role, DictKey>> = {
  Reliability: "alerts.role.reliability",
  Planning: "alerts.role.planning",
  "Dispatch & supervisor": "alerts.role.dispatch",
  Operator: "alerts.role.operator",
};

const LIFECYCLE_KEYS: Readonly<Record<Lifecycle, DictKey>> = {
  open: "alerts.lifecycle.open",
  acknowledged: "alerts.lifecycle.acknowledged",
  escalated: "alerts.lifecycle.escalated",
  closed: "alerts.lifecycle.closed",
};

const AGE_KEYS: Readonly<Record<AgeParts["unit"], DictKey>> = {
  now: "alerts.age.now",
  min: "alerts.age.min",
  h: "alerts.age.h",
  d: "alerts.age.d",
};

export const roleLabel = (role: Role, lang: Lang): string => t(ROLE_KEYS[role], lang);
export const lifecycleLabel = (state: Lifecycle, lang: Lang): string => t(LIFECYCLE_KEYS[state], lang);

export function ageLabel(age: AgeParts, lang: Lang): string {
  return t(AGE_KEYS[age.unit], lang, { value: formatNumber(age.value, lang, 0) });
}

// Los parámetros numéricos del mensaje del backend se formatean con el idioma activo;
// las ventanas y los textos (zona, ventanas "0+1") pasan tal cual.
const INTEGER_PARAMS: ReadonlySet<string> = new Set(["window", "votes"]);

export function localizeReason(record: AlertRecord, lang: Lang): string {
  const { code, params, fallback } = record.reason;
  if (!code) return fallback;
  const formatted = Object.fromEntries(Object.entries(params).map(([name, value]) => [
    name,
    typeof value === "number" ? formatNumber(value, lang, INTEGER_PARAMS.has(name) ? 0 : 1) : value,
  ]));
  return t(code, lang, formatted);
}
