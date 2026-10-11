import * as THREE from "three";
import {
  GEAR_RATIO,
  GDY106_TRAIN,
  stageRatio,
  trainRatio,
  stageSpeeds,
  type GearTrain,
} from "../../../twin/physics";
import { createStage } from "../../../twin/render/stage";

// Corte del conjunto GDY106 para el landing (B04): seis piezas legibles en
// corte, reducción 32.62:1 trazada a la fuente B01 y controles vivos de
// órbita/zoom/aislado. La geometría es una reconstrucción visual simplificada
// (P17, no CAD); los conteos de dientes quedan como ilustrativos (P15).
// Reutiliza el tren y el stage compartido sin editarlos.

export const ASSEMBLY_PART_IDS = ["motor", "sun", "planets", "carrier", "hub", "brakes"] as const;

export type AssemblyPartId = (typeof ASSEMBLY_PART_IDS)[number];

export type AssemblyProvenance = "VERIFIED" | "DERIVED" | "ASSUMPTION";

export interface AssemblyPart {
  readonly id: AssemblyPartId;
  readonly label: string;
  readonly provenance: AssemblyProvenance;
  readonly note: string;
}

export const ASSEMBLY_PARTS: readonly AssemblyPart[] = [
  {
    id: "motor",
    label: "Motor de tracción",
    provenance: "VERIFIED",
    note: "Rotor 3000 rpm; wheel ≈ 92 rpm through the 32.62:1 train.",
  },
  {
    id: "sun",
    label: "Piñón solar GE1288",
    provenance: "ASSUMPTION",
    note: "Illustrative tooth counts; spins with the motor shaft.",
  },
  {
    id: "planets",
    label: "Planetarios de alta/baja (3 + 4)",
    provenance: "ASSUMPTION",
    note: "Illustrative planet counts from the frozen research choice.",
  },
  {
    id: "carrier",
    label: "Portaplanetas de alta/baja",
    provenance: "ASSUMPTION",
    note: "Carries the planetary sets toward the torque tube.",
  },
  {
    id: "hub",
    label: "Tubo de torsión + maza",
    provenance: "DERIVED",
    note: "Output side on tapered roller bearings.",
  },
  {
    id: "brakes",
    label: "Frenos húmedos + pulmón",
    provenance: "DERIVED",
    note: "Brake discs outboard with the spring parking-brake can.",
  },
];

// Trazabilidad B01: el total 32.62:1 es VERIFICADO (manual Komatsu, P2); los
// conteos de dientes son ilustrativos dentro del 0.5 % (P15, geartrain.py).
export const ASSEMBLY_REDUCTION_SOURCE =
  "GDY106 32.62:1 VERIFIED per docs/thesis-annex.md:22 (P2, Komatsu 930E-5 spec sheet) " +
  "traced in docs/research/landing-claims.md §3; tooth counts illustrative ASSUMPTION " +
  "(P15, sim/geartrain.py); mirrored by frontend/src/twin/physics.ts:GEAR_RATIO.";

export const ASSEMBLY_TOLERANCE_PCT = 0.5;

export interface AssemblyReduction {
  readonly overall: number;
  readonly highSpeed: number;
  readonly lowSpeed: number;
  readonly illustrative: number;
  readonly wheelRpmAt3000: number;
  readonly withinTolerance: boolean;
}

export function reductionErrorPct(train: GearTrain = GDY106_TRAIN, overall: number = GEAR_RATIO): number {
  return (Math.abs(trainRatio(train) - overall) / overall) * 100;
}

export function assemblyReduction(train: GearTrain = GDY106_TRAIN): AssemblyReduction {
  const highSpeed = stageRatio(train.hs);
  const lowSpeed = stageRatio(train.ls);
  const illustrative = trainRatio(train);
  return {
    overall: GEAR_RATIO,
    highSpeed,
    lowSpeed,
    illustrative,
    wheelRpmAt3000: 3000 / GEAR_RATIO,
    withinTolerance: reductionErrorPct(train, GEAR_RATIO) <= ASSEMBLY_TOLERANCE_PCT,
  };
}

