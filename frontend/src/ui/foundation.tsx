import type { ComponentChildren, JSX } from "preact";
import { t, useLang, type Lang } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { useBackendState, backendStateLabel } from "./backendOrDemo";
import { levelBarGeometry, severityColor, severityTone, type Tone } from "./logic";
import { confidenceBand, evenPositions, linePath, niceTicks, percentAlong, percentFromTop, scaledPoints, scaledPointsInDomain } from "./chartGeometry";

export type Severity = "N1" | "N2" | "N3" | "N4";

export interface StatusBadgeProps {
  lang: Lang;
  label: string;
  tone?: Tone;
  severity?: Severity;
}

export function StatusBadge({ lang, label, tone = "nominal", severity }: StatusBadgeProps) {
  const resolvedTone = severity ? severityTone(severity) : tone;
  return (
    <span
      className={`og-foundation-badge og-foundation-badge--${resolvedTone}`}
      style={severity ? { color: severityColor(severity) } : undefined}
    >
      <span className="og-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function SeverityBadge({ lang, severity }: { lang: Lang; severity: Severity }) {
  return <StatusBadge lang={lang} label={severity} severity={severity} />;
}

export function RegimeChip({ lang, regime }: { lang: Lang; regime: "movement" | "rest" }) {
  return <span className="og-chip">{t(regime === "movement" ? "ui.movement" : "ui.rest", lang)}</span>;
}

export function ValidityChip({ lang, validity }: { lang: Lang; validity: "valid" | "estimate" | "stale" | "invalid" }) {
  const key = validity === "valid" ? "ui.valid" : validity === "estimate" ? "ui.estimate" : validity === "stale" ? "ui.stale" : "ui.invalid";
  return <span className={`og-chip og-chip--${validity}`}>{t(key, lang)}</span>;
}

export function ProvenanceTag({ lang, value = "DERIVED" }: { lang: Lang; value?: "VERIFIED" | "DERIVED" | "ASSUMPTION" }) {
  return <span className="og-chip">{value}</span>;
}

export function SyntheticBadge({ lang }: { lang: Lang }) {
  return <span className="og-chip og-chip--synthetic">{t("ui.synthetic", lang)}</span>;
}

export interface TelemetryCardProps {
  lang: Lang;
  label: string;
  value: number | string;
  unit?: string;
  sigma?: number;
  status?: Tone;
  children?: ComponentChildren;
}

export function TelemetryCard({ lang, label, value, unit, sigma, status = "nominal", children }: TelemetryCardProps) {
  const displayValue = typeof value === "number" ? formatNumber(value, lang, 1) : value;
  return (
    <article className="og-foundation-card">
      <div className="og-label">{label}</div>
      <div className={`og-telemetry-value og-telemetry-value--${status}`}>
        {displayValue}
        {unit && <small>{unit}</small>}
        {sigma !== undefined && <small>±{formatNumber(sigma, lang, 1)}</small>}
      </div>
      {children}
    </article>
  );
}

export function LevelBar({ lang, value, max = 95, sigma = 0 }: { lang: Lang; value: number; max?: number; sigma?: number }) {
  const geometry = levelBarGeometry(value, max, sigma);
  return (
    <div
      className="og-levelbar"
      role="img"
      aria-label={t("ui.ariaLevel", lang, {
        value: formatNumber(value, lang, 1),
        max: formatNumber(max, lang, 0),
      })}
    >
      <span className="og-levelbar__band" style={{ left: `${geometry.bandStart}%`, width: `${geometry.bandWidth}%` }} />
      <span className="og-levelbar__value" style={{ width: `${geometry.percent}%` }} />
      <i className="og-levelbar__tick og-levelbar__tick--critical" style={{ left: `${geometry.criticalTick}%` }} />
      <i className="og-levelbar__tick og-levelbar__tick--warning" style={{ left: `${geometry.warningTick}%` }} />
    </div>
  );
}

export interface DataTableProps {
  lang: Lang;
  columns: Array<{ key: string; label: string; sortable?: boolean }>;
  rows: Array<{ id: string; cells: Record<string, ComponentChildren>; state?: "nominal" | "warning" | "critical" | "stale" | "offline" }>;
  caption: string;
  compact?: boolean;
}

export function DataTable({ lang, columns, rows, caption, compact = false }: DataTableProps) {
  return (
    <div className={`og-table-wrap ${compact ? "og-table-wrap--compact" : ""}`}>
      <table className="og-foundation-table">
        <caption className="og-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" aria-sort={column.sortable ? "none" : undefined}>
                {column.label}
                {column.sortable && <button type="button" className="og-table-sort" aria-label={`${column.label} ${t("ui.sort", lang)}`}>↕</button>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.state ? `og-row--${row.state}` : undefined}>
              {columns.map((column) => <td>{row.cells[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AlertBanner({
  lang,
  severity = "N2",
  children,
}: {
  lang: Lang;
  severity?: Severity;
  children: ComponentChildren;
  backendLive?: boolean;
}) {
  const reason = t("ui.noAlertLifecycleApi", lang);
  return (
    <div className={`og-alert-banner og-alert-banner--${severity.toLowerCase()}`}>
      <SeverityBadge lang={lang} severity={severity} />
      <span>{children}</span>
      <span className="og-alert-actions">
        <button type="button" disabled title={reason}>{t("ui.acknowledge", lang)}</button>
        <button type="button" disabled title={reason}>{t("ui.escalate", lang)}</button>
        <small>{reason} <a href="/alerts">{t("ui.openAlerts", lang)}</a></small>
      </span>
    </div>
  );
}

export function Notice({ lang, children, kind = "info" }: { lang: Lang; children: ComponentChildren; kind?: "info" | "warning" | "error" | "simulation" | "stale" | "partial" | "analyzer-unavailable" }) {
  return <div className={`og-notice og-notice--${kind}`}>{children}</div>;
}

export function Timeline({ items }: { items: Array<{ title: string; actor: string; time: string }> }) {
  return <ol className="og-timeline">{items.map((item) => <li><strong>{item.title}</strong><span>{item.actor} · {item.time}</span></li>)}</ol>;
}

export function ChannelFusion({
  lang,
  channels,
}: {
  lang: Lang;
  channels?: Partial<Record<"pressure_drop" | "level_trend" | "vib_impact" | "temp_drift_veto", "fired" | "quiet" | "no-data">>;
}) {
  const names = ["pressure_drop", "level_trend", "vib_impact"] as const;
  const label = (name: (typeof names)[number] | "temp_drift_veto") => t(`ui.channel.${name}`, lang);
  return (
    <div className="og-channel-fusion">
      {names.map((name) => {
        const state = channels?.[name] ?? "no-data";
        return <div><span className={`og-status-dot og-status-dot--${state === "fired" ? "fired" : "muted"}`} />{label(name)}<b>{t(state === "fired" ? "ui.fired" : state === "quiet" ? "ui.quiet" : "ui.noData", lang)} · {t("ui.vote", lang)}</b></div>;
      })}
      <div className="og-channel-fusion__veto"><span className={`og-status-dot og-status-dot--${channels?.temp_drift_veto === "fired" ? "veto" : "muted"}`} />{label("temp_drift_veto")}<b>{t(channels?.temp_drift_veto === "fired" ? "ui.fired" : channels?.temp_drift_veto === "quiet" ? "ui.quiet" : "ui.noData", lang)} · {t("ui.veto", lang)}</b></div>
    </div>
  );
}

export function SegmentedControl({ options, value, onChange }: { options: string[]; value: string; onChange?: (value: string) => void }) {
  return <div className="og-seg">{options.map((option) => <button type="button" className="og-seg__btn" aria-pressed={option === value} onClick={() => onChange?.(option)}>{option}</button>)}</div>;
}

export function Sparkline({ lang, values, label = "Sparkline" }: { lang: Lang; values: number[]; label?: string }) {
  const points = scaledPoints(values, 100, 60, { left: 2, right: 2, top: 3, bottom: 3 }).map((point) => `${point.x},${point.y}`).join(" ");
  return <svg className="og-sparkline" viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label={label}><polyline points={points} fill="none" stroke="currentColor" stroke-width="2" /></svg>;
}

export function TimeSeriesChart({
  lang,
  values,
  sigma = [],
  thresholds = [],
  events = [],
  gaps = [],
  title = "Time series",
  xLabels = [],
  yTicks,
  yUnit,
  yDecimals = 0,
  domain,
}: {
  lang: Lang;
  values: number[];
  sigma?: number[];
  thresholds?: Array<{ value: number; label: string }>;
  events?: Array<{ index: number; label: string }>;
  gaps?: number[];
  title?: string;
  xLabels?: string[];
  yTicks?: number[];
  yUnit?: string;
  yDecimals?: number;
  domain?: [number, number];
}) {
  // El trazo se estira con preserveAspectRatio="none"; todo el texto va en HTML
  // sobre la misma caja para que las etiquetas nunca se deformen.
  const plot = { width: 300, height: 100 };
  const zero = { left: 0, right: 0, top: 0, bottom: 0 };
  const upperValues = values.map((value, index) => value + (sigma[index] ?? 0));
  const lowerValues = values.map((value, index) => value - (sigma[index] ?? 0));
  const min = domain?.[0] ?? Math.min(...lowerValues);
  const max = domain?.[1] ?? Math.max(...upperValues);
  const points = scaledPointsInDomain(values, plot.width, plot.height, zero, min, max);
  const band = confidenceBand(values, sigma, plot.width, plot.height, zero, [min, max]);
  const ticks = yTicks ?? niceTicks(min, max, 4);
  const yPct = (value: number) => percentFromTop(value, min, max);
  const gapWidth = plot.width / Math.max(1, values.length - 1);
  return (
    <div className="og-time-series" role="img" aria-label={`${title}. ${t("ui.chartDescription", lang)}`}>
      <div className="og-time-series__plot">
        <svg viewBox={`0 0 ${plot.width} ${plot.height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {ticks.map((tick) => <line x1="0" x2={plot.width} y1={(yPct(tick) / 100) * plot.height} y2={(yPct(tick) / 100) * plot.height} className="og-chart-grid" />)}
          {gaps.map((gap) => <rect x={points[gap]?.x ?? 0} y="0" width={gapWidth} height={plot.height} className="og-chart-gap" />)}
          <polygon points={band.map((point) => `${point.x},${point.y}`).join(" ")} className="og-chart-band" />
          {thresholds.map((threshold) => <line x1="0" x2={plot.width} y1={(yPct(threshold.value) / 100) * plot.height} y2={(yPct(threshold.value) / 100) * plot.height} className="og-chart-threshold" />)}
          {events.map((event) => <line x1={points[event.index]?.x ?? 0} x2={points[event.index]?.x ?? 0} y1="0" y2={plot.height} className="og-chart-event" />)}
          <path d={linePath(points)} className="og-chart-line" />
        </svg>
        {ticks.map((tick) => <span className="og-chart-ytick" style={{ top: `${yPct(tick)}%` }}>{formatNumber(tick, lang, yDecimals)}{yUnit ? ` ${yUnit}` : ""}</span>)}
        {thresholds.map((threshold) => <span className="og-chart-threshold-label" style={{ top: `${yPct(threshold.value)}%` }}>{threshold.label}</span>)}
        {events.map((event) => <span className="og-chart-event-label" style={{ left: `${percentAlong(event.index, values.length)}%` }}>{event.label}</span>)}
        {xLabels.map((label, index) => <span className={`og-chart-xtick${index === 0 ? " is-first" : index === xLabels.length - 1 ? " is-last" : ""}`} style={{ left: `${evenPositions(xLabels.length)[index]}%` }}>{label}</span>)}
      </div>
    </div>
  );
}

export function ScatterChart({ lang, points, title = "Scatter chart" }: { lang: Lang; points: Array<[number, number]>; title?: string }) {
  return <svg className="og-scatter" viewBox="0 0 100 80" role="img" aria-label={title}><line x1="5" y1="75" x2="95" y2="5" className="og-identity-line" />{points.map(([x, y]) => <circle cx={x} cy={75 - y} r="2" />)}<text x="4" y="79">{formatNumber(0, lang, 0)}</text><text x="82" y="79">{formatNumber(100, lang, 0)}</text></svg>;
}

export function FilterBar({ children }: { children: ComponentChildren }) { return <div className="og-filterbar">{children}</div>; }
export function FormField({ label, children }: { label: string; children: ComponentChildren }) { return <label className="og-form-field"><span>{label}</span>{children}</label>; }
export function Slider(props: JSX.InputHTMLAttributes<HTMLInputElement>) { return <input type="range" {...props} />; }
export function Toggle({ checked, onChange }: { checked?: boolean; onChange?: (value: boolean) => void }) { return <button type="button" className={`og-toggle ${checked ? "is-on" : ""}`} aria-pressed={checked} onClick={() => onChange?.(!checked)}>●</button>; }
export function Button({ children, variant = "primary", ...props }: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) { return <button {...props} className={`og-button og-button--${variant}`}>{children}</button>; }

const iconPaths: Record<string, string> = {
  fleet: "M3 5h18v14H3z M7 19v2m10-2v2M6 9h12M6 13h4",
  wheel: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm0 4v10m-5-5h10",
  alert: "M12 3l9 17H3L12 3zm0 5v5m0 3v1",
  history: "M4 12a8 8 0 1 0 3-6m-3 0V2m0 4h4",
  rul: "M4 19V5m0 14h16M8 15l3-4 3 2 4-6",
  calibration: "M4 12h16M12 4v16",
  cube: "M12 3l8 4v10l-8 4-8-4V7l8-4zm0 0v18m-8-14l8 4 8-4",
  mine: "M3 20h18M5 20l3-9h8l3 9M9 11V7h6v4",
  inbox: "M4 4h16v13H4zM4 13h4l2 3h4l2-3h4",
  rules: "M5 5h14M5 12h14M5 19h14",
  device: "M7 3h10v18H7zM10 6h4",
  link: "M9 15l6-6m-8 8H5a4 4 0 0 1 0-8h3m6-2h3a4 4 0 0 1 0 8h-3",
  flask: "M9 3h6m-5 0v6l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3",
  check: "M4 12l5 5L20 6",
  bench: "M4 18h16M6 18V7h12v11M9 7V4h6v3",
  chevron: "M9 6l6 6-6 6",
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14m5 12l4 4",
  download: "M12 3v12m-5-5l5 5 5-5M4 21h16",
  filter: "M4 5h16l-6 7v6l-4 2v-8z",
  "bell-off": "M5 18h14l-2-3V10a5 5 0 0 0-8-4M4 4l16 16",
  info: "M12 11v5m0-9h.01M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0",
  warning: "M12 3l9 17H3L12 3zm0 6v5m0 3v1",
  critical: "M12 3v10m0 4v1M4 5l16 14M20 5L4 19",
  external: "M14 4h6v6m0-6L10 14M20 14v5H5V4h5",
  menu: "M4 7h16M4 12h16M4 17h16",
};

export function Icon({ name, label }: { name: string; label?: string }) {
  return <svg className="og-icon" viewBox="0 0 24 24" role={label ? "img" : undefined} aria-label={label}><path d={iconPaths[name] ?? iconPaths.info} fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" /></svg>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) { return <div className="og-empty"><strong>{title}</strong>{detail && <span>{detail}</span>}</div>; }
export function KpiTile({ lang, label, value, unit, delta, meta, tone = "nominal" }: { lang: Lang; label: string; value: number | string; unit?: string; delta?: string; meta?: string; tone?: Tone }) {
  const displayValue = typeof value === "number" ? formatNumber(value, lang, 1) : value;
  return <article className={`og-kpi-tile og-kpi-tile--${tone}`}><div className="og-label">{label}</div><div className="og-kpi-tile__value">{displayValue}{unit && <small>{unit}</small>}</div>{(delta || meta) && <div className="og-kpi-tile__meta">{delta}{delta && meta ? " · " : ""}{meta}</div>}</article>;
}
export function PageHeader({ eyebrow, title, description, meta, children }: { eyebrow?: string; title: string; description?: string; meta?: ComponentChildren; children?: ComponentChildren }) {
  return <header className="og-page-header">{eyebrow && <div className="og-page-header__eyebrow og-label">{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}<div className="og-page-header__meta">{meta}{children}</div></header>;
}

export function BackendStatePill() {
  const [lang] = useLang();
  const state = useBackendState();
  return <span className={`og-backend-pill og-backend-pill--${state}`}><span className="og-status-dot" />{backendStateLabel(state, lang)}</span>;
}
