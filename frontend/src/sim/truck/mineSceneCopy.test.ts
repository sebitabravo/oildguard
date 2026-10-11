import { describe, expect, test } from "bun:test";
import type { PlmState } from "../../twin/fleet/fleetSim";
import { buildMineHudStatus, buildMineHudTitle, buildMineSceneLabelText, buildPlmStateLabel } from "./mineSceneCopy";

// Solo español (S05): cada copia sale en español con el marcador de supuesto.
describe("mine scene copy", () => {
  test("localizes every interest label and preserves the ramp assumption marker", () => {
    const expected = {
      shovel: "PALA · 4100XPC",
      crusher: "CHANCADORA · PRIMARIA",
      ramp: "RAMPA · 10 % SUPUESTO",
    } as const;

    for (const id of ["shovel", "crusher", "ramp"] as const) {
      expect(buildMineSceneLabelText(id)).toBe(expected[id]);
    }
  });

  test("translates all PLM III state names for the HUD", () => {
    const expected: Array<[PlmState, string]> = [
      ["tare_zone", "Zona de tara"],
      ["empty", "Vacío"],
      ["loading", "Cargando"],
      ["maneuvering", "Maniobrando"],
      ["final_zone", "Zona final"],
      ["hauling", "Acarreando"],
      ["dumping", "Vaciando"],
      ["after_dump", "Posvaciado"],
    ];

    for (const [state, spanish] of expected) {
      expect(buildPlmStateLabel(state)).toBe(spanish);
    }
  });

  test("localizes the selected truck HUD title and its cycle word", () => {
    expect(buildMineHudTitle("OG-03", "dumping", 0)).toBe("OG-03 · Vaciando · ciclo 0");
  });

  test("localizes the HUD movement status without changing its fact", () => {
    expect(buildMineHudStatus(true, false)).toBe("RECAL");
    expect(buildMineHudStatus(false, true)).toBe("EN MOVIMIENTO");
    expect(buildMineHudStatus(false, false)).toBe("EN ESPERA");
  });
});
