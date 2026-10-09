import { describe, expect, test } from "bun:test";
import { parseWheelUrl } from "./wheelUrl";

describe("wheel route handoff state", () => {
  test("uses calibrated demo defaults when the URL has no query", () => {
    expect(parseWheelUrl("")).toEqual({
      sensorId: null,
      oilLitres: 66.5,
      mode: "rest",
      cutaway: true,
      exploded: false,
    });
  });

  test("restores sensor, fill, motion, cutaway, and exploded state", () => {
    expect(parseWheelUrl("?sensor=pressure&oil=42&mode=move&cutaway=0&exploded=1")).toEqual({
      sensorId: "pressure",
      oilLitres: 42,
      mode: "move",
      cutaway: false,
      exploded: true,
    });
  });

  test("clamps imported oil volume and ignores non-finite values", () => {
    expect(parseWheelUrl("?oil=120").oilLitres).toBe(95);
    expect(parseWheelUrl("?oil=nope").oilLitres).toBe(66.5);
  });
});
