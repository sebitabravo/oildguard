import * as THREE from "three";
import type { MaterialLibrary } from "../render/materials";
import { Bin, beam, cyl, rbox, tube, xf } from "../truck930e/geom";

// Pala de cable eléctrica clase P&H 4100XPC, de menor detalle que el camión pero con
// silueta y escala correctas: orugas, casa giratoria con contrapeso y cabina, torre
// en A, pluma con tirantes, mango de empuje y cucharón con dientes. La animación es
// un ciclo excavar -> girar -> volcar -> volver (una pasada por golpe de pala).
//
// Marco local: origen en el suelo bajo el eje de giro, +X hacia la pluma con giro 0.
// Cotas: pluma de ~24 m de alcance (twin-reference §3, 4100XPC: radio de corte 23.9 m).

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Pose del mango y del cucharón en un instante del ciclo [0, 1). */
export interface ShovelPose {
  /** 0 = mirando la pila, 1 = mirando el camión. */
  swing: number;
  /** Cabeceo del mango (grados, negativo = hacia abajo). */
  pitchDeg: number;
  /** Extensión del mango 0..1. */
  crowd: number;
  /** Apertura de la tapa del cucharón (grados). */
  doorDeg: number;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

const KEYS: Array<[number, number, number]> = [
  // [t, pitchDeg, crowd]
  [0.0, -36, 0.7],
  [0.08, -54, 1.0],
  [0.2, -48, 0.88],
  [0.3, -20, 0.45],
  [0.55, -10, 0.12],
  [0.62, -6, 0.06],
  [0.72, -12, 0.12],
  [0.9, -26, 0.5],
  [1.0, -36, 0.7],
];

/** Pose analítica del ciclo; pura para poder probarla sin WebGL. */
export function shovelPose(t01: number): ShovelPose {
  const t = ((t01 % 1) + 1) % 1;
  let pitchDeg = KEYS[0][1];
  let crowd = KEYS[0][2];
  for (let i = 1; i < KEYS.length; i++) {
    if (t <= KEYS[i][0]) {
      const [t0, p0, c0] = KEYS[i - 1];
      const [t1, p1, c1] = KEYS[i];
      const f = smooth((t - t0) / (t1 - t0));
      pitchDeg = p0 + (p1 - p0) * f;
      crowd = c0 + (c1 - c0) * f;
      break;
    }
  }
  const toTruck = smooth((t - 0.3) / 0.25);
  const back = smooth((t - 0.72) / 0.24);
  const swing = t < 0.72 ? toTruck : 1 - back;
  const doorDeg = 75 * smooth((t - 0.58) / 0.05) * (1 - smooth((t - 0.68) / 0.05));
  return { swing, pitchDeg, crowd, doorDeg };
}

export interface Shovel {
  group: THREE.Group;
  /** Coloca la pala en el instante `t01` del ciclo; `yawPile` y `yawTruck` son guiñadas absolutas (rad, three.js). */
  setCycle(t01: number, yawPile: number, yawTruck: number): void;
  /** Posición del cucharón en el mundo (para el polvo y las cámaras). */
  dipperWorld(out: THREE.Vector3): THREE.Vector3;
  dispose(): void;
}

export function buildShovel(materials: MaterialLibrary): Shovel {
  const ownGeo: THREE.BufferGeometry[] = [];
  const ownMat: THREE.Material[] = [];
  const own = <T extends THREE.Material>(m: T): T => {
    ownMat.push(m);
    return m;
  };
  const mat = {
    yellow: materials.get("komatsuYellow"),
    dark: materials.get("paintedSteelDark"),
    machined: materials.get("machinedSteel"),
    glass: materials.get("glassTinted"),
    cast: materials.get("castIron"),
    boom: own(new THREE.MeshStandardMaterial({ color: 0xc98a1a, metalness: 0.45, roughness: 0.55 })),
    rope: own(new THREE.MeshStandardMaterial({ color: 0x2b2b2d, metalness: 0.6, roughness: 0.5 })),
    bucket: own(new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.6, roughness: 0.62 })),
    teeth: own(new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 0.8, roughness: 0.45 })),
  };

  const root = new THREE.Group();
  root.name = "Shovel4100XPC";

  const mesh = (bin: Bin, parent: THREE.Object3D, cast = true) => {
    for (const [key, geo] of bin.merged()) {
      ownGeo.push(geo);
      const m = new THREE.Mesh(geo, (mat as Record<string, THREE.Material>)[key]);
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
    }
  };

  // ---- Orugas y carro (no giran con la casa) ----
  const tracks = new THREE.Group();
  root.add(tracks);
  {
    const b = new Bin();
    for (const side of [-1, 1]) {
      const z = side * 5.2;
      b.add("dark", rbox(12.6, 2.6, 3.4, 0.3), xf(0, 1.5, z));
      for (const x of [-5.6, 5.6]) b.add("cast", cyl(1.55, 3.0, "z", 20), xf(x, 1.55, z));
      // Zapatas: tacos regulares a lo largo del borde superior e inferior.
      for (let k = 0; k < 14; k++) {
        const x = -6 + k * 0.92;
        b.add("machined", new THREE.BoxGeometry(0.5, 0.18, 3.5), xf(x, 2.9, z));
        b.add("machined", new THREE.BoxGeometry(0.5, 0.18, 3.5), xf(x, 0.1, z));
      }
    }
    b.add("dark", rbox(9, 2.4, 9.6, 0.3), xf(0, 2.5, 0));
    b.add("cast", cyl(4.6, 0.7, "y", 28), xf(0, 4.1, 0));
    mesh(b, tracks);
  }

  // ---- Casa giratoria ----
  const upper = new THREE.Group();
  upper.position.y = 4.4;
  root.add(upper);
  {
    const b = new Bin();
    b.add("yellow", rbox(12, 4.6, 9.6, 0.2), xf(-0.6, 2.5, 0));
    b.add("dark", rbox(12.4, 0.35, 9.9, 0.1), xf(-0.6, 4.95, 0));
    b.add("dark", rbox(3.2, 4, 8.8, 0.15), xf(-8.2, 2.3, 0));
    b.add("cast", rbox(2.2, 3.4, 8.2, 0.15), xf(-9.9, 2.0, 0));
    // Salas eléctricas y radiadores sobre el techo.
    b.add("yellow", rbox(3.6, 1.6, 3, 0.1), xf(-3.2, 5.9, -2.8));
    b.add("yellow", rbox(3.6, 1.6, 3, 0.1), xf(-3.2, 5.9, 2.8));
    b.add("dark", cyl(0.3, 2.6, "y", 8), xf(-1, 6.3, 2.4));
    // Cabina elevada, adelante a la izquierda; ventanal al frente.
    b.add("yellow", rbox(3.4, 2.7, 2.8, 0.1), xf(5.3, 6.2, -3.2));
    b.add("glass", new THREE.BoxGeometry(0.1, 1.7, 2.4), xf(7.05, 6.4, -3.2));
    b.add("dark", rbox(0.9, 3.4, 0.9, 0.05), xf(4.6, 3.1, -4.1));
    // Torre en A.
    for (const side of [-1, 1]) {
      b.add("boom", beam(V(-3.4, 4.9, side * 4.1), V(0.6, 16.4, side * 0.7), 0.6, 0.9));
    }
    b.add("boom", beam(V(-2.2, 9.2, -2.8), V(-2.2, 9.2, 2.8), 0.4, 0.5));
    b.add("boom", beam(V(-0.9, 13.0, -1.7), V(-0.9, 13.0, 1.7), 0.4, 0.5));
    b.add("machined", cyl(0.75, 1.5, "z", 16), xf(0.7, 16.6, 0));
    // Pluma: dos cordones con celosía.
    const foot = V(5.2, 3.2, 0);
    const tip = V(19.8, 16.0, 0);
    for (const side of [-1, 1]) {
      b.add("boom", beam(V(foot.x, foot.y, side * 3.2), V(tip.x, tip.y, side * 0.9), 0.55, 0.75));
    }
    const lacing = 7;
    for (let k = 0; k <= lacing; k++) {
      const t = k / lacing;
      const x = foot.x + (tip.x - foot.x) * t;
      const y = foot.y + (tip.y - foot.y) * t;
      const half = 3.2 + (0.9 - 3.2) * t;
      b.add("boom", beam(V(x, y, -half), V(x, y, half), 0.28, 0.4));
      if (k < lacing) {
        const t2 = (k + 1) / lacing;
        const x2 = foot.x + (tip.x - foot.x) * t2;
        const y2 = foot.y + (tip.y - foot.y) * t2;
        const half2 = 3.2 + (0.9 - 3.2) * t2;
        b.add("boom", beam(V(x, y, -half), V(x2, y2, half2), 0.2, 0.3));
        b.add("boom", beam(V(x, y, half), V(x2, y2, -half2), 0.2, 0.3));
      }
    }
    b.add("machined", cyl(0.9, 2.2, "z", 16), xf(tip.x, tip.y + 0.4, 0));
    // Tirantes de suspensión de la torre a la punta de la pluma.
    for (const side of [-1, 1]) b.add("rope", tube(V(0.7, 16.4, side * 0.5), V(tip.x, tip.y + 0.4, side * 0.8), 0.13, 6));
    mesh(b, upper);
  }

  // ---- Mango de empuje y cucharón (animados) ----
  const saddle = V(11.6, 3.2 + 12.8 * 0.45 + 0.6, 0);
  const handlePivot = new THREE.Group();
  handlePivot.position.set(saddle.x, saddle.y, 0);
  upper.add(handlePivot);
  const slide = new THREE.Group();
  handlePivot.add(slide);
  const doorPivot = new THREE.Group();
  {
    const b = new Bin();
    b.add("dark", rbox(2.1, 1.1, 1.0, 0.1), xf(0, 0, 0));
    for (const side of [-1, 1]) b.add("boom", beam(V(-7, 0, side * 0.95), V(10.4, 0, side * 0.95), 0.9, 1.2));
    b.add("dark", rbox(0.9, 1.3, 2.9, 0.1), xf(4, 0, 0));
    b.add("dark", rbox(0.9, 1.3, 2.9, 0.1), xf(-3, 0, 0));
    mesh(b, slide);
    // Cucharón abierto hacia adelante, con dientes en el labio inferior.
    const d = new Bin();
    const L = 3.6;
    const Hh = 3.0;
    const Wd = 4.4;
    d.add("bucket", new THREE.BoxGeometry(0.35, Hh, Wd), xf(10.4 - L / 2 + 0.2, -0.9, 0));
    d.add("bucket", new THREE.BoxGeometry(L, 0.4, Wd), xf(10.4 + 0.2, -2.4, 0));
    for (const side of [-1, 1]) d.add("bucket", new THREE.BoxGeometry(L, Hh, 0.35), xf(10.4 + 0.2, -0.9, side * (Wd / 2 - 0.17)));
    d.add("bucket", new THREE.BoxGeometry(L, 0.3, Wd), xf(10.4 + 0.2, 0.6, 0));
    for (let k = 0; k < 5; k++) {
      d.add("teeth", new THREE.ConeGeometry(0.28, 0.9, 6).rotateZ(-Math.PI / 2), xf(12.4, -2.4, -1.7 + k * 0.85));
    }
    mesh(d, slide);
    // Tapa trasera con bisagra inferior (abre al volcar).
    const door = new Bin();
    door.add("bucket", new THREE.BoxGeometry(0.3, 2.6, Wd - 0.6), xf(0, 1.3, 0));
    mesh(door, doorPivot);
    doorPivot.position.set(10.4 - L / 2 + 0.2, -2.2, 0);
    slide.add(doorPivot);
  }

  const dipperTmp = new THREE.Vector3(10.4, -0.9, 0);
  const api: Shovel = {
    group: root,
    setCycle(t01, yawPile, yawTruck) {
      const p = shovelPose(t01);
      // Orugas paralelas al giro hacia el camión; la casa gira entre pila y camión por el camino corto.
      let delta = yawTruck - yawPile;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      upper.rotation.y = yawPile + delta * p.swing;
      tracks.rotation.y = yawTruck;
      handlePivot.rotation.z = (p.pitchDeg * Math.PI) / 180;
      slide.position.x = -2 + 11 * p.crowd;
      doorPivot.rotation.z = (-p.doorDeg * Math.PI) / 180;
    },
    dipperWorld(out) {
      root.updateMatrixWorld(true);
      return out.copy(dipperTmp).applyMatrix4(slide.matrixWorld);
    },
    dispose() {
      for (const g of ownGeo) g.dispose();
      for (const m of ownMat) m.dispose();
      root.removeFromParent();
    },
  };
  api.setCycle(0, 0, 0);
  return api;
}
