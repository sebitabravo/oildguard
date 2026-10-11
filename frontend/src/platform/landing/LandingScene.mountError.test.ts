import { describe, expect, mock, test } from "bun:test";
import { detectWebGL, resolveSceneState } from "./sceneHost";

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

  test("reports a mocked assembly mount failure and hides controls without a browser", async () => {
    const stateValues: unknown[] = [];
    const refs: Array<{ current: unknown }> = [];
    const effects: Array<() => void | (() => void)> = [];
    let stateCursor = 0;
    let cleanup: void | (() => void);

    mock.module("preact/hooks", () => ({
      useEffect: (effect: () => void | (() => void)) => effects.push(effect),
      useRef: (initial: unknown) => {
        const ref = { current: initial };
        refs.push(ref);
        return ref;
      },
      useState: (initial: unknown) => {
        const index = stateCursor++;
        if (stateValues[index] === undefined) stateValues[index] = initial;
        return [stateValues[index], (next: unknown) => {
          stateValues[index] = typeof next === "function"
            ? (next as (value: unknown) => unknown)(stateValues[index])
            : next;
        }];
      },
    }));
    mock.module(import.meta.resolve("./scenes/assembly"), () => ({
      ASSEMBLY_PARTS: [],
      assemblyReduction: () => ({ overall: 32.62, highSpeed: 6.75, lowSpeed: 4.833 }),
      createAssemblyControls: () => ({ getState: () => ({ isolated: null }) }),
      mountAssemblyScene: () => { throw new Error("forced mount failure"); },
    }));

    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalObserver = globalThis.IntersectionObserver;
    const originalConsoleError = console.error;
    const loggedErrors: unknown[][] = [];
    console.error = (...args: unknown[]) => loggedErrors.push(args);

    class ImmediateIntersectionObserver {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    }

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: () => ({ getContext: () => ({}) }) },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { matchMedia: () => ({ matches: false }) },
    });
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      value: ImmediateIntersectionObserver,
    });

    try {
      const { default: LandingScene } = await import("./LandingScene");
      stateCursor = 0;
      LandingScene({ scene: "assembly" });
      refs[0].current = {};
      refs[1].current = {};
      cleanup = effects[0]();
      await new Promise((resolve) => setTimeout(resolve, 0));

      stateCursor = 0;
      const rendered = LandingScene({ scene: "assembly" }) as {
        props: { "data-scene-state": string; children: unknown };
      };
      const visit = (node: unknown): Array<{ type?: unknown; props?: Record<string, unknown> }> => {
        if (Array.isArray(node)) return node.flatMap(visit);
        if (node === null || typeof node !== "object") return [];
        const vnode = node as { type?: unknown; props?: Record<string, unknown> };
        return [vnode, ...visit(vnode.props?.children)];
      };
      const nodes = visit(rendered);
      expect(rendered.props["data-scene-state"]).toBe("mount-error");
      expect(nodes.some((node) => node.props?.["data-scene-error"] === "true")).toBe(true);
      expect(nodes.some((node) => node.props?.className === "landing__scene-poster")).toBe(true);
      expect(nodes.some((node) => node.props?.className === "landing__assembly-controls")).toBe(false);
      expect(loggedErrors).toHaveLength(1);
      expect(loggedErrors[0][1]).toEqual(new Error("forced mount failure"));
    } finally {
      cleanup?.();
      console.error = originalConsoleError;
      Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
      Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
      Object.defineProperty(globalThis, "IntersectionObserver", { configurable: true, value: originalObserver });
    }
  });
});
