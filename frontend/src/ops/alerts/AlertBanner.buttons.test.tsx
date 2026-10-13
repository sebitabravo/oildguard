import { expect, test } from "bun:test";
import { renderToString } from "preact-render-to-string";
import { AlertBanner } from "../../ui/foundation";
declare const Bun: { file(path: URL): { text(): Promise<string> } };

test("alert actions use shared ghost button styling without changing accessible names", () => {
  const html = renderToString(<AlertBanner>Alerta de prueba</AlertBanner>);

  expect(html).toMatch(/<button[^>]*class="og-button og-button--ghost"[^>]*>Reconocer<\/button>/);
  expect(html).toMatch(/<button[^>]*class="og-button og-button--ghost"[^>]*>Escalar<\/button>/);
});

test("wheel alert banner restores the shared button height over compact action styles", async () => {
  const css = await Bun.file(new URL("../wheel/wheel.css", import.meta.url)).text();

  expect(css).toContain(".og-wheel-detail .og-alert-actions .og-button { min-height: 36px; }");
});

test("wheel alert actions stay readable and wrap the explanation on narrow screens", async () => {
  const css = await Bun.file(new URL("../wheel/wheel.css", import.meta.url)).text();
  const mobileRules = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

  expect(mobileRules).toContain(".og-wheel-detail .og-alert-banner { flex-wrap: wrap; }");
  expect(mobileRules).toContain(".og-wheel-detail .og-alert-banner > span:not(.og-alert-actions):not(.og-foundation-badge) { flex: 1 1 calc(100% - 56px); min-width: 0; }");
  expect(mobileRules).toContain(".og-wheel-detail .og-alert-actions { flex: 1 1 100%; min-width: 0; flex-wrap: wrap; margin-left: 0; }");
  expect(mobileRules).toContain(".og-wheel-detail .og-alert-actions .og-button { flex: 0 0 auto; white-space: nowrap; }");
  expect(mobileRules).toContain(".og-wheel-detail .og-alert-actions small { flex: 1 1 100%; min-width: 0; }");
});
