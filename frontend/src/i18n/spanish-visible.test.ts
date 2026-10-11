import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { t } from "./index";
import RulPage from "../ops/rul/RulPage";
import TruckView from "../sim/truck/TruckView";

declare const Bun: { file(path: URL): { text(): Promise<string> } };

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
    const script = await Bun.file(new URL("../../../docs/demo-script.md", import.meta.url)).text();
    const copyOnly = script
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
      .replace(/`([^`]+)`/g, (_match: string, value: string) => value === "DEMO" || value === "EN VIVO" ? value : " ");
    const renderedCopy = visibleText(copyOnly.replace(/[*_#]/g, " "));

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
    const componentSource = await Bun.file(new URL("../ops/rul/RulPage.tsx", import.meta.url)).text();

    expect(sourceBadges.length).toBeGreaterThan(0);
    expect(t("rul.source.live")).toBe("EN VIVO");
    expect(sourceBadges.filter((value) => value === "LIVE")).toEqual([]);
    expect(findEnglishMatches(visibleText(renderedHtml), ["live"])).toEqual([]);
    // SSR muestra el fallback DEMO; el enlace directo exponería LIVE tras el efecto del cliente.
    const rawBadgeBindings = [
      /className=\{`og-rul-source[^`]*`\}>\{card\.source\}<\/span>/,
      /className="og-chip">\{card\.source\}<\/span>/,
    ];
    expect(rawBadgeBindings.some((pattern) => pattern.test(componentSource))).toBe(false);
  });
});
