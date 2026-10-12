import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage, { ActiveCountSource } from "./AlertsInboxPage";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("./alerts.css", import.meta.url)).text();

describe("alerts polish contract", () => {
  test("keeps the seven-day distribution collapsed with a visible disclosure cue", async () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const details = html.match(/<details class="og-alerts-secondary og-alerts-distribution">([\s\S]*?)<\/details>/)?.[0] ?? "";

    expect(details).not.toBe("");
    expect(!details.includes(" open")).toBe(true);
    expect(details).toContain("Ver distribución de siete días (22 alertas)");
    expect(/\.og-alerts-distribution\s*>\s*summary::after\s*\{/.test(await css)).toBe(true);
  });

  test("keeps the complete live/demo split together beside MIXTO", async () => {
    const html = renderToString(h(ActiveCountSource, { demo: 2, live: 1, backendLive: true }));
    const split = html.match(/<span class="og-alerts-source-split og-alerts-source-split--single-line">([\s\S]*?)<\/span>/)?.[1] ?? "";

    expect(html).toContain("og-alerts-source--mixed");
    expect(split).toContain("EN VIVO");
    expect(split).toContain("1 ·");
    expect(split).toContain("DEMO");
    expect(split).toContain("2");
    expect(/\.og-alerts-source-split--single-line\s*\{[^}]*white-space:\s*nowrap/.test(await css)).toBe(true);
  });
});
