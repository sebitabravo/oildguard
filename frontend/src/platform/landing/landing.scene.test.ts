import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import * as sceneHostModule from "./sceneHost";
import {
  LANDING_SCENES,
  SCENE_POSTERS,
  SCROLL_CONTRACT,
  createSceneHost,
  posterFor,
  resolveSceneState,
  shouldDeferScene,
  type LandingSceneId,
} from "./sceneHost";
import LandingScene from "./LandingScene";
import assemblyPoster from "./posters/assembly.svg";
import sensorsPoster from "./posters/sensors.svg";
import cyclePoster from "./posters/cycle.svg";
import oilPoster from "./posters/oil.svg";

// El host persistente difiere el chunk 3D hasta el viewport; los cuatro
// pósters sostienen la portada sin WebGL y el scroll sigue nativo.
const EXPECTED_SCENES: readonly LandingSceneId[] = ["assembly", "sensors", "cycle", "oil"];

const POSTER_URLS: Record<LandingSceneId, string> = {
  assembly: assetUrl(assemblyPoster),
  sensors: assetUrl(sensorsPoster),
  cycle: assetUrl(cyclePoster),
  oil: assetUrl(oilPoster),
};

// El empaquetado tipa el SVG como componente con `.src`; el runner lo
// entrega como ruta. El test acepta ambas formas, igual que el componente.
function assetUrl(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}

describe("landing scene host", () => {
  test("declares exactly four deferred scenes", () => {
    expect([...LANDING_SCENES]).toEqual([...EXPECTED_SCENES]);
  });

  test("maps every scene to its exact poster path", () => {
    for (const scene of EXPECTED_SCENES) {
      expect(SCENE_POSTERS[scene]).toBe(`frontend/src/platform/landing/posters/${scene}.svg`);
      expect(posterFor(scene)).toBe(`frontend/src/platform/landing/posters/${scene}.svg`);
    }
  });

  test("rejects unknown scenes instead of inventing a poster", () => {
    expect(() => posterFor("unknown" as unknown as LandingSceneId)).toThrow();
  });

  test("bundles every poster as a loadable asset", () => {
    for (const scene of EXPECTED_SCENES) {
      expect(typeof POSTER_URLS[scene]).toBe("string");
      expect(POSTER_URLS[scene].length).toBeGreaterThan(0);
    }
  });

  test("defers the 3D chunk until the scene is in viewport", () => {
    expect(shouldDeferScene({ inViewport: false })).toBe(true);
    expect(shouldDeferScene({ inViewport: true })).toBe(false);
  });

  test("keeps the poster outside the viewport, without WebGL, or with reduced motion", () => {
    expect(resolveSceneState({ inViewport: false, webglAvailable: true }).state).toBe("poster");
    expect(resolveSceneState({ inViewport: true, webglAvailable: false }).state).toBe("poster");
    expect(
      resolveSceneState({ inViewport: true, webglAvailable: true, prefersReducedMotion: true }).state,
    ).toBe("poster");
    expect(resolveSceneState({ inViewport: true, webglAvailable: true }).state).toBe("loading-3d");
    expect(
      resolveSceneState({ inViewport: true, webglAvailable: true, moduleLoaded: true }).state,
    ).toBe("ready-3d");
  });

  test("loads the 3D module lazily, once, and only in view with WebGL", async () => {
    let calls = 0;
    const host = createSceneHost("assembly", {
      webglAvailable: true,
      importScene: () => {
        calls += 1;
        return Promise.resolve({ default: {} });
      },
    });
    expect(calls).toBe(0);
    host.onViewportChange(false);
    await Promise.resolve();
    expect(calls).toBe(0);
    host.onViewportChange(true);
    await Promise.resolve();
    expect(calls).toBe(1);
    host.onViewportChange(true);
    await Promise.resolve();
    expect(calls).toBe(1);
    expect(host.getState()).toBe("ready-3d");
    host.dispose();
  });

  test("never loads 3D without WebGL and ignores the viewport after dispose", async () => {
    let calls = 0;
    const host = createSceneHost("sensors", {
      webglAvailable: false,
      importScene: () => {
        calls += 1;
        return Promise.resolve({ default: {} });
      },
    });
    host.onViewportChange(true);
    await Promise.resolve();
    expect(calls).toBe(0);
    expect(host.getState()).toBe("poster");
    host.dispose();
    host.onViewportChange(true);
    await Promise.resolve();
    expect(calls).toBe(0);
  });

  test("stays on the poster when the 3D chunk fails", async () => {
    const host = createSceneHost("cycle", {
      webglAvailable: true,
      importScene: () => Promise.reject(new Error("chunk missing")),
    });
    host.onViewportChange(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(host.getState()).toBe("poster");
    host.dispose();
  });

  test("keeps native scroll: the host exposes no scroll-hijack control", () => {
    expect(SCROLL_CONTRACT).toBe("native");
    const host = createSceneHost("oil", { webglAvailable: false });
    const controls = host as unknown as Record<string, unknown>;
    expect(controls["scrollTo"]).toBe(undefined);
    expect(controls["scrollIntoView"]).toBe(undefined);
    expect(controls["hijackScroll"]).toBe(undefined);
    expect("hijackScroll" in sceneHostModule).toBe(false);
    host.dispose();
  });
});

describe("landing scene cover", () => {
  test("every scene renders its poster cover without eager 3D", () => {
    for (const scene of EXPECTED_SCENES) {
      const html = renderToString(h(LandingScene, { scene }));
      expect(html.includes(`data-scene="${scene}"`)).toBe(true);
      expect(html.includes("<img")).toBe(true);
      expect(html.includes(POSTER_URLS[scene])).toBe(true);
      expect(html.includes("<canvas")).toBe(false);
      expect(html.includes('data-deferred="true"')).toBe(true);
    }
  });

  test("the cover stays legible in Spanish before 3D exists", () => {
    const html = renderToString(h(LandingScene, { scene: "assembly" }));
    expect(html.includes("<figcaption")).toBe(true);
    expect(html.includes('alt=""')).toBe(false);
  });
});
