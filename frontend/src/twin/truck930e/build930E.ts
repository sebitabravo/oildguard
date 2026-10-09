import * as THREE from "three";
import type { MaterialLibrary } from "../render/materials";
import { buildBodyParts } from "./body";
import { buildChassis } from "./chassis";
import { ackermann, clampTiltDeg, hoistPose, hoistStageLength, payloadSag } from "./kinematics";
import { plateTexture } from "./plate";
import { S } from "./spec";
import { buildWheelGeometries } from "./tire";

// Ensamble del 930E-4SE: grupos `axle` (queda en el suelo) y `chassis` (se hunde
// con la carga) y, colgando del chasis, la tolva sobre su bisagra. El origen
// del grupo raíz es el centro del eje trasero a nivel del suelo, +X adelante,
// +Y arriba, +Z a la derecha del camión (la cabina queda en Z negativo).

export type TruckMode = "moving" | "rest" | "alert" | "stop";
export type AnchorName = "cab" | "rearLeftWheelMotor" | "rearRightWheelMotor" | "body" | "deck" | "frontAxle";

export interface Truck930EOptions {
  /** Segmentos radiales de los neumáticos (96 por defecto). */
  tireSegments?: number;
}

export interface Truck930E {
  group: THREE.Group;
  /** Levanta la tolva 0–45° sobre la bisagra trasera; los cilindros telescópicos siguen. */
  setBodyTilt(deg: number): void;
  /** Ángulo medio de dirección (rad, + = izquierda); cada rueda delantera sigue Ackermann. */
  setSteer(rad: number): void;
  /** Velocidad angular de las ruedas (rad/s) que `advance` integra. */
  setWheelSpin(radPerSec: number): void;
  advance(dt: number): void;
  /** Carga 0..1: monta el montículo de mineral y comprime los Hydrair. */
  setPayload(fraction: number): void;
  setModeTint(mode: TruckMode): void;
  getAnchors(): Record<AnchorName, THREE.Object3D>;
  state(): { tiltDeg: number; steer: number; payload: number; wheelAngle: number; mode: TruckMode };
  dispose(): void;
}

export const MODE_COLORS: Record<TruckMode, number> = {
  moving: 0x2f6fe0,
  rest: 0x2fbf71,
  alert: 0xf5a623,
  stop: 0xe5484d,
};

const RAD = Math.PI / 180;
const AX = S.tire.axleHeight;

