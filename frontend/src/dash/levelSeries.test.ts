import { describe, expect, test } from "bun:test";
import { mergeLevelSeries } from "./levelSeries";

describe("live level series merge", () => {
  test("sorts by timestamp and replaces duplicate timestamps with the latest sample", () => {
    expect(mergeLevelSeries(
      [
        { t_s: 8, liters: 90 },
        { t_s: 2, liters: 91 },
      ],
      [
        { t_s: 5, liters: 92 },
        { t_s: 8, liters: 89 },
      ],
    )).toEqual([
      { t_s: 2, liters: 91 },
      { t_s: 5, liters: 92 },
      { t_s: 8, liters: 89 },
    ]);
  });
});
