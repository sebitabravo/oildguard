import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { createMaterials } from "./materials";
import { PALETTE } from "./palette";
import {
  dirtMaps,
  isPowerOfTwo,
  rockMaps,
  surfaceTextures,
  treadBumpPixels,
  treadHeight,
} from "./textures";

const hsl = (hex: number) => new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);

describe("palette", () => {
  test("komatsu yellow is in the yellow hue band", () => {
    const { h, s } = hsl(PALETTE.komatsuYellow);
    expect(h * 360).toBeGreaterThan(38);
    expect(h * 360).toBeLessThan(50);
    expect(s).toBeGreaterThan(0.8);
  });

  test("oil is amber/brown, never green", () => {
    const { h } = hsl(PALETTE.oilAmber);
    expect(h * 360).toBeGreaterThan(20);
    expect(h * 360).toBeLessThan(45);
    const c = new THREE.Color(PALETTE.oilAmber);
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.g).toBeGreaterThan(c.b);
  });
});

describe("material library", () => {
  test("caches instances by name", () => {
    const lib = createMaterials();
    expect(lib.get("komatsuYellow")).toBe(lib.get("komatsuYellow"));
    expect(lib.ground("dirt")).toBe(lib.ground("dirt"));
    expect(lib.ground("dirt", [4, 4])).not.toBe(lib.ground("dirt", [8, 8]));
    lib.dispose();
  });

  test("komatsu yellow is a clearcoated physical material", () => {
    const lib = createMaterials();
    const m = lib.get("komatsuYellow");
    expect(m.isMeshPhysicalMaterial).toBe(true);
    expect(m.clearcoat).toBeCloseTo(0.6, 2);
    expect(m.roughness).toBeCloseTo(0.45, 2);
    lib.dispose();
  });

  test("machined steel is fully metallic", () => {
    const lib = createMaterials();
    const steel = lib.get("machinedSteel");
    expect(steel.isMeshPhysicalMaterial).toBe(true);
    expect(steel.metalness).toBe(1);
    expect(steel.roughness).toBeCloseTo(0.3, 2);
    expect(steel.clearcoat).toBe(0);
    lib.dispose();
  });

  test("steel and cast iron material classes stay physical without a clearcoat", () => {
    const lib = createMaterials();
    const paintedSteel = lib.get("paintedSteelDark");
    const castIron = lib.get("castIron");
    expect(paintedSteel.isMeshPhysicalMaterial).toBe(true);
    expect(castIron.isMeshPhysicalMaterial).toBe(true);
    expect(castIron.clearcoat).toBe(0);
    expect(castIron.color.getHex()).toBe(PALETTE.castIron);
    expect(castIron.metalness).toBeCloseTo(0.85, 2);
    expect(castIron.roughness).toBeCloseTo(0.55, 2);
    lib.dispose();
  });

  test("oil 85W-140 transmits light with ior 1.48", () => {
    const lib = createMaterials();
    const oil = lib.get("oil85W140");
    expect(oil.transmission).toBeGreaterThanOrEqual(0.3);
    expect(oil.transmission).toBeLessThanOrEqual(0.5);
    expect(oil.ior).toBeCloseTo(1.48, 2);
    expect(oil.roughness).toBeLessThan(0.2);
    expect(oil.attenuationColor.r).toBeGreaterThan(oil.attenuationColor.b);
    lib.dispose();
  });

  test("rubber tire is very dark and rough", () => {
    const lib = createMaterials();
    const tire = lib.rubberTire();
    expect(tire.isMeshPhysicalMaterial).toBe(true);
    expect(tire.roughness).toBeCloseTo(0.9, 2);
    expect(tire.clearcoat).toBe(0);
    expect(tire.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(0.05);
    expect(tire.bumpMap).toBeTruthy();
    lib.dispose();
  });

  test("ground textures: sRGB albedo, linear roughness, power-of-two", () => {
    const lib = createMaterials();
    const ground = lib.ground("rock");
    expect(ground.map?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(ground.roughnessMap?.colorSpace).toBe(THREE.NoColorSpace);
    const image = ground.map?.image as { width: number; height: number };
    expect(isPowerOfTwo(image.width)).toBe(true);
    expect(isPowerOfTwo(image.height)).toBe(true);
    lib.dispose();
  });
});

describe("procedural surfaces", () => {
  test("dirt maps are deterministic", () => {
    const a = dirtMaps(32, 5);
    const b = dirtMaps(32, 5);
    expect(Array.from(a.albedo)).toEqual(Array.from(b.albedo));
    expect(Array.from(a.roughness)).toEqual(Array.from(b.roughness));
  });

  test("dirt and rock differ", () => {
    expect(Array.from(dirtMaps(32).albedo)).not.toEqual(Array.from(rockMaps(32).albedo));
  });

  test("albedo is opaque RGBA and roughness stays in a rough range", () => {
    const m = dirtMaps(32);
    expect(m.albedo.length).toBe(32 * 32 * 4);
    let minRough = 255;
    for (let i = 0; i < m.albedo.length; i += 4) {
      expect(m.albedo[i + 3]).toBe(255);
      minRough = Math.min(minRough, m.roughness[i + 1]);
    }
    expect(minRough).toBeGreaterThan(150);
  });

  test("rejects sizes that are not a power of two", () => {
    expect(() => dirtMaps(30)).toThrow();
  });

  test("tread height tiles in u and v and has both lugs and grooves", () => {
    expect(treadHeight(0, 0.3)).toBeCloseTo(treadHeight(1, 0.3), 12);
    expect(treadHeight(0.4, 0)).toBeCloseTo(treadHeight(0.4, 1), 12);
    const px = treadBumpPixels(64);
    let lug = 0;
    let groove = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] > 128) lug++;
      if (px[i] === 0) groove++;
    }
    expect(lug).toBeGreaterThan(0);
    expect(groove).toBeGreaterThan(0);
  });

  test("surfaceTextures wraps in repeat mode with the requested tiling", () => {
    const t = surfaceTextures(dirtMaps(32), [3, 5]);
    expect(t.map.wrapS).toBe(THREE.RepeatWrapping);
    expect(t.map.repeat.x).toBe(3);
    expect(t.map.repeat.y).toBe(5);
    t.map.dispose();
    t.roughnessMap.dispose();
  });
});
