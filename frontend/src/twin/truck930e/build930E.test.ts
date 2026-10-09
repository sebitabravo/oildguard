import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { createMaterials } from "../render/materials";
import { build930E, MODE_COLORS } from "./build930E";
import { bodyUpHeight } from "./kinematics";
import { S } from "./spec";

const RAD = Math.PI / 180;

function setup() {
  const mats = createMaterials();
  const truck = build930E(mats, { tireSegments: 48 });
  return { mats, truck };
}

/** Caja de las mallas visibles (el montículo vacío no cuenta aunque su morph sea grande). */
function visibleBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.visible) box.union(new THREE.Box3().setFromObject(m));
  });
  return box;
}

function countMeshes(root: THREE.Object3D): { meshes: number; triangles: number } {
  let meshes = 0;
  let triangles = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes++;
    const g = m.geometry;
    const verts = g.index ? g.index.count : g.attributes.position.count;
    triangles += (verts / 3) * ((m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1);
  });
  return { meshes, triangles };
}

describe("930E model: envelope and budget", () => {
  test("fits the brochure envelope (stairs project about a metre past the bumper)", () => {
    const { truck, mats } = setup();
    const box = visibleBox(truck.group);
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(S.chassis.overallLength - 0.3);
    expect(size.x).toBeLessThan(S.chassis.overallLength + 1.2);
    expect(size.z).toBeGreaterThan(S.chassis.overallWidth - 0.3);
    expect(size.z).toBeLessThan(S.chassis.overallWidth + 0.3);
    expect(box.max.y).toBeGreaterThan(S.chassis.overallHeight - 0.05);
    expect(box.max.y).toBeLessThan(S.chassis.overallHeight + 0.15);
    expect(box.min.y).toBeGreaterThan(-0.2);
    truck.dispose();
    mats.dispose();
  });

  test("keeps the draw-call budget: meshes x2 (shadow pass) under 150", () => {
    const { truck, mats } = setup();
    const { meshes, triangles } = countMeshes(truck.group);
    expect(meshes * 2).toBeLessThan(150);
    expect(triangles).toBeLessThan(450000);
    truck.dispose();
    mats.dispose();
  });

  test("origin is the rear-axle centre: rear wheels at x=0, front axle at the wheelbase", () => {
    const { truck, mats } = setup();
    const a = truck.getAnchors();
    truck.group.updateMatrixWorld(true);
    const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
    expect(world(a.frontAxle).x).toBeCloseTo(S.chassis.wheelbase, 3);
    expect(world(a.rearLeftWheelMotor).x).toBeCloseTo(0, 3);
    expect(world(a.rearLeftWheelMotor).z).toBeLessThan(-4);
    expect(world(a.rearRightWheelMotor).z).toBeGreaterThan(4);
    expect(world(a.cab).z).toBeLessThan(0);
    expect(world(a.deck).y).toBeCloseTo(S.chassis.deckHeight, 3);
    truck.dispose();
    mats.dispose();
  });
});

describe("930E model: controls", () => {
  test("body tilt reaches the published body-up height and is clamped to 45 degrees", () => {
    const { truck, mats } = setup();
    truck.setBodyTilt(45);
    const up = visibleBox(truck.group).max.y;
    expect(up).toBeGreaterThan(14.0);
    expect(up).toBeLessThan(14.8);
    expect(Math.abs(up - bodyUpHeight(45))).toBeLessThan(0.15);
    truck.setBodyTilt(120);
    expect(truck.state().tiltDeg).toBe(45);
    truck.setBodyTilt(-5);
    expect(truck.state().tiltDeg).toBe(0);
    truck.dispose();
    mats.dispose();
  });

  test("hoist cylinders telescope: the three stages lengthen with the tilt", () => {
    const { truck, mats } = setup();
    const stageScale = () => {
      const lens: number[] = [];
      truck.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry.type === "CylinderGeometry" && (m.parent as THREE.Group)?.children.length === 3) {
          lens.push(m.scale.x);
        }
      });
      return lens;
    };
    const flat = stageScale();
    truck.setBodyTilt(45);
    const up = stageScale();
    expect(flat.length).toBe(6);
    expect(up.length).toBe(6);
    for (let i = 0; i < 6; i++) expect(up[i]).toBeGreaterThan(flat[i]);
    truck.dispose();
    mats.dispose();
  });

  test("steering follows Ackermann: the inner wheel turns more", () => {
    const { truck, mats } = setup();
    truck.setSteer(0.3);
    const left = truck.group.getObjectByName("steer-left")!.rotation.y;
    const right = truck.group.getObjectByName("steer-right")!.rotation.y;
    expect(left).toBeGreaterThan(right);
    expect(right).toBeGreaterThan(0);
    truck.setSteer(0);
    expect(truck.group.getObjectByName("steer-left")!.rotation.y).toBe(0);
    truck.dispose();
    mats.dispose();
  });

  test("wheels integrate the commanded spin rate", () => {
    const { truck, mats } = setup();
    truck.setWheelSpin(2);
    truck.advance(0.25);
    expect(truck.state().wheelAngle).toBeCloseTo(0.5, 9);
    truck.setWheelSpin(0);
    truck.advance(1);
    expect(truck.state().wheelAngle).toBeCloseTo(0.5, 9);
    truck.dispose();
    mats.dispose();
  });

  test("payload shows the heap and lowers the chassis a few centimetres, never the axle", () => {
    const { truck, mats } = setup();
    const chassis = truck.group.getObjectByName("chassis")!;
    const axle = truck.group.getObjectByName("axle")!;
    expect(chassis.position.y).toBe(0);
    truck.setPayload(1);
    expect(chassis.position.y).toBeLessThan(-0.03);
    expect(chassis.position.y).toBeGreaterThan(-0.1);
    expect(axle.position.y).toBe(0);
    truck.setPayload(0);
    expect(chassis.position.y).toBe(0);
    truck.dispose();
    mats.dispose();
  });

  test("mode tint repaints only the accent material", () => {
    const { truck, mats } = setup();
    for (const mode of Object.keys(MODE_COLORS) as Array<keyof typeof MODE_COLORS>) {
      truck.setModeTint(mode);
      expect(truck.state().mode).toBe(mode);
    }
    const accents = new Set<number>();
    truck.group.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (m.isMesh && mat?.emissive && mat.emissiveIntensity > 1.7) accents.add(mat.emissive.getHex());
    });
    expect(accents.has(MODE_COLORS.stop)).toBe(true);
    truck.dispose();
    mats.dispose();
  });
});

describe("930E model: geometry hygiene", () => {
  test("no NaN positions and every mesh has normals", () => {
    const { truck, mats } = setup();
    truck.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 7) {
        expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))).toBe(true);
      }
      expect(m.geometry.attributes.normal).toBeTruthy();
    });
    truck.dispose();
    mats.dispose();
  });

  test("dispose is idempotent and detaches the group", () => {
    const { truck, mats } = setup();
    const parent = new THREE.Group();
    parent.add(truck.group);
    truck.dispose();
    expect(parent.children.length).toBe(0);
    truck.dispose();
    mats.dispose();
  });
});
