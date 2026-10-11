import { describe, expect, test } from "bun:test";
import { agoLabel, timeAxisTicks } from "./levelAxis";

describe("level chart time axis", () => {
  test("spreads five ticks from the oldest sample to now", () => {
    expect(timeAxisTicks(0, 3600)).toEqual([
      { t_s: 0, agoS: 3600 },
      { t_s: 900, agoS: 2700 },
      { t_s: 1800, agoS: 1800 },
      { t_s: 2700, agoS: 900 },
      { t_s: 3600, agoS: 0 },
    ]);
  });

  test("labels spans in seconds below three minutes and minutes above", () => {
    expect(agoLabel(0, "ahora")).toBe("ahora");
    expect(agoLabel(90, "ahora")).toBe("−90 s");
    expect(agoLabel(900, "ahora")).toBe("−15 min");
    expect(agoLabel(2700, "ahora")).toBe("−45 min");
  });
});
