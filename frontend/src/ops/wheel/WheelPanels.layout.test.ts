import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("./wheel.css", import.meta.url)).text();

describe("monitoring level-card layout contract", () => {
  test("lays telemetry notes out as separate readable blocks", async () => {
    expect(/\.og-wheel-telemetry\s+span\.og-wheel-card__note[^{}]*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap/.test(await css)).toBe(true);
  });

  test("wraps level-card source and validity lines without overlap", async () => {
    expect(/\.og-wheel-panel__meta\s+\.og-wheel-card__note\s*\{[^}]*flex-wrap:\s*wrap/.test(await css)).toBe(true);
  });
});
