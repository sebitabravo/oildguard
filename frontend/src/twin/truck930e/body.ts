import * as THREE from "three";
import { S } from "./spec";
import { Bin, beam, canon, cyl, lerpPoly, rbox, tube, xf } from "./geom";

// Tolva volcable con visera (canopy): casco por secciones (loft) con piso en
// pendiente, flancos abiertos y rodillo de borde, nervios, visera arqueada y
// montón de mineral con morph target para la carga. Todo se construye en el
// marco del camión y se traslada a la bisagra, que es el origen de la tolva.

type P = [number, number]; // [z, y]

const UNDERSIDE: ReadonlyArray<readonly [number, number]> = [
  [-4.8, 4.0],
  [-4.6, 3.7],
  [-4.3, 3.46],
  [-3.6, 3.33],
  [-2.55, 3.3],
  [0, 3.42],
  [2.5, 3.65],
  [4.6, 3.95],
];

const RIM: ReadonlyArray<readonly [number, number]> = [
  [-4.8, 5.0],
  [-4.6, 5.7],
  [-4.2, 6.4],
  [-3.6, 6.85],
  [-2.8, 7.06],
  [4.6, 7.06],
];

const STATIONS = [-4.8, -4.75, -4.6, -4.4, -4.1, -3.7, -3.2, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.2, 4.6];
const ARC = 5;

const FRONT_X = 4.6;

/** Contorno en U (de borde izquierdo a borde derecho) con esquina de piso redondeada. */
function uShape(wf: number, floorY: number, rimY: number, rc: number): P[] {
  const s = S.body.wallSlope;
  const n = Math.hypot(s, 1);
  const wx = s / n;
  const wy = 1 / n;
  const a = Math.acos(-wx);
  const t = rc / Math.tan(a / 2);
  const t1: P = [wf - t, floorY];
  const cv: P = [wf, floorY];
  const t2: P = [wf + t * wx, floorY + t * wy];
  const arc: P[] = [];
  for (let u = 0; u <= ARC; u++) {
    const f = u / ARC;
    const q = 1 - f;
    arc.push([q * q * t1[0] + 2 * q * f * cv[0] + f * f * t2[0], q * q * t1[1] + 2 * q * f * cv[1] + f * f * t2[1]]);
  }
  const rimZ = wf + s * (rimY - floorY);
  const left = arc
    .slice()
    .reverse()
    .map(([z, y]) => [-z, y] as P);
  return [[-rimZ, rimY], ...left, ...arc, [rimZ, rimY]];
}

export interface Section {
  x: number;
  outer: P[];
  inner: P[];
  floorInner: number;
  wfInner: number;
  floorOuter: number;
}

export function section(x: number): Section {
  const floorY = lerpPoly(UNDERSIDE, x);
  const rimY = lerpPoly(RIM, x);
  const wf = S.body.floorHalfWidth;
  const th = S.body.floorThickness;
  const wfInner = wf + S.body.wallSlope * th - S.body.wallThickness;
  return {
    x,
    outer: uShape(wf, floorY, rimY, 0.55),
    inner: uShape(wfInner, floorY + th, rimY, 0.35),
    floorInner: floorY + th,
    wfInner,
    floorOuter: floorY,
  };
}

const v3 = (x: number, p: P) => new THREE.Vector3(x, p[1], p[0]);

