import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { configureTransmissionRenderTargetMipmap } from "./transmissionTarget";

describe("transmission render target mipmap configuration", () => {
  test("disables mipmap generation for the multisampled transmission target", () => {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      samples: 4,
    });

    expect(configureTransmissionRenderTargetMipmap(target)).toBe(true);
    expect(target.texture.generateMipmaps).toBe(false);
    expect(target.texture.minFilter).toBe(THREE.LinearFilter);
    expect(configureTransmissionRenderTargetMipmap(target)).toBe(false);
  });

  test("leaves unrelated render targets unchanged", () => {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      samples: 0,
    });

    expect(configureTransmissionRenderTargetMipmap(target)).toBe(false);
    expect(target.texture.generateMipmaps).toBe(true);
    expect(target.texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
  });
});
