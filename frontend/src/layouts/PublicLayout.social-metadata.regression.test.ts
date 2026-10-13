import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const layout = Bun.file(new URL("./PublicLayout.astro", import.meta.url)).text();

describe("public social metadata", () => {
  test("reuses the page title and description for Open Graph and Twitter metadata", async () => {
    const source = await layout;

    expect(source).toContain('<meta property="og:title" content={title}');
    expect(source).toContain('<meta property="og:description" content={description}');
    expect(source).toContain('<meta property="og:type" content="website"');
    expect(source).toContain('<meta name="twitter:card" content="summary"');
    expect(source).not.toContain("og:image");
  });
});
