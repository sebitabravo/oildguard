import { describe, expect, test } from "bun:test";
import type { Lang } from "../../i18n";
import type { PlmState } from "../../twin/fleet/fleetSim";
import { buildMineHudStatus, buildMineHudTitle, buildMineSceneLabelText, buildPlmStateLabel } from "./mineSceneCopy";

describe("mine scene copy", () => {
  test("localizes every interest label and preserves the ramp assumption marker", () => {
    const expected = {
      en: {
        shovel: "SHOVEL · 4100XPC",
        crusher: "PRIMARY CRUSHER",
        ramp: "RAMP · 10% ASSUMPTION",
      },
      es: {
        shovel: "PALA · 4100XPC",
        crusher: "CHANCADORA · PRIMARIA",
        ramp: "RAMPA · 10 % SUPUESTO",
      },
    } satisfies Record<Lang, Record<"shovel" | "crusher" | "ramp", string>>;

    for (const lang of ["en", "es"] as const) {
      for (const id of ["shovel", "crusher", "ramp"] as const) {
        expect(buildMineSceneLabelText(id, lang)).toBe(expected[lang][id]);
      }
    }
  });

  test("translates all PLM III state names for the HUD", () => {
    const expected: Array<[PlmState, string, string]> = [
      ["tare_zone", "Tare zone", "Zona de tara"],
      ["empty", "Empty", "Vacío"],
      ["loading", "Loading", "Cargando"],
      ["maneuvering", "Maneuvering", "Maniobrando"],
      ["final_zone", "Final zone", "Zona final"],
      ["hauling", "Hauling", "Acarreando"],
      ["dumping", "Dumping", "Vaciando"],
      ["after_dump", "After dump", "Posvaciado"],
    ];

    for (const [state, english, spanish] of expected) {
      expect(buildPlmStateLabel(state, "en")).toBe(english);
      expect(buildPlmStateLabel(state, "es")).toBe(spanish);
    }
  });

  test("localizes the selected truck HUD title and its cycle word", () => {
    expect(buildMineHudTitle("OG-03", "dumping", 0, "en")).toBe("OG-03 · Dumping · cycle 0");
    expect(buildMineHudTitle("OG-03", "dumping", 0, "es")).toBe("OG-03 · Vaciando · ciclo 0");
  });

  test("localizes the HUD movement status without changing its fact", () => {
    expect(buildMineHudStatus(true, false, "en")).toBe("RECAL");
    expect(buildMineHudStatus(true, false, "es")).toBe("RECAL");
    expect(buildMineHudStatus(false, true, "en")).toBe("IN MOTION");
    expect(buildMineHudStatus(false, true, "es")).toBe("EN MOVIMIENTO");
    expect(buildMineHudStatus(false, false, "en")).toBe("STANDBY");
    expect(buildMineHudStatus(false, false, "es")).toBe("EN ESPERA");
  });
});
