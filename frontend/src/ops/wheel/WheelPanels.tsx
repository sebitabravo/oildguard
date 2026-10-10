import type { ComponentChildren } from "preact";
import { t, type DictKey, type Lang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import {
  ChannelFusion, RegimeChip, TelemetryCard, ValidityChip,
  type Severity,
} from "../../ui/foundation";
import { ladderRows, type LevelValidity } from "./logic";

type ChannelStates = Parameters<typeof ChannelFusion>[0]["channels"];

export interface WheelContextProps {
  lang: Lang;
  truckId: string;
  wheelId: string;
  position: "LH" | "RH";
  regime: "movement" | "rest";
  sourceBadge: ComponentChildren;
  lastUpdate: string;
  wheelOptions: Array<{ id: string; label: string }>;
  onSelectWheel: (wheelId: string) => void;
}

export function WheelContext({ lang, truckId, wheelId, position, regime, sourceBadge, lastUpdate, wheelOptions, onSelectWheel }: WheelContextProps) {
  return (
    <section className="og-wheel-context" aria-label={t("wheel.context.label", lang)}>
      <div className="og-wheel-context__id">
        <label className="og-wheel-context__select">
          <span className="og-label">{t("history.selector", lang)}</span>
          <select value={wheelId} onChange={(event) => onSelectWheel(event.currentTarget.value)}>
            {wheelOptions.map((option) => <option value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <p className="og-wheel-context__position">{t(`wheel.context.position.${position}`, lang)}</p>
      </div>
      <dl className="og-wheel-context__facts">
        <div><dt>{t("dash.fleet.truck", lang)}</dt><dd>{truckId}</dd></div>
        <div><dt>{t("wheel.context.model", lang)}</dt><dd>930E-4SE · GDY106</dd></div>
        <div><dt>{t("wheel.context.regime", lang)}</dt><dd><RegimeChip lang={lang} regime={regime} /> <small>{t("wheel.context.readOnly", lang)}</small></dd></div>
        <div><dt>{t("wheel.context.source", lang)}</dt><dd>{sourceBadge}</dd></div>
        <div><dt>{t("wheel.context.lastUpdate", lang)}</dt><dd className="og-mono">{lastUpdate}</dd></div>
      </dl>
    </section>
  );
}

export interface TelemetryRowProps {
  lang: Lang;
  level: number;
  sigma: number;
  confidence: number;
  validity: LevelValidity;
  pressureKpa: number;
  temperatureC: number;
  vibrationG: number;
  tauS: number;
  pressureLive: boolean;
  temperatureLive: boolean;
  vibrationLive: boolean;
}

function levelTone(percent: number): "nominal" | "warning" | "critical" {
  return percent < 30 ? "critical" : percent < 50 ? "warning" : "nominal";
}

export function TelemetryRow({ lang, level, sigma, confidence, validity, pressureKpa, temperatureC, vibrationG, tauS, pressureLive, temperatureLive, vibrationLive }: TelemetryRowProps) {
  const percent = (level / 95) * 100;
  return (
    <section className="og-wheel-telemetry" aria-label={t("wheel.telemetry", lang)}>
      <TelemetryCard lang={lang} label={t("wheel.card.level", lang)} value={level} unit="L" sigma={sigma} status={levelTone(percent)}>
        <p className="og-wheel-card__note">{t("wheel.card.levelNominal", lang, { value: formatNumber(percent, lang, 1) })} · {t("ui.confidence", lang)} {formatNumber(confidence, lang, 2)}</p>
        <ValidityChip lang={lang} validity={validity} />
      </TelemetryCard>
      <TelemetryCard lang={lang} label={t("wheel.card.pressure", lang)} value={formatNumber(pressureKpa, lang, 2)} unit="kPa">
        <p className="og-wheel-card__note">{t("wheel.card.pressureNote", lang)}</p>
        <p className="og-wheel-card__ref">{t(pressureLive ? "wheel.card.liveSource" : "wheel.card.demoReference", lang)}</p>
      </TelemetryCard>
      <TelemetryCard lang={lang} label={t("wheel.card.temperature", lang)} value={temperatureC} unit="°C">
        <p className="og-wheel-card__note">{t("wheel.card.temperatureNote", lang)}</p>
        <p className="og-wheel-card__ref">{t(temperatureLive ? "wheel.card.liveSource" : "wheel.card.demoReference", lang)}</p>
      </TelemetryCard>
      <TelemetryCard lang={lang} label={t("wheel.card.vibration", lang)} value={formatNumber(vibrationG, lang, 2)} unit="g">
        <p className="og-wheel-card__note">{t("wheel.card.vibrationNote", lang)}</p>
        <p className="og-wheel-card__ref">{t(vibrationLive ? "wheel.card.liveSource" : "wheel.card.demoReference", lang)}</p>
      </TelemetryCard>
      <TelemetryCard lang={lang} label={t("wheel.card.settling", lang)} value={formatNumber(tauS, lang, 2)} unit="s">
        <p className="og-wheel-card__note">{t("wheel.card.settlingNote", lang)}</p>
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

export function LadderPanel({ lang, active, colors }: { lang: Lang; active: Severity | null; colors: Readonly<Record<string, string>> }) {
  return (
    <section className="og-wheel-panel" aria-label={t("wheel.ladder.title", lang)}>
      <h3 className="og-wheel-panel__title">{t("wheel.ladder.title", lang)}</h3>
      <ol className="og-wheel-ladder">
        {ladderRows(active).map((row) => (
          <li className={row.active ? "is-active" : ""} style={`--tone: ${colors[row.level]}`} aria-current={row.active ? "true" : undefined}>
            <b>{row.level}</b>
            <span>{t(LADDER_COPY[row.level], lang)}</span>
            <em>{row.active ? t("wheel.ladder.active", lang) : t("wheel.ladder.inactive", lang)}</em>
          </li>
        ))}
      </ol>
      <p className="og-wheel-panel__note">{t("wheel.ladder.rule", lang)}</p>
    </section>
  );
}

export function FusionPanel({ lang, channels, votes }: { lang: Lang; channels: ChannelStates; votes: number }) {
  return (
    <section className="og-wheel-panel" aria-label={t("wheel.fusion.title", lang)}>
      <h3 className="og-wheel-panel__title">
        {t("wheel.fusion.title", lang)}
        <span className="og-chip">{t("wheel.fusion.summary", lang, { count: formatNumber(votes, lang, 0) })}</span>
      </h3>
      <ChannelFusion lang={lang} channels={channels} />
      <p className="og-wheel-panel__note">{t("wheel.fusion.rule", lang)}</p>
    </section>
  );
}

export function ChartLegend({ lang }: { lang: Lang }) {
  return (
    <ul className="og-wheel-legend">
      <li><i className="is-level" />{t("wheel.legend.level", lang)}</li>
      <li><i className="is-band" />{t("wheel.legend.band", lang)}</li>
      <li><i className="is-rest" />{t("wheel.legend.rest", lang)}</li>
      <li><i className="is-movement" />{t("wheel.legend.movement", lang)}</li>
    </ul>
  );
}
