import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import RulPage from "../ops/rul/RulPage";
import TruckView from "../sim/truck/TruckView";

const englishStopWords = [
  "five-minute", "jury", "start", "stack", "healthy", "response", "proves", "only", "open", "select", "reach",
  "point", "row-level", "source", "labels", "live", "api", "contain", "simulator", "devices", "full", "fleet",
  "presentation", "includes", "deterministic", "dataset", "click", "wheel", "row", "opens", "monitoring", "analysis",
  "page", "cutaway", "run", "leak", "clean", "synthetic", "model", "behavior", "measurement", "validation", "close",
  "loading", "hauling", "dumping", "maneuvering", "tare_zone", "final_zone", "after_dump",
];

function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findEnglishMatches(text: string, stopWords = englishStopWords): string[] {
  return stopWords.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
}

describe("Spanish-only visible copy", () => {
  test("keeps the served demo script in Spanish while allowing the DEMO loanword", async () => {
    const script = await readFile(new URL("../../../docs/demo-script.md", import.meta.url), "utf8");
    const renderedCopy = visibleText(script.replace(/[`*_#\[\]()>]/g, " "));

    expect(findEnglishMatches(renderedCopy)).toEqual([]);
  });

  test("keeps the rendered mine status list free of English labels and PLM codes", () => {
    const priorWindow = globalThis.window;
    globalThis.window = { location: { search: "" } } as Window & typeof globalThis;
    try {
      const renderedCopy = visibleText(renderToString(h(TruckView, {})));
      expect(findEnglishMatches(renderedCopy, ["payload", "empty", "loading", "hauling", "dumping", "maneuvering", "tare_zone", "final_zone", "after_dump"])).toEqual([]);
    } finally {
      globalThis.window = priorWindow;
    }
  });

  test("maps the client-only RUL LIVE badge while allowing the rendered DEMO loanword", async () => {
    const renderedHtml = renderToString(h(RulPage, {}));
    const sourceBadges = [...renderedHtml.matchAll(/<span class="og-rul-source[^>]*>(.*?)<\/span>/g)]
      .map((match) => visibleText(match[1] ?? ""));
    const componentSource = await readFile(new URL("../ops/rul/RulPage.tsx", import.meta.url), "utf8");

    expect(sourceBadges.length).toBeGreaterThan(0);
    expect(sourceBadges.filter((value) => value === "LIVE")).toEqual([]);
    expect(findEnglishMatches(visibleText(renderedHtml), ["live"])).toEqual([]);
    // SSR muestra el fallback DEMO; el enlace directo exponería LIVE tras el efecto del cliente.
    expect(/className=\{`og-rul-source[^`]*`\}>\{card\.source\}<\/span>/.test(componentSource)).toBe(false);
  });
});
