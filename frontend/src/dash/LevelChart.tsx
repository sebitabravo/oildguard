// T11 level + confidence chart (S6 slice, SVG, no deps).
//
// Level trace with a +/- sigma confidence band, rest-window shading,
// warning/critical threshold lines, and N1–N4 alert dots. Pure SVG so it
// renders in headless screenshots without extra packages.

import type { DashAlert } from "../sim/api";
import type { RestWindow } from "../sim/signals";
import { useLang } from "../i18n";

export interface ChartPoint {
  t_s: number;
  liters: number;
}

interface LevelChartProps {
  points: ChartPoint[];
  sigmaL: number;
  windows: RestWindow[];
  alerts: DashAlert[];
}

const W = 640;
const H = 220;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 34;
const PAD_B = 26;

const WARN_L = 47.5;
const CRIT_L = 28.5;
const CAP_L = 95;

const ALERT_CSS: Record<string, string> = {
  N1: "var(--og-amber)",
  N2: "var(--og-orange)",
  N3: "var(--og-orange)",
  N4: "var(--og-red)",
};

export default function LevelChart({
  points,
  sigmaL,
  windows,
  alerts,
}: LevelChartProps) {
  const [lang] = useLang();
  const es = lang === "es";
  if (points.length === 0) {
    return (
      <p style={{ color: "var(--og-muted)", fontSize: 13 }}>
        {es ? "Sin muestras de nivel — ingiere filas o ejecuta la demo." : "No level samples yet — ingest rows or run the demo."}
      </p>
    );
  }
  const tMin = points[0].t_s;
  const tMax = points[points.length - 1].t_s;
  const span = Math.max(1, tMax - tMin);
  const yMax = CAP_L + 3;
  const yMin = 20;
  const x = (t: number) =>
    PAD_L + ((t - tMin) / span) * (W - PAD_L - PAD_R);
  const y = (l: number) =>
    PAD_T + (1 - (l - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B);

  const line = points.map((p) => `${x(p.t_s).toFixed(1)},${y(p.liters).toFixed(1)}`).join(" ");
  const bandTop = points
    .map((p) => `${x(p.t_s).toFixed(1)},${y(p.liters + sigmaL).toFixed(1)}`)
    .join(" ");
  const bandBottom = [...points]
    .reverse()
    .map((p) => `${x(p.t_s).toFixed(1)},${y(p.liters - sigmaL).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={es ? "Nivel de aceite con banda de confianza" : "Oil level with confidence band"}
      style={{ display: "block", background: "var(--og-panel-inset)" }}
    >
      {/* rest-window shading */}
      {windows
        .filter((w) => w.state === "rest")
        .map((w) => {
          const x0 = x(Math.max(tMin, w.start_t_s));
          const x1 = x(Math.min(tMax, w.end_t_s));
          if (x1 <= x0) return null;
          return (
            <rect
              key={w.window_id}
              x={x0}
              y={PAD_T}
              width={x1 - x0}
              height={H - PAD_T - PAD_B}
              fill="var(--og-green)"
              opacity={0.12}
            />
          );
        })}
      {/* threshold lines */}
      <line x1={PAD_L} x2={W - PAD_R} y1={y(WARN_L)} y2={y(WARN_L)} stroke="var(--og-amber)" strokeDasharray="5 4" strokeWidth={1} />
      <line x1={PAD_L} x2={W - PAD_R} y1={y(CRIT_L)} y2={y(CRIT_L)} stroke="var(--og-red)" strokeDasharray="5 4" strokeWidth={1} />
      <text x={W - PAD_R - 2} y={y(WARN_L) - 4} fill="var(--og-amber)" fontSize={10} textAnchor="end">
        {es ? "advertencia 50% (47.5 L)" : "warn 50% (47.5 L)"}
      </text>
      <text x={W - PAD_R - 2} y={y(CRIT_L) - 4} fill="var(--og-red)" fontSize={10} textAnchor="end">
        {es ? "crítico 30% (28.5 L)" : "critical 30% (28.5 L)"}
      </text>
      {/* confidence band */}
      <polygon points={`${bandTop} ${bandBottom}`} fill="var(--og-blue)" opacity={0.22} />
      {/* level line */}
      <polyline points={line} fill="none" stroke="var(--og-text)" strokeWidth={1.6} />
      {/* alert dots (ladder-offset so same-window N1/N2/N3 all stay visible) */}
      {alerts.map((a) => {
        const lvl = Number(a.inputs.level_med_L ?? 80);
        const base = Number.isFinite(lvl) ? lvl : 80;
        const lane = { N1: 0, N2: 1, N3: 2, N4: 3 }[a.level] ?? 0;
        const cy = y(base) - lane * 13;
        return (
          <g key={a.alert_id}>
            <circle
              cx={x(a.t_s)}
              cy={cy}
              r={6}
              fill={ALERT_CSS[a.level] ?? "var(--og-text)"}
              stroke="var(--og-panel-inset)"
              strokeWidth={1.5}
            />
            <text
              x={x(a.t_s)}
              y={cy - 9}
              fill={ALERT_CSS[a.level] ?? "var(--og-text)"}
              fontSize={10}
              fontWeight={700}
              textAnchor="middle"
            >
              {a.level}
            </text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="var(--og-line-soft)" />
      <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="var(--og-line-soft)" />
      <text x={PAD_L - 6} y={y(CAP_L)} fill="var(--og-muted)" fontSize={10} textAnchor="end">
        95
      </text>
      <text x={PAD_L - 6} y={y(60)} fill="var(--og-muted)" fontSize={10} textAnchor="end">
        60
      </text>
      <text x={PAD_L} y={H - 8} fill="var(--og-muted)" fontSize={10}>
        t {tMin.toFixed(0)} s
      </text>
      <text x={W - PAD_R} y={H - 8} fill="var(--og-muted)" fontSize={10} textAnchor="end">
        {tMax.toFixed(0)} s
      </text>
    </svg>
  );
}
