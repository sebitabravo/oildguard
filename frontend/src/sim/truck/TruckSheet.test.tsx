import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import TruckSheet from "./TruckSheet";

// Solo español (S05): la ficha siempre sale en español, sin idioma por localStorage.
function renderTruckSheet(): string {
  return renderToString(h(TruckSheet, {}));
}

describe("truck technical sheet locale formatting", () => {
  test("renders dimensions, weights, capacity, and provenance with decimal commas in Spanish", () => {
    const html = renderTruckSheet();

    expect(html).toContain("15,29 × 8,89 × 8,10 m");
    expect(html).toContain("15,60 × 8,69 × 7,37 m");
    expect(html).toContain("14,80 m");
    expect(html).toContain("14,02 m");
    expect(html).toContain("290303 kg, 211 m³");
    expect(html).toContain("del 12,92/tras 9,40 ±6,5°");
    expect(html).toContain("6,35</td>");
    expect(html.includes("15.29 × 8.89")).toBe(false);
    expect(html.includes("15.60 × 8.69")).toBe(false);
    expect(html.includes("6.35</td>")).toBe(false);
  });
});
