import * as THREE from "three";

// Placa con texto generada píxel a píxel (sin canvas): fuente 5x7 mínima con
// los glifos de "930E", testeable sin DOM ni WebGL.

const GLYPHS: Record<string, number[]> = {
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  "3": [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
};

export const PLATE_W = 128;
export const PLATE_H = 32;

/** RGBA: texto claro sobre fondo oscuro con borde fino; `scale` px por celda de la fuente. */
export function platePixels(text: string, scale = 4): Uint8Array {
  const px = new Uint8Array(PLATE_W * PLATE_H * 4);
  const set = (x: number, y: number, v: number) => {
    if (x < 0 || y < 0 || x >= PLATE_W || y >= PLATE_H) return;
    // DataTexture: la fila 0 es la inferior; se invierte para que el texto quede al derecho.
    const k = ((PLATE_H - 1 - y) * PLATE_W + x) * 4;
    px[k] = v;
    px[k + 1] = v;
    px[k + 2] = v;
    px[k + 3] = 255;
  };
  for (let y = 0; y < PLATE_H; y++) {
    for (let x = 0; x < PLATE_W; x++) {
      const border = x < 2 || y < 2 || x >= PLATE_W - 2 || y >= PLATE_H - 2;
      set(x, y, border ? 200 : 18);
    }
  }
  const advance = 6 * scale;
  const total = text.length * advance - scale;
  const x0 = Math.floor((PLATE_W - total) / 2);
  const y0 = Math.floor((PLATE_H - 7 * scale) / 2);
  [...text].forEach((ch, i) => {
    const rows = GLYPHS[ch];
    if (!rows) return;
    rows.forEach((bits, r) => {
      for (let c = 0; c < 5; c++) {
        if (!(bits & (1 << (4 - c)))) continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) set(x0 + i * advance + c * scale + dx, y0 + r * scale + dy, 245);
        }
      }
    });
  });
  return px;
}

export function plateTexture(text: string): THREE.DataTexture {
  const tex = new THREE.DataTexture(platePixels(text), PLATE_W, PLATE_H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}
