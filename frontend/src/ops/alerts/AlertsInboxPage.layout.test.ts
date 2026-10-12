import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./AlertsInboxPage";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("./alerts.css", import.meta.url)).text();

describe("alerts inbox layout contract", () => {
  test("reflows summary tiles before their labels become cramped", async () => {
    expect(/@media\s*\(max-width:\s*1100px\)\s*\{\s*\.og-alerts-tiles\s*\{[^}]*grid-template-columns:\s*repeat\(3,/.test(await css)).toBe(true);
  });

  test("allows mixed-source badges to wrap inside their tile", async () => {
    expect(/\.og-alerts-source-split\s*\{[^}]*flex-wrap:\s*wrap/.test(await css)).toBe(true);
  });

  test("uses a single-column card layout on narrow phones", async () => {
    expect(/@media\s*\(max-width:\s*480px\)[\s\S]*?\.og-alerts-tiles\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(await css)).toBe(true);
  });

  test("renders a scroll cue before the wide alerts table", () => {
    const html = renderToString(h(AlertsInboxPage, {}));

    expect(html.includes('class="og-alerts-table-cue"')).toBe(true);
    expect(html.includes("Desliza para ver más")).toBe(true);
  });
});
