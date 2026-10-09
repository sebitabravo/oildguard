import { fbmTile } from "../render/noise";
import { P, benchRunM, pitDepthM } from "./pitSpec";

// Terreno del foso en funciones puras (sin three.js): `heightAt(x, z)` es la única
// fuente de verdad para la malla, el trazado de la ruta y las pruebas.
//
// Planta: elipse de borde con semiejes A y B. La "profundidad en planta" d de un
// punto es cuánto hay que achicar los semiejes para que la elipse pase por él; los
// bancos son una escalera en función de d. La rampa es una espiral cortada en la
// pared a pendiente de diseño; el terreno se recorta a un cono de corte y relleno
// alrededor del camino, así el camino queda plano y lo demás lo rodea.

export type Pt = [number, number];

export interface PitPlan {
  /** Semieje del borde en X (m). */
  A: number;
  /** Semieje del borde en Z (m). */
  B: number;
}

export const PLAN: PitPlan = { A: 190, B: 125 };

/** Extensión de la malla de terreno en planta. */
export const DOMAIN = { minX: -340, maxX: 300, minZ: -230, maxZ: 340 } as const;

const RAD = Math.PI / 180;
const NOISE_PERIOD = 1024;

/** Profundidad en planta d: la elipse de semiejes (A-d, B-d) pasa por el punto. Negativa fuera del borde. */
export function insetAt(x: number, z: number, plan: PitPlan = PLAN): number {
  const g = (d: number) => (x / (plan.A - d)) ** 2 + (z / (plan.B - d)) ** 2;
  let lo = -200;
  let hi = plan.B - 1;
  if (g(hi) < 1) return hi;
  for (let i = 0; i < 24; i++) {
    const mid = 0.5 * (lo + hi);
    if (g(mid) < 1) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

const smooth01 = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Escalera de bancos: cara inclinada y banco de captura plano. d en metros de planta. */
export function stairHeight(d: number): number {
  const H = P.bench.height;
  const run = benchRunM();
  const face = H / Math.tan(P.bench.faceAngle * RAD);
  const total = P.bench.count * run;
  if (d <= 0) return 0;
  if (d >= total) return -P.bench.count * H;
  const i = Math.floor(d / run);
  const r = d - i * run;
  const f = Math.min(1, r / face);
  // Mezcla lineal y smoothstep: redondea la cresta y el pie sin aplanar la cara.
  const shaped = f + (smooth01(f) - f) * 0.45;
  return -(i + shaped) * H;
}

export interface RoadSample {
  x: number;
  z: number;
  /** Altura de la superficie de rodado. */
  h: number;
  /** Semiancho del camino recortado (superficie más hombro). */
  hw: number;
}

export interface FlatZone {
  /** Centro y semiejes de un rectángulo orientado. */
  cx: number;
  cz: number;
  hu: number;
  hv: number;
  /** Guiñada del eje u (rad, atan2(dz, dx)). */
  yaw: number;
  h: number;
  /** Distancia de transición fuera del rectángulo (m). */
  blend: number;
}

export interface PocketCut {
  cx: number;
  cz: number;
  hu: number;
  hv: number;
  yaw: number;
  depth: number;
  blend: number;
}

export interface PileBump {
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface RampSample {
  x: number;
  z: number;
  /** Altura del eje del camino. */
  h: number;
  /** Distancia recorrida en planta desde la cabecera. */
  dist: number;
  /** Pendiente local dh/ds (negativa al descender). */
  grade: number;
}

export interface RampParams {
  /** Ángulo paramétrico de la elipse en la cabecera (rad). */
  phiTop: number;
  /** Sentido de giro: -1 antihorario en pantalla (z hacia abajo), +1 horario. */
  dir: 1 | -1;
  /** Desfase d de la cabecera respecto de la pared media (m; negativo = fuera del borde). */
  cTop: number;
  /** Idem al pie. */
  cBottom: number;
  /** Longitud de las transiciones verticales (m). */
  easeM: number;
}

export const RAMP: RampParams = { phiTop: 0, dir: -1, cTop: -14, cBottom: 4, easeM: 40 };

/** Eje del camino de dos carriles bajando desde la cabecera, con paso de ~1 m. */
export function marchRamp(plan: PitPlan = PLAN, rp: RampParams = RAMP): RampSample[] {
  const depth = pitDepthM();
  const G = P.ramp.grade;
  const k = benchRunM() / P.bench.height;
  const out: RampSample[] = [];
  let phi = rp.phiTop;
  let h = 0;
  let dist = 0;
  for (let guard = 0; guard < 6000; guard++) {
    const f = Math.min(1, -h / depth);
    const c = rp.cTop + (rp.cBottom - rp.cTop) * smooth01(f);
    const d = k * -h + c;
    const x = (plan.A - d) * Math.cos(phi);
    const z = (plan.B - d) * Math.sin(phi);
    const rem = depth + h;
    const easeIn = Math.min(1, dist / (rp.easeM * 0.5) + 0.02);
    const easeOut = Math.min(1, rem / (G * rp.easeM * 0.5) + 0.12);
    const g = G * Math.min(easeIn, easeOut);
    out.push({ x, z, h, dist, grade: -g });
    if (rem <= 0.02) break;
    const speed = Math.hypot((plan.A - d) * Math.sin(phi), (plan.B - d) * Math.cos(phi));
    phi += (rp.dir * 1) / Math.max(20, speed);
    const nx = (plan.A - d) * Math.cos(phi);
    const nz = (plan.B - d) * Math.sin(phi);
    const ds = Math.hypot(nx - x, nz - z);
    dist += ds;
    h -= g * ds;
  }
  return out;
}

export interface TerrainDef {
  plan: PitPlan;
  /** Muestras de todo camino recortado (rampa y sus extensiones). */
  roads: RoadSample[];
  flats: FlatZone[];
  piles: PileBump[];
  /** Huecos rectangulares (bolsillo de descarga). */
  pockets?: PocketCut[];
  seed: number;
}

export interface TerrainSample {
  h: number;
  /** Distancia al borde del camino recortado (m); negativa sobre el camino. */
  edge: number;
  /** Altura del eje del camino más cercano. */
  roadH: number;
  /** Peso 0..1 de las explanadas planas. */
  flat: number;
  /** Peso 0..1 de la pila de mineral. */
  pile: number;
  /** Profundidad en planta. */
  d: number;
}

export interface Terrain {
  def: TerrainDef;
  heightAt(x: number, z: number): number;
  /** Altura y máscaras en una sola pasada (para colorear la malla). */
  sample(x: number, z: number, out?: TerrainSample): TerrainSample;
}

const noise2 = (x: number, z: number, cells: number, octaves: number, seed: number) =>
  fbmTile(((x + NOISE_PERIOD / 2) / NOISE_PERIOD) % 1, ((z + NOISE_PERIOD / 2) / NOISE_PERIOD) % 1, { baseCells: cells, octaves, seed });

export function createTerrain(def: TerrainDef): Terrain {
  const { plan, roads, flats, piles, seed } = def;
  const pockets = def.pockets ?? [];
  const total = P.bench.count * benchRunM();
  const cutSlope = P.ramp.cutSlope;
  const fillSlope = P.ramp.fillSlope;
  const scratch: TerrainSample = { h: 0, edge: 0, roadH: 0, flat: 0, pile: 0, d: 0 };

  const sample = (x: number, z: number, out: TerrainSample = scratch): TerrainSample => {
    let d = insetAt(x, z, plan);
    // Borde irregular: ondulación de baja frecuencia más rugosidad fina.
    const wob = (noise2(x, z, 8, 3, seed) - 0.5) * 7 + (noise2(x, z, 64, 2, seed + 5) - 0.5) * 1.2;
    d += wob * smooth01((d + 30) / 30) * (d > total ? 0 : 1);

    let best = Infinity;
    let bestH = 0;
    let bestHw = 0;
    for (const r of roads) {
      const dx = x - r.x;
      const dz = z - r.z;
      const l2 = dx * dx + dz * dz;
      if (l2 < best) {
        best = l2;
        bestH = r.h;
        bestHw = r.hw;
      }
    }
    const edge = roads.length ? Math.sqrt(best) - bestHw : Infinity;

    let T = stairHeight(d);
    if (d < 0) {
      // Terreno natural fuera del borde: lomas suaves que mueren hacia el límite de la malla.
      const margin = Math.min(x - DOMAIN.minX, DOMAIN.maxX - x, z - DOMAIN.minZ, DOMAIN.maxZ - z);
      const hills = (noise2(x, z, 6, 3, seed + 9) - 0.5) * 5.5;
      T = hills * smooth01((-d - 6) / 40) * smooth01(margin / 60);
    }

    let pileW = 0;
    for (const p of piles) {
      const r = Math.hypot(x - p.x, z - p.z) / p.radius;
      if (r < 1) {
        const w = 1 - smooth01(r);
        T += p.height * w * (0.85 + 0.15 * Math.cos(r * 9));
        pileW = Math.max(pileW, w);
      }
    }

    let H = T;
    if (roads.length) {
      if (edge <= 0) H = bestH;
      else {
        const cutH = bestH + edge * cutSlope;
        const fillH = bestH - edge * fillSlope;
        H = Math.min(cutH, Math.max(fillH, T));
      }
    }

    let flatW = 0;
    for (const f of flats) {
      const c = Math.cos(f.yaw);
      const s = Math.sin(f.yaw);
      const dx = x - f.cx;
      const dz = z - f.cz;
      const u = Math.abs(dx * c + dz * s) - f.hu;
      const v = Math.abs(-dx * s + dz * c) - f.hv;
      const w = 1 - smooth01(Math.hypot(Math.max(0, u), Math.max(0, v)) / f.blend);
      if (w > 0) {
        H = H + (f.h - H) * w;
        flatW = Math.max(flatW, w);
      }
    }
    for (const k of pockets) {
      const c = Math.cos(k.yaw);
      const sn = Math.sin(k.yaw);
      const dx = x - k.cx;
      const dz = z - k.cz;
      const u = Math.abs(dx * c + dz * sn) - k.hu;
      const v = Math.abs(-dx * sn + dz * c) - k.hv;
      const w = 1 - smooth01(Math.hypot(Math.max(0, u), Math.max(0, v)) / k.blend);
      if (w > 0) H -= k.depth * w;
    }
    out.h = H;
    out.edge = edge;
    out.roadH = bestH;
    out.flat = flatW;
    out.pile = pileW;
    out.d = d;
    return out;
  };

  return { def, sample, heightAt: (x, z) => sample(x, z, scratch).h };
}

/** Polilínea desplazada `off` metros a la derecha del sentido de marcha (z hacia abajo en planta). */
export function offsetPolyline(pts: Pt[], off: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0];
    let tz = b[1] - a[1];
    const n = Math.hypot(tx, tz) || 1;
    tx /= n;
    tz /= n;
    // Derecha del rumbo (tx, tz) con z hacia abajo: (-tz, tx).
    out.push([pts[i][0] - tz * off, pts[i][1] + tx * off]);
  }
  return out;
}
