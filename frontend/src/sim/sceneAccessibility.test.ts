import { describe, expect, test } from "bun:test";
import {
  buildMineSceneAccessibilityCopy,
  buildWheelSceneAccessibilityCopy,
  canPublishSceneAccessibilityUpdate,
} from "./sceneAccessibility";

// Solo español (S05): los resúmenes salen en español con coma decimal.
describe("scene accessibility copy", () => {
  test("builds Spanish mine scene summaries with the current truck state and cycle", () => {
    expect(buildMineSceneAccessibilityCopy({ truckId: "OG-03", state: "hauling", cycle: 2 })).toEqual({
      label: "Mina a cielo abierto: camión OG-03, Acarreando, ciclo 2.",
      caption: "Solo sustituto sintético. Camión seleccionado OG-03: Acarreando, ciclo 2. El estado de la flota de cinco camiones es simulado; los datos de campo están pendientes.",
    });
  });

  test("builds Spanish wheel summaries with current oil level and mode", () => {
    expect(buildWheelSceneAccessibilityCopy({ oilLevel: 0.7, mode: "move" })).toEqual({
      label: "Corte de rueda GDY106: nivel de aceite 66,5 L · 70%, modo EN MOVIMIENTO.",
      caption: "Solo sustituto sintético. El nivel de aceite 66,5 L · 70% y el modo EN MOVIMIENTO son valores modelados, no mediciones de campo.",
    });
  });

  test("allows accessible scene copy updates no more than once per second", () => {
    expect(canPublishSceneAccessibilityUpdate(1000, 1999)).toBe(false);
    expect(canPublishSceneAccessibilityUpdate(1000, 2000)).toBe(true);
  });
});
