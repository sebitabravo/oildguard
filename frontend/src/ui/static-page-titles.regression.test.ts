import { describe, expect, test } from "bun:test";
declare const Bun: { file(url: URL): { text(): Promise<string> } };

const devicesPage = await Bun.file(new URL("../pages/devices.astro", import.meta.url)).text();
const linkPage = await Bun.file(new URL("../pages/link.astro", import.meta.url)).text();

describe("static page title regression", () => {
  test("devices exposes a localized h1 and document title before hydration", () => {
    expect(devicesPage).toContain('<h1 class="og-visually-hidden">{t("devices.title")}</h1>');
    expect(devicesPage).toContain('title={t("devices.title")}');
  });

  test("link exposes a localized h1 and document title before hydration", () => {
    expect(linkPage).toContain('<h1 class="og-visually-hidden">{t("link.title")}</h1>');
    expect(linkPage).toContain('title={t("link.title")}');
  });
});
