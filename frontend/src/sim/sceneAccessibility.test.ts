import { describe, expect, test } from "bun:test";
import {
  buildMineSceneAccessibilityCopy,
  buildWheelSceneAccessibilityCopy,
  canPublishSceneAccessibilityUpdate,
} from "./sceneAccessibility";

describe("scene accessibility copy", () => {
  test("builds localized mine scene summaries with the current truck state and cycle", () => {
    expect(buildMineSceneAccessibilityCopy({ truckId: "OG-03", state: "hauling", cycle: 2 }, "en")).toEqual({
      label: "Open-pit mine: truck OG-03, Hauling, cycle 2.",
      caption: "Synthetic proxy only. Selected truck OG-03: Hauling, cycle 2. The five-truck fleet state is simulated; field data is pending.",
    });
    expect(buildMineSceneAccessibilityCopy({ truckId: "OG-03", state: "hauling", cycle: 2 }, "es")).toEqual({
      label: "Mina a cielo abierto: camión OG-03, Acarreando, ciclo 2.",
      caption: "Solo sustituto sintético. Camión seleccionado OG-03: Acarreando, ciclo 2. El estado de la flota de cinco camiones es simulado; los datos de campo están pendientes.",
    });
  });

  test("builds localized wheel summaries with current oil level and mode", () => {
    expect(buildWheelSceneAccessibilityCopy({ oilLevel: 0.7, mode: "move" }, "en")).toEqual({
      label: "GDY106 wheel cutaway: oil level 66.5 L · 70%, mode MOVING.",
      caption: "Synthetic proxy only. Oil level 66.5 L · 70% and mode MOVING are modelled, not field measurements.",
    });
    expect(buildWheelSceneAccessibilityCopy({ oilLevel: 0.7, mode: "move" }, "es")).toEqual({
      label: "Corte de rueda GDY106: nivel de aceite 66,5 L · 70%, modo EN MOVIMIENTO.",
      caption: "Solo sustituto sintético. El nivel de aceite 66,5 L · 70% y el modo EN MOVIMIENTO son valores modelados, no mediciones de campo.",
    });
  });

  test("allows accessible scene copy updates no more than once per second", () => {
    expect(canPublishSceneAccessibilityUpdate(1000, 1999)).toBe(false);
    expect(canPublishSceneAccessibilityUpdate(1000, 2000)).toBe(true);
  });
});
