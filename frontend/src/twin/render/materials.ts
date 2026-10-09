import * as THREE from "three";
import { PALETTE } from "./palette";
import {
  dirtMaps,
  rockMaps,
  surfaceTextures,
  treadBumpTexture,
  type SurfaceTextures,
} from "./textures";

// Fábrica de materiales PBR compartidos. Cada material se crea una sola vez
// (cache) y se libera junto con sus texturas desde `dispose()`.

const builders = {
  komatsuYellow: () =>
    new THREE.MeshPhysicalMaterial({
      color: PALETTE.komatsuYellow,
      metalness: 0.15,
      roughness: 0.45,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
    }),
  paintedSteelDark: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.paintedSteelDark,
      metalness: 0.4,
      roughness: 0.55,
    }),
  machinedSteel: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.machinedSteel,
      metalness: 1,
      roughness: 0.3,
    }),
  castIron: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.castIron,
      metalness: 0.85,
      roughness: 0.55,
    }),
  glassTinted: () =>
    new THREE.MeshPhysicalMaterial({
      color: PALETTE.glassTinted,
      metalness: 0,
      roughness: 0.05,
      transparent: true,
      opacity: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
  // Aceite 85W-140: ámbar/marrón con transmisión; nunca verde.
  oil85W140: () =>
    new THREE.MeshPhysicalMaterial({
      color: PALETTE.oilAmber,
      metalness: 0,
      roughness: 0.08,
      transmission: 0.4,
      ior: 1.48,
      thickness: 0.6,
      attenuationColor: new THREE.Color(PALETTE.oilAttenuation),
      attenuationDistance: 0.7,
      transparent: true,
      opacity: 0.95,
    }),
  studioFloor: () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.studioFloor,
      metalness: 0.2,
      roughness: 0.7,
    }),
} as const;

export type MaterialName = keyof typeof builders;
export type GroundKind = "dirt" | "rock";

export interface MaterialLibrary {
  get<N extends MaterialName>(name: N): ReturnType<(typeof builders)[N]>;
  /** Neumático con relieve de banda de rodadura (bump procedural). */
  rubberTire(): THREE.MeshStandardMaterial;
  /** Suelo con albedo + rugosidad procedurales; `repeat` controla el tileado. */
  ground(kind: GroundKind, repeat?: [number, number]): THREE.MeshStandardMaterial;
  dispose(): void;
}

export function createMaterials(): MaterialLibrary {
  const cache = new Map<string, THREE.Material>();
  const textures: THREE.Texture[] = [];

  const memo = <T extends THREE.Material>(key: string, make: () => T): T => {
    const hit = cache.get(key);
    if (hit) return hit as T;
    const created = make();
    cache.set(key, created);
    return created;
  };

  return {
    get(name) {
      return memo(name, builders[name]) as ReturnType<(typeof builders)[typeof name]>;
    },
    rubberTire() {
      return memo("rubberTire", () => {
        const bump = treadBumpTexture();
        textures.push(bump);
        return new THREE.MeshStandardMaterial({
          color: PALETTE.rubberTire,
          metalness: 0,
          roughness: 0.9,
          bumpMap: bump,
          bumpScale: 1.5,
        });
      });
    },
    ground(kind, repeat = [8, 8]) {
      return memo(`ground:${kind}:${repeat[0]}x${repeat[1]}`, () => {
        const maps = kind === "dirt" ? dirtMaps() : rockMaps();
        const tex: SurfaceTextures = surfaceTextures(maps, repeat);
        textures.push(tex.map, tex.roughnessMap);
        return new THREE.MeshStandardMaterial({
          map: tex.map,
          roughnessMap: tex.roughnessMap,
          roughness: 1,
          metalness: 0,
        });
      });
    },
    dispose() {
      for (const m of cache.values()) m.dispose();
      for (const t of textures) t.dispose();
      cache.clear();
      textures.length = 0;
    },
  };
}
