import type { ComponentChildren, JSX } from "preact";
import { t } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { useBackendState, backendStateLabel } from "./backendOrDemo";
import { levelBarGeometry, severityColor, severityTone, type Tone } from "./logic";
import { collisionLabelOffsets, linePath, monotoneCurvePath, niceTicks, nextCursorIndex, scaledPoints } from "./chartGeometry";
import { useId, useState } from "preact/hooks";

export type Severity = "N1" | "N2" | "N3" | "N4";

export interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  severity?: Severity;
}

export function StatusBadge({ label, tone = "nominal", severity }: StatusBadgeProps) {
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

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <StatusBadge label={severity} severity={severity} />;
}

export function RegimeChip({ regime }: { regime: "movement" | "rest" }) {
  return <span className="og-chip">{t(regime === "movement" ? "ui.movement" : "ui.rest")}</span>;
}

export function ValidityChip({ validity }: { validity: "valid" | "estimate" | "stale" | "invalid" }) {
  const key = validity === "valid" ? "ui.valid" : validity === "estimate" ? "ui.estimate" : validity === "stale" ? "ui.stale" : "ui.invalid";
  return <span className={`og-chip og-chip--${validity}`}>{t(key)}</span>;
}

export function ProvenanceTag({ value = "DERIVED" }: { value?: "VERIFIED" | "DERIVED" | "ASSUMPTION" }) {
  return <span className="og-chip">{value}</span>;
}

export function SyntheticBadge() {
  return <span className="og-chip og-chip--synthetic">{t("ui.synthetic")}</span>;
}

export interface TelemetryCardProps {
  label: string;
  value: number | string;
  unit?: string;
  sigma?: number;
  status?: Tone;
  children?: ComponentChildren;
}

export function TelemetryCard({ label, value, unit, sigma, status = "nominal", children }: TelemetryCardProps) {
  const displayValue = typeof value === "number" ? formatNumber(value, 1) : value;
  return (
    <article className="og-foundation-card">
      <div className="og-label">{label}</div>
      <div className={`og-telemetry-value og-telemetry-value--${status}`}>
        {displayValue}
        {unit && <small>{unit}</small>}
        {sigma !== undefined && <small>±{formatNumber(sigma, 1)}</small>}
      </div>
      {children}
    </article>
  );
}

