import { describe, expect, mock, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { createWebGLScene, WebGLFallback } from "./webgl";

describe("WebGL viewport fallback", () => {
  test("shows the poster and skips renderer creation when WebGL is unavailable", () => {
    const createRenderer = mock(() => ({ id: "renderer" }));
    const renderer = createWebGLScene(false, createRenderer, () => {});
    const html = renderToString(h(WebGLFallback, {
      poster: "/posters/cycle.svg",
      caption: "La vista 3D interactiva requiere WebGL.",
    }));

    expect(renderer).toBeNull();
    expect(createRenderer).not.toHaveBeenCalled();
    expect(html).toContain('src="/posters/cycle.svg"');
    expect(html).toContain("La vista 3D interactiva requiere WebGL.");
  });

  test("creates the renderer when WebGL is available", () => {
    const rendererValue = { id: "renderer" };
    const createRenderer = mock(() => rendererValue);
    const renderer = createWebGLScene(true, createRenderer, () => {});

    expect(renderer).toBe(rendererValue);
    expect(createRenderer).toHaveBeenCalledTimes(1);
  });

  test("turns renderer creation failures into the fallback state", () => {
    const createRenderer = mock(() => { throw new Error("WebGL context lost"); });
    const onUnavailable = mock(() => {});
    const renderer = createWebGLScene(true, createRenderer, onUnavailable);

    expect(renderer).toBeNull();
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });
});
