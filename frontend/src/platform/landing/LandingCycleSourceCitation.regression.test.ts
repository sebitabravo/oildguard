import { describe, expect, test } from "bun:test";
import { platform } from "../../i18n/dict/platform";

describe("landing cycle source citation", () => {
  test("cites the existing feasibility evidence and truck cycle source", () => {
    const source = platform["landing.cycle.source"];

    expect(source).toContain("frontend/src/sim/truck/cycle.ts");
    expect(source).toContain("docs/feasibility.md");
    expect(source).not.toContain("docs/research/landing-claims.md");
  });
});
