import { describe, expect, test } from "bun:test";
import { detectWebGL, resolveSceneState } from "./sceneHost";

declare const require: (specifier: string) => unknown;
declare const process: { env: Record<string, string | undefined> };
const testWithSkip = test as typeof test & { skip: typeof test };

// Estas rutas configurables evitan depender del equipo de quien ejecuta la prueba.
const PLAYWRIGHT_MODULE = process.env.PLAYWRIGHT_MODULE;
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const missingBrowserEnv = [
  !PLAYWRIGHT_MODULE && "PLAYWRIGHT_MODULE",
  !CHROMIUM_EXECUTABLE && "PLAYWRIGHT_CHROMIUM_EXECUTABLE",
].filter(Boolean);
const skipMessage = `Skipping browser test: missing ${missingBrowserEnv.join(", ")}`;
if (missingBrowserEnv.length > 0) console.warn(skipMessage);
const { chromium } = PLAYWRIGHT_MODULE
  ? require(PLAYWRIGHT_MODULE) as { chromium: any }
  : { chromium: null };
const MOUNT_ERROR_COPY = "No se pudo cargar la vista 3D. El esquema estático permanece disponible.";

describe("landing scene mount failures", () => {
  const originalDocument = globalThis.document;

  test("recognizes a WebGL2-only browser context", () => {
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

  const browserTestName = "shows a labelled error, keeps the poster, and logs when assembly mounting throws";
  if (missingBrowserEnv.length > 0) {
    testWithSkip.skip(`${browserTestName} — ${skipMessage}`, () => {});
  } else test(browserTestName, async () => {
    const browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (message: any) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.addInitScript(() => {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, name: string, ...args: any[]) {
          if (name === "webgl2" || name === "webgl" || name === "experimental-webgl") return {} as WebGLRenderingContext;
          return originalGetContext.call(this, name, ...args);
        } as typeof HTMLCanvasElement.prototype.getContext;
      });
      await page.route("**/scenes/assembly.ts*", (route: any) => route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `export const ASSEMBLY_PARTS = [];\nexport const assemblyReduction = () => ({ overall: 1, highSpeed: 1, lowSpeed: 1 });\nexport function createAssemblyControls() { return { getState: () => ({ isolated: null }) }; }\nexport function mountAssemblyScene() { window.__assemblyMountAttempts = (window.__assemblyMountAttempts || 0) + 1; throw new Error("forced mount failure"); }`,
      }));
      await page.goto("http://localhost:5174/", { waitUntil: "load" });
      const scene = page.locator('figure[data-scene="assembly"]');
      await scene.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () => (window as any).__assemblyMountAttempts === 1,
        null,
        { timeout: 3500 },
      );

      const observed = await scene.evaluate((element: Element) => {
        const error = element.querySelector('[data-scene-error="true"]');
        return {
          sceneState: element.getAttribute("data-scene-state"),
          errorVisible: Boolean(error),
          errorText: error?.textContent?.trim() ?? null,
          posterRetained: Boolean(element.querySelector("img.landing__scene-poster")),
          mountAttempts: (window as any).__assemblyMountAttempts ?? 0,
        };
      });
      expect({
        ...observed,
        mountErrorReported: errors.some((message) => message.includes("forced mount failure")),
      }).toEqual({
        sceneState: "mount-error",
        errorVisible: true,
        errorText: MOUNT_ERROR_COPY,
        posterRetained: true,
        mountErrorReported: true,
        mountAttempts: 1,
      });
      await context.close();
    } finally {
      await browser.close();
    }
  });
});
