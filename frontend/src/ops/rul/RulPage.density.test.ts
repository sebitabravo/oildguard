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

    expect(projectedCards.length).toBeGreaterThan(0);
    expect(cards.length).toBeGreaterThan(projectedCards.length);
    for (const card of projectedCards) {
      const disclosure = card.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
      const beforeDisclosure = card.split("<details")[0] ?? "";
      expect(disclosure).not.toBeNull();
      expect(disclosure?.[1]).not.toContain("open");
      expect(disclosure?.[1]).toContain('class="og-rul-projection"');
      expect(disclosure?.[2]).toContain(`<summary>${t("rul.projection")} · 30%</summary>`);
      expect(disclosure?.[2]).toContain("<svg");
      expect(beforeDisclosure).toContain('class="og-rul-card__horizon"');
      expect(beforeDisclosure).toContain('class="og-rul-card__metrics"');
      expect(beforeDisclosure).toContain('class="og-rul-source');
    }
  });
});