export function assertAssemblyComplete(ids: readonly string[]): void {
  const missing = ASSEMBLY_PART_IDS.filter((id) => !ids.includes(id));
  if (missing.length > 0) throw new Error(`Assembly cutaway is missing parts: ${missing.join(", ")}`);
}

// Límites de cámara del banco: órbita sobre el suelo y zoom acotado.
export const ASSEMBLY_VIEW_LIMITS = {
  minDistance: 1.5,
  maxDistance: 16,
  minPolarAngle: 0.15,
  maxPolarAngle: Math.PI * 0.495,
} as const;

export interface AssemblyViewState {
  readonly azimuth: number;
  readonly polar: number;
  readonly distance: number;
  readonly isolated: AssemblyPartId | null;
}

const INITIAL_VIEW: AssemblyViewState = {
  azimuth: 0.65,
  polar: 1.1,
  distance: 6.5,
  isolated: null,
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export interface AssemblyControls {
  getState(): AssemblyViewState;
  orbit(deltaAzimuth: number, deltaPolar: number): void;
  zoom(factor: number): void;
  isolate(part: AssemblyPartId | null): void;
  reset(): void;
}

export function createAssemblyControls(initial: Partial<AssemblyViewState> = {}): AssemblyControls {
  let state: AssemblyViewState = { ...INITIAL_VIEW, ...initial };
  return {
    getState: () => ({ ...state }),
    orbit(deltaAzimuth, deltaPolar) {
      const fullTurn = Math.PI * 2;
      const azimuth = (state.azimuth + deltaAzimuth) % fullTurn;
      state = {
        ...state,
        azimuth: azimuth < 0 ? azimuth + fullTurn : azimuth,
        polar: clamp(state.polar + deltaPolar, ASSEMBLY_VIEW_LIMITS.minPolarAngle, ASSEMBLY_VIEW_LIMITS.maxPolarAngle),
      };
    },
    zoom(factor) {
      if (!(factor > 0) || !Number.isFinite(factor)) throw new Error("Zoom factor must be a finite number above zero");
      state = {
        ...state,
        distance: clamp(state.distance * factor, ASSEMBLY_VIEW_LIMITS.minDistance, ASSEMBLY_VIEW_LIMITS.maxDistance),
      };
    },
    isolate(part) {
      if (part !== null && !ASSEMBLY_PART_IDS.includes(part)) {
        throw new Error(`Unknown assembly part: ${String(part)}`);
      }
      state = { ...state, isolated: part };
    },
    reset() {
      state = { ...INITIAL_VIEW };
    },
  };
}

export function visibleParts(state: AssemblyViewState): ReadonlySet<AssemblyPartId> {
  return new Set(state.isolated === null ? ASSEMBLY_PART_IDS : [state.isolated]);
}

// Posición orbital sobre el objetivo del banco, para los botones de la UI.
export function cameraPositionFor(
  state: AssemblyViewState,
  target: readonly [number, number, number] = [0, 1.6, 0],
): { readonly x: number; readonly y: number; readonly z: number } {
  const { azimuth, polar, distance } = state;
  return {
    x: target[0] + distance * Math.sin(polar) * Math.sin(azimuth),
    y: target[1] + distance * Math.cos(polar),
    z: target[2] + distance * Math.sin(polar) * Math.cos(azimuth),
  };
}

// Altura del eje y opacidad de corte del banco: mismas referencias del Sim A.
const ASSEMBLY_AXIS_Y = 2.09;
const CUTAWAY_SHELL_OPACITY = 0.22;

export interface BuiltAssembly {
  readonly group: THREE.Group;
  readonly parts: Record<AssemblyPartId, THREE.Group>;
  readonly shellOpacity: number;
}

function partGroup(id: AssemblyPartId): THREE.Group {
  const group = new THREE.Group();
  group.name = `assembly-${id}`;
  group.userData.partId = id;
  group.visible = true;
  return group;
}

function cylX(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  material: THREE.Material,
  x: number,
  segments = 24,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, ASSEMBLY_AXIS_Y, 0);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

export function buildAssemblyScene(): BuiltAssembly {
  const group = new THREE.Group();
  group.name = "gdy106-assembly-cutaway";

  const steel = new THREE.MeshStandardMaterial({ color: 0x6f7886, metalness: 0.85, roughness: 0.4 });
  const gear = new THREE.MeshStandardMaterial({ color: 0x9aa7bd, metalness: 0.9, roughness: 0.35 });
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0xa0622d, metalness: 0.8, roughness: 0.4 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9b13b, metalness: 0.9, roughness: 0.3 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2b3547, metalness: 0.6, roughness: 0.5 });
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x5b7ba6,
    metalness: 0.55,
    roughness: 0.42,
    transparent: true,
    opacity: CUTAWAY_SHELL_OPACITY,
  });

  // Carcasa en corte: envuelve sin ocultar; no es una pieza aislable.
  const shell = new THREE.Group();
  shell.name = "assembly-shell";
  shell.userData.cutaway = true;
  cylX(shell, 0.55, 1.7, shellMat, 0, 32);
  const gearbox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.15, 1.15), shellMat);
  gearbox.position.set(-1.4, ASSEMBLY_AXIS_Y, 0);
  shell.add(gearbox);
  group.add(shell);

  // Motor: barril del rotor sobre el eje + anillos.
  const motor = partGroup("motor");
  cylX(motor, 0.36, 1.2, rotorMat, 0, 20);
  for (const rx of [-0.6, 0.6]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 10, 24), gear);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(rx, ASSEMBLY_AXIS_Y, 0);
    motor.add(ring);
  }
  group.add(motor);

  // Sol: eje + piñón GE1288 dentro de la caja.
  const sun = partGroup("sun");
  cylX(sun, 0.1, 2.6, gear, -0.3, 12);
  const sunDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 16), gear);
  sunDisc.rotation.z = Math.PI / 2;
  sunDisc.position.set(-1.4, ASSEMBLY_AXIS_Y, 0);
  sun.add(sunDisc);
  group.add(sun);

  // Planetas: 3 de alta alrededor del sol + 4 de baja; un solo grupo legible.
  const planets = partGroup("planets");
  const pinion = (x: number, y: number, z: number, discR: number): void => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(discR, discR, 0.3, 12), gear);
    disc.rotation.z = Math.PI / 2;
    disc.position.set(x, y, z);
    planets.add(disc);
  };
  for (let k = 0; k < GDY106_TRAIN.hs.planets; k++) {
    const a = (k / GDY106_TRAIN.hs.planets) * Math.PI * 2;
    pinion(-1.4, ASSEMBLY_AXIS_Y + Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0.11);
  }
  for (let k = 0; k < GDY106_TRAIN.ls.planets; k++) {
    const a = (k / GDY106_TRAIN.ls.planets) * Math.PI * 2;
    pinion(-1.08, ASSEMBLY_AXIS_Y + Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.13);
  }
  group.add(planets);

  // Portaplanetas: discos de alta y baja hacia el tubo de torsión.
  const carrier = partGroup("carrier");
  cylX(carrier, 0.28, 0.1, gear, -0.85, 18);
  cylX(carrier, 0.44, 0.08, gear, -1.15, 20);
  group.add(carrier);

  // Maza: tubo de torsión + maza sobre rodamientos cónicos + neumático.
  const hub = partGroup("hub");
  cylX(hub, 0.16, 1.1, gear, 0.75, 14);
  cylX(hub, 0.34, 0.7, darkSteel, 0.75, 18);
  for (const [bx, br] of [[0.45, 0.26], [1.05, 0.3]] as Array<[number, number]>) {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(br, br * 0.78, 0.12, 16), brass);
    cone.rotation.z = Math.PI / 2;
    cone.position.set(bx, ASSEMBLY_AXIS_Y, 0);
    hub.add(cone);
  }
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 12, 28), darkSteel);
  tire.rotation.y = Math.PI / 2;
  tire.position.set(1.35, ASSEMBLY_AXIS_Y, 0);
  hub.add(tire);
  group.add(hub);

  // Frenos húmedos: discos + pulmón del freno de estacionamiento.
  const brakes = partGroup("brakes");
  for (const bx of [1.18, 1.28]) {
    cylX(brakes, 0.4, 0.05, gear, bx, 20);
  }
  const springCan = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12), brass);
  springCan.position.set(1.0, ASSEMBLY_AXIS_Y + 0.55, 0);
  brakes.add(springCan);
  group.add(brakes);

  const parts: Record<AssemblyPartId, THREE.Group> = { motor, sun, planets, carrier, hub, brakes };
  return { group, parts, shellOpacity: CUTAWAY_SHELL_OPACITY };
}

