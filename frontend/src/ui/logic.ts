import { ALERT_SEVERITY_COLORS } from "../dash/alertSeverity";
import { formatNumber } from "../i18n/numberFormat";

export type Tone = "nominal" | "warning" | "critical" | "info";
export type ChannelState = "fired" | "quiet" | "no-data";

export function severityTone(level: string): Tone {
  if (level === "N4") return "critical";
  if (level === "N1" || level === "N2" || level === "N3") return "warning";
  return "info";
}

export function severityColor(level: string): string {
  return ALERT_SEVERITY_COLORS[level] ?? "var(--og-text-muted)";
}

export function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function levelBarGeometry(value: number, max: number, sigma: number) {
  const safeMax = max > 0 ? max : 1;
  const percent = clampPercentage((value / safeMax) * 100);
  const bandStart = clampPercentage(((value - Math.abs(sigma)) / safeMax) * 100);
  const bandEnd = clampPercentage(((value + Math.abs(sigma)) / safeMax) * 100);
  return {
    percent,
    bandStart,
    bandWidth: Math.max(0, bandEnd - bandStart),
    warningTick: 50,
    criticalTick: 30,
  };
}

export function formatTick(value: number): string {
  return formatNumber(value, 1);
}

export function chartPoints(values: readonly (number | null)[], width: number, height: number) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const min = valid.length ? Math.min(...valid) : 0;
  const max = valid.length ? Math.max(...valid) : 1;
  const span = max - min || 1;
  return values.map((value, index) => value === null ? null : {
    x: values.length <= 1 ? 0 : (index / (values.length - 1)) * width,
    y: height - ((value - min) / span) * height,
  });
}

export function buildDeviceQuery(path: string, deviceId?: string): string {
  if (!deviceId) return path;
  return `${path}${path.includes("?") ? "&" : "?"}device_id=${encodeURIComponent(deviceId)}`;
}
