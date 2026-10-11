import { t } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { formatOilText } from "./bench/oil";
import { buildPlmStateLabel } from "./truck/mineSceneCopy";
import type { PlmState } from "../twin/fleet/fleetSim";

export interface SceneAccessibilityCopy {
  label: string;
  caption: string;
}

export const SCENE_ACCESSIBILITY_UPDATE_INTERVAL_MS = 1000;

export function buildMineSceneAccessibilityCopy(
  state: { truckId: string; state: PlmState; cycle: number },
): SceneAccessibilityCopy {
  const stateLabel = buildPlmStateLabel(state.state);
  const params = { truck: state.truckId, state: stateLabel, cycle: formatNumber(state.cycle, 0) };
  return {
    label: t("a11y.mine.scene", params),
    caption: t("a11y.mine.caption", params),
  };
}

export function buildWheelSceneAccessibilityCopy(
  state: { oilLevel: number; mode: "move" | "rest" },
): SceneAccessibilityCopy {
  const oil = formatOilText(Math.max(0, Math.min(1, state.oilLevel)));
  const mode = t(state.mode === "move" ? "hud.moving" : "hud.rest");
  const params = { oil, mode };
  return {
    label: t("a11y.wheel.scene", params),
    caption: t("a11y.wheel.caption", params),
  };
}

export function canPublishSceneAccessibilityUpdate(lastPublishedAtMs: number, nowMs: number): boolean {
  return nowMs - lastPublishedAtMs >= SCENE_ACCESSIBILITY_UPDATE_INTERVAL_MS;
}