export function applyIsolation(
  parts: Record<AssemblyPartId, THREE.Group>,
  isolated: AssemblyPartId | null,
): void {
  for (const id of ASSEMBLY_PART_IDS) {
    parts[id].visible = isolated === null || isolated === id;
  }
}

export interface MountedAssembly {
  syncCamera(): void;
  dispose(): void;
}

// Montaje en el host diferido: crea el stage compartido, puebla el corte y
// anima la desmultiplicación (sol rápido, rueda lenta) salvo movimiento reducido.
export function mountAssemblyScene(host: HTMLElement, controls: AssemblyControls): MountedAssembly {
  // El nodo de montaje B03 no genera caja (display:contents): se le da
  // tamaño propio en línea para que el canvas del stage mida algo visible.
  host.style.display = "block";
  host.style.position = "relative";
  host.style.width = "100%";
  host.style.minHeight = "320px";
  host.style.aspectRatio = "16 / 9";
  const stage = createStage(host, {
    preset: "studio",
    cameraPosition: [4.4, 3.4, 5.4],
    cameraTarget: [0, 1.6, 0],
    sun: { shadowBox: 5, target: [0, 1, 0] },
    minDistance: ASSEMBLY_VIEW_LIMITS.minDistance,
    maxDistance: ASSEMBLY_VIEW_LIMITS.maxDistance,
    maxPolarAngle: ASSEMBLY_VIEW_LIMITS.maxPolarAngle,
  });
  const built = buildAssemblyScene();
  stage.scene.add(built.group);
  stage.renderer.domElement.setAttribute("role", "img");
  stage.renderer.domElement.setAttribute(
    "aria-label",
    "GDY106 assembly cutaway: motor, sun, planets, carriers, hub and wet brakes, 32.62 to 1 reduction",
  );

  // La desmultiplicación se demuestra girando cada extremo a su velocidad:
  // el sol al régimen del rotor y la maza al de rueda (vía stageSpeeds).
  const speeds = stageSpeeds(3000);
  const toRadPerSecond = (rpm: number): number => (rpm * Math.PI * 2) / 60;
  const visual = 0.02;
  const sunRate = toRadPerSecond(speeds.shaftRpm) * visual;
  const wheelRate = toRadPerSecond(speeds.wheelRpm) * visual;
  const stopFrame = stage.onFrame((dt) => {
    if (stage.prefersReducedMotion()) return;
    built.parts.sun.rotation.x += dt * sunRate;
    built.parts.planets.rotation.x += dt * ((sunRate + wheelRate) / 2);
    built.parts.carrier.rotation.x += dt * wheelRate * 2;
    built.parts.hub.rotation.x += dt * wheelRate;
    applyIsolation(built.parts, controls.getState().isolated);
  });
  applyIsolation(built.parts, controls.getState().isolated);

  // Los botones de la UI mueven la misma vista que el arrastre orbital.
  const syncCamera = (): void => {
    const position = cameraPositionFor(controls.getState());
    stage.camera.position.set(position.x, position.y, position.z);
    stage.controls.update();
  };

  return {
    syncCamera,
    dispose() {
      stopFrame();
      stage.dispose();
    },
  };
}
