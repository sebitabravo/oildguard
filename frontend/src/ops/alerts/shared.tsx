import { t, type DictKey, type Lang } from "../../i18n";
import { SeverityBadge } from "../../ui/foundation";
import { lifecycleLabel } from "./localize";
import type { AlertSource, Level, Lifecycle } from "./logic";

export const detailHref = (id: string): string => `/alerts/detail?id=${encodeURIComponent(id)}`;

// Cada color de severidad va acompañado de su palabra.
export function LevelTag({ lang, level }: { lang: Lang; level: Level }) {
  return (
    <span className="og-alerts-level">
      <SeverityBadge lang={lang} severity={level} />
      <span>{t(`alerts.level.word.${level}` as DictKey, lang)}</span>
    </span>
  );
}

export function SourceTag({ lang, source }: { lang: Lang; source: AlertSource }) {
  return <small className={`og-alerts-source og-alerts-source--${source}`}>{t(source === "live" ? "alerts.source.live" : "alerts.source.demo", lang)}</small>;
}

export function StateChip({ lang, state }: { lang: Lang; state: Lifecycle }) {
  return <span className={`og-alerts-state og-alerts-state--${state}`}><i aria-hidden="true" />{lifecycleLabel(state, lang)}</span>;
}