export function LevelBar({ value, max = 95, sigma = 0 }: { value: number; max?: number; sigma?: number }) {
  const geometry = levelBarGeometry(value, max, sigma);
  return (
    <div
      className="og-levelbar"
      role="img"
      aria-label={t("ui.ariaLevel", {
        value: formatNumber(value, 1),
        max: formatNumber(max, 0),
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
  columns: Array<{ key: string; label: string; sortable?: boolean }>;
  rows: Array<{ id: string; cells: Record<string, ComponentChildren>; state?: "nominal" | "warning" | "critical" | "stale" | "offline" }>;
  caption: string;
  compact?: boolean;
}

export function DataTable({ columns, rows, caption, compact = false }: DataTableProps) {
  return (
    <div className={`og-table-wrap ${compact ? "og-table-wrap--compact" : ""}`}>
      <table className="og-foundation-table">
        <caption className="og-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" aria-sort={column.sortable ? "none" : undefined}>
                {column.label}
                {column.sortable && <button type="button" className="og-table-sort" aria-label={`${column.label} ${t("ui.sort")}`}>↕</button>}
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
  severity = "N2",
  children,
}: {
  severity?: Severity;
  children: ComponentChildren;
  backendLive?: boolean;
}) {
  const reason = t("ui.noAlertLifecycleApi");
  return (
    <div className={`og-alert-banner og-alert-banner--${severity.toLowerCase()}`}>
      <SeverityBadge severity={severity} />
      <span>{children}</span>
      <span className="og-alert-actions">
        <button type="button" disabled title={reason}>{t("ui.acknowledge")}</button>
        <button type="button" disabled title={reason}>{t("ui.escalate")}</button>
        <small>{reason} <a href="/alerts">{t("ui.openAlerts")}</a></small>
      </span>
    </div>
  );
}

export function Notice({ children, kind = "info" }: { children: ComponentChildren; kind?: "info" | "warning" | "error" | "simulation" | "stale" | "partial" | "analyzer-unavailable" }) {
  return <div className={`og-notice og-notice--${kind}`}>{children}</div>;
}

export function Timeline({ items }: { items: Array<{ title: string; actor: string; time: string }> }) {
  return <ol className="og-timeline">{items.map((item) => <li><strong>{item.title}</strong><span>{item.actor} · {item.time}</span></li>)}</ol>;
}

export function ChannelFusion({
  channels,
}: {
  channels?: Partial<Record<"pressure_drop" | "level_trend" | "vib_impact" | "temp_drift_veto", "fired" | "quiet" | "no-data">>;
}) {
  const names = ["pressure_drop", "level_trend", "vib_impact"] as const;
  const label = (name: (typeof names)[number] | "temp_drift_veto") => t(`ui.channel.${name}`);
  return (
    <div className="og-channel-fusion">
      {names.map((name) => {
        const state = channels?.[name] ?? "no-data";
        return <div><span className={`og-status-dot og-status-dot--${state === "fired" ? "fired" : "muted"}`} />{label(name)}<b>{t(state === "fired" ? "ui.fired" : state === "quiet" ? "ui.quiet" : "ui.noData")} · {t("ui.vote")}</b></div>;
      })}
      <div className="og-channel-fusion__veto"><span className={`og-status-dot og-status-dot--${channels?.temp_drift_veto === "fired" ? "veto" : "muted"}`} />{label("temp_drift_veto")}<b>{t(channels?.temp_drift_veto === "fired" ? "ui.fired" : channels?.temp_drift_veto === "quiet" ? "ui.quiet" : "ui.noData")} · {t("ui.veto")}</b></div>
    </div>
  );
}

export function SegmentedControl({ options, value, onChange }: { options: string[]; value: string; onChange?: (value: string) => void }) {
  return <div className="og-seg">{options.map((option) => <button type="button" className="og-seg__btn" aria-pressed={option === value} onClick={() => onChange?.(option)}>{option}</button>)}</div>;
}

export function Sparkline({ values, label = "Sparkline" }: { values: number[]; label?: string }) {
  const points = scaledPoints(values, 100, 60, { left: 2, right: 2, top: 3, bottom: 3 });
  if (!points.length) return <svg className="og-sparkline" viewBox="0 0 100 60" role="img" aria-label={label} />;
  const curve = monotoneCurvePath(points);
  const area = `${curve} L ${points[points.length - 1].x} 60 L ${points[0].x} 60 Z`;
  return <svg className="og-sparkline" viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label={label}><path className="og-sparkline__area" d={area} /><path className="og-sparkline__line" d={curve} /></svg>;
}

export interface SyncChartSeries {
  name: string;
  values: number[];
  unit?: string;
  color?: string;
  axis?: "left" | "right";
  sigma?: number[];
  dashed?: boolean;
  domain?: [number, number];
  decimals?: number;
  axisTicks?: boolean;
}

export interface SyncChartProps {
  series: SyncChartSeries[];
  title?: string;
  xLabels?: string[];
  leftTicks?: number[];
  thresholds?: Array<{ value: number; label: string; axis?: "left" | "right"; domain?: [number, number] }>;
  events?: Array<{ index: number; label: string; color?: string }>;
  gaps?: number[];
  regimes?: Array<{ startIndex: number; endIndex: number; label: string; tone?: "rest" | "movement" }>;
  cursorIndex?: number | null;
  onCursorChange?: (index: number) => void;
  height?: number;
}

const SERIES_COLORS = ["var(--og-blue)", "var(--og-accent)", "var(--og-temperature)", "var(--og-green)"];

function seriesDomain(series: SyncChartSeries[], axis: "left" | "right"): [number, number] {
  const items = series.filter((item) => (item.axis ?? "left") === axis);
  const fixed = items.find((item) => item.axisTicks)?.domain ?? items.find((item) => item.domain)?.domain;
  if (fixed) return fixed;
  const values = items.flatMap((item) => item.values.flatMap((value, index) => [value - (item.sigma?.[index] ?? 0), value + (item.sigma?.[index] ?? 0)]));
  if (!values.length) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || Math.abs(max) * 0.1 || 1) * 0.08;
  return [min - pad, max + pad];
}

export function SyncChart({
  series, title = "Time series", xLabels = [], thresholds = [], events = [], gaps = [], regimes = [],
  cursorIndex, onCursorChange, height = 200, leftTicks: requestedLeftTicks,
}: SyncChartProps) {
  const [localCursor, setLocalCursor] = useState<number | null>(null);
  const hatchId = useId();
  const count = Math.max(0, ...series.map((item) => item.values.length));
  const activeCursor = cursorIndex === undefined ? localCursor : cursorIndex;
  const chart = { width: 640, height: 220 };
  const pad = { left: 58, right: 58, top: 22, bottom: 30 };
  const plotWidth = chart.width - pad.left - pad.right;
  const plotHeight = chart.height - pad.top - pad.bottom;
  const domains = { left: seriesDomain(series, "left"), right: seriesDomain(series, "right") };
  const xAt = (index: number) => pad.left + (count <= 1 ? plotWidth / 2 : index / (count - 1) * plotWidth);
  const yAt = (value: number, axis: "left" | "right", override?: [number, number]) => {
    const [min, max] = override ?? domains[axis];
    return pad.top + (1 - (value - min) / (max - min || 1)) * plotHeight;
  };
  const leftTicks = requestedLeftTicks ?? niceTicks(...domains.left, 4);
  const rightTicks = series.some((item) => item.axis === "right") ? niceTicks(...domains.right, 4) : [];
  const eventOffsets = collisionLabelOffsets(events.map((item) => {
    const width = item.label.length * 5.5 + 4;
    return { left: Math.max(pad.left, Math.min(chart.width - pad.right - width, xAt(item.index) + 4)), width };
  }));
  const setCursor = (index: number) => {
    if (cursorIndex === undefined) setLocalCursor(index);
    onCursorChange?.(index);
  };
  const onKeyDown = (event: KeyboardEvent & { currentTarget: HTMLDivElement }) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const next = activeCursor === null ? (event.key === "End" ? count - 1 : 0) : nextCursorIndex(activeCursor, event.key, count);
    if (next >= 0 && next !== activeCursor) {
      event.preventDefault();
      setCursor(next);
    }
  };
  const onPointerMove = (event: PointerEvent & { currentTarget: SVGSVGElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!count || rect.width <= 0) return;
    const viewX = (event.clientX - rect.left) / rect.width * chart.width;
    const ratio = Math.max(0, Math.min(1, (viewX - pad.left) / plotWidth));
    setCursor(Math.round(ratio * (count - 1)));
  };
  const onPointerLeave = () => { if (cursorIndex === undefined) setLocalCursor(null); };
  const cursorX = activeCursor === null || activeCursor < 0 ? null : xAt(activeCursor);
  return (
    <section className="og-sync" style={{ height: `${height}px` }} aria-label={title}>
      <div className="og-sync__legend" aria-label={title}>
        {series.map((item, index) => <span className="og-sync__legend-item" style={{ color: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length] }}><i className={item.dashed ? "is-dashed" : ""} />{item.name}{item.unit ? ` · ${item.unit}` : ""}</span>)}
      </div>
      <div className="og-sync__frame" onKeyDown={onKeyDown} tabIndex={0} role="application" aria-label={`${title}. ${t("ui.chartDescription")}`}>
        <svg className="og-sync__svg" viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} aria-hidden="true" focusable="false">
          <defs><pattern id={`${hatchId}-gap-hatch`} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="6" className="og-sync__hatch-line" /></pattern></defs>
          {regimes.map((regime) => <rect x={xAt(regime.startIndex)} y={pad.top} width={Math.max(0, xAt(regime.endIndex) - xAt(regime.startIndex))} height={plotHeight} className={`og-sync__regime og-sync__regime--${regime.tone ?? "rest"}`} />)}
          {leftTicks.map((tick) => <line x1={pad.left} x2={chart.width - pad.right} y1={yAt(tick, "left")} y2={yAt(tick, "left")} className="og-sync__grid" />)}
          {gaps.map((gap) => <rect x={xAt(gap)} y={pad.top} width={Math.max(4, plotWidth / Math.max(1, count - 1))} height={plotHeight} fill={`url(#${hatchId}-gap-hatch)`} className="og-sync__gap" />)}
          {thresholds.map((threshold) => <line x1={pad.left} x2={chart.width - pad.right} y1={yAt(threshold.value, threshold.axis ?? "left", threshold.domain)} y2={yAt(threshold.value, threshold.axis ?? "left", threshold.domain)} className="og-sync__threshold" />)}
          {events.map((item) => <g style={item.color ? `--tone: ${item.color}` : undefined}><line x1={xAt(item.index)} x2={xAt(item.index)} y1={pad.top} y2={pad.top + plotHeight} className="og-sync__event" /></g>)}
          {series.map((item, index) => {
            const axis = item.axis ?? "left";
            const color = item.color ?? SERIES_COLORS[index % SERIES_COLORS.length];
            const points = item.values.map((value, sample) => ({ x: xAt(sample), y: yAt(value, axis, item.domain) }));
            const upper = item.values.map((value, sample) => ({ x: xAt(sample), y: yAt(value + (item.sigma?.[sample] ?? 0), axis, item.domain) }));
            const segments: Array<{ points: typeof points; upper: typeof upper; lower: typeof upper }> = [];
            let segment: number[] = [];
            const flush = () => {
              if (segment.length) segments.push({
                points: segment.map((sample) => points[sample]),
                upper: segment.map((sample) => upper[sample]),
                lower: segment.map((sample) => ({ x: xAt(sample), y: yAt(item.values[sample] - (item.sigma?.[sample] ?? 0), axis, item.domain) })),
              });
              segment = [];
            };
            points.forEach((_, sample) => {
              if (gaps.includes(sample)) flush();
              else segment.push(sample);
            });
            flush();
            return <g style={{ color }}>{segments.map((part) => {
              const bandPath = item.sigma?.some((value) => value > 0) ? `${linePath(part.upper)} ${[...part.lower].reverse().map((point) => `L ${point.x} ${point.y}`).join(" ")} Z` : "";
              return <><path d={bandPath} className="og-sync__band" /><path d={monotoneCurvePath(part.points)} className={`og-sync__line${item.dashed ? " is-dashed" : ""}`} /></>;
            })}</g>;
          })}
          {cursorX !== null && <line x1={cursorX} x2={cursorX} y1={pad.top} y2={pad.top + plotHeight} className="og-sync__cursor" />}
          {cursorX !== null && series.map((item, index) => item.values[activeCursor ?? -1] === undefined ? null : <circle cx={cursorX} cy={yAt(item.values[activeCursor ?? 0], item.axis ?? "left", item.domain)} r="3.5" className="og-sync__cursor-point" style={{ color: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length] }} />)}
        </svg>
        <div className="og-sync__labels" aria-hidden="true">
          {leftTicks.map((tick) => <span className="og-sync__tick og-sync__tick--left" style={{ left: `${(pad.left - 8) / chart.width * 100}%`, top: `${yAt(tick, "left") / chart.height * 100}%` }}>{formatNumber(tick, series.find((item) => (item.axis ?? "left") === "left")?.decimals ?? 1)}</span>)}
          {rightTicks.map((tick) => <span className="og-sync__tick og-sync__tick--right" style={{ left: `${(chart.width - pad.right + 8) / chart.width * 100}%`, top: `${yAt(tick, "right") / chart.height * 100}%` }}>{formatNumber(tick, series.find((item) => item.axis === "right")?.decimals ?? 1)}</span>)}
          {regimes.map((regime) => <span className="og-sync__regime-label" style={{ left: `${(xAt(regime.startIndex) + 5) / chart.width * 100}%`, top: `${(pad.top + 12) / chart.height * 100}%` }}>{regime.label}</span>)}
          {thresholds.map((threshold) => <span className="og-sync__threshold-label" style={{ left: `${(pad.left + 5) / chart.width * 100}%`, top: `${(yAt(threshold.value, threshold.axis ?? "left", threshold.domain) - 4) / chart.height * 100}%` }}>{threshold.label}</span>)}
          {events.map((item, index) => {
            const width = item.label.length * 5.5 + 4;
            const left = Math.max(pad.left, Math.min(chart.width - pad.right - width, xAt(item.index) + 4));
            const top = pad.top + plotHeight - 5 - (eventOffsets[index] ?? 0);
            return <span className="og-sync__event-label" style={`left: ${left / chart.width * 100}%; top: ${top / chart.height * 100}%; --tone: ${item.color ?? "var(--og-blue)"}`}>{item.label}</span>;
          })}
        </div>
        <div className="og-sync__xlabels">{xLabels.map((label, index) => <span className={index === 0 ? "is-first" : index === xLabels.length - 1 ? "is-last" : ""} style={{ left: `${xLabels.length <= 1 ? 50 : index / (xLabels.length - 1) * 100}%` }}>{label}</span>)}</div>
      </div>
      {activeCursor !== null && activeCursor >= 0 && count > 0 && <div className="og-sync__tooltip" role="status"><strong>{xLabels.length ? xLabels[Math.min(xLabels.length - 1, Math.round(activeCursor / Math.max(1, count - 1) * (xLabels.length - 1)))] : `#${activeCursor + 1}`}</strong>{series.map((item, index) => {
        const value = item.values[activeCursor];
        return value === undefined ? null : <span style={{ color: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length] }}><i />{item.name}: {formatNumber(value, item.decimals ?? 2)}{item.unit ? ` ${item.unit}` : ""}</span>;
      })}</div>}
    </section>
  );
}

