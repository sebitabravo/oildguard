// Ruido determinista y tileable para texturas procedurales.
// Sin Math.random: el mismo seed siempre produce los mismos píxeles, así los
// tests y las capturas son reproducibles.

/** PRNG mulberry32: secuencia reproducible en [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash entero 2D a [0, 1); sin estado, sirve para el lattice del value noise. */
export function hash2(ix: number, iy: number, seed: number): number {
  let h =
    Math.imul(ix | 0, 0x27d4eb2d) ^
    Math.imul(iy | 0, 0x165667b1) ^
    Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const wrap = (i: number, period: number) => ((i % period) + period) % period;

/** Value noise cuyo lattice se repite cada `period` celdas (tileable). */
export function valueNoiseTile(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = fade(x - x0);
  const fy = fade(y - y0);
  const xa = wrap(x0, period);
  const xb = wrap(x0 + 1, period);
  const ya = wrap(y0, period);
  const yb = wrap(y0 + 1, period);
  const v00 = hash2(xa, ya, seed);
  const v10 = hash2(xb, ya, seed);
  const v01 = hash2(xa, yb, seed);
  const v11 = hash2(xb, yb, seed);
  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

export interface FbmOptions {
  /** Celdas del lattice en la octava base (se duplican por octava). */
  baseCells: number;
  octaves: number;
  /** Atenuación de amplitud por octava. */
  gain?: number;
  seed: number;
}

/** fBm tileable en u, v ∈ [0, 1); normalizado a [0, 1]. */
export function fbmTile(u: number, v: number, opts: FbmOptions): number {
  const gain = opts.gain ?? 0.5;
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let cells = opts.baseCells;
  for (let o = 0; o < opts.octaves; o++) {
    sum += amp * valueNoiseTile(u * cells, v * cells, cells, opts.seed + o * 101);
    norm += amp;
    amp *= gain;
    cells *= 2;
  }
  return sum / norm;
}

/** Campo size×size de fBm en [0, 1], fila mayor (y crece hacia abajo). */
export function noiseField(size: number, opts: FbmOptions): Float32Array {
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      out[y * size + x] = fbmTile(x / size, y / size, opts);
    }
  }
  return out;
}
