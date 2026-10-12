import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { dict } from "../../i18n";
import Landing from "./Landing";

function landingStat(label: string): string {
  const html = renderToString(h(Landing, {}));
  const start = html.indexOf(`<article><span>${label}</span>`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = html.indexOf("</article>", start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

describe("landing design provenance", () => {
  test("marks the simulator rate as an assumption, not verified", () => {
    const rateStat = landingStat(dict["landing.factRate"]);

    expect(rateStat).toContain(">ASSUMPTION</span>");
    expect(rateStat).not.toContain(">VERIFIED</span>");
  });

  test("marks the response ladder as an assumption, not verified", () => {
    const ladderStat = landingStat(dict["landing.factLevels"]);

    expect(ladderStat).toContain(">ASSUMPTION</span>");
    expect(ladderStat).not.toContain(">VERIFIED</span>");
  });
});
