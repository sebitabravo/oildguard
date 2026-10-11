import { t, type DictKey } from "../../i18n";
import { SeverityBadge } from "../../ui/foundation";
import { lifecycleLabel } from "./localize";
import type { AlertSource, Level, Lifecycle } from "./logic";

export const detailHref = (id: string): string => `/alerts/detail?id=${encodeURIComponent(id)}`;

// Cada color de severidad va acompañado de su palabra.
export function LevelTag({ level }: { level: Level }) {
  return (
    <span className="og-alerts-level">
      <SeverityBadge severity={level} />
      <span>{t(`alerts.level.word.${level}` as DictKey)}</span>
    </span>
  );
}

export function SourceTag({ source }: { source: AlertSource }) {
  return <small className={`og-alerts-source og-alerts-source--${source}`}>{t(source === "live" ? "alerts.source.live" : "alerts.source.demo")}</small>;
}

export function StateChip({ state }: { state: Lifecycle }) {
  return <span className={`og-alerts-state og-alerts-state--${state}`}><i aria-hidden="true" />{lifecycleLabel(state)}</span>;
}
