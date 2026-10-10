import { describe, expect, test } from "bun:test";

describe("theme tokens", () => {
  test("keeps every hexadecimal colour inside the root token block", async () => {
    const css = await (globalThis as unknown as {
      Bun: { file(path: URL): { text(): Promise<string> } };
    }).Bun.file(new URL("./theme.css", import.meta.url)).text();
    const outsideRoot = css.replace(/:root\s*\{[^}]*\}/, "");

    expect(outsideRoot.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});
