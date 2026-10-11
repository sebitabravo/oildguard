import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { createDemoDataset } from "../../demo/dataset";
import { t, type Lang } from "../../i18n";
import { mergeLiveDevices, type FleetRow } from "./logic";
import { FleetWheelRow } from "./FleetPage";

const dataset = createDemoDataset();
// Reloj fijo: evita pruebas frágiles contra el reloj mural.
const NOW = Date.parse("2026-10-10T12:00:00.000Z");

function liveRowWithLevel(): FleetRow {
  const live = mergeLiveDevices(dataset.trucks, [{
    device_id: "wheel-RH-01",
    truck_id: "OG-01",
    latest_level_liters: 91.2,
    last_t_iso: "2026-10-10T09:00:00.000Z",
  }]);
  const row = live.find((item) => item.id === "wheel-RH-01");
  if (!row) throw new Error("missing wheel-RH-01");
  return row;
}

function renderRow(lang: Lang, row: FleetRow): string {
  return renderToString(h(FleetWheelRow, { row, lang, now: NOW }));
}

function cellsOf(html: string): string[] {
  return html.split(/<td[^>]*>/).slice(1);
}

describe("fleet per-field provenance", () => {
  test("a LIVE-merged row keeps demo telemetry labeled DEMO at the field", () => {
    const row = liveRowWithLevel();
    expect(row.source).toBe("LIVE");
    // Solo el nivel y la última comunicación vienen del backend; el resto
    // sigue siendo DEMO aunque la fila sea LIVE.
    expect(row.fieldSources.level).toBe("LIVE");
    expect(row.fieldSources.lastComm).toBe("LIVE");
    expect(row.fieldSources.trend).toBe("DEMO");
    expect(row.fieldSources.lossRate).toBe("DEMO");
    expect(row.fieldSources.temperature).toBe("DEMO");
    expect(row.fieldSources.vibration).toBe("DEMO");
    expect(row.fieldSources.regime).toBe("DEMO");
    expect(row.fieldSources.alert).toBe("DEMO");
    for (const lang of ["en", "es"] as const) {
      const cells = cellsOf(renderRow(lang, row));
      expect(cells.length).toBe(9);
      // Nivel y última comunicación en vivo; el resto demo, cada uno en su celda.
      expect(cells[1].includes(t("fleet.source.live", lang))).toBe(true);
      expect(cells[2].includes(t("fleet.source.demo", lang))).toBe(true);
      expect(cells[3].includes(t("fleet.source.demo", lang))).toBe(true);
      expect(cells[4].includes(t("fleet.source.demo", lang))).toBe(true);
      expect(cells[5].includes(t("fleet.source.demo", lang))).toBe(true);
      expect(cells[6].includes(t("fleet.source.demo", lang))).toBe(true);
      expect(cells[7].includes(t("fleet.source.demo", lang))).toBe(true);
      expect(cells[8].includes(t("fleet.source.live", lang))).toBe(true);
    }
  });

  test("demo rows label every field DEMO", () => {
    const row = mergeLiveDevices(dataset.trucks, []).find((item) => item.id === "wheel-RH-01");
    if (!row) throw new Error("missing wheel-RH-01");
    expect(row.source).toBe("DEMO");
    for (const lang of ["en", "es"] as const) {
      const cells = cellsOf(renderRow(lang, row));
      expect(cells.length).toBe(9);
      for (const cell of cells) {
        expect(cell.includes(t("fleet.source.demo", lang))).toBe(true);
        expect(cell.includes(t("fleet.source.live", lang))).toBe(false);
      }
    }
  });

  test("live device without a level keeps level DEMO while last-comm stays LIVE", () => {
    const live = mergeLiveDevices(dataset.trucks, [{
      device_id: "wheel-RH-01",
      truck_id: "OG-01",
      last_t_iso: "2026-10-10T09:00:00.000Z",
    }]);
    const row = live.find((item) => item.id === "wheel-RH-01");
    if (!row) throw new Error("missing wheel-RH-01");
    expect(row.source).toBe("LIVE");
    expect(row.fieldSources.level).toBe("DEMO");
    expect(row.fieldSources.lastComm).toBe("LIVE");
    for (const lang of ["en", "es"] as const) {
      const cells = cellsOf(renderRow(lang, row));
      expect(cells[1].includes(t("fleet.source.demo", lang))).toBe(true);
      expect(cells[8].includes(t("fleet.source.live", lang))).toBe(true);
    }
  });

  test("negative: a demo temperature in a LIVE row renders unlabeled without the fix", () => {
    // La fila es LIVE pero su temperatura sigue siendo DEMO; si la celda de
    // temperatura se pintara sin rótulo, esta aserción fallaría y la mezcla
    // volvería a presentarse como viva en silencio.
    const row = liveRowWithLevel();
    expect(row.source).toBe("LIVE");
    expect(row.fieldSources.temperature).toBe("DEMO");
    for (const lang of ["en", "es"] as const) {
      const cells = cellsOf(renderRow(lang, row));
      const tempCell = cells[4];
      expect(tempCell.includes(t("fleet.source.demo", lang))).toBe(true);
      expect(tempCell.includes("°C")).toBe(true);
    }
  });

  test("level LIVE does not cover demo sigma: distinct badges EN+ES", () => {
    // El nivel viene del backend pero el sigma sigue siendo sintético; un solo
    // rótulo LIVE en la celda compuesta lo presentaría como vivo.
    const row = liveRowWithLevel();
    expect(row.source).toBe("LIVE");
    expect(row.fieldSources.level).toBe("LIVE");
    for (const lang of ["en", "es"] as const) {
      const cells = cellsOf(renderRow(lang, row));
      const levelCell = cells[1] ?? "";
      const liveLabel = t("fleet.source.live", lang);
      const demoLabel = t("fleet.source.demo", lang);
      expect(levelCell.includes(liveLabel)).toBe(true);
      expect(levelCell.includes(demoLabel)).toBe(true);
      const sigmaMark = levelCell.indexOf("±");
      const liveIndex = levelCell.indexOf(liveLabel);
      const demoIndex = levelCell.indexOf(demoLabel);
      expect(sigmaMark).toBeGreaterThan(-1);
      expect(liveIndex).toBeGreaterThan(-1);
      expect(liveIndex).toBeLessThan(sigmaMark);
      expect(demoIndex).toBeGreaterThan(sigmaMark);
      expect(levelCell.split("og-fleet-source").length).toBeGreaterThan(2);
    }
  });
});
