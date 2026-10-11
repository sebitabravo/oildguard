import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import ReportPage from "./ReportPage";

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

describe("report per-field provenance", () => {
  test("labels each synthetic report KPI next to its value", () => {
    const markup = renderToString(h(ReportPage, {}));
    const tiles = elements(markup, "article", "og-kpi-tile");
    ["94,7 L", "14,7 L"].forEach((value) => {
      const tile = tiles.find((item) => item.includes(value)) ?? "";
      expect(/og-badge--source-demo[\s\S]*?DEMO/.test(tile)).toBe(true);
    });
  });
});
