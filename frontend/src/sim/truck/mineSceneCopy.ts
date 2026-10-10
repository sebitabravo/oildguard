import { t, type DictKey, type Lang } from "../../i18n";
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

export function buildMineSceneLabelText(id: MineSceneLabelId, lang: Lang): string {
  return t(MINE_SCENE_LABEL_KEYS[id], lang);
}

export function buildPlmStateLabel(state: PlmState, lang: Lang): string {
  return t(PLM_LABEL_KEYS[state], lang);
}

export function buildMineHudTitle(truckId: string, state: PlmState, cycle: number, lang: Lang): string {
  return `${truckId} · ${buildPlmStateLabel(state, lang)} · ${t("mine.hud.cycle", lang)} ${formatNumber(cycle, lang, 0)}`;
}

export function buildMineHudStatus(recal: boolean, moving: boolean, lang: Lang): string {
  const key = recal
    ? "mine.hud.status.recal"
    : moving
      ? "mine.hud.status.moving"
      : "mine.hud.status.standby";
  return t(key, lang);
}
