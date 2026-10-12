import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { dict } from "../../i18n";
import Landing from "./Landing";

function reservoirStat(): string {
  const html = renderToString(h(Landing, {}));
  const start = html.indexOf(`<article><span>${dict["landing.factReservoir"]}</span>`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = html.indexOf("</article>", start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

describe("landing reservoir provenance", () => {
  test("marks the reservoir stat as an assumption, not verified", () => {
    const stat = reservoirStat();

    expect(stat.includes(">ASSUMPTION</span>")).toBe(true);
    expect(stat.includes(">VERIFIED</span>")).toBe(false);
  });

  test("does not claim an unconfirmed oil grade in the headline", () => {
    expect(reservoirStat().includes("SAE 85W-140")).toBe(false);
  });

  test("shows the Spanish note that the grade is unconfirmed", () => {
    expect(reservoirStat().includes("grado no confirmado en manuales")).toBe(true);
  });
});
