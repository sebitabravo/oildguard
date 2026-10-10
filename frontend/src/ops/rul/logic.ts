export type RulUnit = "hours" | "cycles" | "shifts";

export interface RulCard {
  wheelId: string;
  horizonHours: number | null;
  projected: boolean;
}

export function convertRulHours(hours: number, unit: RulUnit): number {
  if (unit === "cycles") return hours * 3600 / 29;
  if (unit === "shifts") return hours / 8;
  return hours;
}

export function sortRulCards<T extends RulCard>(cards: T[]): T[] {
  return [...cards].sort((left, right) => {
    if (left.horizonHours === null) return right.horizonHours === null ? left.wheelId.localeCompare(right.wheelId) : 1;
    if (right.horizonHours === null) return -1;
    return left.horizonHours - right.horizonHours || left.wheelId.localeCompare(right.wheelId);
  });
}

export function filterProjectedRul<T extends RulCard>(cards: T[], onlyProjected: boolean): T[] {
  return onlyProjected ? cards.filter((card) => card.projected) : cards;
}
