import { describe, expect, test } from "bun:test";

declare const Bun: { file(path: URL): { text(): Promise<string> } };

function rule(stylesheet: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

describe("login remember checkbox hit area", () => {
  test("uses a 44px interactive box while retaining a compact checkbox visual", async () => {
    const stylesheet = await Bun.file(new URL("./login.css", import.meta.url)).text();
    const input = rule(stylesheet, ".login__remember input");
    const visual = rule(stylesheet, ".login__remember input::before");

    expect(input).toContain("width: 44px");
    expect(input).toContain("height: 44px");
    expect(input).toContain("appearance: none");
    expect(visual).toContain("width: 15px");
    expect(visual).toContain("height: 15px");
  });
});
