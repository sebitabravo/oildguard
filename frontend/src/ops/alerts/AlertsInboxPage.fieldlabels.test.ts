import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage, { ActiveCountSource } from "./AlertsInboxPage";

function elements(html: string, tag: string, className: string): string[] {
  const opening = className
    ? new RegExp(`<${tag}\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>`, "g")
    : new RegExp(`<${tag}\\b[^>]*>`, "g");
  const output: string[] = [];
  for (const match of html.matchAll(opening)) {
    const start = match.index ?? 0;
    const tags = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}>`, "g");
    tags.lastIndex = start;
    let depth = 0;
    for (const current of html.matchAll(tags)) {
      if (current.index === start) depth = 1;
      else if (current[0].startsWith(`</${tag}`)) depth -= 1;
      else depth += 1;
      if (depth === 0) {
        output.push(html.slice(start, (current.index ?? 0) + current[0].length));
        break;
      }
    }
  }
  return output;
}

function normalizedWithSourceMarkers(markup: string): string {
  return markup
    .replace(/<small class="og-alerts-source og-alerts-source--(?:demo|live|mixed)">\s*(DEMO|EN VIVO|MIXTO)\s*<\/small>/g, " ⟦$1⟧")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expectDemoField(markup: string, text: string): void {
  expect(normalizedWithSourceMarkers(markup)).toContain(`${text} ⟦DEMO⟧`);
}

const renderPage = () => renderToString(h(AlertsInboxPage, {}));

describe("alerts summary field provenance", () => {
  test("labels each active-level count and seven-day count/percentage pair", () => {
    const html = renderPage();
    const tiles = elements(html, "article", "og-kpi-tile");
    expect(tiles.length).toBeGreaterThanOrEqual(4);
    ["2", "2", "0", "1"].forEach((count, index) => expectDemoField(tiles[index] ?? "", count));

    const distribution = elements(html, "ul", "og-alerts-legend")[0] ?? "";
    const items = elements(distribution, "li", "");
    expect(items.length).toBe(4);
    ["10 (45%)", "6 (27%)", "3 (14%)", "3 (14%)"].forEach((field, index) => {
      expectDemoField(items[index] ?? "", field);
    });
    const total = elements(html, "p", "og-alerts-note").find((item) => item.includes("22 alertas")) ?? "";
    expectDemoField(total, "22 alertas");
  });

  test("labels each recurrence alert count and last-seen age beside the field", () => {
    const html = renderPage();
    const ranking = elements(html, "ol", "og-alerts-ranking")[0] ?? "";
    const items = elements(ranking, "li", "");
    expect(items.length).toBe(5);

    const expected = [
      ["3 alertas", "última hace 1 h"],
      ["3 alertas", "última hace 3 h"],
      ["3 alertas", "última hace 17 h"],
      ["2 alertas", "última hace 6 h"],
      ["2 alertas", "última hace 23 h"],
    ];
    expected.forEach(([count, age], index) => {
      expectDemoField(items[index] ?? "", count);
      expectDemoField(items[index] ?? "", age);
    });
  });

  test("shows a MIXTO label and source split when live and demo counts contribute", () => {
    const html = renderToString(h(ActiveCountSource, { demo: 2, live: 1, backendLive: true }));
    expect(normalizedWithSourceMarkers(html)).toContain("⟦MIXTO⟧ ⟦EN VIVO⟧ 1 · ⟦DEMO⟧ 2");
  });
});
