import { describe, expect, test } from "bun:test";
declare const Bun: { file(path: URL): { text(): Promise<string> } };

const theme = await Bun.file(new URL("./theme.css", import.meta.url)).text();

function token(name: string): string {
  const match = theme.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`));
  if (!match?.[1]) throw new Error(`Missing color token --${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

describe("theme text contrast", () => {
  test("muted copy remains readable on the dark surfaces where it is used", () => {
    const surfaces = ["#0B0F14", "#111720", "#18202C", "#1E293B"];
    for (const name of ["og-muted", "og-text-muted"]) {
      for (const surface of surfaces) expect(contrastRatio(token(name), surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("critical badge text remains readable on its red fill", () => {
    expect(contrastRatio(token("og-on-red"), token("og-red"))).toBeGreaterThanOrEqual(4.5);
  });
});

test("danger button text uses its accessible foreground on red", () => {
  expect(theme).toMatch(/\.og-button--danger\s*\{[^}]*color:\s*var\(--og-on-red\)[^}]*background:\s*var\(--og-red\)/);
});

test("critical alert text uses its accessible foreground on the red alert fill", () => {
  expect(theme).toMatch(/\.og-badge--n4\s*\{[^}]*background:\s*var\(--og-red\)[^}]*color:\s*var\(--og-on-red\)/);
});
