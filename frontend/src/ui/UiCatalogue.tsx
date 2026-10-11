import { t } from "../i18n";
import {
  AlertBanner, ChannelFusion, DataTable, EmptyState, Icon, KpiTile, LevelBar,
  Notice, PageHeader, RegimeChip, ScatterChart, SegmentedControl, SeverityBadge,
  Sparkline, StatusBadge, SyntheticBadge, TelemetryCard, TimeSeriesChart,
  Timeline, ValidityChip,
} from "./foundation";

export default function UiCatalogue() {
  const rows = [
    { id: "nominal", state: "nominal" as const, cells: { device: "wheel-LH-01", state: <StatusBadge label="Nominal" />, validity: <ValidityChip validity="valid" /> } },
    { id: "warning", state: "warning" as const, cells: { device: "wheel-RH-02", state: <SeverityBadge severity="N2" />, validity: <ValidityChip validity="estimate" /> } },
    { id: "critical", state: "critical" as const, cells: { device: "wheel-LH-04", state: <SeverityBadge severity="N4" />, validity: <ValidityChip validity="invalid" /> } },
    { id: "stale", state: "stale" as const, cells: { device: "wheel-RH-05", state: <StatusBadge label="Stale" tone="warning" />, validity: <ValidityChip validity="stale" /> } },
    { id: "offline", state: "offline" as const, cells: { device: "wheel-RH-03", state: <StatusBadge label="Offline" tone="info" />, validity: <SyntheticBadge /> } },
  ];
  return (
    <>
      <PageHeader eyebrow={t("ui.catalogueEyebrow")} title={t("ui.catalogueTitle")} description={t("ui.catalogueDescription")}>
        <SyntheticBadge />
      </PageHeader>
      <Notice kind="simulation">{t("ui.catalogueSynthetic")}</Notice>
      <div className="og-catalogue-grid">
        <TelemetryCard label={t("ui.oilLevel")} value={82.4} unit="L" sigma={1.2}><LevelBar value={82.4} sigma={1.2} /></TelemetryCard>
        <KpiTile label={t("ui.confidence")} value={96} unit="%" delta="+2.1%" meta={t("ui.vsPriorWindow")} />
        <div className="og-foundation-card"><div className="og-label">{t("ui.severity")}</div><div className="og-catalogue-row"><StatusBadge label="Nominal" /><SeverityBadge severity="N1" /><SeverityBadge severity="N2" /><SeverityBadge severity="N3" /><SeverityBadge severity="N4" /></div></div>
        <div className="og-foundation-card"><div className="og-label">{t("ui.regimeValidity")}</div><div className="og-catalogue-row"><RegimeChip regime="movement" /><RegimeChip regime="rest" /><ValidityChip validity="valid" /><ValidityChip validity="estimate" /><ValidityChip validity="stale" /><ValidityChip validity="invalid" /></div></div>
      </div>
      <div className="og-foundation-card og-catalogue-section"><div className="og-label">{t("ui.noticesActions")}</div><div className="og-catalogue-stack"><Notice kind="stale">{t("ui.stale")}</Notice><Notice kind="partial">{t("ui.partialData")}</Notice><Notice kind="analyzer-unavailable">{t("ui.analyzerUnavailable")}</Notice><AlertBanner severity="N2">{t("ui.demoActionsDisabled")}</AlertBanner></div></div>
      <div className="og-catalogue-grid og-catalogue-section">
        <div className="og-foundation-card"><div className="og-label">{t("ui.charts")}</div><Sparkline values={[42, 48, 45, 52, 50]} /><TimeSeriesChart values={[42, 48, 45, 52, 50]} sigma={[1, 1, 2, 1, 1]} thresholds={[{ value: 40, label: "N2" }]} events={[{ index: 2, label: t("ui.alert") }]} gaps={[3]} xLabels={["−4 h", "−2 h", t("history.axis.now")]} yUnit="L" /><ScatterChart points={[[10, 12], [25, 22], [40, 45]]} /></div>
        <div className="og-foundation-card"><div className="og-label">{t("ui.fusionTimeline")}</div><ChannelFusion channels={{ pressure_drop: "fired", level_trend: "fired", vib_impact: "quiet", temp_drift_veto: "quiet" }} /><Timeline items={[{ title: t("ui.alertAcknowledged"), actor: t("ui.reliability"), time: "2026-10-10 08:42" }]} /></div>
      </div>
      <div className="og-catalogue-section"><DataTable caption={t("ui.catalogueTitle")} columns={[{ key: "device", label: t("ui.device"), sortable: true }, { key: "state", label: t("ui.state") }, { key: "validity", label: t("ui.validity") }]} rows={rows} /></div>
      <div className="og-catalogue-row og-catalogue-section"><SegmentedControl options={["250 h", "7 d", "30 d"]} value="250 h" /><Icon name="fleet" label={t("ui.fleet")} /><Icon name="wheel" label={t("ui.wheel")} /><Icon name="alert" label={t("ui.alert")} /><EmptyState title={t("ui.noLiveRows")} detail={t("ui.localDemoLabel")} /></div>
    </>
  );
}
