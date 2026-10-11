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
import { generateGearGeometry } from "./gears";

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

// P2 respalda la cita del total; separar el supuesto de etapas evita atribuirlo al manual.
export const ASSEMBLY_REDUCTION_SOURCE =
  "GDY106 32.62:1 source cited in docs/thesis-annex.md:22 (P2, Komatsu 930E-5 spec sheet) " +
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

  // Carcasa abierta en corte: el hueco deja legible el tren sin crear una pieza aislable.
  const shell = new THREE.Group();
  shell.name = "assembly-shell";
  shell.userData.cutaway = true;
  const caseSection = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.78, 1.9, 36, 1, true, Math.PI * 0.1, Math.PI * 1.55),
    shellMat,
  );
  caseSection.rotation.z = Math.PI / 2;
  caseSection.position.set(-0.7, ASSEMBLY_AXIS_Y, 0);
  shell.add(caseSection);
  group.add(shell);

  // Proporciones de estudio, no CAD: la carcasa motor deja visible el rotor.
  const motor = partGroup("motor");
  const motorShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.95, 32, 1, true, Math.PI * 0.08, Math.PI * 1.55),
    shellMat,
  );
  motorShell.rotation.z = Math.PI / 2;
  motorShell.position.set(-2.15, ASSEMBLY_AXIS_Y, 0);
  motor.add(motorShell);
  cylX(motor, 0.3, 0.8, rotorMat, -2.15, 24);
  for (const rx of [-2.62, -1.68]) cylX(motor, 0.43, 0.06, gear, rx, 28);
  group.add(motor);

  // Sol y satélites comparten el eje axial; los conteos son sólo parámetros visuales.
  const sun = partGroup("sun");
  cylX(sun, 0.075, 1.8, gear, -1.75, 16);
  const sunPinion = new THREE.Mesh(
    generateGearGeometry({ teeth: 18, rootRadius: 0.19, tipRadius: 0.225, width: 0.22 }), gear,
  );
  sunPinion.name = "sun-pinion-teeth";
  sunPinion.position.set(-1.45, ASSEMBLY_AXIS_Y, 0);
  sun.add(sunPinion);
  group.add(sun);

  // Planetas escalonados axialmente para comunicar ambas etapas sin afirmar relaciones.
  const planets = partGroup("planets");
  const addPlanet = (x: number, y: number, z: number, teeth: number, rootRadius: number): void => {
    const mesh = new THREE.Mesh(
      generateGearGeometry({ teeth, rootRadius, tipRadius: rootRadius * 1.16, width: 0.2 }), gear,
    );
    mesh.name = `planet-gear-${teeth}`;
    mesh.position.set(x, y, z);
    planets.add(mesh);
  };
  for (let k = 0; k < GDY106_TRAIN.hs.planets; k++) {
    const a = (k / GDY106_TRAIN.hs.planets) * Math.PI * 2;
    addPlanet(-1.45, ASSEMBLY_AXIS_Y + Math.cos(a) * 0.43, Math.sin(a) * 0.43, 30, 0.17);
  }
  for (let k = 0; k < GDY106_TRAIN.ls.planets; k++) {
    const a = (k / GDY106_TRAIN.ls.planets) * Math.PI * 2;
    addPlanet(-0.98, ASSEMBLY_AXIS_Y + Math.cos(a) * 0.59, Math.sin(a) * 0.59, 36, 0.2);
  }
  group.add(planets);

  // Portaplanetas: placas coaxiales con brazos que dejan leer los engranajes.
  const carrier = partGroup("carrier");
  cylX(carrier, 0.16, 0.09, gear, -1.23, 20);
  cylX(carrier, 0.28, 0.09, gear, -0.76, 24);
  for (let k = 0; k < GDY106_TRAIN.hs.planets; k++) {
    const a = (k / GDY106_TRAIN.hs.planets) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.055), brass);
    arm.position.set(-1.23, ASSEMBLY_AXIS_Y + Math.cos(a) * 0.22, Math.sin(a) * 0.22);
    arm.rotation.x = -a;
    carrier.add(arm);
  }
  for (let k = 0; k < GDY106_TRAIN.ls.planets; k++) {
    const a = (k / GDY106_TRAIN.ls.planets) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.055), brass);
    arm.position.set(-0.76, ASSEMBLY_AXIS_Y + Math.cos(a) * 0.29, Math.sin(a) * 0.29);
    arm.rotation.x = -a;
    carrier.add(arm);
  }
  group.add(carrier);

  // Maza: tubo de torsión, anillos de apoyo y disco de salida.
  const hub = partGroup("hub");
  cylX(hub, 0.15, 1.35, gear, 0.1, 20);
  cylX(hub, 0.39, 0.52, darkSteel, 0.72, 28);
  for (const bx of [0.42, 1.02]) cylX(hub, 0.44, 0.07, brass, bx, 28);
  cylX(hub, 0.54, 0.12, gear, 1.12, 32);
  group.add(hub);

  // Frenos húmedos: paquete de discos separado del lado de salida.
  const brakes = partGroup("brakes");
  for (let i = 0; i < 7; i += 1) cylX(brakes, i % 2 === 0 ? 0.46 : 0.35, 0.035, i % 2 === 0 ? gear : darkSteel, 1.38 + i * 0.055, 28);
  cylX(brakes, 0.19, 0.23, brass, 1.62, 20);
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
    "GDY106 assembly cutaway: motor, sun, planets, carriers, hub and wet brakes",
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
