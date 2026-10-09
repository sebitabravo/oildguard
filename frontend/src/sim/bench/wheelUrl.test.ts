import { describe, expect, test } from "bun:test";
import { buildWheelDetailHref, parseWheelUrl } from "./wheelUrl";

describe("wheel route handoff state", () => {
  test("uses calibrated demo defaults when the URL has no query", () => {
    expect(parseWheelUrl("")).toEqual({
      sensorId: null,
      truckId: null,
      wheelId: null,
      oilLitres: 66.5,
      mode: "rest",
      cutaway: true,
      exploded: false,
    });
  });

  test("restores sensor, fill, motion, cutaway, and exploded state", () => {
    expect(parseWheelUrl("?sensor=pressure&oil=42&mode=move&cutaway=0&exploded=1&truck=OG-03&wheel=RH")).toEqual({
      sensorId: "pressure",
      truckId: "OG-03",
      wheelId: "RH",
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

  test("builds a wheel detail URL carrying the selected truck and wheel", () => {
    expect(buildWheelDetailHref("OG-03", "RH")).toBe(
      "/wheel?from=monitoring&truck=OG-03&wheel=RH&sensor=pressure&mode=rest&cutaway=1"
    );
  });

  test("encodes identifiers in the wheel detail query", () => {
    expect(buildWheelDetailHref("Truck 4", "rear right")).toContain("truck=Truck+4");
    expect(buildWheelDetailHref("Truck 4", "rear right")).toContain("wheel=rear+right");
  });
});
