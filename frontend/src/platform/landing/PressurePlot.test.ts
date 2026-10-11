import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { headFromVolume, pressureKpaFromMass, pressureKpaFromVolume } from "../../twin/physics";
import {
  OIL_GATE_LEVELS_L,
  OIL_PLOT_TEMPS_C,
  OIL_TABLE_TEMP_C,
  assertOilPointsTraced,
  oilCurve,
  oilPoint,
} from "./scenes/oil";
import PressurePlot from "./PressurePlot";
import LandingScene from "./LandingScene";
import { dict, t } from "../../i18n";

// Gráfica de sensibilidad (B07): cada cifra visible sale de la física
// importada y la compuerta rechaza cualquier número sin traza.
const OIL_DICT_KEYS = [
  "landing.oil.title",
  "landing.oil.plotTitle",
  "landing.oil.plotAlt",
  "landing.oil.level",
  "landing.oil.volume",
  "landing.oil.head",
  "landing.oil.pressure",
  "landing.oil.dvdh",
  "landing.oil.dpdv",
  "landing.oil.nominal",
  "landing.oil.warning",
  "landing.oil.critical",
  "landing.oil.tableTitle",
  "landing.oil.tempTitle",
  "landing.oil.massPrefix",
  "landing.oil.massSuffix",
  "landing.oil.source",
  "landing.oil.synth",
] as const;

function fieldValues(html: string, field: string): number[] {
  const matches = [...html.matchAll(new RegExp(`data-field="${field}" data-value="([^"]+)"`, "g"))];
  return matches.map((match) => Number(match[1]));
}

describe("pressure plot provenance", () => {
  test("renders the plot, the gate table, and the source lines", () => {
    const html = renderToString(h(PressurePlot, {}));
    expect(html.includes('data-oil="true"')).toBe(true);
    expect(html.includes('data-oil-plot="true"')).toBe(true);
    expect(html.includes('data-oil-table="true"')).toBe(true);
    expect(html.includes('data-oil-legend="true"')).toBe(true);
    expect(html.includes('data-oil-source="pressure"')).toBe(true);
    expect(html.includes('data-oil-source="sensitivity"')).toBe(true);
    expect(html.includes("frontend/src/twin/physics.ts")).toBe(true);
    expect(html.includes("thesis-annex")).toBe(true);
  });

  test("draws one traced series per annex temperature", () => {
    const html = renderToString(h(PressurePlot, {}));
    for (const tempC of OIL_PLOT_TEMPS_C) {
      expect(html.includes(`data-temp="${tempC}"`)).toBe(true);
    }
    const series = [...html.matchAll(/data-temp="(\d+)" data-volumes="([^"]+)" data-pressures="([^"]+)"/g)];
    expect(series.length).toBe(3);
    for (const match of series) {
      const tempC = Number(match[1]);
      const volumes = match[2].split(",").map(Number);
      const pressures = match[3].split(",").map(Number);
      expect(volumes.length).toBe(pressures.length);
      expect(volumes.length).toBeGreaterThan(3);
      for (let i = 0; i < volumes.length; i++) {
        expect(pressures[i]).toBe(pressureKpaFromVolume(volumes[i] as number, tempC));
      }
    }
  });

  test("every table number matches the physics recomputation", () => {
    const html = renderToString(h(PressurePlot, {}));
    const rows = [...html.matchAll(/<tr[^>]*data-volume="([^"]+)" data-temp="([^"]+)"[^>]*>/g)];
    expect(rows.length).toBe(3);
    const volumes = fieldValues(html, "volume");
    const heads = fieldValues(html, "head");
    const pressures = fieldValues(html, "pressure");
    const dvdhs = fieldValues(html, "dvdh");
    const dpdvs = fieldValues(html, "dpdv");
    expect(volumes.length).toBe(3);
    for (let i = 0; i < volumes.length; i++) {
      const volumeL = volumes[i] as number;
      expect(heads[i]).toBe(headFromVolume(volumeL));
      expect(pressures[i]).toBe(pressureKpaFromVolume(volumeL, OIL_TABLE_TEMP_C));
      expect(pressures[i]).toBe(oilPoint(volumeL, OIL_TABLE_TEMP_C).pressureKpa);
      expect(dvdhs[i]).toBe(oilPoint(volumeL, OIL_TABLE_TEMP_C).dvdhLPerMm);
      expect(dpdvs[i]).toBe(oilPoint(volumeL, OIL_TABLE_TEMP_C).dpdvKpaPerL);
    }
    for (const volumeL of OIL_GATE_LEVELS_L) {
      expect(html.includes(`data-volume="${volumeL}"`)).toBe(true);
    }
  });

  test("marks every gate with its traced pressure", () => {
    const html = renderToString(h(PressurePlot, {}));
    for (const volumeL of OIL_GATE_LEVELS_L) {
      const expected = pressureKpaFromVolume(volumeL, OIL_TABLE_TEMP_C);
      expect(html.includes(`data-gate-volume="${volumeL}"`)).toBe(true);
      expect(html.includes(`data-pressure="${expected}"`)).toBe(true);
    }
  });

  test("derives the fixed-mass note from the mass function", () => {
    const html = renderToString(h(PressurePlot, {}));
    expect(html.includes(`data-mass="80"`)).toBe(true);
    expect(html.includes(`data-p-from="${pressureKpaFromMass(80, 40)}"`)).toBe(true);
    expect(html.includes(`data-p-to="${pressureKpaFromMass(80, 100)}"`)).toBe(true);
  });

  test("negative: an untraced table number fails the gate", () => {
    const points = oilCurve(OIL_TABLE_TEMP_C);
    const fake = points.map((point, index) =>
      index === 0 ? { ...point, pressureKpa: point.pressureKpa + 0.5 } : point,
    );
    expect(() => assertOilPointsTraced(fake)).toThrow();
    // La curva trazada no lanza: el tipo de `.not` no expone `toThrow`.
    let tracedThrows = false;
    try {
      assertOilPointsTraced(points);
    } catch {
      tracedThrows = true;
    }
    expect(tracedThrows).toBe(false);
  });

  test("negative: an off-gate rendered pressure must equal physics", () => {
    // Si la curva fijara valores a mano, este punto intermedio la delata.
    expect(oilPoint(63.7, 22).pressureKpa).toBe(pressureKpaFromVolume(63.7, 22));
  });
});

describe("pressure plot Spanish copy", () => {
  test("every oil key carries non-empty Spanish copy", () => {
    for (const key of OIL_DICT_KEYS) {
      expect(dict[key].trim().length).toBeGreaterThan(0);
      expect(t(key).length).toBeGreaterThan(0);
    }
  });

  test("renders Spanish copy with comma decimals", () => {
    const spanish = renderToString(h(PressurePlot, {}));
    expect(spanish.includes(t("landing.oil.plotTitle"))).toBe(true);
    expect(spanish.includes(t("landing.oil.pressure"))).toBe(true);
    // Cifras visibles con coma decimal en español.
    expect(spanish.includes("2,610")).toBe(true);
    expect(spanish.includes("28,5")).toBe(true);
  });

  test("keeps the oil scene inside the landing without eager 3D", () => {
    const html = renderToString(h(LandingScene, { scene: "oil" }));
    expect(html.includes('data-scene="oil"')).toBe(true);
    expect(html.includes("<img")).toBe(true);
    expect(html.includes('data-oil="true"')).toBe(true);
    expect(html.includes('data-oil-plot="true"')).toBe(true);
    expect(html.includes("<canvas")).toBe(false);
  });
});
