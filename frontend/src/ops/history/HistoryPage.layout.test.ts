import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("./history.css", import.meta.url)).text();

describe("history chart label spacing", () => {
  test("separates event labels from the x-axis tick row", async () => {
    const source = await css;
    const mobileRules = source.slice(source.lastIndexOf("@media (max-width: 700px)"));

    expect(/\.og-history-charts\s+\.og-time-series\s*\{[^}]*height:\s*180px/.test(mobileRules)).toBe(true);
    expect(/\.og-history-charts\s+\.og-sync__event-label\s*\{[^}]*transform:\s*translateY\(-200%\)/.test(mobileRules)).toBe(true);
  });
});
