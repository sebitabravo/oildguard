import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { ProvenanceTag } from "../../ui/foundation";
import {
  OIL_FIXED_MASS_KG,
  OIL_GATE_LEVELS_L,
  OIL_MASS_FROM_C,
  OIL_MASS_TO_C,
  OIL_PLOT_TEMPS_C,
  OIL_PRESSURE_SOURCE,
  OIL_REFERENCE_L,
  OIL_SENSITIVITY_SOURCE,
  OIL_TABLE_TEMP_C,
  oilCurve,
  oilGateLabelKey,
  oilMassPressureKpa,
  oilPoint,
} from "./oilData";

// Gráfica de sensibilidad presión/volumen (B07): curvas a tres temperaturas
// calculadas con la física importada; cada cifra visible sale de oil.ts y
// lleva su procedencia en la tabla y en los atributos de datos.
const PLOT_WIDTH = 320;
const PLOT_HEIGHT = 180;
const PLOT_PAD = { left: 38, right: 10, top: 10, bottom: 24 } as const;

function strokeFor(tempC: number): string {
  if (tempC === 40) return "var(--og-info)";
  if (tempC === 80) return "var(--og-danger)";
  return "var(--og-accent)";
}

// La geometría SVG exige punto decimal (la coma separa coordenadas según la
// especificación), así que el atributo `d` se serializa con aritmética simple
// y nunca con el formateador local: el texto visible sigue usando formatNumber.
function pathNum(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export default function PressurePlot() {
  const curves = [...OIL_PLOT_TEMPS_C].map((tempC) => ({ tempC, points: oilCurve(tempC) }));
  const gates = [...OIL_GATE_LEVELS_L].sort((a, b) => b - a).map((volumeL) => oilPoint(volumeL, OIL_TABLE_TEMP_C));
  const atReference = [...OIL_PLOT_TEMPS_C].map((tempC) => oilPoint(OIL_REFERENCE_L, tempC));
  const massFrom = oilMassPressureKpa(OIL_FIXED_MASS_KG, OIL_MASS_FROM_C);
  const massTo = oilMassPressureKpa(OIL_FIXED_MASS_KG, OIL_MASS_TO_C);
  const massDeltaPct = ((massTo - massFrom) / massFrom) * 100;

  const volumes = curves[0]?.points.map((point) => point.volumeL) ?? [OIL_REFERENCE_L];
  const xMin = Math.min(...volumes);
  const xMax = Math.max(...volumes);
  const yMax = Math.max(...curves.flatMap((curve) => curve.points.map((point) => point.pressureKpa))) * 1.1;
  const x = (volumeL: number): number =>
    PLOT_PAD.left + ((volumeL - xMin) / (xMax - xMin)) * (PLOT_WIDTH - PLOT_PAD.left - PLOT_PAD.right);
  const y = (pressureKpa: number): number =>
    PLOT_HEIGHT - PLOT_PAD.bottom - (pressureKpa / yMax) * (PLOT_HEIGHT - PLOT_PAD.top - PLOT_PAD.bottom);

  return (
    <article className="landing__chart" data-oil="true" data-plot="sensitivity">
      <header className="landing__chart-head">
        <div>
          <span className="landing__micro">{t("landing.oil.title")}</span>
          <strong>{t("landing.oil.plotTitle")}</strong>
        </div>
        <span className="landing__assumption-chip inline-block px-og-50 py-og-50 border border-[color-mix(in_srgb,var(--og-warning)_45%,transparent)] text-og-warning text-og-xs leading-og-xs max-w-full whitespace-normal [overflow-wrap:anywhere]">{t("landing.oil.synth")}</span>
      </header>
      <div className="landing__chart-legend flex flex-wrap justify-end gap-og-100 mt-og-100 mb-0 max-[600px]:justify-start max-[600px]:gap-og-75" data-oil-legend="true">
        {curves.map((curve) => (
          <span className="flex items-center gap-og-50 font-og-mono text-og-xs leading-og-xs text-og-text-muted" key={curve.tempC}>
            <i className="h-[2px] w-[10px]" style={{ background: strokeFor(curve.tempC) }} />
            {`${formatNumber(curve.tempC, 0)} °C`}
          </span>
        ))}
      </div>
      <svg
        className="landing__plot block h-[192px] w-full overflow-visible max-[600px]:h-[160px]"
        data-oil-plot="true"
        viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
        role="img"
        aria-label={t("landing.oil.plotAlt")}
      >
        {curves.map((curve) => (
          <path
            key={curve.tempC}
            data-temp={String(curve.tempC)}
            data-volumes={curve.points.map((point) => String(point.volumeL)).join(",")}
            data-pressures={curve.points.map((point) => String(point.pressureKpa)).join(",")}
            d={curve.points.map((point, index) => `${index === 0 ? "M" : "L"}${pathNum(x(point.volumeL))} ${pathNum(y(point.pressureKpa))}`).join(" ")}
            fill="none"
            stroke={strokeFor(curve.tempC)}
            stroke-width={1.8}
          />
        ))}
        {gates.map((row) => (
          <circle
            key={row.volumeL}
            data-gate-volume={String(row.volumeL)}
            data-gate-temp={String(OIL_TABLE_TEMP_C)}
            data-pressure={String(row.pressureKpa)}
            cx={x(row.volumeL)}
            cy={y(row.pressureKpa)}
            r={3.5}
            fill="var(--og-accent)"
          />
        ))}
        {gates.map((row) => (
          <text key={`x${row.volumeL}`} x={x(row.volumeL)} y={PLOT_HEIGHT - 8} text-anchor="middle">
            {formatNumber(row.volumeL, 1)}
          </text>
        ))}
        {gates.map((row) => (
          <text key={`y${row.volumeL}`} x={8} y={y(row.pressureKpa) + 3}>
            {formatNumber(row.pressureKpa, 2)}
          </text>
        ))}
        <text x={PLOT_WIDTH - PLOT_PAD.right} y={PLOT_HEIGHT - 8} text-anchor="end">
          {t("landing.oil.volume")} · L
        </text>
        <text x={8} y={PLOT_PAD.top}>
          {t("landing.oil.pressure")} · kPa
        </text>
      </svg>
      <p className="landing__micro" data-oil-table-title="true">
        {t("landing.oil.tableTitle")} · {`${formatNumber(OIL_TABLE_TEMP_C, 0)} °C`}
      </p>
      <div className="landing__mount-table-wrap min-w-0 max-w-full">
        <div className="landing__mount-table-scroll w-full max-w-full min-w-0 overflow-x-auto">
          <table className="landing__mount-table" data-oil-table="true">
          <thead>
            <tr>
              <th>{t("landing.oil.level")}</th>
              <th>{t("landing.oil.volume")}</th>
              <th>{t("landing.oil.head")}</th>
              <th>{t("landing.oil.pressure")}</th>
              <th>{t("landing.oil.dvdh")}</th>
              <th>{t("landing.oil.dpdv")}</th>
            </tr>
          </thead>
          <tbody>
            {gates.map((row) => (
              <tr key={row.volumeL} data-volume={String(row.volumeL)} data-temp={String(OIL_TABLE_TEMP_C)}>
                <td>{t(oilGateLabelKey(row.volumeL))}</td>
                <td data-field="volume" data-value={String(row.volumeL)}>
                  {`${formatNumber(row.volumeL, 1)} L`} <ProvenanceTag value="CONFIGURACIÓN" />
                </td>
                <td data-field="head" data-value={String(row.headM)}>
                  {`${formatNumber(row.headM, 3)} m`} <ProvenanceTag value="ASSUMPTION" />
                </td>
                <td data-field="pressure" data-value={String(row.pressureKpa)}>
                  {`${formatNumber(row.pressureKpa, 3)} kPa`} <ProvenanceTag value="ASSUMPTION" />
                </td>
                <td data-field="dvdh" data-value={String(row.dvdhLPerMm)}>
                  {`${formatNumber(row.dvdhLPerMm, 3)} L/mm`} <ProvenanceTag value="ASSUMPTION" />
                </td>
                <td data-field="dpdv" data-value={String(row.dpdvKpaPerL)}>
                  {`${formatNumber(row.dpdvKpaPerL, 4)} kPa/L`} <ProvenanceTag value="ASSUMPTION" />
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
      <p className="landing__chart-note flex min-w-0 flex-wrap items-center gap-og-75 mt-og-75 mb-0 [overflow-wrap:anywhere] font-og-mono text-og-xs leading-og-xs text-og-text-muted" data-oil-temps="true">
        {t("landing.oil.tempTitle")} · {`${formatNumber(OIL_REFERENCE_L, 0)} L`} ·{" "}
        {atReference.map((row, index) => (
          <span key={row.tempC} data-temp={String(row.tempC)} data-pressure={String(row.pressureKpa)}>
            {index > 0 ? " · " : ""}
            {`${formatNumber(row.tempC, 0)} °C · ${formatNumber(row.pressureKpa, 3)} kPa`}
          </span>
        ))}
      </p>
      <p
        className="landing__chart-note flex min-w-0 flex-wrap items-center gap-og-75 mt-og-75 mb-0 [overflow-wrap:anywhere] font-og-mono text-og-xs leading-og-xs text-og-text-muted"
        data-oil-mass="true"
        data-mass={String(OIL_FIXED_MASS_KG)}
        data-p-from={String(massFrom)}
        data-p-to={String(massTo)}
      >
        {t("landing.oil.massPrefix")} {`${formatNumber(OIL_FIXED_MASS_KG, 0)} kg`} ·{" "}
        {`${formatNumber(OIL_MASS_FROM_C, 0)} °C`} → {`${formatNumber(OIL_MASS_TO_C, 0)} °C`}:{" "}
        {`${formatNumber(massFrom, 3)} kPa`} → {`${formatNumber(massTo, 3)} kPa`}{" "}
        ({`${formatNumber(massDeltaPct, 1)} %`}) — {t("landing.oil.massSuffix")}
      </p>
      <p className="landing__chart-note flex min-w-0 flex-wrap items-center gap-og-75 mt-og-75 mb-0 [overflow-wrap:anywhere] font-og-mono text-og-xs leading-og-xs text-og-text-muted" data-oil-source="pressure">
        {t("landing.oil.source")} · {OIL_PRESSURE_SOURCE}
      </p>
      <p className="landing__chart-note flex min-w-0 flex-wrap items-center gap-og-75 mt-og-75 mb-0 [overflow-wrap:anywhere] font-og-mono text-og-xs leading-og-xs text-og-text-muted" data-oil-source="sensitivity">
        {OIL_SENSITIVITY_SOURCE}
      </p>
    </article>
  );
}
