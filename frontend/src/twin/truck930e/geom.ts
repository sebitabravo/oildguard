import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Utilidades de geometría para el camión: normalización de atributos para poder
// fusionar, colocación por matriz y un "bin" que agrupa piezas por material.

const KEEP = new Set(["position", "normal", "uv"]);

/** Copia no indexada con solo position/normal/uv: condición para mergeGeometries. */
export function canon(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(out.attributes)) {
    if (!KEEP.has(name)) out.deleteAttribute(name);
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.uv) {
    out.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  }
  out.clearGroups();
  return out;
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _one = new THREE.Vector3(1, 1, 1);

/** Matriz de colocación: posición + rotación Euler XYZ. */
export function xf(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Matrix4 {
  _q.setFromEuler(_e.set(rx, ry, rz));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, _one);
}

/** Matriz con el eje X local a lo largo de `dir` y el Y local lo más cercano a `up`. */
export function alongBasis(origin: THREE.Vector3, dir: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)): THREE.Matrix4 {
  const x = dir.clone().normalize();
  let u = up.clone();
  if (Math.abs(x.dot(u)) > 0.98) u = new THREE.Vector3(1, 0, 0);
  const z = new THREE.Vector3().crossVectors(x, u).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(origin);
}

/** Viga rectangular entre dos puntos (sección `h` en el eje "up" y `w` transversal). */
export function beam(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, up?: THREE.Vector3): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(len, h, w);
  g.applyMatrix4(alongBasis(a.clone().add(b).multiplyScalar(0.5), b.clone().sub(a), up));
  return g;
}

/** Cilindro entre dos puntos. */
export function tube(a: THREE.Vector3, b: THREE.Vector3, r: number, segs = 10): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, segs, 1);
  g.rotateZ(-Math.PI / 2);
  g.applyMatrix4(alongBasis(a.clone().add(b).multiplyScalar(0.5), b.clone().sub(a)));
  return g;
}

/** Caja con aristas biseladas (para que la pintura capte luz). */
export function rbox(w: number, h: number, d: number, r = 0.04): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, 1, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
}

/** Cilindro con eje a lo largo de X, Y o Z, centrado en el origen. */
export function cyl(r: number, len: number, axis: "x" | "y" | "z", segs = 16, rTop = r): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, r, len, segs, 1);
  if (axis === "x") g.rotateZ(-Math.PI / 2);
  if (axis === "z") g.rotateX(Math.PI / 2);
  return g;
}

/** Interpolación lineal por tramos sobre puntos [x, y] ordenados por x. */
export function lerpPoly(pts: ReadonlyArray<readonly [number, number]>, x: number): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

/** Acumula geometrías por clave de material y las fusiona en una malla por clave. */
export class Bin {
  private readonly parts = new Map<string, THREE.BufferGeometry[]>();

  add(key: string, g: THREE.BufferGeometry, m?: THREE.Matrix4): this {
    const c = canon(g);
    if (m) c.applyMatrix4(m);
    const list = this.parts.get(key);
    if (list) list.push(c);
    else this.parts.set(key, [c]);
    return this;
  }

  /** Una geometría fusionada por clave de material. */
  merged(): Map<string, THREE.BufferGeometry> {
    const out = new Map<string, THREE.BufferGeometry>();
    for (const [key, list] of this.parts) {
      const g = mergeGeometries(list, false);
      if (!g) throw new Error(`cannot merge geometries for "${key}"`);
      for (const p of list) p.dispose();
      out.set(key, g);
    }
    return out;
  }
}

/** Espejo en Z de una geometría (invierte el orden de caras para conservar normales). */
export function mirrorZ(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const c = canon(g);
  c.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -1));
  const pos = c.attributes.position as THREE.BufferAttribute;
  const nor = c.attributes.normal as THREE.BufferAttribute;
  const uv = c.attributes.uv as THREE.BufferAttribute;
  // El escalado negativo invierte el bobinado (applyMatrix4 ya corrige las normales): se intercambian los vértices 1 y 2.
  for (let i = 0; i < pos.count; i += 3) {
    for (const a of [pos, nor]) {
      const x = a.getX(i + 1);
      const y = a.getY(i + 1);
      const z = a.getZ(i + 1);
      a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2));
      a.setXYZ(i + 2, x, y, z);
    }
    const u = uv.getX(i + 1);
    const v = uv.getY(i + 1);
    uv.setXY(i + 1, uv.getX(i + 2), uv.getY(i + 2));
    uv.setXY(i + 2, u, v);
  }
  return c;
}
