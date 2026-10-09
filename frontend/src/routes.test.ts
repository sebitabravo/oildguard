import { describe, expect, test } from "bun:test";
import { modeFromHash, pathFromHash } from "./routes";

describe("modeFromHash", () => {
  test("canonical hashes", () => {
    expect(modeFromHash("#mine")).toBe("mine");
    expect(modeFromHash("#wheel")).toBe("wheel");
    expect(modeFromHash("#monitoring")).toBe("monitoring");
  });

  test("legacy aliases keep working", () => {
    expect(modeFromHash("#truck")).toBe("mine");
    expect(modeFromHash("#bench")).toBe("wheel");
    expect(modeFromHash("#dash")).toBe("monitoring");
    expect(modeFromHash("#dash-demo")).toBe("monitoring");
  });

  test("prefix aliases resolve to their section", () => {
    expect(modeFromHash("#monitoring-details")).toBe("monitoring");
    expect(modeFromHash("#dash-details")).toBe("monitoring");
  });

  test("empty and unknown hashes fall back to the wheel view", () => {
    expect(modeFromHash("")).toBe("wheel");
    expect(modeFromHash("#stub")).toBe("wheel");
  });
});

describe("pathFromHash", () => {
  test("maps hashes to section paths", () => {
    expect(pathFromHash("#mine")).toBe("/mine");
    expect(pathFromHash("#wheel")).toBe("/wheel");
    expect(pathFromHash("#monitoring")).toBe("/monitoring");
    expect(pathFromHash("#truck")).toBe("/mine");
    expect(pathFromHash("#bench")).toBe("/wheel");
    expect(pathFromHash("#dash")).toBe("/monitoring");
    expect(pathFromHash("#monitoring-anything")).toBe("/monitoring");
    expect(pathFromHash("#dash-anything")).toBe("/monitoring");
    expect(pathFromHash("#unknown")).toBe("/wheel");
  });

  test("demo aliases enable the monitoring demo and preserve query data", () => {
    expect(pathFromHash("#dash-demo")).toBe("/monitoring?demo=1");
    expect(pathFromHash("#dash-demo-test")).toBe("/monitoring?demo=1");
    expect(pathFromHash("#monitoring-demo-test")).toBe("/monitoring?demo=1");
    expect(pathFromHash("#monitoring-demo", "?source=legacy")).toBe(
      "/monitoring?source=legacy&demo=1",
    );
    expect(pathFromHash("#dash-demo", "?demo=0&source=legacy")).toBe(
      "/monitoring?demo=1&source=legacy",
    );
  });

  test("preserves query data for regular aliases", () => {
    expect(pathFromHash("#truck", "?pause=1&t=4")).toBe("/mine?pause=1&t=4");
  });
});
