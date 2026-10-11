import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import HistoryPage from "./HistoryPage";

function elements(html: string, tag: string, className: string): string[] {
  const open = new RegExp(`<${tag}\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>`, "g");
  return [...html.matchAll(open)].map((match) => {
    const start = match.index ?? 0;
    const close = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}>`, "g");
    close.lastIndex = start;
    let depth = 0;
    for (const item of html.matchAll(close)) {
      if (item.index === start) depth = 1;
      else if (item[0].startsWith(`</${tag}`)) depth -= 1;
      else depth += 1;
      if (!depth) return html.slice(start, (item.index ?? 0) + item[0].length);
    }
    return "";
  });
}

const html = () => renderToString(h(HistoryPage, {}));
const sourceLabel = /og-badge--source-demo[\s\S]*?DEMO/;

describe("history per-field provenance", () => {
  test("labels each KPI and event-table measurement as demo data", () => {
    const markup = html();
    const tiles = elements(markup, "article", "og-kpi-tile");
    ["-0,3 L", "0,12 L/100 h", "92%"].forEach((value) => {
      const tile = tiles.find((item) => item.includes(value)) ?? "";
      expect(sourceLabel.test(tile)).toBe(true);
    });
    const levels = elements(markup, "td", "og-mono").filter((cell) => /\d+,\d L/.test(cell));
    expect(levels.some((cell) => cell.includes("90,4 L") && sourceLabel.test(cell))).toBe(true);
    expect(levels.some((cell) => cell.includes("92,8 L") && sourceLabel.test(cell))).toBe(true);
  });
});
