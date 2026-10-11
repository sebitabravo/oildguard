import { t, type DictKey } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import type { PlmState } from "../../twin/fleet/fleetSim";

export const PLM_LABEL_KEYS: Record<PlmState, DictKey> = {
  tare_zone: "truck.state.tareZone",
  empty: "truck.state.empty",
  loading: "truck.state.loading",
  maneuvering: "truck.state.maneuvering",
  final_zone: "truck.state.finalZone",
  hauling: "truck.state.hauling",
  dumping: "truck.state.dumping",
  after_dump: "truck.state.afterDump",
};

export const MINE_SCENE_LABEL_KEYS = {
  shovel: "mine.scene.shovel",
  crusher: "mine.scene.crusher",
  ramp: "mine.scene.ramp",
} as const satisfies Record<string, DictKey>;

export type MineSceneLabelId = keyof typeof MINE_SCENE_LABEL_KEYS;

export function buildMineSceneLabelText(id: MineSceneLabelId): string {
  return t(MINE_SCENE_LABEL_KEYS[id]);
}

export function buildPlmStateLabel(state: PlmState): string {
  return t(PLM_LABEL_KEYS[state]);
}

export function buildMineHudTitle(truckId: string, state: PlmState, cycle: number): string {
  return `${truckId} · ${buildPlmStateLabel(state)} · ${t("mine.hud.cycle")} ${formatNumber(cycle, 0)}`;
}

export function buildMineHudStatus(recal: boolean, moving: boolean): string {
  const key = recal
    ? "mine.hud.status.recal"
    : moving
      ? "mine.hud.status.moving"
      : "mine.hud.status.standby";
  return t(key);
}