export function build930E(materials: MaterialLibrary, opts: Truck930EOptions = {}): Truck930E {
  const geoms = new Set<THREE.BufferGeometry>();
  const ownedMats: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const own = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };
  const emissive = (color: number, emissiveHex: number, intensity: number) =>
    own(new THREE.MeshStandardMaterial({ color, emissive: emissiveHex, emissiveIntensity: intensity, roughness: 0.4 }));

  const accentMat = own(
    new THREE.MeshStandardMaterial({ color: 0x20262e, emissive: MODE_COLORS.rest, emissiveIntensity: 1.8, roughness: 0.5 }),
  );
  const plate = plateTexture("930E");
  textures.push(plate);
  // Mineral: textura de tierra del stage oscurecida (clon: comparte texturas con la biblioteca).
  const oreMat = own(materials.ground("dirt", [6, 6]).clone());
  oreMat.color.setHex(0x6c5c4c);
  const mat: Record<string, THREE.Material> = {
    yellow: materials.get("komatsuYellow"),
    dark: materials.get("paintedSteelDark"),
    machined: materials.get("machinedSteel"),
    cast: materials.get("castIron"),
    glass: materials.get("glassTinted"),
    rail: own(new THREE.MeshStandardMaterial({ color: 0xa3abb5, metalness: 0.7, roughness: 0.42 })),
    black: own(new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.2, roughness: 0.75 })),
    orange: own(new THREE.MeshStandardMaterial({ color: 0xd9801a, metalness: 0.35, roughness: 0.5 })),
    white: emissive(0xffffff, 0xfff1cc, 1.4),
    amber: emissive(0xffb020, 0xffa21a, 1.1),
    red: emissive(0xc01010, 0xff2a1a, 0.9),
    accent: accentMat,
    liner: own(new THREE.MeshStandardMaterial({ color: 0x6d7178, metalness: 0.5, roughness: 0.62 })),
    plate: own(new THREE.MeshStandardMaterial({ map: plate, roughness: 0.55, metalness: 0.2 })),
    ore: oreMat,
    tire: own(new THREE.MeshStandardMaterial({ color: 0x242427, roughness: 0.88, metalness: 0 })),
  };
  const lugMat = materials.rubberTire();

  const root = new THREE.Group();
  root.name = "Truck930E";
  const axleGroup = new THREE.Group();
  axleGroup.name = "axle";
  const chassisGroup = new THREE.Group();
  chassisGroup.name = "chassis";
  root.add(axleGroup, chassisGroup);

  const mk = (
    g: THREE.BufferGeometry,
    m: THREE.Material,
    parent: THREE.Object3D,
    shadow: { cast?: boolean; receive?: boolean } = {},
  ) => {
    geoms.add(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = shadow.cast ?? true;
    mesh.receiveShadow = shadow.receive ?? true;
    parent.add(mesh);
    return mesh;
  };

  // ---- Chasis y eje (geometría fusionada por material) ----
  const parts = buildChassis();
  for (const [key, g] of parts.chassis) mk(g, mat[key], chassisGroup, { cast: key !== "accent" });
  for (const [key, g] of parts.axle) mk(g, mat[key], axleGroup);

  // ---- Ruedas ----
  const wg = buildWheelGeometries(opts.tireSegments ?? 96);
  for (const g of [wg.tireFront, wg.tireRear, wg.lug, wg.rim, wg.hub, wg.gdyCast, wg.gdyBolts]) geoms.add(g);
  const spinNodes: Array<{ node: THREE.Object3D; side: number }> = [];

  const makeWheel = (parent: THREE.Object3D, kind: "front" | "rear", side: number, withCap: boolean) => {
    const mount = new THREE.Group();
    if (side < 0) mount.rotation.y = Math.PI;
    const spin = new THREE.Group();
    mount.add(spin);
    mk(kind === "front" ? wg.tireFront : wg.tireRear, mat.tire, spin);
    const lugs = new THREE.InstancedMesh(wg.lug, lugMat, wg.lugMatrices.length);
    wg.lugMatrices.forEach((m, i) => lugs.setMatrixAt(i, m));
    lugs.instanceMatrix.needsUpdate = true;
    lugs.computeBoundingSphere();
    lugs.castShadow = false;
    lugs.receiveShadow = true;
    spin.add(lugs);
    mk(wg.rim, mat.yellow, spin);
    mk(wg.hub, mat.machined, spin);
    if (withCap) {
      mk(wg.gdyCast, mat.orange, spin);
      mk(wg.gdyBolts, mat.machined, spin);
    }
    parent.add(mount);
    spinNodes.push({ node: spin, side });
    return mount;
  };

  const rearZ = S.chassis.rearTrack / 2;
  const half = S.tire.dualSpacing / 2;
  for (const side of [-1, 1]) {
    for (const [dz, outer] of [
      [-half, false],
      [half, true],
    ] as const) {
      const w = makeWheel(axleGroup, "rear", side, outer);
      w.position.set(0, AX, side * (rearZ + dz));
    }
  }
  const steerNodes: Record<number, THREE.Object3D> = {};
  for (const side of [-1, 1]) {
    const steer = new THREE.Group();
    steer.name = side < 0 ? "steer-left" : "steer-right";
    steer.position.set(S.chassis.wheelbase, AX, (side * S.chassis.frontTrack) / 2);
    axleGroup.add(steer);
    makeWheel(steer, "front", side, false);
    steerNodes[side] = steer;
  }

  // ---- Tolva sobre su bisagra, hija del chasis ----
  const bodyGroup = new THREE.Group();
  bodyGroup.name = "body";
  bodyGroup.position.set(S.body.hingeX, S.body.hingeY, 0);
  chassisGroup.add(bodyGroup);
  const bp = buildBodyParts();
  mk(bp.yellow, mat.yellow, bodyGroup);
  mk(bp.liner, mat.liner, bodyGroup);
  mk(bp.dark, mat.dark, bodyGroup);
  mk(bp.machined, mat.machined, bodyGroup);
  mk(bp.plate, mat.plate, bodyGroup, { cast: false });
  const heap = mk(bp.heap, mat.ore, bodyGroup, { cast: false });
  heap.visible = false;

  // ---- Cilindros de levante de tres etapas (uno por lado) ----
  const stageRadii = [S.hoist.stageRadius1, S.hoist.stageRadius2, S.hoist.stageRadius3];
  const stageMats = [mat.yellow, mat.machined, mat.machined];
  const hoists = [-1, 1].map((side) => {
    const g = new THREE.Group();
    g.position.set(S.hoist.baseX, S.hoist.baseY, side * S.hoist.zOffset);
    chassisGroup.add(g);
    const stages = stageRadii.map((r, i) => {
      const geo = new THREE.CylinderGeometry(r, r, 1, 16, 1);
      geo.rotateZ(-Math.PI / 2);
      return mk(geo, stageMats[i], g);
    });
    return { group: g, stages };
  });

  const updateHoist = (deg: number) => {
    const pose = hoistPose(deg);
    const sl = hoistStageLength(pose.length);
    for (const h of hoists) {
      h.group.rotation.z = pose.angle;
      h.stages.forEach((mesh, i) => {
        mesh.scale.x = sl;
        mesh.position.x = i * (sl - S.hoist.stageOverlap) + sl / 2;
      });
    }
  };

  // ---- Anclas ----
  const anchor = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const capZ = S.chassis.rearTrack / 2 + half + S.tire.sectionWidthRear / 2 + 0.09;
  const anchors: Record<AnchorName, THREE.Object3D> = {
    cab: anchor("cab", chassisGroup, S.cab.x, S.chassis.deckHeight + S.cab.height * 0.6, S.cab.z),
    deck: anchor("deck", chassisGroup, (S.deck.rearX + S.deck.frontX) / 2, S.chassis.deckHeight, 0),
    body: anchor("body", bodyGroup, -S.body.hingeX, S.body.loadingHeight - S.body.hingeY, 0),
    frontAxle: anchor("frontAxle", axleGroup, S.chassis.wheelbase, AX, 0),
    rearLeftWheelMotor: anchor("rearLeftWheelMotor", axleGroup, 0, AX, -capZ),
    rearRightWheelMotor: anchor("rearRightWheelMotor", axleGroup, 0, AX, capZ),
  };

  // ---- Estado y API ----
  let tiltDeg = 0;
  let steer = 0;
  let payload = 0;
  let wheelAngle = 0;
  let wheelOmega = 0;
  let mode: TruckMode = "rest";

  const applySpin = () => {
    for (const { node, side } of spinNodes) node.rotation.z = side > 0 ? -wheelAngle : wheelAngle;
  };

  const api: Truck930E = {
    group: root,
    setBodyTilt(deg) {
      tiltDeg = clampTiltDeg(deg);
      bodyGroup.rotation.z = tiltDeg * RAD;
      updateHoist(tiltDeg);
    },
    setSteer(rad) {
      steer = rad;
      const [l, r] = ackermann(rad);
      steerNodes[-1].rotation.y = l;
      steerNodes[1].rotation.y = r;
    },
    setWheelSpin(radPerSec) {
      wheelOmega = radPerSec;
    },
    advance(dt) {
      if (wheelOmega === 0) return;
      wheelAngle = (wheelAngle + wheelOmega * dt) % (Math.PI * 2);
      applySpin();
    },
    setPayload(fraction) {
      payload = Math.min(1, Math.max(0, fraction));
      heap.visible = payload > 0.01;
      heap.morphTargetInfluences![0] = payload;
      chassisGroup.position.y = 0 - payloadSag(payload);
    },
    setModeTint(next) {
      if (next === mode && accentMat.emissive.getHex() === MODE_COLORS[next]) return;
      mode = next;
      accentMat.emissive.setHex(MODE_COLORS[next]);
    },
    getAnchors: () => anchors,
    state: () => ({ tiltDeg, steer, payload, wheelAngle, mode }),
    dispose() {
      for (const g of geoms) g.dispose();
      geoms.clear();
      for (const m of ownedMats) m.dispose();
      for (const t of textures) t.dispose();
      root.removeFromParent();
    },
  };

  api.setBodyTilt(0);
  api.setModeTint("rest");
  return api;
}
