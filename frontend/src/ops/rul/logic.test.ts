import { describe, expect, test } from "bun:test";
import { demoDataset } from "../../demo/dataset";
import {
  convertRulHours,
  filterProjectedRul,
  sortRulCards,
  type RulCard,
} from "./logic";

const cards: RulCard[] = [
  { wheelId: "wheel-LH-01", horizonHours: 24, projected: true },
  { wheelId: "wheel-RH-01", horizonHours: null, projected: false },
  { wheelId: "wheel-LH-02", horizonHours: 8, projected: true },
];

describe("RUL page contracts", () => {
  test("converts hours to cycles and shifts using the backend constants", () => {
    expect(convertRulHours(8, "hours")).toBe(8);
    expect(convertRulHours(8, "cycles")).toBeCloseTo(8 * 3600 / 29, 8);
    expect(convertRulHours(8, "shifts")).toBe(1);
  });

  test("sorts projected horizons shortest first and keeps suppressed rows last", () => {
    expect(sortRulCards(cards).map((card) => card.wheelId)).toEqual([
      "wheel-LH-02",
      "wheel-LH-01",
      "wheel-RH-01",
    ]);
  });

  test("filters to wheels that have a numeric projection", () => {
    expect(filterProjectedRul(cards, true).map((card) => card.wheelId)).toEqual([
      "wheel-LH-01",
      "wheel-LH-02",
    ]);
    expect(filterProjectedRul(cards, false).length).toBe(3);
  });

  test("demo cards cover the full twelve-wheel fleet", () => {
    expect(demoDataset.wheels.length).toBe(12);
  });
});
