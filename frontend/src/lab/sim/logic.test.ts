import { describe, expect, test } from "bun:test";
import {
  FIXTURE_SECONDS,
  SCENARIOS,
  SCENARIO_LABEL,
  buildCommands,
  countLabels,
  fixtureSeed,
  linkDownRanges,
  nextIndex,
  normalizeParams,
  previewMatchesFixture,
  rowsForIngest,
  rowsToCsv,
  scenarioRows,
} from "./logic";

declare const Bun: { file(path: URL): { text(): Promise<string> } };

describe("scenario fixtures", () => {
  test("exposes the five real generator scenarios with their ground-truth label", () => {
    expect([...SCENARIOS]).toEqual(["clean", "slow-leak", "abrupt-drop", "sensor-drift", "link-outage"]);
    expect(SCENARIO_LABEL).toEqual({
      clean: "normal",
      "slow-leak": "slow-leak",
      "abrupt-drop": "abrupt-drop",
      "sensor-drift": "sensor-drift",
      "link-outage": "link-outage-buffered",
    });
  });

  test("loads 300 rows at 10 Hz per scenario with the golden seed", () => {
    for (const scenario of SCENARIOS) {
      const rows = scenarioRows(scenario);
      expect(rows.length).toBe(FIXTURE_SECONDS * 10);
      expect(rows[0].t_s).toBe(0);
      expect(rows[299].t_s).toBeCloseTo(29.9, 5);
    }
    expect(fixtureSeed("clean")).toBe(7);
    expect(fixtureSeed("link-outage")).toBe(19);
  });

  test("rebuilds the timestamps and device id the generator wrote", async () => {
    const golden = JSON.parse(
      await Bun.file(new URL("../../../../tests/fixtures/generator_golden.json", import.meta.url)).text(),
    ) as { cases: Array<{ scenario: string; rows: string[][] }> };
    const rows = scenarioRows("clean");
    const source = golden.cases[0].rows;
    expect(rows[0].t_iso).toBe(source[0][0]);
    expect(rows[1].t_iso).toBe(source[1][0]);
    expect(rows[10].t_iso).toBe(source[10][0]);
    expect(rows[299].t_iso).toBe(source[299][0]);
    expect(rows[0].device_id).toBe("wheel-RH-01");
  });
});

describe("label counters", () => {
  test("counts each ground-truth label over the whole scenario", () => {
    expect(countLabels(scenarioRows("clean"))).toEqual({
      normal: 300, "slow-leak": 0, "abrupt-drop": 0, "sensor-drift": 0, "link-outage-buffered": 0,
    });
    expect(countLabels(scenarioRows("abrupt-drop"))).toEqual({
      normal: 150, "slow-leak": 0, "abrupt-drop": 150, "sensor-drift": 0, "link-outage-buffered": 0,
    });
    expect(countLabels(scenarioRows("link-outage"))["link-outage-buffered"]).toBe(60);
    expect(countLabels(scenarioRows("slow-leak"))["slow-leak"]).toBe(280);
    expect(countLabels(scenarioRows("sensor-drift"))["sensor-drift"]).toBe(280);
  });

  test("counts only the rows played so far when a limit is given", () => {
    const counts = countLabels(scenarioRows("slow-leak"), 25);
    expect(counts.normal).toBe(20);
    expect(counts["slow-leak"]).toBe(5);
    expect(countLabels(scenarioRows("clean"), 0).normal).toBe(0);
  });
});

describe("link outage ranges", () => {
  test("finds the contiguous buffered window of the link-outage scenario", () => {
    expect(linkDownRanges(scenarioRows("link-outage"))).toEqual([{ start: 120, end: 179 }]);
    expect(linkDownRanges(scenarioRows("clean"))).toEqual([]);
  });
});

describe("csv export", () => {
  test("writes the generator header and fixed-decimal values, including negative zero", async () => {
    const rows = scenarioRows("clean");
    const csv = rowsToCsv(rows).trimEnd().split("\n");
    expect(csv.length).toBe(301);
    expect(csv[0].startsWith("t_iso,t_s,seq,device_id,fsm_state")).toBe(true);
    const golden = JSON.parse(
      await Bun.file(new URL("../../../../tests/fixtures/generator_golden.json", import.meta.url)).text(),
    ) as { cases: Array<{ rows: string[][] }> };
    for (const index of [0, 1, 57, 299]) {
      expect(csv[index + 1]).toBe(golden.cases[0].rows[index].join(","));
    }
    const everyRow = golden.cases[0].rows.map((row) => row.join(","));
    expect(csv.slice(1)).toEqual(everyRow);
  });
});

describe("parameters and commands", () => {
  test("normalizes seed, duration and rate to safe integers", () => {
    expect(normalizeParams({ scenario: "clean", seed: -3, durationS: 0, rateHz: 0 })).toEqual({
      scenario: "clean", seed: 0, durationS: 1, rateHz: 1,
    });
    expect(normalizeParams({ scenario: "clean", seed: 7.9, durationS: 99999, rateHz: 5000 })).toEqual({
      scenario: "clean", seed: 7, durationS: 3600, rateHz: 1000,
    });
    expect(normalizeParams({ scenario: "clean", seed: Number.NaN, durationS: Number.NaN, rateHz: Number.NaN })).toEqual({
      scenario: "clean", seed: 7, durationS: 30, rateHz: 10,
    });
  });

  test("builds the real flags of sim/generate.py and edge-sim", () => {
    const commands = buildCommands({ scenario: "slow-leak", seed: 11, durationS: 30, rateHz: 10 });
    expect(commands.python).toBe(
      "python3 sim/generate.py --scenario slow-leak --seconds 30 --seed 11 --out /tmp/oilguard-slow-leak.csv",
    );
    expect(commands.rust).toBe(
      "cargo run --release --manifest-path edge-sim/Cargo.toml -- --devices 1 --scenario slow-leak --seconds 30 --seed 11 --rate-hz 10 --output csv:/tmp/oilguard-slow-leak-edge.csv",
    );
  });

  test("the preview matches only the pinned seed, duration and rate", () => {
    expect(previewMatchesFixture({ scenario: "abrupt-drop", seed: 13, durationS: 30, rateHz: 10 })).toBe(true);
    expect(previewMatchesFixture({ scenario: "abrupt-drop", seed: 7, durationS: 30, rateHz: 10 })).toBe(false);
    expect(previewMatchesFixture({ scenario: "abrupt-drop", seed: 13, durationS: 20, rateHz: 10 })).toBe(false);
    expect(previewMatchesFixture({ scenario: "abrupt-drop", seed: 13, durationS: 30, rateHz: 20 })).toBe(false);
  });
});

describe("playback and ingest", () => {
  test("advances by the speed and loops at the end", () => {
    expect(nextIndex(0, 1, 300)).toBe(1);
    expect(nextIndex(10, 4, 300)).toBe(14);
    expect(nextIndex(298, 4, 300)).toBe(2);
    expect(nextIndex(299, 1, 300)).toBe(0);
  });

  test("relabels the device id so a lab send never touches the live wheel", () => {
    const rows = rowsForIngest(scenarioRows("clean").slice(0, 3), "lab-sim-01");
    expect(rows.map((row) => row.device_id)).toEqual(["lab-sim-01", "lab-sim-01", "lab-sim-01"]);
    expect(rows[2].seq).toBe(2);
  });
});
