import type { ComponentChildren } from "preact";
import { t, type DictKey } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import {
  ChannelFusion, ProvenanceTag, RegimeChip, TelemetryCard, ValidityChip,
  type Severity,
} from "../../ui/foundation";
import { ladderRows, type LevelValidity } from "./logic";

type ChannelStates = Parameters<typeof ChannelFusion>[0]["channels"];

export interface WheelContextProps {
  truckId: string;
  wheelId: string;
  position: "LH" | "RH";
  regime: "movement" | "rest";
  sourceBadge: ComponentChildren;
  lastUpdate: string;
  wheelOptions: Array<{ id: string; label: string }>;
  onSelectWheel: (wheelId: string) => void;
}

export function WheelContext({ truckId, wheelId, position, regime, sourceBadge, lastUpdate, wheelOptions, onSelectWheel }: WheelContextProps) {
  return (
    <section className="og-wheel-context" aria-label={t("wheel.context.label")}>
      <div className="og-wheel-context__id">
        <label className="og-wheel-context__select">
          <span className="og-label">{t("history.selector")}</span>
          <select value={wheelId} onChange={(event) => onSelectWheel(event.currentTarget.value)}>
            {wheelOptions.map((option) => <option value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <p className="og-wheel-context__position">{t(`wheel.context.position.${position}`)}</p>
      </div>
      <dl className="og-wheel-context__facts">
        <div><dt>{t("dash.fleet.truck")}</dt><dd>{truckId}</dd></div>
        <div><dt>{t("wheel.context.model")}</dt><dd>930E-4SE · GDY106</dd></div>
        <div><dt>{t("wheel.context.regime")}</dt><dd><RegimeChip regime={regime} /> <small>{t("wheel.context.readOnly")}</small></dd></div>
        <div><dt>{t("wheel.context.source")}</dt><dd>{sourceBadge}</dd></div>
        <div><dt>{t("wheel.context.lastUpdate")}</dt><dd className="og-mono">{lastUpdate}</dd></div>
      </dl>
    </section>
  );
}

export interface TelemetryRowProps {
  level: number;
  sigma: number;
  confidence: number;
  validity: LevelValidity;
  levelSource: "LIVE" | "DEMO";
  sigmaSource: "LIVE" | "DEMO";
  confidenceSource: "LIVE" | "DEMO";
  pressureKpa: number;
  temperatureC: number;
  vibrationG: number;
  tauS: number;
  pressureLive: boolean;
  temperatureLive: boolean;
  vibrationLive: boolean;
}

export function NumericEvidence({ field, source, validity, children }: {
  field: "level" | "sigma" | "confidence";
  source: "LIVE" | "DEMO";
  validity: LevelValidity;
  children: ComponentChildren;
}) {
  const liveSourceWithoutBadge = source === "LIVE" && validity !== "valid";
  const originValidityCopy: Record<LevelValidity, DictKey> = {
    valid: "wheel.numeric.liveOrigin",
    estimate: "wheel.numeric.origin.estimate",
    stale: "wheel.numeric.origin.stale",
    invalid: "wheel.numeric.origin.invalid",
  };

  return (
    <span className="og-wheel-card__note" data-field={field}>
      {children}{" · "}
      {liveSourceWithoutBadge
        ? <span>{t("wheel.numeric.liveOrigin")} ({t(originValidityCopy[validity])})</span>
        : <span className={`og-badge og-badge--source og-badge--source-${source.toLowerCase()}`}>
            {t(source === "LIVE" ? "fleet.source.live" : "fleet.source.demo")}
          </span>}{" "}
      {source === "DEMO"
        ? <span className="og-chip og-chip--synthetic">{t("wheel.numeric.syntheticValidity")}</span>
        : <ValidityChip validity={validity} />}
    </span>
  );
}

function levelTone(percent: number): "nominal" | "warning" | "critical" {
  return percent < 30 ? "critical" : percent < 50 ? "warning" : "nominal";
}

export function TelemetryRow({ level, sigma, confidence, validity, levelSource, sigmaSource, confidenceSource, pressureKpa, temperatureC, vibrationG, tauS, pressureLive, temperatureLive, vibrationLive }: TelemetryRowProps) {
  const percent = (level / 95) * 100;
  return (
    <section className="og-wheel-telemetry" aria-label={t("wheel.telemetry")}>
      <TelemetryCard label={t("wheel.card.level")} value={level} unit="L" status={levelTone(percent)}>
        <NumericEvidence field="level" source={levelSource} validity={validity}>
          {t("wheel.card.levelNominal", { value: formatNumber(percent, 1) })}{" · "}
          {t("wheel.numeric.band", { value: formatNumber(sigma, 1) })}
        </NumericEvidence>
        <NumericEvidence field="sigma" source={sigmaSource} validity={validity}>
          {t("wheel.numeric.sigma")} {formatNumber(sigma, 1)} L
        </NumericEvidence>
        <NumericEvidence field="confidence" source={confidenceSource} validity={validity}>
          {t("ui.confidence")} {formatNumber(confidence, 2)} {t("wheel.numeric.unitless")}
        </NumericEvidence>
      </TelemetryCard>
      <TelemetryCard label={t("wheel.card.pressure")} value={formatNumber(pressureKpa, 2)} unit="kPa">
        <p className="og-wheel-card__note">{t("wheel.card.pressureNote")}</p>
        <p className="og-wheel-card__ref">{t(pressureLive ? "wheel.card.liveSource" : "wheel.card.demoReference")}</p>
      </TelemetryCard>
      <TelemetryCard label={t("wheel.card.temperature")} value={temperatureC} unit="°C">
        <p className="og-wheel-card__note">{t("wheel.card.temperatureNote")}</p>
        <p className="og-wheel-card__ref">{t(temperatureLive ? "wheel.card.liveSource" : "wheel.card.demoReference")}</p>
      </TelemetryCard>
      <TelemetryCard label={t("wheel.card.vibration")} value={formatNumber(vibrationG, 2)} unit="g">
        <p className="og-wheel-card__note">{t("wheel.card.vibrationNote")}</p>
        <p className="og-wheel-card__ref">{t(vibrationLive ? "wheel.card.liveSource" : "wheel.card.demoReference")}</p>
      </TelemetryCard>
      <TelemetryCard label={t("wheel.card.settling")} value={formatNumber(tauS, 2)} unit="s">
        <p className="og-wheel-card__note">{t("wheel.card.settlingNote")}</p>
      </TelemetryCard>
    </section>
  );
}

const LADDER_COPY: Record<Severity, DictKey> = {
  N1: "wheel.ladder.N1",
  N2: "wheel.ladder.N2",
  N3: "wheel.ladder.N3",
  N4: "wheel.ladder.N4",
};

export function LadderPanel({ active, colors }: { active: Severity | null; colors: Readonly<Record<string, string>> }) {
  return (
    <section className="og-wheel-panel" aria-label={t("wheel.ladder.title")}>
      <h3 className="og-wheel-panel__title">{t("wheel.ladder.title")}</h3>
      <ol className="og-wheel-ladder">
        {ladderRows(active).map((row) => (
          <li className={row.active ? "is-active" : ""} style={`--tone: ${colors[row.level]}`} aria-current={row.active ? "true" : undefined}>
            <b>{row.level}</b>
            <span>{t(LADDER_COPY[row.level])}</span>
            <em>{row.active ? t("wheel.ladder.active") : t("wheel.ladder.inactive")}</em>
          </li>
        ))}
      </ol>
      <p className="og-wheel-panel__note">{t("wheel.ladder.rule")}</p>
    </section>
  );
}

export function FusionPanel({ channels, votes }: { channels: ChannelStates; votes: number }) {
  return (
    <section className="og-wheel-panel" aria-label={t("wheel.fusion.title")}>
      <h3 className="og-wheel-panel__title">
        {t("wheel.fusion.title")}
        <span className="og-chip">{t("wheel.fusion.summary", { count: formatNumber(votes, 0) })}</span> <ProvenanceTag value="DERIVED" />
      </h3>
      <ChannelFusion channels={channels} />
      <p className="og-wheel-panel__note">{t("wheel.fusion.rule")}</p>
    </section>
  );
}

export function ChartLegend() {
  return (
    <ul className="og-wheel-legend">
      <li><i className="is-level" />{t("wheel.legend.level")}</li>
      <li><i className="is-band" />{t("wheel.legend.band")}</li>
      <li><i className="is-rest" />{t("wheel.legend.rest")}</li>
      <li><i className="is-movement" />{t("wheel.legend.movement")}</li>
    </ul>
  );
}
