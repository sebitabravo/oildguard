import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { createDemoDataset } from "../../demo/demoData";
import { t } from "../../i18n";
import { mergeLiveDevices, toCsv, type FleetRow } from "./logic";
import { FleetWheelRow } from "./FleetPage";

const dataset = createDemoDataset();
const NOW = Date.parse("2026-10-10T12:00:00.000Z");

function liveRow(device: Parameters<typeof mergeLiveDevices>[1][number]): FleetRow {
  const row = mergeLiveDevices(dataset.trucks, [device]).find((item) => item.id === device.device_id);
  if (!row) throw new Error(`missing ${device.device_id}`);
  return row;
}

function renderRow(row: FleetRow): string {
  return renderToString(h(FleetWheelRow, { row, now: NOW }));
}

describe("rejected-only fleet devices", () => {
  test("shows rejected-signature status instead of link-down without verified rows", () => {
    const rejectedOnly = liveRow({
      device_id: "wheel-RH-rejected",
      truck_id: "OG-01",
      last_t_iso: null,
      rows_verified: 0,
      rows_rejected: 2,
    });
    const disconnected = liveRow({
      device_id: "wheel-RH-disconnected",
      truck_id: "OG-01",
      last_t_iso: null,
      rows_verified: 0,
      rows_rejected: 0,
    });

    const rejectedHtml = renderRow(rejectedOnly);
    const disconnectedHtml = renderRow(disconnected);

    expect(rejectedHtml).toContain("RECHAZADAS POR FIRMA · SIN DATOS VERIFICADOS");
    expect(rejectedHtml).not.toContain(t("fleet.state.link-down"));
    expect(disconnectedHtml).toContain(t("fleet.state.link-down"));
    expect(toCsv([rejectedOnly])).toContain('"rejected-only"');
  });

  test("rejected-only status takes precedence for an out-of-service fallback wheel", () => {
    const outOfServiceWheel = liveRow({
      device_id: "wheel-LH-06",
      truck_id: "OG-06",
      last_t_iso: null,
      rows_verified: 0,
      rows_rejected: 1,
    });

    expect(renderRow(outOfServiceWheel)).toContain("FILAS RECHAZADAS POR FIRMA · SIN DATOS VERIFICADOS");
  });
});
