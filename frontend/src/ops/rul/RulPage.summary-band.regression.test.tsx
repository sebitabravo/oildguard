import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import RulPage from "./RulPage";

describe("RUL first-view synthetic band chart", () => {
  test("does not substitute a DEMO oil-level projection for a missing RUL confidence band", () => {
    const html = renderToString(h(RulPage, {}));

    expect(html).not.toContain("og-rul-summary-chart");
  });

});
