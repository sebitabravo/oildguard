import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { MAX_PIXEL_RATIO, resolveQuality } from "../../twin/render/settings";
import { createRenderLoop, disposeRendererResources, disposeSceneResources } from "../../twin/render/stage";

type Frame = () => void;
type Spy<T extends (...args: never[]) => unknown> = T & { calls: Parameters<T>[] };

function spy<T extends (...args: never[]) => unknown>(implementation: T): Spy<T> {
  const calls: Parameters<T>[] = [];
  const wrapped = (...args: Parameters<T>): ReturnType<T> => {
    calls.push(args);
    return implementation(...args) as ReturnType<T>;
  };
  return Object.assign(wrapped, { calls }) as Spy<T>;
}

function createFrameHost() {
  let nextId = 1;
  const frames = new Map<number, Frame>();
  const canceled: number[] = [];
  let hidden = false;
  let onVisibilityChange: (() => void) | null = null;
  const host = {
    requestFrame: spy((callback: Frame) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    }),
    cancelFrame: spy((id: number) => {
      canceled.push(id);
      frames.delete(id);
    }),
    isHidden: () => hidden,
    subscribeVisibility: (callback: () => void) => {
      onVisibilityChange = callback;
      return () => {
        onVisibilityChange = null;
      };
    },
    setHidden(value: boolean) {
      hidden = value;
      onVisibilityChange?.();
    },
    flush() {
      const next = frames.entries().next().value as [number, Frame] | undefined;
      if (!next) return;
      const [id, callback] = next;
      frames.delete(id);
      callback();
    },
    frames,
    canceled,
  };
  return host;
}

describe("landing 3D scene lifecycle", () => {
  test("caps every renderer DPR at 2", () => {
    for (const quality of ["low", "medium", "high"] as const) {
      expect(resolveQuality(quality, 3).pixelRatio).toBeLessThanOrEqual(2);
    }
    expect(MAX_PIXEL_RATIO).toBe(2);
  });

  test("starts one RAF by default and maintains one scheduled callback", () => {
    const host = createFrameHost();
    const render = spy(() => {});
    const loop = createRenderLoop(render, host);
    expect(host.frames.size).toBe(1);
    host.flush();
    expect(render.calls.length).toBe(1);
    expect(host.frames.size).toBe(1);
    loop.dispose();
    expect(host.frames.size).toBe(0);
  });

  test("pauses while document visibility is hidden and resumes when visible", () => {
    const host = createFrameHost();
    const render = spy(() => {});
    const loop = createRenderLoop(render, host);
    const scheduledId = host.frames.keys().next().value;
    host.setHidden(true);
    expect(host.frames.size).toBe(0);
    expect(host.canceled).toContain(scheduledId);
    host.flush();
    expect(render.calls.length).toBe(0);
    host.setHidden(false);
    expect(host.frames.size).toBe(1);
    loop.dispose();
  });

  test("disposes geometry, material, texture, and renderer resources", () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const renderer = { dispose: spy(() => {}), forceContextLoss: spy(() => {}) };
    const geometryDispose = spy(geometry.dispose.bind(geometry));
    const textureDispose = spy(texture.dispose.bind(texture));
    const materialDispose = spy(material.dispose.bind(material));
    geometry.dispose = geometryDispose;
    texture.dispose = textureDispose;
    material.dispose = materialDispose;
    scene.add(new THREE.Mesh(geometry, material));

    disposeSceneResources(scene);
    disposeRendererResources(renderer);

    expect(geometryDispose.calls.length).toBe(1);
    expect(materialDispose.calls.length).toBe(1);
    expect(textureDispose.calls.length).toBe(1);
    expect(renderer.dispose.calls.length).toBe(1);
    expect(renderer.forceContextLoss.calls.length).toBe(1);
  });

  test("manual pause keeps the default stage render path opt-in", () => {
    const host = createFrameHost();
    const loop = createRenderLoop(() => {}, host);
    expect(host.frames.size).toBe(1);
    loop.pause();
    expect(host.frames.size).toBe(0);
    loop.resume();
    expect(host.frames.size).toBe(1);
    loop.dispose();
  });
});