/** Superficie indexada (normales suaves) entre estaciones consecutivas. */
function loftSurface(rings: THREE.Vector3[][], flip: boolean): THREE.BufferGeometry {
  const m = rings[0].length;
  const pos: number[] = [];
  for (const ring of rings) for (const p of ring) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let j = 0; j < m - 1; j++) {
      const A = k * m + j;
      const B = k * m + j + 1;
      const C = (k + 1) * m + j + 1;
      const D = (k + 1) * m + j;
      if (!flip) idx.push(A, D, C, A, C, B);
      else idx.push(A, B, C, A, C, D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Franja plana entre dos polilíneas paralelas (rodillo de borde, canto de cola). */
function ribbon(a: THREE.Vector3[], b: THREE.Vector3[], flip: boolean): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const p of a) pos.push(p.x, p.y, p.z);
  for (const p of b) pos.push(p.x, p.y, p.z);
  const n = a.length;
  const idx: number[] = [];
  for (let j = 0; j < n - 1; j++) {
    const A = j;
    const B = j + 1;
    const C = n + j + 1;
    const D = n + j;
    if (!flip) idx.push(A, B, C, A, C, D);
    else idx.push(A, D, C, A, C, B);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Pared frontal interior: abanico desde el centroide, normal hacia -X. */
function frontWall(sec: Section): THREE.BufferGeometry {
  const pts = sec.inner.map((p) => v3(sec.x, p));
  const c = new THREE.Vector3();
  for (const p of pts) c.add(p);
  c.multiplyScalar(1 / pts.length);
  const pos: number[] = [c.x, c.y, c.z];
  for (const p of pts) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  for (let j = 1; j < pts.length; j++) idx.push(0, j, j + 1);
  idx.push(0, pts.length, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Perfil frontal de la visera: losa arqueada con labios laterales hacia abajo. */
function canopyShape(): THREE.Shape {
  const W = S.body.canopyHalfWidth;
  const t = S.body.canopyThickness;
  const lip = 0.4;
  const arch = 0.1;
  const sh = new THREE.Shape();
  sh.moveTo(-W, -t / 2 - lip);
  sh.lineTo(-W, t / 2);
  const n = 28;
  for (let i = 1; i < n; i++) {
    const z = -W + (2 * W * i) / n;
    sh.lineTo(z, t / 2 + arch * (1 - (z / W) ** 2));
  }
  sh.lineTo(W, t / 2);
  sh.lineTo(W, -t / 2 - lip);
  sh.lineTo(W - 0.18, -t / 2 - lip);
  sh.lineTo(W - 0.18, -t / 2);
  sh.lineTo(-W + 0.18, -t / 2);
  sh.lineTo(-W + 0.18, -t / 2 - lip);
  sh.closePath();
  return sh;
}

export interface BodyParts {
  yellow: THREE.BufferGeometry;
  liner: THREE.BufferGeometry;
  dark: THREE.BufferGeometry;
  machined: THREE.BufferGeometry;
  plate: THREE.BufferGeometry;
  heap: THREE.BufferGeometry;
}

const LUMP = 0.2;

function heapGeometry(): THREE.BufferGeometry {
  const nx = 40;
  const ns = 24;
  const x0 = -4.35;
  const x1 = 4.4;
  const xc = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  const flat: number[] = [];
  const full: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx;
    const sec = section(Math.min(x, FRONT_X - 0.05));
    const u = (x - xc) / half;
    const fx = Math.max(0, 1 - Math.abs(u) ** 2.6);
    const rim = lerpPoly(RIM, x);
    const hmax = rim - sec.floorInner + 1.0;
    for (let j = 0; j <= ns; j++) {
      const s = -1 + (2 * j) / ns;
      const wob = LUMP * (Math.sin(3.1 * x + 4 * s) + Math.sin(5.7 * x - 3 * s + 1.3) + 0.6 * Math.sin(11 * x + 9 * s));
      const h = Math.max(0.05, hmax * fx * (1 - 0.5 * Math.abs(s) ** 2.2) + wob * fx);
      const y = sec.floorInner + h;
      const zFull = s * (sec.wfInner + S.body.wallSlope * (y - sec.floorInner) - 0.04);
      const zFlat = s * (sec.wfInner - 0.04);
      full.push(x, y, zFull);
      flat.push(x, sec.floorInner + 0.02, zFlat);
      uv.push(x / 4, zFull / 4);
    }
  }
  const idx: number[] = [];
  const row = ns + 1;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ns; j++) {
      const A = i * row + j;
      const B = (i + 1) * row + j;
      const C = (i + 1) * row + j + 1;
      const D = i * row + j + 1;
      idx.push(A, D, C, A, C, B);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(flat, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const gf = new THREE.BufferGeometry();
  gf.setAttribute("position", new THREE.Float32BufferAttribute(full, 3));
  gf.setIndex(idx);
  gf.computeVertexNormals();
  g.morphAttributes.position = [gf.attributes.position as THREE.BufferAttribute];
  g.morphAttributes.normal = [gf.attributes.normal as THREE.BufferAttribute];
  return g;
}

export function buildBodyParts(): BodyParts {
  const rings = STATIONS.map((x) => section(x));
  const outerRings = rings.map((r) => r.outer.map((p) => v3(r.x, p)));
  const innerRings = rings.map((r) => r.inner.map((p) => v3(r.x, p)));

  const yellow = new Bin();
  const liner = new Bin();
  const dark = new Bin();
  const machined = new Bin();

  yellow.add("y", loftSurface(outerRings, false));
  liner.add("l", loftSurface(innerRings, true));

  // Cantos: rodillos de borde (cara superior), canto de cola y canto frontal.
  const last = rings.length - 1;
  const rimL = (ring: THREE.Vector3[]) => [ring[0]];
  const rimR = (ring: THREE.Vector3[]) => [ring[ring.length - 1]];
  const lineAlong = (pick: (r: THREE.Vector3[]) => THREE.Vector3[], rs: THREE.Vector3[][]) => rs.map((r) => pick(r)[0]);
  yellow.add("y", ribbon(lineAlong(rimL, outerRings), lineAlong(rimL, innerRings), true));
  yellow.add("y", ribbon(lineAlong(rimR, outerRings), lineAlong(rimR, innerRings), false));
  yellow.add("y", ribbon(outerRings[0], innerRings[0], false));
  yellow.add("y", ribbon(outerRings[last], innerRings[last], true));
  liner.add("l", frontWall(rings[last]));

  // Rodillo redondeado del borde superior.
  for (const pick of [rimL, rimR]) {
    const pts = lineAlong(pick, outerRings);
    for (let i = 0; i < pts.length - 1; i++) yellow.add("y", tube(pts[i], pts[i + 1], 0.1, 8));
  }

  // Nervios verticales de los flancos (inclinados con la pared).
  const s = S.body.wallSlope;
  const ribXs = [-3.5, -2.7, -1.9, -1.1, -0.3, 0.5, 1.3, 2.1, 2.9, 3.7];
  for (const x of ribXs) {
    const sec = section(x);
    const y0 = sec.floorOuter + 0.7;
    const y1 = lerpPoly(RIM, x) - 0.2;
    for (const side of [-1, 1]) {
      const zAt = (y: number) => side * (S.body.floorHalfWidth + s * (y - sec.floorOuter) + 0.07);
      const normal = new THREE.Vector3(0, -s, side).normalize();
      yellow.add("y", beam(new THREE.Vector3(x, y0, zAt(y0)), new THREE.Vector3(x, y1, zAt(y1)), 0.16, 0.12, normal));
    }
  }

  // Largueros bajo el piso.
  for (const x of [-3.9, -2.6, -1.3, 0, 1.3, 2.6, 3.9]) {
    const y = lerpPoly(UNDERSIDE, x) - 0.12;
    dark.add("d", rbox(0.34, 0.24, S.body.floorHalfWidth * 2 - 0.5, 0.04), xf(x, y, 0));
  }

  // Ménsulas del cilindro de levante y orejas de bisagra.
  for (const side of [-1, 1]) {
    dark.add("d", rbox(0.5, 0.34, 0.42, 0.04), xf(S.hoist.attachX, S.hoist.attachY + 0.1, side * S.hoist.zOffset));
    machined.add("m", cyl(0.2, 0.7, "z", 14), xf(S.body.hingeX, S.body.hingeY, side * 1.55));
    yellow.add("y", rbox(0.7, 0.55, 0.3, 0.05), xf(S.body.hingeX - 0.1, S.body.hingeY + 0.25, side * 1.85));
  }

  // Visera: losa arqueada extruida en X, inclinada hacia la punta.
  const t = S.body.canopyThickness;
  const sx = FRONT_X - 0.25;
  const slope = (S.body.canopyTipHeight - S.body.loadingHeight) / (S.body.canopyTipX - S.body.canopyKneeX);
  const alpha = Math.atan(slope);
  const yKnee = S.body.loadingHeight - t / 2 - 0.1;
  const yAt = (x: number) => yKnee + (x - S.body.canopyKneeX) * slope;
  const lc = (S.body.canopyTipX - sx) / Math.cos(alpha);
  const ext = new THREE.ExtrudeGeometry(canopyShape(), {
    depth: lc,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 1,
    curveSegments: 1,
  });
  ext.rotateY(Math.PI / 2);
  const toCanopy = xf(sx, yAt(sx), 0, 0, 0, alpha);
  yellow.add("y", ext, toCanopy);

  // Fascia frontal, vigas bajo la visera y placa "930E".
  const tipX = S.body.canopyTipX;
  yellow.add("y", rbox(0.16, 0.8, 7.6, 0.05), xf(tipX - 0.05, yAt(tipX) - 0.18, 0, 0, 0, alpha));
  for (const x of [5.3, 6.4, 7.5]) {
    dark.add("d", rbox(0.16, 0.26, 7.6, 0.03), xf(x, yAt(x) - t / 2 - 0.18, 0, 0, 0, alpha));
  }
  const plate = new THREE.PlaneGeometry(2.3, 0.58);
  plate.rotateY(Math.PI / 2);
  plate.applyMatrix4(xf(tipX + 0.11, yAt(tipX) - 0.2, 0, 0, 0, alpha));

  const merged = (b: Bin, k: string) => {
    const g = b.merged().get(k)!;
    g.translate(-S.body.hingeX, -S.body.hingeY, 0);
    return g;
  };
  const heap = heapGeometry();
  heap.translate(-S.body.hingeX, -S.body.hingeY, 0);
  for (const m of heap.morphAttributes.position as THREE.BufferAttribute[]) {
    for (let i = 0; i < m.count; i++) m.setXYZ(i, m.getX(i) - S.body.hingeX, m.getY(i) - S.body.hingeY, m.getZ(i));
  }
  plate.translate(-S.body.hingeX, -S.body.hingeY, 0);

  return {
    yellow: merged(yellow, "y"),
    liner: merged(liner, "l"),
    dark: merged(dark, "d"),
    machined: merged(machined, "m"),
    plate: canon(plate),
    heap,
  };
}
