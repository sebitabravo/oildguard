import * as THREE from "three";
import { hash2, valueNoiseTile } from "../render/noise";
import type { MaterialLibrary } from "../render/materials";
import { Bin, xf } from "../truck930e/geom";
import { S } from "../truck930e/spec";
import { toWorld, frameHeading, createPitWorld, LANE, TURN_R, type PitWorld } from "./pitLayout";
import { P, bermBaseM } from "./pitSpec";
import { DOMAIN, bermToeHeights, stairHeight, terrainMeshHeightAt, type TerrainSample } from "./pitTerrain";

// Foso a cielo abierto como mallas de three.js a metros reales. La malla de terreno
// sale de la misma función de altura que usa la ruta (pitTerrain), así que los
// camiones ruedan exactamente sobre lo que se dibuja. Geometría estática fusionada:
// terreno (2 grupos de material), bermas, marcas de camino y chancadora.

export interface PitBuild {
  group: THREE.Group;
  world: PitWorld;
  heightAt(x: number, z: number): number;
  /** Lazo cerrado por los carriles (visual / depuración); la simulación usa `world.route`. */
  roadPath: THREE.CatmullRomCurve3;
  /** Puntos de interés para etiquetas y cámaras (mundo, metros). */
  anchors: {
    crusher: THREE.Vector3;
    pocket: THREE.Vector3;
    shovel: THREE.Vector3;
    rampMid: THREE.Vector3;
    pitCenter: THREE.Vector3;
    plazaCenter: THREE.Vector3;
  };
  stats: { terrainVertices: number; terrainTriangles: number };
  dispose(): void;
}

const CELL = 2;

const srgb = (hex: number) => new THREE.Color(hex);
// Albedo medio (lineal) de las texturas dirt/rock del stage, para convertir colores objetivo en tintes.
const TEX_MEAN_DIRT = new THREE.Color().setRGB(0.184, 0.109, 0.054, THREE.LinearSRGBColorSpace);
const TEX_MEAN_ROCK = new THREE.Color().setRGB(0.22, 0.175, 0.13, THREE.LinearSRGBColorSpace);

const COLORS = {
  rim: srgb(0xa68f68),
  rimDark: srgb(0x8e7957),
  bench: srgb(0x9d8363),
  floor: srgb(0x7d6b57),
  road: srgb(0xb8a684),
  roadDark: srgb(0x9a8a6c),
  rockLight: srgb(0xb4a18a),
  rockDark: srgb(0x6c5c4d),
  oreBand: srgb(0x9c6a48),
  darkBand: srgb(0x4d453d),
  pile: srgb(0x5b5046),
};

const smooth01 = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

function tint(target: THREE.Color, mean: THREE.Color, out: THREE.Color): THREE.Color {
  return out.setRGB(target.r / mean.r, target.g / mean.g, target.b / mean.b, THREE.LinearSRGBColorSpace);
}

interface TerrainBuild {
  mesh: THREE.Mesh;
  vertices: number;
  triangles: number;
}

