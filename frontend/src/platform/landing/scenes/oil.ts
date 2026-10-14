import * as THREE from "three";
import { DEFAULT_GEAR_CASE, headFromVolume, volumeFullL, type GearCase } from "../../../twin/physics";
import { createStage } from "../../../twin/render/stage";
import { OIL_REFERENCE_L } from "../oilData";
export * from "../oilData";

// Corte de aceite: carcasa anular translúcida (cotas importadas) y piscina
// extruida a la altura h(V); el montaje usa el stage compartido sin tocarlo.
const OIL_SHELL_OPACITY = 0.22;
const OIL_POOL_OPACITY = 0.85;

function oilPoolGeometry(volumeL: number, gc: GearCase): THREE.BufferGeometry {
  const h = headFromVolume(Math.min(volumeFullL(gc), Math.max(0, volumeL)), gc);
  const y = h - gc.rOut;
  const halfChord = Math.sqrt(Math.max(0, gc.rOut * gc.rOut - y * y));
  if (!(halfChord > 0)) return new THREE.BufferGeometry();
  const asin = Math.asin(Math.min(1, Math.max(-1, y / gc.rOut)));
  const shape = new THREE.Shape();
  shape.moveTo(-halfChord, y);
  for (let i = 0; i <= 36; i++) {
    const angle = Math.PI - asin + ((Math.PI + 2 * asin) * i) / 36;
    shape.lineTo(gc.rOut * Math.cos(angle), gc.rOut * Math.sin(angle));
  }
  shape.closePath();
  if (y > -gc.rIn) {
    const hole = new THREE.Path();
    if (y >= gc.rIn) {
      hole.absellipse(0, 0, gc.rIn, gc.rIn, 0, Math.PI * 2, true, 0);
    } else {
      const innerChord = Math.sqrt(Math.max(0, gc.rIn * gc.rIn - y * y));
      const innerAsin = Math.asin(Math.min(1, Math.max(-1, y / gc.rIn)));
      hole.moveTo(-innerChord, y);
      for (let i = 0; i <= 24; i++) {
        const angle = Math.PI - innerAsin + ((Math.PI + 2 * innerAsin) * i) / 24;
        hole.lineTo(gc.rIn * Math.cos(angle), gc.rIn * Math.sin(angle));
      }
      hole.closePath();
    }
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: gc.length, bevelEnabled: false, curveSegments: 24 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-gc.length / 2, 0, 0);
  return geometry;
}

export interface BuiltOilScene {
  readonly group: THREE.Group;
  readonly pool: THREE.Mesh;
  readonly headM: number;
  readonly volumeL: number;
}

export function buildOilScene(volumeL: number = OIL_REFERENCE_L): BuiltOilScene {
  if (!Number.isFinite(volumeL)) throw new Error("Oil scene needs a finite volume");
  const gc = DEFAULT_GEAR_CASE;
  const volume = Math.min(volumeFullL(gc), Math.max(0, volumeL));
  const headM = headFromVolume(volume, gc);
  const group = new THREE.Group();
  group.name = "gdy106-oil-cutaway";

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0x56616c,
    metalness: 0.68,
    roughness: 0.38,
    transparent: true,
    opacity: OIL_SHELL_OPACITY,
    clearcoat: 0.16,
    clearcoatRoughness: 0.4,
  });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(gc.rOut, gc.rOut, gc.length, 48, 1, true), shellMat);
  shell.rotation.z = Math.PI / 2;
  shell.name = "oil-shell";
  group.add(shell);

  const hubMat = new THREE.MeshPhysicalMaterial({ color: 0x89929e, metalness: 0.88, roughness: 0.34 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(gc.rIn, gc.rIn, gc.length, 32), hubMat);
  hub.rotation.z = Math.PI / 2;
  hub.name = "oil-hub";
  group.add(hub);

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x475569,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  for (const mesh of [shell, hub]) {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 24), edgeMaterial));
  }

  const poolMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.1,
    roughness: 0.35,
    transparent: true,
    opacity: OIL_POOL_OPACITY,
  });
  const pool = new THREE.Mesh(oilPoolGeometry(volume, gc), poolMat);
  pool.name = "oil-pool";
  pool.userData.volumeL = volume;
  pool.userData.headM = headM;
  group.add(pool);

  return { group, pool, headM, volumeL: volume };
}

export function mountOilScene(host: HTMLElement, volumeL: number = OIL_REFERENCE_L): { pause(): void; resume(): void; dispose(): void } {
  host.style.display = "block";
  host.style.position = "relative";
  host.style.width = "100%";
  host.style.minHeight = "320px";
  host.style.aspectRatio = "16 / 9";
  const stage = createStage(host, {
    preset: "studio",
    cameraPosition: [1.9, 1.3, 2.3],
    cameraTarget: [0, 0, 0],
    sun: { shadowBox: 3, target: [0, 0, 0] },
  });
  const built = buildOilScene(volumeL);
  stage.scene.add(built.group);
  stage.renderer.domElement.setAttribute("role", "img");
  stage.renderer.domElement.setAttribute(
    "aria-label",
    "GDY106 oil cutaway: annular gear case with the settling pool at the reference level",
  );
  return {
    pause() {
      stage.pause();
    },
    resume() {
      stage.resume();
    },
    dispose() {
      stage.dispose();
    },
  };
}
