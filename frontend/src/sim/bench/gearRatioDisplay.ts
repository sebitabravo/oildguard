import { GEAR_RATIO, GDY106_TRAIN, stageRatio } from "../../twin/physics";
import type { DictParams } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";

export type GearRatioDisplay = DictParams & {
  highSpeed: string;
  lowSpeed: string;
  overall: string;
};

export function buildGearRatioDisplay(): GearRatioDisplay {
  return {
    highSpeed: formatNumber(stageRatio(GDY106_TRAIN.hs), 3),
    lowSpeed: formatNumber(stageRatio(GDY106_TRAIN.ls), 3),
    overall: formatNumber(GEAR_RATIO, 2),
  };
}
