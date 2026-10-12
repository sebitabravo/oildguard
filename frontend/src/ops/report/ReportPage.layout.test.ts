import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import ReportPage from "./ReportPage";

describe("report chart label spacing", () => {
  test("keeps the chart frame within its mobile slot", () => {
    const html = renderToString(h(ReportPage, {}));

    expect(html.includes('media="(max-width: 700px)"')).toBe(true);
    expect(html.includes(".og-report-page .og-sync")).toBe(true);
    expect(html.includes("height: 140px !important")).toBe(true);
  });
});
