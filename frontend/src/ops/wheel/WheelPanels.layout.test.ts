import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./wheel.css", import.meta.url), "utf8");

describe("monitoring level-card layout contract", () => {
  test("lays telemetry notes out as separate readable blocks", () => {
    expect(css).toMatch(/\.og-wheel-telemetry\s+\.og-wheel-card__note\s*\{[^}]*display:\s*block/);
  });
});
