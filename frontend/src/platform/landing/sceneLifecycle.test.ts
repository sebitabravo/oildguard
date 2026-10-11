import { describe, expect, test } from "bun:test";
// @ts-expect-error Bun provee node:fs en pruebas, pero el typecheck de Astro no incluye tipos de Node.
import { readFileSync } from "node:fs";
import { MAX_PIXEL_RATIO, resolveQuality } from "../../twin/render/settings";

const stageSource = readFileSync(new URL("../../twin/render/stage.ts", import.meta.url), "utf8");
const landingSource = readFileSync(new URL("./LandingScene.tsx", import.meta.url), "utf8");
const assemblySource = readFileSync(new URL("./scenes/assembly.ts", import.meta.url), "utf8");
const oilSource = readFileSync(new URL("./scenes/oil.ts", import.meta.url), "utf8");

describe("landing 3D scene lifecycle", () => {
  test("caps every renderer DPR at 2", () => {
    for (const quality of ["low", "medium", "high"] as const) {
      expect(resolveQuality(quality, 3).pixelRatio).toBeLessThanOrEqual(2);
    }
    expect(MAX_PIXEL_RATIO).toBe(2);
  });

  test("pauses landing scene loops when hidden or outside the viewport", () => {
    expect(stageSource).toContain("pause(): void");
    expect(stageSource).toContain("resume(): void");
    expect(landingSource).toContain("mountedRef.current?.pause()");
    expect(landingSource).toContain("mountedRef.current?.resume()");
    expect(landingSource).toContain("oilMountedRef.current?.pause()");
    expect(landingSource).toContain("oilMountedRef.current?.resume()");
    expect(stageSource).toContain("document.hidden");
  });

  test("keeps one scheduled animation frame per stage", () => {
    expect(stageSource).toContain("if (disposed || manuallyPaused || document.hidden || frameId) return");
    expect(stageSource).toContain("frameId = requestAnimationFrame(frame)");
    expect(stageSource).toContain("cancelAnimationFrame(frameId)");
  });

  test("disposes scene resources and renderer on unmount", () => {
    for (const source of [assemblySource, oilSource]) {
      expect(source).toContain("stage.dispose()");
    }
    expect(stageSource).toContain("mesh.geometry?.dispose()");
    expect(stageSource).toContain("mat.dispose()");
    expect(stageSource).toContain("renderer.dispose()");
    expect(stageSource).toContain("renderer.forceContextLoss()");
  });

  test("preserves the default unpaused render path for existing stage callers", () => {
    expect(stageSource).toContain("if (!document.hidden) start()");
    expect(stageSource).toContain("if (!document.hidden) start()");
    expect(stageSource).toContain("manuallyPaused = false;");
  });
});
