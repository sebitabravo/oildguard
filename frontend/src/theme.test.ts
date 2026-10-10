import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("theme tokens", () => {
  test("keeps every hexadecimal colour inside the root token block", () => {
    const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8");
    const outsideRoot = css.replace(/:root\s*\{[^}]*\}/, "");

    expect(outsideRoot.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});
