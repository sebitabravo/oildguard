import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { createWebGLScene, WebGLFallback } from "./webgl";

describe("WebGL viewport fallback", () => {
  test("shows the poster and skips renderer creation when WebGL is unavailable", () => {
    let createCalls = 0;
    const createRenderer = () => {
      createCalls += 1;
      return { id: "renderer" };
    };
    const renderer = createWebGLScene(false, createRenderer, () => {});
    const html = renderToString(h(WebGLFallback, {
      poster: "/posters/cycle.svg",
      caption: "La vista 3D interactiva requiere WebGL.",
    }));

    expect(renderer).toBe(null);
    expect(createCalls).toBe(0);
    expect(html).toContain('src="/posters/cycle.svg"');
    expect(html).toContain("La vista 3D interactiva requiere WebGL.");
  });

  test("creates the renderer when WebGL is available", () => {
    const rendererValue = { id: "renderer" };
    let createCalls = 0;
    const createRenderer = () => {
      createCalls += 1;
      return rendererValue;
    };
    const renderer = createWebGLScene(true, createRenderer, () => {});

    expect(renderer).toBe(rendererValue);
    expect(createCalls).toBe(1);
  });

  test("turns renderer creation failures into the fallback state", () => {
    const createRenderer = () => { throw new Error("WebGL context lost"); };
    let unavailableCalls = 0;
    const onUnavailable = () => { unavailableCalls += 1; };
    const renderer = createWebGLScene(true, createRenderer, onUnavailable);

    expect(renderer).toBe(null);
    expect(unavailableCalls).toBe(1);
  });
});
