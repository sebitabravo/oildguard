import { t, useLang } from "../i18n";
import {
  AlertBanner, ChannelFusion, DataTable, EmptyState, Icon, KpiTile, LevelBar,
  Notice, PageHeader, RegimeChip, ScatterChart, SegmentedControl, SeverityBadge,
  Sparkline, StatusBadge, SyntheticBadge, TelemetryCard, TimeSeriesChart,
  Timeline, ValidityChip,
} from "./foundation";

export default function UiCatalogue() {
  const [lang] = useLang();
  const rows = [
    { id: "nominal", state: "nominal" as const, cells: { device: "wheel-LH-01", state: <StatusBadge lang={lang} label="Nominal" />, validity: <ValidityChip lang={lang} validity="valid" /> } },
    { id: "warning", state: "warning" as const, cells: { device: "wheel-RH-02", state: <SeverityBadge lang={lang} severity="N2" />, validity: <ValidityChip lang={lang} validity="estimate" /> } },
    { id: "critical", state: "critical" as const, cells: { device: "wheel-LH-04", state: <SeverityBadge lang={lang} severity="N4" />, validity: <ValidityChip lang={lang} validity="invalid" /> } },
    { id: "stale", state: "stale" as const, cells: { device: "wheel-RH-05", state: <StatusBadge lang={lang} label="Stale" tone="warning" />, validity: <ValidityChip lang={lang} validity="stale" /> } },
    { id: "offline", state: "offline" as const, cells: { device: "wheel-RH-03", state: <StatusBadge lang={lang} label="Offline" tone="info" />, validity: <SyntheticBadge lang={lang} /> } },
  ];
  return (
    <>
      <PageHeader eyebrow={t("ui.catalogueEyebrow", lang)} title={t("ui.catalogueTitle", lang)} description={t("ui.catalogueDescription", lang)}>
        <SyntheticBadge lang={lang} />
      </PageHeader>
      <Notice lang={lang} kind="simulation">{t("ui.catalogueSynthetic", lang)}</Notice>
      <div className="og-catalogue-grid">
        <TelemetryCard lang={lang} label={t("ui.oilLevel", lang)} value={82.4} unit="L" sigma={1.2}><LevelBar lang={lang} value={82.4} sigma={1.2} /></TelemetryCard>
        <KpiTile lang={lang} label={t("ui.confidence", lang)} value={96} unit="%" delta="+2.1%" meta={t("ui.vsPriorWindow", lang)} />
        <div className="og-foundation-card"><div className="og-label">{t("ui.severity", lang)}</div><div className="og-catalogue-row"><StatusBadge lang={lang} label="Nominal" /><SeverityBadge lang={lang} severity="N1" /><SeverityBadge lang={lang} severity="N2" /><SeverityBadge lang={lang} severity="N3" /><SeverityBadge lang={lang} severity="N4" /></div></div>
        <div className="og-foundation-card"><div className="og-label">{t("ui.regimeValidity", lang)}</div><div className="og-catalogue-row"><RegimeChip lang={lang} regime="movement" /><RegimeChip lang={lang} regime="rest" /><ValidityChip lang={lang} validity="valid" /><ValidityChip lang={lang} validity="estimate" /><ValidityChip lang={lang} validity="stale" /><ValidityChip lang={lang} validity="invalid" /></div></div>
      </div>
      <div className="og-foundation-card og-catalogue-section"><div className="og-label">{t("ui.noticesActions", lang)}</div><div className="og-catalogue-stack"><Notice lang={lang} kind="stale">{t("ui.stale", lang)}</Notice><Notice lang={lang} kind="partial">{t("ui.partialData", lang)}</Notice><Notice lang={lang} kind="analyzer-unavailable">{t("ui.analyzerUnavailable", lang)}</Notice><AlertBanner lang={lang} severity="N2">{t("ui.demoActionsDisabled", lang)}</AlertBanner></div></div>
      <div className="og-catalogue-grid og-catalogue-section">
        <div className="og-foundation-card"><div className="og-label">{t("ui.charts", lang)}</div><Sparkline lang={lang} values={[42, 48, 45, 52, 50]} /><TimeSeriesChart lang={lang} values={[42, 48, 45, 52, 50]} sigma={[1, 1, 2, 1, 1]} thresholds={[{ value: 40, label: "N2" }]} events={[{ index: 2, label: t("ui.alert", lang) }]} gaps={[3]} xLabels={["−4 h", "−2 h", t("history.axis.now", lang)]} yUnit="L" /><ScatterChart lang={lang} points={[[10, 12], [25, 22], [40, 45]]} /></div>
        <div className="og-foundation-card"><div className="og-label">{t("ui.fusionTimeline", lang)}</div><ChannelFusion lang={lang} channels={{ pressure_drop: "fired", level_trend: "fired", vib_impact: "quiet", temp_drift_veto: "quiet" }} /><Timeline items={[{ title: t("ui.alertAcknowledged", lang), actor: t("ui.reliability", lang), time: "2026-10-10 08:42" }]} /></div>
      </div>
      <div className="og-catalogue-section"><DataTable lang={lang} caption={t("ui.catalogueTitle", lang)} columns={[{ key: "device", label: t("ui.device", lang), sortable: true }, { key: "state", label: t("ui.state", lang) }, { key: "validity", label: t("ui.validity", lang) }]} rows={rows} /></div>
      <div className="og-catalogue-row og-catalogue-section"><SegmentedControl options={["250 h", "7 d", "30 d"]} value="250 h" /><Icon name="fleet" label={t("ui.fleet", lang)} /><Icon name="wheel" label={t("ui.wheel", lang)} /><Icon name="alert" label={t("ui.alert", lang)} /><EmptyState title={t("ui.noLiveRows", lang)} detail={t("ui.localDemoLabel", lang)} /></div>
    </>
  );
}
