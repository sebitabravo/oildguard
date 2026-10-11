import { describe, expect, test } from "bun:test";
import { handleAssemblyPartChange } from "./LandingScene";
// @ts-expect-error Bun provee node:fs en pruebas, pero el typecheck de Astro no incluye tipos de Node.
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./LandingScene.tsx", import.meta.url), "utf8");
const controlsGroup = source.match(/<div className="landing__assembly-controls-actions">([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/)?.[1] ?? "";

describe("assembly scene controls", () => {
  test("keeps the native part selector in the controls group", () => {
    expect(controlsGroup).toContain("<select");
    expect(controlsGroup).toContain("<label>");
  });

  test("updates the displayed part from a native select change", () => {
    let displayedPart: string | null = null;
    let isolatedPart: string | null = null;
    const select = Object.assign(new EventTarget(), { value: "sun" });
    select.addEventListener("change", (event) => handleAssemblyPartChange(
      { currentTarget: event.currentTarget as HTMLSelectElement },
      (part) => { displayedPart = part; },
      (part) => { isolatedPart = part; },
    ));

    select.dispatchEvent(new Event("change"));

    expect(displayedPart).toBe("sun");
    expect(isolatedPart).toBe("sun");
  });

  test("gives both rotate controls SVG glyphs and preserves their Spanish labels", () => {
    expect(/aria-label="Girar a la izquierda"[\s\S]*?<svg[\s\S]*?<\/svg>/.test(controlsGroup)).toBe(true);
    expect(/aria-label="Girar a la derecha"[\s\S]*?<svg[\s\S]*?<\/svg>/.test(controlsGroup)).toBe(true);
  });
});