function buildTerrainMesh(world: PitWorld, mats: MaterialLibrary, ownMaterials: THREE.Material[]): TerrainBuild {
  const { terrain } = world;
  const nx = Math.round((DOMAIN.maxX - DOMAIN.minX) / CELL);
  const nz = Math.round((DOMAIN.maxZ - DOMAIN.minZ) / CELL);
  const stride = nx + 1;
  const count = stride * (nz + 1);
  const heights = new Float32Array(count);
  const samples: Array<Pick<TerrainSample, "edge" | "flat" | "pile" | "d">> = new Array(count);
  const scratch: TerrainSample = { h: 0, edge: 0, roadH: 0, flat: 0, pile: 0, d: 0 };
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const s = terrain.sample(DOMAIN.minX + i * CELL, DOMAIN.minZ + j * CELL, scratch);
      const k = j * stride + i;
      heights[k] = s.h;
      samples[k] = { edge: s.edge, flat: s.flat, pile: s.pile, d: s.d };
    }
  }

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const tiltMetric = new Float32Array(count);
  const total = P.bench.count * 14.5;
  const c = new THREE.Color();
  const tmp = new THREE.Color();
  const H = (i: number, j: number) => heights[Math.min(nz, Math.max(0, j)) * stride + Math.min(nx, Math.max(0, i))];

  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * stride + i;
      const x = DOMAIN.minX + i * CELL;
      const z = DOMAIN.minZ + j * CELL;
      const h = heights[k];
      positions[k * 3] = x;
      positions[k * 3 + 1] = h;
      positions[k * 3 + 2] = z;
      const gx = (H(i + 1, j) - H(i - 1, j)) / (2 * CELL);
      const gz = (H(i, j + 1) - H(i, j - 1)) / (2 * CELL);
      const inv = 1 / Math.hypot(gx, 1, gz);
      normals[k * 3] = -gx * inv;
      normals[k * 3 + 1] = inv;
      normals[k * 3 + 2] = -gz * inv;
      const tilt = 1 - inv;
      tiltMetric[k] = tilt;
      uvs[k * 2] = (x - DOMAIN.minX) / (DOMAIN.maxX - DOMAIN.minX);
      uvs[k * 2 + 1] = (z - DOMAIN.minZ) / (DOMAIN.maxZ - DOMAIN.minZ);

      // ---- Color ----
      const sm = samples[k];
      const fine = hash2(i, j, 31) * 0.14 - 0.07;
      const mid = valueNoiseTile(x / 23 + 50, z / 23 + 50, 64, 7) - 0.5;
      // Suelo base: arena fuera del borde, banco y piso dentro.
      const inside = smooth01(sm.d / 3);
      const floorW = smooth01((sm.d - total + 4) / 6);
      c.copy(COLORS.rim).lerp(COLORS.rimDark, 0.5 + mid);
      c.lerp(tmp.copy(COLORS.bench), inside * (1 - floorW));
      c.lerp(tmp.copy(COLORS.floor), floorW);
      // Roca en las caras: estratos por altura con bandas de mineral.
      const rockW = smooth01((tilt - 0.1) / 0.14);
      if (rockW > 0) {
        const band = Math.sin(h * 1.9 + mid * 7) * 0.5 + 0.5;
        const layer = Math.floor((h + 120) / 2.6);
        const pick = hash2(layer, 3, 17);
        tmp.copy(COLORS.rockDark).lerp(COLORS.rockLight, band);
        if (pick > 0.78) tmp.lerp(COLORS.oreBand, 0.55);
        else if (pick < 0.16) tmp.lerp(COLORS.darkBand, 0.5);
        c.lerp(tmp, rockW);
      }
      // Pila de mineral tronado.
      if (sm.pile > 0) c.lerp(tmp.copy(COLORS.pile), Math.min(1, sm.pile * 2.2));
      // Camino y explanadas: grava clara y lisa, con borde suave.
      const roadW = Math.max(smooth01(1 - (sm.edge - 0.5) / 3), sm.flat);
      if (roadW > 0) {
        tmp.copy(COLORS.road).lerp(COLORS.roadDark, 0.5 + mid * 0.8);
        c.lerp(tmp, Math.min(1, roadW) * (1 - rockW * 0.85));
      }
      // Oclusión falsa: más oscuro donde el vecindario está más alto (pie de talud, rincones).
      const avg = (H(i + 1, j) + H(i - 1, j) + H(i, j + 1) + H(i, j - 1)) * 0.25;
      const ao = 1 - Math.min(0.32, Math.max(0, (avg - h) * 0.09));
      const shade = ao * (1 + fine + mid * 0.12);
      // Se convierte a tinte sobre la textura de dirt o de roca.
      const isRock = rockW > 0.5;
      tint(c, isRock ? TEX_MEAN_ROCK : TEX_MEAN_DIRT, tmp);
      colors[k * 3] = tmp.r * shade;
      colors[k * 3 + 1] = tmp.g * shade;
      colors[k * 3 + 2] = tmp.b * shade;
    }
  }

  // Índices: celdas con inclinación alta van al material de roca (grupo 1).
  const flatIdx: number[] = [];
  const rockIdx: number[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * stride + i;
      const b = a + 1;
      const d = a + stride;
      const e = d + 1;
      const tilt = (tiltMetric[a] + tiltMetric[b] + tiltMetric[d] + tiltMetric[e]) * 0.25;
      // Diagonal alternada según la pendiente para evitar el patrón de rombos.
      const target = tilt > 0.17 ? rockIdx : flatIdx;
      if ((i + j) % 2 === 0) target.push(a, d, b, b, d, e);
      else target.push(a, d, e, a, e, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  const index = new Uint32Array(flatIdx.length + rockIdx.length);
  index.set(flatIdx, 0);
  index.set(rockIdx, flatIdx.length);
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.addGroup(0, flatIdx.length, 0);
  geo.addGroup(flatIdx.length, rockIdx.length, 1);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  const tileM = 14;
  const repeat: [number, number] = [(DOMAIN.maxX - DOMAIN.minX) / tileM, (DOMAIN.maxZ - DOMAIN.minZ) / tileM];
  const dirt = mats.ground("dirt", repeat).clone();
  const rock = mats.ground("rock", repeat).clone();
  for (const m of [dirt, rock]) {
    m.vertexColors = true;
    m.color.setHex(0xffffff);
    m.roughness = 1;
    m.envMapIntensity = 0.6;
    ownMaterials.push(m);
  }
  const mesh = new THREE.Mesh(geo, [dirt, rock]);
  mesh.name = "PitTerrain";
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return { mesh, vertices: count, triangles: index.length / 3 };
}

/** Bermas de seguridad en el borde abierto de la rampa; una malla fusionada. */
function buildBerms(world: PitWorld, mats: MaterialLibrary, ownMaterials: THREE.Material[]): THREE.Mesh {
  const { terrain, center } = world;
  const stepM = 3;
  const half = P.road.width / 2;
  const crest = half + 1.2;
  const baseHalf = bermBaseM() / 2;
  const height = P.berm.height;

  // Estaciones a lo largo del eje, solo sobre la rampa y su curva de pie.
  const stations: Array<{ x: number; z: number; h: number; rx: number; rz: number; breakBefore: boolean }> = [];
  let acc = 0;
  let breakNext = false;
  for (let i = 1; i < center.length - 1; i++) {
    const a = center[i - 1];
    const b = center[i + 1];
    acc += Math.hypot(center[i].x - a.x, center[i].z - a.z);
    if (acc < stepM) continue;
    acc = 0;
    if (center[i].h > -0.2 && center[i].h < 0.05) {
      breakNext = true;
      continue;
    }
    if (center[i].h > 0.05) {
      breakNext = true;
      continue;
    }
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const n = Math.hypot(tx, tz) || 1;
    stations.push({
      x: center[i].x,
      z: center[i].z,
      h: center[i].h,
      rx: -tz / n,
      rz: tx / n,
      breakBefore: breakNext,
    });
    breakNext = false;
  }

  const open: Array<[number, number]> = stations.map((st) =>
    [1, -1].map((side) => {
      const px = st.x + st.rx * side * (half + 11);
      const pz = st.z + st.rz * side * (half + 11);
      return terrain.heightAt(px, pz) < st.h - 1.4 ? 1 : 0;
    }) as [number, number],
  );

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let base = 0;
  for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
    const side = sideIdx === 0 ? 1 : -1;
    // Altura suavizada por vecindad: el extremo de cada tramo se afina en lugar de cortarse en seco.
    const factor = stations.map((_, i) => {
      let sum = 0;
      let w = 0;
      for (let k = -4; k <= 4; k++) {
        const o = open[Math.min(stations.length - 1, Math.max(0, i + k))][sideIdx];
        sum += o;
        w += 1;
      }
      return open[i][sideIdx] ? Math.min(1, (sum / w) * 1.6) : 0;
    });
    let prevValid = -1;
    let dist = 0;
    for (let i = 0; i < stations.length; i++) {
      const st = stations[i];
      const f = factor[i];
      if (f <= 0.02) {
        prevValid = -1;
        continue;
      }
      const cx = st.x + st.rx * side * crest;
      const cz = st.z + st.rz * side * crest;
      const inner = [st.x + st.rx * side * (crest - baseHalf), st.z + st.rz * side * (crest - baseHalf)];
      const outer = [st.x + st.rx * side * (crest + baseHalf), st.z + st.rz * side * (crest + baseHalf)];
      const h0 = st.h;
      const renderedGround = terrainMeshHeightAt(outer[0], outer[1], terrain.heightAt);
      const toe = bermToeHeights(renderedGround);
      // Sección: pie interior, cresta, pie exterior y zócalo enterrado.
      positions.push(inner[0], h0 + 0.02, inner[1], cx, h0 + height * f, cz, outer[0], toe.exposed, outer[1], outer[0], toe.buried, outer[1]);
      const connectToPrevious = i > 0 && prevValid === i - 1 && !st.breakBefore;
      if (connectToPrevious) dist += stepM;
      const u = dist / 18;
      uvs.push(u, 0, u, 0.5, u, 1, u, 1.4);
      if (connectToPrevious) {
        const p = base - 4;
        const q = base;
        // Orden de caras según el lado para que las normales apunten hacia arriba.
        const flip = side > 0;
        for (let k = 0; k < 3; k++) {
          const a = p + k;
          const b = p + k + 1;
          const c = q + k;
          const d = q + k + 1;
          if (flip) indices.push(a, c, b, b, c, d);
          else indices.push(a, b, c, b, d, c);
        }
      }
      prevValid = i;
      base += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = mats.ground("rock", [14, 14]).clone();
  mat.color.setHex(0xe0d2bd);
  mat.side = THREE.DoubleSide;
  ownMaterials.push(mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "SafetyBerms";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Línea de eje discontinua sobre el camino de dos carriles. */
function buildCenterDashes(world: PitWorld, ownMaterials: THREE.Material[]): THREE.Mesh {
  const { center } = world;
  const dashLen = 6;
  const gap = 10;
  const width = 0.4;
  const lift = 0.07;
  const positions: number[] = [];
  const indices: number[] = [];
  let acc = 0;
  let drawing = true;
  let seg: Array<{ x: number; z: number; h: number; rx: number; rz: number }> = [];
  const flush = () => {
    if (seg.length >= 2) {
      const base = positions.length / 3;
      for (const p of seg) {
        positions.push(p.x + p.rx * width, p.h + lift, p.z + p.rz * width, p.x - p.rx * width, p.h + lift, p.z - p.rz * width);
      }
      for (let i = 0; i < seg.length - 1; i++) {
        const a = base + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    seg = [];
  };
  for (let i = 1; i < center.length - 1; i++) {
    const a = center[i - 1];
    const b = center[i + 1];
    const step = Math.hypot(center[i].x - a.x, center[i].z - a.z) / 2;
    acc += step;
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const n = Math.hypot(tx, tz) || 1;
    if (drawing) seg.push({ x: center[i].x, z: center[i].z, h: center[i].h, rx: -tz / n, rz: tx / n });
    if (acc >= (drawing ? dashLen : gap)) {
      acc = 0;
      if (drawing) flush();
      drawing = !drawing;
    }
  }
  flush();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe0c545,
    roughness: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
  ownMaterials.push(mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "CenterDashes";
  mesh.receiveShadow = true;
  return mesh;
}

interface CrusherBuild {
  group: THREE.Group;
  pocketMouth: THREE.Vector3;
  building: THREE.Vector3;
}

/** Chancadora primaria: bolsillo revestido, tope de ruedas, edificio, correa y acopio. */
function buildCrusher(world: PitWorld, ownMaterials: THREE.Material[], ownGeometries: THREE.BufferGeometry[]): CrusherBuild {
  const { plaza } = world;
  const pf = plaza.frame;
  const yaw = -frameHeading(pf);
  const R = TURN_R;
  const uc = plaza.u0 + R;
  const returnV = -LANE / 2;
  const dumpV = returnV - R;
  const tailOver = 4.8 - P.crusher.tailOverlap;
  const lipV = dumpV - tailOver;
  const pocketLen = 14;
  const depth = 10;

  const bin = new Bin();
  const at = (u: number, v: number, y: number, su: number, sv: number, sh: number) => {
    const w = toWorld(pf, u, v);
    return { geo: new THREE.BoxGeometry(su, sh, sv), m: xf(w[0], y, w[1], 0, yaw, 0) };
  };
  const put = (key: string, u: number, v: number, y: number, su: number, sv: number, sh: number) => {
    const { geo, m } = at(u, v, y, su, sv, sh);
    bin.add(key, geo, m);
  };

  const hw = P.crusher.pocketWidth / 2;
  const wallT = 1.4;
  // Muros del bolsillo: dos laterales y uno de fondo, de -depth a +2.2 m sobre la explanada.
  const wallTop = 2.4;
  const wallH = depth + wallTop;
  const wallMid = (wallTop - depth) / 2;
  const vMid = lipV - pocketLen / 2;
  put("concrete", uc - hw - wallT / 2 + 0.2, vMid, wallMid, wallT, pocketLen + wallT, wallH);
  put("concrete", uc + hw + wallT / 2 - 0.2, vMid, wallMid, wallT, pocketLen + wallT, wallH);
  put("concrete", uc, lipV - pocketLen - wallT / 2 + 0.2, wallMid, P.crusher.pocketWidth + wallT * 2, wallT, wallH);
  // Mineral que ya cayó al bolsillo: sube hasta unos metros bajo el labio.
  put("ore", uc, vMid, -depth + 3.2, P.crusher.pocketWidth - 0.4, pocketLen - 0.4, 6.4);
  // Parrilla inclinada del alimentador (barras oscuras) en el fondo del bolsillo.
  for (let k = 0; k < 7; k++) {
    put("steel", uc - hw + 1 + k * 1.6, vMid - 2, -depth + 6.45, 0.5, pocketLen - 4, 0.5);
  }
  // Tope de ruedas: barrera de 1.9 m (>= radio del neumático) delante del labio, una por rueda trasera.
  const stopV = lipV + 1.2;
  const rearHalf = S.chassis.rearTrack / 2;
  for (const side of [-1, 1]) {
    put("concrete", uc + side * rearHalf, stopV, P.crusher.wheelStopHeight / 2, 4.4, 1.5, P.crusher.wheelStopHeight);
    put("stripe", uc + side * rearHalf, stopV + 0.76, P.crusher.wheelStopHeight * 0.7, 4.2, 0.04, 0.35);
  }
  // Labio y losa de aproximación a nivel de la explanada.
  put("concrete", uc, lipV + 0.3, 0.12, P.crusher.pocketWidth + 3, 0.6, 0.3);

  // Edificio de la chancadora, detrás del bolsillo.
  const bV = lipV - pocketLen - 4 - 11;
  put("building", uc, bV, 7.5, 22, 20, 15);
  put("buildingRoof", uc, bV, 15.4, 23, 21, 0.8);
  put("stripe", uc, bV + 10.05, 2.6, 22.2, 0.15, 0.7);
  put("steel", uc - 5, bV, 17.6, 3, 3, 4.4);
  // Tolva de alimentación inclinada entre el muro de fondo y el edificio.
  put("steel", uc, lipV - pocketLen - 2, 1.4, P.crusher.pocketWidth * 0.55, 3.4, 2.8);

  // Correa: sale por el lado del edificio, sube con pendiente y descarga sobre el acopio.
  const beltLen = 46;
  const beltRise = 12;
  const beltU0 = uc + 11;
  const beltAngle = Math.atan2(beltRise, beltLen);
  {
    const mid = toWorld(pf, beltU0 + beltLen / 2, bV - 4);
    const g = new THREE.BoxGeometry(Math.hypot(beltLen, beltRise), 0.9, 2);
    // Eje u del marco al eje X local; inclinación alrededor de v.
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(mid[0], 5 + beltRise / 2, mid[1]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), beltAngle)),
      new THREE.Vector3(1, 1, 1),
    );
    bin.add("belt", g, m);
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const hgt = 5 + beltRise * t;
      put("steel", beltU0 + beltLen * t, bV - 4, (hgt - 0.5) / 2, 0.8, 1.6, hgt - 0.5);
    }
  }
  put("steel", beltU0 + beltLen + 2.5, bV - 4, 8.5, 5, 5, 17);

  // Acopio de mineral triturado bajo el final de la correa.
  const pileC = toWorld(pf, beltU0 + beltLen + 2.5, bV - 4);
  const cone = new THREE.ConeGeometry(15, 12, 24, 1);
  bin.add("pile", cone, xf(pileC[0], 6, pileC[1]));

  const merged = bin.merged();
  const mats: Record<string, THREE.Material> = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x8c8d8c, roughness: 0.92, metalness: 0 }),
    ore: new THREE.MeshStandardMaterial({ color: 0x2c2823, roughness: 1, metalness: 0 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x414a55, roughness: 0.55, metalness: 0.7 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xe5b81a, roughness: 0.6, metalness: 0.1 }),
    building: new THREE.MeshStandardMaterial({ color: 0x5f7488, roughness: 0.7, metalness: 0.35 }),
    buildingRoof: new THREE.MeshStandardMaterial({ color: 0x3d4650, roughness: 0.7, metalness: 0.4 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.8, metalness: 0.1 }),
    pile: new THREE.MeshStandardMaterial({ color: 0x4e4339, roughness: 1, metalness: 0, flatShading: true }),
  };
  const group = new THREE.Group();
  group.name = "Crusher";
  for (const [key, geo] of merged) {
    ownGeometries.push(geo);
    ownMaterials.push(mats[key]);
    const mesh = new THREE.Mesh(geo, mats[key]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `crusher-${key}`;
    group.add(mesh);
  }
  const mouth = toWorld(pf, uc, lipV);
  const bw = toWorld(pf, uc, bV);
  return { group, pocketMouth: new THREE.Vector3(mouth[0], 0, mouth[1]), building: new THREE.Vector3(bw[0], 8, bw[1]) };
}

/** Curva cerrada por los puntos de la ruta cada ~`stepM` metros (visual / depuración). */
function buildRoadPath(world: PitWorld, stepM = 12): THREE.CatmullRomCurve3 {
  const { route } = world;
  const pts: THREE.Vector3[] = [];
  const n = Math.round(stepM / route.ds);
  for (let i = 0; i < route.n; i += n) pts.push(new THREE.Vector3(route.x[i], route.y[i] + 0.3, route.z[i]));
  return new THREE.CatmullRomCurve3(pts, true, "centripetal");
}

export function buildPit(mats: MaterialLibrary, world: PitWorld = createPitWorld()): PitBuild {
  const ownMaterials: THREE.Material[] = [];
  const ownGeometries: THREE.BufferGeometry[] = [];

  const group = new THREE.Group();
  group.name = "Pit";
  const terrain = buildTerrainMesh(world, mats, ownMaterials);
  group.add(terrain.mesh);
  const berms = buildBerms(world, mats, ownMaterials);
  group.add(berms);
  group.add(buildCenterDashes(world, ownMaterials));
  const crusher = buildCrusher(world, ownMaterials, ownGeometries);
  group.add(crusher.group);

  // Suelo lejano: continúa el terreno hasta el horizonte (la niebla oculta el borde).
  const farMat = mats.ground("dirt", [260, 260]).clone();
  farMat.color.setHex(0xb59f78);
  ownMaterials.push(farMat);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), farMat);
  far.rotation.x = -Math.PI / 2;
  // Keep the horizon continuation below the deepest modeled bench. A plane at
  // grade would cover the open cut and make every negative-height bench vanish.
  far.position.y = -P.bench.count * P.bench.height - 10;
  far.receiveShadow = true;
  far.name = "FarGround";
  group.add(far);

  const roadPath = buildRoadPath(world);
  const { plaza, shovel } = world;
  const rampMid = world.ramp[Math.floor(world.ramp.length / 2)];
  const plazaC = toWorld(plaza.frame, plaza.u0 + TURN_R, 0);
  const anchors = {
    crusher: crusher.building.clone(),
    pocket: crusher.pocketMouth.clone(),
    shovel: new THREE.Vector3(shovel.pos[0], -P.bench.count * P.bench.height, shovel.pos[1]),
    rampMid: new THREE.Vector3(rampMid.x, rampMid.h, rampMid.z),
    pitCenter: new THREE.Vector3(0, -P.bench.count * P.bench.height, 0),
    plazaCenter: new THREE.Vector3(plazaC[0], 0, plazaC[1]),
  };

  return {
    group,
    world,
    heightAt: world.terrain.heightAt,
    roadPath,
    anchors,
    stats: { terrainVertices: terrain.vertices, terrainTriangles: terrain.triangles },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      for (const g of ownGeometries) g.dispose();
      for (const m of ownMaterials) m.dispose();
      group.removeFromParent();
    },
  };
}

/** Altura teórica de un banco a profundidad `d` (para pruebas y etiquetas). */
export const benchLevelAt = (d: number): number => stairHeight(d);