export function TimeSeriesChart({
  values, sigma = [], thresholds = [], events = [], gaps = [], title = "Time series", xLabels = [], yTicks, yUnit, yDecimals = 0, domain, color = "var(--og-accent)",
  cursorIndex, onCursorChange, height,
}: {
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
  color?: string;
  cursorIndex?: number | null;
  onCursorChange?: (index: number) => void;
  height?: number;
}) {
  return <div className="og-time-series"><SyncChart title={title} series={[{ name: title, values, sigma, unit: yUnit, color, domain, decimals: yDecimals }]} thresholds={thresholds} events={events} gaps={gaps} xLabels={xLabels} leftTicks={yTicks} cursorIndex={cursorIndex} onCursorChange={onCursorChange} height={height ?? 180} /></div>;
}

export function ScatterChart({ points, title = "Scatter chart", band = 0, domain, pointTones = [], xLabel, yLabel }: { points: Array<[number, number]>; title?: string; band?: number; domain?: [number, number]; pointTones?: string[]; xLabel?: string; yLabel?: string }) {
  const values = points.flatMap(([x, y]) => [x, y]);
  const min = domain?.[0] ?? Math.min(0, ...values);
  const max = domain?.[1] ?? Math.max(1, ...values);
  const scale = (value: number) => 8 + (value - min) / (max - min || 1) * 84;
  const bandPct = band / (max - min || 1) * 84;
  return <svg className="og-scatter" viewBox="0 0 100 100" role="img" aria-label={title}><line x1="8" y1="92" x2="92" y2="8" className="og-identity-line" /><polygon points={`8,${92 - bandPct} 92,${8 - bandPct} 92,${8 + bandPct} 8,${92 + bandPct}`} className="og-scatter__band" />{niceTicks(min, max, 4).map((tick) => <g><line x1={scale(tick)} x2={scale(tick)} y1="8" y2="92" className="og-sync__grid" /><line x1="8" x2="92" y1={100 - scale(tick)} y2={100 - scale(tick)} className="og-sync__grid" /><text x={scale(tick)} y="98" text-anchor="middle">{formatNumber(tick, 0)}</text><text x="6" y={100 - scale(tick) + 2} text-anchor="end">{formatNumber(tick, 0)}</text></g>)}{points.map(([x, y], index) => <circle cx={scale(x)} cy={100 - scale(y)} r="1.5" className={pointTones[index] ? `val-dot val-dot--${pointTones[index]}` : "og-scatter__point"} />)}{xLabel && <text x="50" y="99" text-anchor="middle">{xLabel}</text>}{yLabel && <text x="2" y="50" text-anchor="middle" transform="rotate(-90 2 50)">{yLabel}</text>}</svg>;
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
export function KpiTile({ label, value, unit, delta, meta, tone = "nominal" }: { label: string; value: number | string; unit?: string; delta?: string; meta?: string; tone?: Tone }) {
  const displayValue = typeof value === "number" ? formatNumber(value, 1) : value;
  return <article className={`og-kpi-tile og-kpi-tile--${tone}`}><div className="og-label">{label}</div><div className="og-kpi-tile__value">{displayValue}{unit && <small>{unit}</small>}</div>{(delta || meta) && <div className="og-kpi-tile__meta">{delta}{delta && meta ? " · " : ""}{meta}</div>}</article>;
}
export function PageHeader({ eyebrow, title, description, meta, children }: { eyebrow?: string; title: string; description?: string; meta?: ComponentChildren; children?: ComponentChildren }) {
  return <header className="og-page-header">{eyebrow && <div className="og-page-header__eyebrow og-label">{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}<div className="og-page-header__meta">{meta}{children}</div></header>;
}

export function BackendStatePill() {
  const state = useBackendState();
  return <span className={`og-backend-pill og-backend-pill--${state}`}><span className="og-status-dot" />{backendStateLabel(state)}</span>;
}
