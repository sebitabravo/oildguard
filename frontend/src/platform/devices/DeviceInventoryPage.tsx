import { useCallback, useMemo, useState } from "preact/hooks";
import { t } from "../../i18n";
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

function relativeTime(timestamp: number | null, nowMs: number): string {
  if (timestamp === null) return t("devices.notReported");
  const seconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (seconds < 30) return t("devices.lastSeenNow");
  if (seconds < 60 * 60) {
    const minutes = Math.floor(seconds / 60);
    return minutes < 1
      ? t("devices.secondsAgo", { value: formatNumber(seconds, 0) })
      : t("devices.minutesAgo", { value: formatNumber(minutes, 0) });
  }
  return t("devices.hoursAgo", { value: formatNumber(seconds / 3600, 1) });
}

export default function DeviceInventoryPage() {
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
    ? t("devices.demoSigning")
    : health?.signing?.enforced && configuredKeys
      ? t("devices.hmac")
      : t("devices.signingUnenforced");
  const filterOptions: Array<[DeviceFilter, string]> = [
    ["all", t("devices.filterAll")],
    ["reporting", t("devices.filterReporting")],
    ["stale", t("devices.filterStale")],
    ["rejected", t("devices.filterRejected")],
  ];
  const columns = [
    { key: "device", label: t("devices.device") },
    { key: "mapping", label: t("devices.mapping") },
    { key: "lastSeen", label: t("devices.lastSeen") },
    { key: "rows", label: t("devices.rowsRetained") },
    { key: "signed", label: t("devices.signedRows") },
    { key: "rejected", label: t("devices.rejectedReasons") },
    { key: "signals", label: t("devices.latestSignals") },
    { key: "alert", label: t("devices.alertLevel") },
    { key: "signing", label: t("devices.rowSigning") },
    { key: "firmware", label: t("devices.firmware") },
    { key: "certificate", label: t("devices.certificate") },
  ];
  const rows = page.items.map((device) => {
    const mapping = mapDeviceToWheel(device.id, demoDataset.wheels.map((wheel) => ({ id: wheel.id, truckId: wheel.truckId, position: wheel.position })));
    const ratio = data.source === "demo" ? device.signedRatio ?? null : device.signedRatio ?? null;
    const ratioText = ratio === null ? t("devices.notReported") : `${formatNumber(ratio * 100, 1)}%`;
    const latest = device.latest
      ? `${formatNumber(device.latest.temperatureC, 1)} °C · ${formatNumber(device.latest.vibrationRmsG, 2)} g · ${formatNumber(device.latest.pressureKpa, 2)} kPa`
      : t("devices.notReported");
    const reasons = Object.entries(device.rejectedReasons).map(([reason, count]) => <span className="device-inventory__reason">{reason} · {formatNumber(count, 0)}</span>);
    return {
      id: device.id,
      state: device.lastSeenMs === null || nowMs - device.lastSeenMs > 120_000 ? "stale" as const : "nominal" as const,
      cells: {
        device: <code>{device.id}</code>,
        mapping: mapping ? <span>{mapping.truckId} · {mapping.position}</span> : <span>{t("devices.noMapping")}</span>,
        lastSeen: relativeTime(device.lastSeenMs, nowMs),
        rows: device.rowsRetained === null ? t("devices.notReported") : formatNumber(device.rowsRetained, 0),
        signed: <div className="device-inventory__ratio"><span>{ratioText}</span>{ratio !== null && <span className="device-inventory__bar"><i style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }} /></span>}</div>,
        rejected: reasons.length ? <div className="device-inventory__reasons">{reasons}</div> : <span>{device.rejectedRows > 0 ? formatNumber(device.rejectedRows, 0) : t("devices.notReported")}</span>,
        signals: latest,
        alert: device.alertLevel ? <span className={`device-inventory__alert device-inventory__alert--${device.alertLevel.toLowerCase()}`}>{device.alertLevel}</span> : device.alertLevelReason === "no_alert" ? t("devices.noAlert") : t("devices.notReported"),
        signing: signingLabel,
        firmware: t("devices.notReported"),
        certificate: t("devices.notReported"),
      },
    };
  });

  return <main className="device-inventory">
    <PageHeader eyebrow={t("devices.eyebrow")} title={t("devices.title")} description={t("devices.description")} meta={data.source === "demo" ? <SyntheticBadge /> : <span className="device-inventory__source">{t(data.source === "live" ? "devices.liveSource" : "devices.loading")}</span>} />
    <section className="device-inventory__kpis" aria-label={t("devices.title")}>
      <KpiTile label={t("devices.reporting")} value={data.source === "loading" ? "—" : formatNumber(kpis.reporting, 0)} />
      <KpiTile label={t("devices.signedRatio")} value={data.source === "loading" || displayedSignedRatio === null ? "—" : formatNumber(displayedSignedRatio * 100, 1)} unit={data.source === "loading" || displayedSignedRatio === null ? undefined : "%"} meta={displayedSignedRatio === null || data.source === "loading" ? undefined : t(data.source === "demo" ? "devices.demoSource" : "devices.liveSource")} />
      <KpiTile label={t("devices.rejected")} value={data.source === "loading" ? "—" : formatNumber(kpis.rejected, 0)} />
      <KpiTile label={t("devices.stale")} value={data.source === "loading" ? "—" : formatNumber(kpis.stale, 0)} />
    </section>
    <FilterBar><div className="device-inventory__filters" aria-label={t("devices.filterLabel")}>
      <label><span>{t("devices.filterLabel")}</span><select value={filter} onChange={(event) => { setFilter((event.currentTarget as HTMLSelectElement).value as DeviceFilter); setPageIndex(1); }}>{filterOptions.map(([value, label]) => <option value={value}>{label}</option>)}</select></label>
      <label><span>{t("devices.search")}</span><input type="search" value={query} onInput={(event) => { setQuery((event.currentTarget as HTMLInputElement).value); setPageIndex(1); }} placeholder={t("devices.search")} /></label>
    </div></FilterBar>
    {data.source === "demo" && <div className="device-inventory__demo-note"><SyntheticBadge /><span>{t("devices.demoSigning")}</span></div>}
    <DataTable caption={t("devices.title")} columns={columns} rows={rows} />
    {rows.length === 0 && <p className="device-inventory__empty">{t(data.source === "loading" ? "devices.loadingNote" : "devices.empty")}</p>}
    {page.pageCount > 1 && <nav className="device-inventory__pagination" aria-label={t("devices.filterLabel")}>
      <span>{t("devices.pagination")} {formatNumber((page.page - 1) * 20 + 1, 0)}–{formatNumber(Math.min(page.page * 20, page.total), 0)} / {formatNumber(page.total, 0)}</span>
      <div><button type="button" disabled={page.page === 1} onClick={() => setPageIndex(page.page - 1)}>{t("devices.previous")}</button><span>{formatNumber(page.page, 0)} / {formatNumber(page.pageCount, 0)}</span><button type="button" disabled={page.page === page.pageCount} onClick={() => setPageIndex(page.page + 1)}>{t("devices.next")}</button></div>
    </nav>}
    <aside className="device-inventory__note"><strong>{t("devices.rowSigning")}</strong><p>{t("devices.signingNote")}</p></aside>
  </main>;
}
