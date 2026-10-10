import { useCallback, useMemo, useState } from "preact/hooks";
import { t, useLang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { demoDataset } from "../../demo/dataset";
import { DataTable, FilterBar, KpiTile, PageHeader, SyntheticBadge } from "../../ui/foundation";
import { useBackendOrDemo } from "../../ui/backendOrDemo";
import { getFleetDevices, getPlatformHealth, type BackendDevice, type PlatformHealthResponse } from "../api";
import { deriveDeviceKpis, deriveSignedRowsRatio, filterDevices, mapDeviceToWheel, paginateDevices, type DeviceFilter, type InventoryDevice } from "./logic";
import "./devices.css";

interface PageData {
  devices: InventoryDevice[];
  health: PlatformHealthResponse | null;
}

function demoInventory(): PageData {
  const devices = demoDataset.devices.map((device) => {
    const wheel = demoDataset.wheels.find((candidate) => candidate.id === device.id);
    return {
      id: device.id,
      lastSeenMs: device.lastSeen,
      rowsRetained: null,
      rowsVerified: 0,
      rowsOffered: 0,
      signedRatio: device.signedRowRatio,
      rejectedRows: 0,
      rejectedReasons: {},
      latest: wheel ? {
        temperatureC: wheel.temperatureC,
        vibrationRmsG: wheel.vibRms,
        pressureKpa: wheel.pressureKpa,
        fsmState: wheel.regime,
        moving: wheel.regime === "movement" ? 1 : 0,
        linkDown: wheel.state === "link-down" ? 1 : 0,
        tIso: device.lastSeen ? new Date(device.lastSeen).toISOString() : "",
      } : null,
      alertLevel: wheel?.alertLevel ?? null,
      alertLevelReason: null,
    } satisfies InventoryDevice;
  });
  return { devices, health: null };
}
const DEMO_INVENTORY_DATA = demoInventory();

function mapBackendDevice(device: BackendDevice): InventoryDevice {
  return {
    id: device.device_id,
    lastSeenMs: device.last_t_iso ? Date.parse(device.last_t_iso) : null,
    rowsRetained: device.rows_retained,
    rowsVerified: device.rows_verified,
    rowsOffered: device.rows_offered,
    signedRatio: device.verified_ratio,
    rejectedRows: device.rows_rejected,
    rejectedReasons: device.rejected_reasons,
    latest: device.latest ? {
      temperatureC: device.latest.temperature_c,
      vibrationRmsG: device.latest.vib_rms_g,
      pressureKpa: device.latest.pressure_kpa,
      fsmState: device.latest.fsm_state,
      moving: device.latest.moving,
      linkDown: device.latest.link_down,
      tIso: device.latest.t_iso,
    } : null,
    alertLevel: device.alert_level,
    alertLevelReason: device.alert_level_reason,
  };
}

function relativeTime(timestamp: number | null, nowMs: number, lang: "en" | "es"): string {
  if (timestamp === null) return t("devices.notReported", lang);
  const seconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (seconds < 30) return t("devices.lastSeenNow", lang);
  if (seconds < 60 * 60) {
    const minutes = Math.floor(seconds / 60);
    return minutes < 1
      ? t("devices.secondsAgo", lang, { value: formatNumber(seconds, lang, 0) })
      : t("devices.minutesAgo", lang, { value: formatNumber(minutes, lang, 0) });
  }
  return t("devices.hoursAgo", lang, { value: formatNumber(seconds / 3600, lang, 1) });
}

export default function DeviceInventoryPage() {
  const [lang] = useLang();
  const [filter, setFilter] = useState<DeviceFilter>("all");
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const load = useCallback(async (signal?: AbortSignal) => {
    const [deviceResponse, health] = await Promise.all([getFleetDevices(signal), getPlatformHealth(signal)]);
    return { devices: deviceResponse.devices.map(mapBackendDevice), health };
  }, []);
  const data = useBackendOrDemo(load, DEMO_INVENTORY_DATA, 10_000);
  const nowMs = data.source === "demo" ? demoDataset.referenceMs : Date.now();
  const devices = data.data?.devices ?? [];
  const kpis = useMemo(() => deriveDeviceKpis(devices, nowMs), [devices, nowMs]);
  const visible = useMemo(() => filterDevices(devices, filter, query, nowMs), [devices, filter, query, nowMs]);
  const displayedSignedRatio = useMemo(() => deriveSignedRowsRatio(visible), [visible]);
  const page = useMemo(() => paginateDevices(visible, pageIndex, 20), [visible, pageIndex]);
  const health = data.data?.health ?? null;
  const configuredKeys = Boolean(health?.device_keys?.master_key_configured || (health?.signing?.devices ?? 0) > 0);
  const signingLabel = data.source !== "live"
    ? t("devices.demoSigning", lang)
    : health?.signing?.enforced && configuredKeys
      ? t("devices.hmac", lang)
      : t("devices.signingUnenforced", lang);
  const filterOptions: Array<[DeviceFilter, string]> = [
    ["all", t("devices.filterAll", lang)],
    ["reporting", t("devices.filterReporting", lang)],
    ["stale", t("devices.filterStale", lang)],
    ["rejected", t("devices.filterRejected", lang)],
  ];
  const columns = [
    { key: "device", label: t("devices.device", lang) },
    { key: "mapping", label: t("devices.mapping", lang) },
    { key: "lastSeen", label: t("devices.lastSeen", lang) },
    { key: "rows", label: t("devices.rowsRetained", lang) },
    { key: "signed", label: t("devices.signedRows", lang) },
    { key: "rejected", label: t("devices.rejectedReasons", lang) },
    { key: "signals", label: t("devices.latestSignals", lang) },
    { key: "alert", label: t("devices.alertLevel", lang) },
    { key: "signing", label: t("devices.rowSigning", lang) },
    { key: "firmware", label: t("devices.firmware", lang) },
    { key: "certificate", label: t("devices.certificate", lang) },
  ];
  const rows = page.items.map((device) => {
    const mapping = mapDeviceToWheel(device.id, demoDataset.wheels.map((wheel) => ({ id: wheel.id, truckId: wheel.truckId, position: wheel.position })));
    const ratio = data.source === "demo" ? device.signedRatio ?? null : device.signedRatio ?? null;
    const ratioText = ratio === null ? t("devices.notReported", lang) : `${formatNumber(ratio * 100, lang, 1)}%`;
    const latest = device.latest
      ? `${formatNumber(device.latest.temperatureC, lang, 1)} °C · ${formatNumber(device.latest.vibrationRmsG, lang, 2)} g · ${formatNumber(device.latest.pressureKpa, lang, 2)} kPa`
      : t("devices.notReported", lang);
    const reasons = Object.entries(device.rejectedReasons).map(([reason, count]) => <span className="device-inventory__reason">{reason} · {formatNumber(count, lang, 0)}</span>);
    return {
      id: device.id,
      state: device.lastSeenMs === null || nowMs - device.lastSeenMs > 120_000 ? "stale" as const : "nominal" as const,
      cells: {
        device: <code>{device.id}</code>,
        mapping: mapping ? <span>{mapping.truckId} · {mapping.position}</span> : <span>{t("devices.noMapping", lang)}</span>,
        lastSeen: relativeTime(device.lastSeenMs, nowMs, lang),
        rows: device.rowsRetained === null ? t("devices.notReported", lang) : formatNumber(device.rowsRetained, lang, 0),
        signed: <div className="device-inventory__ratio"><span>{ratioText}</span>{ratio !== null && <span className="device-inventory__bar"><i style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }} /></span>}</div>,
        rejected: reasons.length ? <div className="device-inventory__reasons">{reasons}</div> : <span>{device.rejectedRows > 0 ? formatNumber(device.rejectedRows, lang, 0) : t("devices.notReported", lang)}</span>,
        signals: latest,
        alert: device.alertLevel ? <span className={`device-inventory__alert device-inventory__alert--${device.alertLevel.toLowerCase()}`}>{device.alertLevel}</span> : device.alertLevelReason === "no_alert" ? t("devices.noAlert", lang) : t("devices.notReported", lang),
        signing: signingLabel,
        firmware: t("devices.notReported", lang),
        certificate: t("devices.notReported", lang),
      },
    };
  });

  return <main className="device-inventory">
    <PageHeader eyebrow={t("devices.eyebrow", lang)} title={t("devices.title", lang)} description={t("devices.description", lang)} meta={data.source === "demo" ? <SyntheticBadge lang={lang} /> : <span className="device-inventory__source">{t(data.source === "live" ? "devices.liveSource" : "devices.loading", lang)}</span>} />
    <section className="device-inventory__kpis" aria-label={t("devices.title", lang)}>
      <KpiTile lang={lang} label={t("devices.reporting", lang)} value={data.source === "loading" ? "—" : formatNumber(kpis.reporting, lang, 0)} />
      <KpiTile lang={lang} label={t("devices.signedRatio", lang)} value={data.source === "loading" || displayedSignedRatio === null ? "—" : formatNumber(displayedSignedRatio * 100, lang, 1)} unit={data.source === "loading" || displayedSignedRatio === null ? undefined : "%"} meta={displayedSignedRatio === null || data.source === "loading" ? undefined : t(data.source === "demo" ? "devices.demoSource" : "devices.liveSource", lang)} />
      <KpiTile lang={lang} label={t("devices.rejected", lang)} value={data.source === "loading" ? "—" : formatNumber(kpis.rejected, lang, 0)} />
      <KpiTile lang={lang} label={t("devices.stale", lang)} value={data.source === "loading" ? "—" : formatNumber(kpis.stale, lang, 0)} />
    </section>
    <FilterBar><div className="device-inventory__filters" aria-label={t("devices.filterLabel", lang)}>
      <label><span>{t("devices.filterLabel", lang)}</span><select value={filter} onChange={(event) => { setFilter((event.currentTarget as HTMLSelectElement).value as DeviceFilter); setPageIndex(1); }}>{filterOptions.map(([value, label]) => <option value={value}>{label}</option>)}</select></label>
      <label><span>{t("devices.search", lang)}</span><input type="search" value={query} onInput={(event) => { setQuery((event.currentTarget as HTMLInputElement).value); setPageIndex(1); }} placeholder={t("devices.search", lang)} /></label>
    </div></FilterBar>
    {data.source === "demo" && <div className="device-inventory__demo-note"><SyntheticBadge lang={lang} /><span>{t("devices.demoSigning", lang)}</span></div>}
    <DataTable lang={lang} caption={t("devices.title", lang)} columns={columns} rows={rows} />
    {rows.length === 0 && <p className="device-inventory__empty">{t(data.source === "loading" ? "devices.loadingNote" : "devices.empty", lang)}</p>}
    {page.pageCount > 1 && <nav className="device-inventory__pagination" aria-label={t("devices.filterLabel", lang)}>
      <span>{t("devices.pagination", lang)} {formatNumber((page.page - 1) * 20 + 1, lang, 0)}–{formatNumber(Math.min(page.page * 20, page.total), lang, 0)} / {formatNumber(page.total, lang, 0)}</span>
      <div><button type="button" disabled={page.page === 1} onClick={() => setPageIndex(page.page - 1)}>{t("devices.previous", lang)}</button><span>{formatNumber(page.page, lang, 0)} / {formatNumber(page.pageCount, lang, 0)}</span><button type="button" disabled={page.page === page.pageCount} onClick={() => setPageIndex(page.page + 1)}>{t("devices.next", lang)}</button></div>
    </nav>}
    <aside className="device-inventory__note"><strong>{t("devices.rowSigning", lang)}</strong><p>{t("devices.signingNote", lang)}</p></aside>
  </main>;
}
