import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import RulPage from "./RulPage";
import { t } from "../../i18n";

describe("RUL projection density", () => {
  test("collapses each projection chart while keeping horizon, status and source visible", () => {
    const html = renderToString(h(RulPage, {}));
    const cards = [...html.matchAll(/<article class="og-rul-card[^>]*>([\s\S]*?)<\/article>/g)].map((match) => match[1] ?? "");
    const projectedCards = cards.filter((card) => card.includes('class="og-rul-projection"'));

    expect(projectedCards.length > 0).toBe(true);
    expect(cards.length > projectedCards.length).toBe(true);
    for (const card of projectedCards) {
      const disclosure = card.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
      const beforeDisclosure = card.split("<details")[0] ?? "";
      expect(disclosure !== null).toBe(true);
      expect(disclosure?.[1]?.includes("open") ?? false).toBe(false);
      expect(disclosure?.[1]?.includes('class="og-rul-projection"') ?? false).toBe(true);
      expect(disclosure?.[2]?.includes(`<summary>${t("rul.projection")} · 30%</summary>`) ?? false).toBe(true);
      expect(disclosure?.[2]?.includes("<svg") ?? false).toBe(true);
      expect(beforeDisclosure.includes('class="og-rul-card__horizon"')).toBe(true);
      expect(beforeDisclosure.includes('class="og-rul-card__metrics"')).toBe(true);
      expect(beforeDisclosure.includes('class="og-rul-source')).toBe(true);
    }
  });
});
