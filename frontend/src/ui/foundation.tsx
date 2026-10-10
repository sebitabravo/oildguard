import type { ComponentChildren, JSX } from "preact";

export type Severity = "N1" | "N2" | "N3" | "N4";

export function StatusBadge({ label, tone = "nominal" }: { label: string; tone?: "nominal" | "warning" | "critical" | "info" }) {
  return <span className={`og-foundation-badge og-foundation-badge--${tone}`}><span className="og-status-dot" />{label}</span>;
}
export function SeverityBadge({ severity }: { severity: Severity }) {
  return <StatusBadge label={severity} tone={severity === "N4" ? "critical" : severity === "N1" ? "warning" : severity === "N2" || severity === "N3" ? "warning" : "nominal"} />;
}
export function RegimeChip({ regime }: { regime: "movement" | "rest" }) { return <span className="og-chip">{regime === "movement" ? "MOVEMENT" : "REST"}</span>; }
export function ProvenanceTag({ value = "DERIVED" }: { value?: "VERIFIED" | "DERIVED" | "ASSUMPTION" }) { return <span className="og-chip">{value}</span>; }
export function SyntheticBadge() { return <span className="og-chip og-chip--synthetic">SYNTHETIC-PROXY</span>; }
export function TelemetryCard({ label, value, unit, children }: { label: string; value: string; unit?: string; children?: ComponentChildren }) {
  return <article className="og-foundation-card"><div className="og-label">{label}</div><div className="og-telemetry-value">{value}<small>{unit}</small></div>{children}</article>;
}
export function LevelBar({ value, max = 95 }: { value: number; max?: number }) { return <div className="og-levelbar" aria-label={`${value} of ${max}`}><span style={{ width: `${Math.max(0, Math.min(100, value / max * 100))}%` }} /></div>; }
export function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<ComponentChildren>> }) {
  return <div className="og-table-wrap"><table className="og-foundation-table"><thead><tr>{columns.map((column) => <th scope="col">{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr>{row.map((cell) => <td>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function AlertBanner({ severity = "N2", children }: { severity?: Severity; children: ComponentChildren }) { return <div className={`og-alert-banner og-alert-banner--${severity.toLowerCase()}`}><SeverityBadge severity={severity} /><span>{children}</span></div>; }
export function Notice({ children, tone = "info" }: { children: ComponentChildren; tone?: "info" | "warning" | "error" | "simulation" }) { return <div className={`og-notice og-notice--${tone}`}>{children}</div>; }
export function Timeline({ items }: { items: Array<{ title: string; actor: string; time: string }> }) { return <ol className="og-timeline">{items.map((item) => <li><strong>{item.title}</strong><span>{item.actor} · {item.time}</span></li>)}</ol>; }
export function ChannelFusion({ channels = ["pressure", "temperature", "acoustic"] }: { channels?: string[] }) { return <div className="og-channel-fusion">{channels.map((channel, index) => <div><span className="og-status-dot og-status-dot--ok" />{channel}<b>{index < 2 ? "VOTE" : "VETO"}</b></div>)}</div>; }
export function SegmentedControl({ options, value, onChange }: { options: string[]; value: string; onChange?: (value: string) => void }) { return <div className="og-seg">{options.map((option) => <button type="button" className="og-seg__btn" aria-pressed={option === value} onClick={() => onChange?.(option)}>{option}</button>)}</div>; }
export function Sparkline({ values = [42, 48, 45, 52, 50] }: { values?: number[] }) { const points = values.map((value, index) => `${index * 25},${60 - value / 2}`).join(" "); return <svg className="og-sparkline" viewBox="0 0 100 60" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" stroke-width="2" /></svg>; }
export function TimeSeriesChart({ values = [42, 48, 45, 52, 50] }: { values?: number[] }) { return <div className="og-chart"><Sparkline values={values} /></div>; }
export function ScatterChart({ points = [[10, 12], [25, 22], [40, 45]] }: { points?: number[][] }) { return <svg className="og-scatter" viewBox="0 0 100 60" aria-label="Scatter chart">{points.map(([x, y]) => <circle cx={x} cy={60 - y} r="2" />)}</svg>; }
export function FilterBar({ children }: { children: ComponentChildren }) { return <div className="og-filterbar">{children}</div>; }
export function FormField({ label, children }: { label: string; children: ComponentChildren }) { return <label className="og-form-field"><span>{label}</span>{children}</label>; }
export function Slider(props: JSX.InputHTMLAttributes<HTMLInputElement>) { return <input type="range" {...props} />; }
export function Toggle({ checked, onChange }: { checked?: boolean; onChange?: (value: boolean) => void }) { return <button type="button" className={`og-toggle ${checked ? "is-on" : ""}`} aria-pressed={checked} onClick={() => onChange?.(!checked)}>●</button>; }
export function Button({ children, variant = "primary", ...props }: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) { return <button {...props} className={`og-button og-button--${variant}`}>{children}</button>; }
export function Icon({ name }: { name: string }) { return <span className="og-icon" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>; }
export function EmptyState({ title, detail }: { title: string; detail?: string }) { return <div className="og-empty"><strong>{title}</strong>{detail && <span>{detail}</span>}</div>; }
export function KpiTile({ label, value, unit }: { label: string; value: string; unit?: string }) { return <TelemetryCard label={label} value={value} unit={unit} />; }
export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ComponentChildren }) { return <header className="og-page-header">{eyebrow && <div className="og-label">{eyebrow}</div>}<h1>{title}</h1>{children}</header>; }
