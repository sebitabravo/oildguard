import * as THREE from "three";
import { noiseField } from "./noise";

// Texturas procedurales: se generan como píxeles puros (testeables) y luego
// se envuelven en DataTexture; no hay descargas de imágenes. Todo es
// potencia de 2 y tileable.

export interface PixelMaps {
  size: number;
  /** RGBA sRGB. */
  albedo: Uint8Array;
  /** RGBA lineal; roughnessMap lee el canal G. */
  roughness: Uint8Array;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const byte = (v: number) => Math.round(clamp01(v) * 255);

export const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

const channels = (hex: number): [number, number, number] => [
  (hex >> 16) & 255,
  (hex >> 8) & 255,
  hex & 255,
];

function assertPow2(size: number) {
  if (!isPowerOfTwo(size)) throw new Error(`texture size must be a power of two, got ${size}`);
}

/** Albedo por mezcla de dos tonos + oscurecimiento por fBm fino; rugosidad alta con variación. */
function surfaceMaps(
  size: number,
  seed: number,
  light: number,
  dark: number,
  strata: number,
): PixelMaps {
  assertPow2(size);
  const coarse = noiseField(size, { baseCells: 4, octaves: 4, seed });
  const fine = noiseField(size, { baseCells: 32, octaves: 2, seed: seed + 977 });
  const [lr, lg, lb] = channels(light);
  const [dr, dg, db] = channels(dark);
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // strata: bandas horizontales periódicas (tileables) para los bancos de roca.
      const band = strata > 0 ? 0.5 + 0.5 * Math.sin((y / size) * Math.PI * 2 * strata + coarse[i] * 3) : 0;
      const m = clamp01(coarse[i] * 0.75 + fine[i] * 0.25 + band * 0.18 * strata);
      const k = i * 4;
      albedo[k] = Math.round(dr + (lr - dr) * m);
      albedo[k + 1] = Math.round(dg + (lg - dg) * m);
      albedo[k + 2] = Math.round(db + (lb - db) * m);
      albedo[k + 3] = 255;
      const r = byte(0.78 + 0.22 * fine[i]);
      roughness[k] = r;
      roughness[k + 1] = r;
      roughness[k + 2] = r;
      roughness[k + 3] = 255;
    }
  }
  return { size, albedo, roughness };
}

/** Tierra de camino de acarreo. */
export function dirtMaps(size = 256, seed = 11): PixelMaps {
  return surfaceMaps(size, seed, 0x9a7a52, 0x4e3a26, 0);
}

/** Roca de banco con estratos. */
export function rockMaps(size = 256, seed = 23): PixelMaps {
  return surfaceMaps(size, seed, 0xa4917c, 0x4a3f35, 3);
}

/** Altura (0..1) del dibujo de banda de rodadura: tacos en V que se repiten una vez por tile en u. */
export function treadHeight(u: number, v: number): number {
  const phase = u + Math.abs(v - 0.5) * 0.9;
  const f = phase - Math.floor(phase);
  if (f >= 0.62) return 0;
  const edge = Math.min(f, 0.62 - f) / 0.04;
  return 0.35 + 0.65 * clamp01(edge);
}

/** Bump gris del dibujo de la banda de rodadura (RGBA, bumpMap lee R). */
export function treadBumpPixels(size = 128): Uint8Array {
  assertPow2(size);
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = byte(treadHeight(x / size, y / size));
      const k = (y * size + x) * 4;
      out[k] = h;
      out[k + 1] = h;
      out[k + 2] = h;
      out[k + 3] = 255;
    }
  }
  return out;
}

function dataTexture(
  pixels: Uint8Array,
  size: number,
  colorSpace: THREE.ColorSpace,
  repeat: [number, number],
): THREE.DataTexture {
  const tex = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export interface SurfaceTextures {
  map: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
}

/** Albedo en sRGB, rugosidad en espacio lineal (dato, no color). */
export function surfaceTextures(maps: PixelMaps, repeat: [number, number]): SurfaceTextures {
  return {
    map: dataTexture(maps.albedo, maps.size, THREE.SRGBColorSpace, repeat),
    roughnessMap: dataTexture(maps.roughness, maps.size, THREE.NoColorSpace, repeat),
  };
}

export function treadBumpTexture(size = 128, repeat: [number, number] = [18, 1]): THREE.DataTexture {
  return dataTexture(treadBumpPixels(size), size, THREE.NoColorSpace, repeat);
}
