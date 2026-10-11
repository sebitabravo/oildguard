import { describe, expect, test } from "bun:test";
import {
  mountAssemblyWithFallback,
  sceneMountErrorPresentation,
  shouldShowScenePoster,
  shouldSyncSceneHostState,
  shouldShowAssemblyControls,
} from "./LandingScene";
import type { AssemblyReduction } from "./scenes/assembly";
import { detectWebGL, resolveSceneState, type SceneLoadState } from "./sceneHost";

describe("landing scene mount failures", () => {
  test("recognizes a WebGL2-only browser context", () => {
    const originalDocument = globalThis.document;
    const canvas = {
      getContext: (name: string) => name === "webgl2" ? {} : null,
    } as HTMLCanvasElement;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: () => canvas },
    });

    try {
      const webglAvailable = detectWebGL();
      expect(webglAvailable).toBe(true);
      expect(resolveSceneState({ inViewport: true, webglAvailable }).state).toBe("loading-3d");
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });

  test("preserves mount-error state, logs failure, and hides controls", async () => {
    const originalConsoleError = console.error;
    const loggedErrors: unknown[][] = [];
    console.error = (...args: unknown[]) => loggedErrors.push(args);
    let state: SceneLoadState = "loading-3d";
    const mountError = new Error("forced mount failure");
    const brokenModule = {
      createAssemblyControls: () => ({ getState: () => ({ isolated: null }) }),
      mountAssemblyScene: () => { throw mountError; },
    } as unknown as typeof import("./scenes/assembly");

    try {
      const result = await mountAssemblyWithFallback(
        {} as HTMLDivElement,
        (nextState) => { state = nextState; },
        async () => brokenModule,
      );
      const reduction = {
        overall: 32.62,
        highSpeed: 6.75,
        lowSpeed: 4.833,
        illustrative: 32.625,
        wheelRpmAt3000: 3000 / 32.62,
        withinTolerance: true,
      } satisfies AssemblyReduction;

      expect(result).toBe(null);
      expect(state).toBe("mount-error");
      expect(shouldShowAssemblyControls("assembly", state, reduction)).toBe(false);
      expect(loggedErrors.length).toBe(1);
      expect(loggedErrors[0][1]).toBe(mountError);
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("does not mount assembly after unmount while its import is pending", async () => {
    let resolveModule!: (module: typeof import("./scenes/assembly")) => void;
    let alive = true;
    let createdControls = 0;
    let mountedScene = 0;
    const pendingModule = new Promise<typeof import("./scenes/assembly")>((resolve) => {
      resolveModule = resolve;
    });
    const loadedModule = {
      createAssemblyControls: () => {
        createdControls += 1;
        return { getState: () => ({ isolated: null }) };
      },
      mountAssemblyScene: () => {
        mountedScene += 1;
        return { dispose: () => undefined, syncCamera: () => undefined };
      },
    } as unknown as typeof import("./scenes/assembly");

    const pendingMount = mountAssemblyWithFallback(
      {} as HTMLDivElement,
      () => undefined,
      () => pendingModule,
      () => alive,
    );
    alive = false;
    resolveModule(loadedModule);

    const result = await pendingMount;
    expect(result).toBe(null);
    expect(createdControls).toBe(0);
    expect(mountedScene).toBe(0);
  });

  test("keeps the labelled mount error and poster while host sync is guarded", () => {
    const presentation = sceneMountErrorPresentation("assembly", "mount-error");

    expect(presentation?.role).toBe("status");
    expect(typeof presentation?.message).toBe("string");
    expect(presentation?.message.length).toBeGreaterThan(0);
    expect(shouldShowScenePoster("assembly", "mount-error", false)).toBe(true);
    expect(shouldSyncSceneHostState(true, true)).toBe(false);
    expect(shouldSyncSceneHostState(true, false)).toBe(true);
  });
});
