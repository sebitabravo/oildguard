import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./AlertsInboxPage";

const renderPage = () => renderToString(h(AlertsInboxPage, {}));

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

function hasDemoSource(markup: string): boolean {
  return /class="og-alerts-source og-alerts-source--demo"[^>]*>DEMO<\/small>/.test(markup);
}

describe("alerts summary field provenance", () => {
  test("labels each active-level value and seven-day distribution item", () => {
    const html = renderPage();
    const tiles = elements(html, "article", "og-kpi-tile");
    expect(tiles.length).toBeGreaterThanOrEqual(4);
    for (const tile of tiles.slice(0, 4)) expect(hasDemoSource(tile)).toBe(true);

    const distribution = elements(html, "ul", "og-alerts-legend")[0] ?? "";
    const items = elements(distribution, "li", "");
    expect(items.length).toBe(4);
    for (const item of items) expect(hasDemoSource(item)).toBe(true);
  });

  test("labels each wheel recurrence count and age in its card", () => {
    const html = renderPage();
    const ranking = elements(html, "ol", "og-alerts-ranking")[0] ?? "";
    const items = elements(ranking, "li", "");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(hasDemoSource(item)).toBe(true);
  });
});
