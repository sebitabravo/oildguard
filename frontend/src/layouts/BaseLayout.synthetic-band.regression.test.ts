import { describe, expect, test } from "bun:test";
import { t } from "../i18n";

declare const Bun: { file(url: URL): { text(): Promise<string> } };

describe("shared shell synthetic-data disclosure", () => {
  test("renders the exact synthetic-data band once beneath the top bar", async () => {
    const source = await Bun.file(new URL("./BaseLayout.astro", import.meta.url)).text();
    const bandCall = '{t("shell.syntheticBand")}';
    const renderedLayout = source.replace(bandCall, t("shell.syntheticBand"));
    const headerEnd = source.indexOf("</header>");
    const bandPosition = source.indexOf(bandCall);
    const navStart = source.indexOf('<nav class="og-mobile-nav"');

    expect(source.match(/\{t\("shell\.syntheticBand"\)\}/g) ?? []).toHaveLength(1);
    expect(bandPosition).toBeGreaterThan(headerEnd);
    expect(bandPosition).toBeLessThan(navStart);
    expect(renderedLayout.match(/SINTÉTICO · datos del simulador, no de terreno/g) ?? []).toHaveLength(1);
  });
});
