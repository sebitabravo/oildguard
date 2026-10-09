import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  PRESET_DEFAULTS,
  resolveQuality,
  sunDirection,
  type Quality,
  type StagePreset,
} from "./settings";

// Stage compartido: renderer con tone mapping ACES, luz de entorno (IBL),
// sol con sombras, OrbitControls, overlay CSS2D y un único bucle rAF.
// Cada escena (camión, banco, mina) lo crea con un host y se limita a
// poblar `scene` y registrar callbacks con `onFrame`.

export type FrameCallback = (dt: number, elapsed: number) => void;

export interface SunOptions {
  elevationDeg?: number;
  azimuthDeg?: number;
  intensity?: number;
  /** Semilado de la caja ortográfica de sombra. */
  shadowBox?: number;
  /** Punto al que apunta la luz y centro de la caja de sombra. */
  target?: [number, number, number];
}

export interface FogOptions {
  /** Densidad de FogExp2; ~0.004–0.012 para neblina de polvo en el foso. */
  density: number;
  color?: THREE.ColorRepresentation;
}

export interface StageOptions {
  preset: StagePreset;
  quality?: Quality;
  exposure?: number;
  /** Solo 'studio': color de fondo. 'outdoor' usa el cielo. */
  background?: THREE.ColorRepresentation;
  fov?: number;
  near?: number;
  far?: number;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  sun?: SunOptions;
  /** Solo 'outdoor' por defecto; pasar `false` para desactivar. */
  fog?: FogOptions | false;
  minDistance?: number;
  maxDistance?: number;
  /** Límite de elevación de la órbita (rad); evita pasar bajo el suelo. */
  maxPolarAngle?: number;
}

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  /** Overlay CSS2D: agregar `CSS2DObject` (ver labels.ts) a la escena. */
  labels: CSS2DRenderer;
  /** Luz direccional principal (sol en outdoor, key en studio). */
  sun: THREE.DirectionalLight;
  host: HTMLElement;
  /** Registra un callback por frame; devuelve la función para quitarlo. */
  onFrame(cb: FrameCallback): () => void;
  setQuality(q: Quality): void;
  quality(): Quality;
  dispose(): void;
}

const MAX_DT = 0.05;

function applyShadowFlag(renderer: THREE.WebGLRenderer, sun: THREE.DirectionalLight, scene: THREE.Scene, on: boolean, size: number) {
  const changed = renderer.shadowMap.enabled !== on;
  renderer.shadowMap.enabled = on;
  sun.castShadow = on;
  if (on && sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    // Forzar la reasignación del render target con el nuevo tamaño.
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
  if (changed) {
    // El programa del shader depende de si hay sombras: hay que recompilar.
    scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) for (const m of mat) m.needsUpdate = true;
      else if (mat) mat.needsUpdate = true;
    });
  }
}

function disposeMaterial(mat: THREE.Material) {
  for (const value of Object.values(mat)) {
    if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
  }
  mat.dispose();
}

export function createStage(host: HTMLElement, opts: StageOptions): Stage {
  const defaults = PRESET_DEFAULTS[opts.preset];
  let quality: Quality = opts.quality ?? "high";
  let settings = resolveQuality(quality, window.devicePixelRatio);

  if (getComputedStyle(host).position === "static") host.style.position = "relative";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    opts.fov ?? 45,
    1,
    opts.near ?? 0.1,
    opts.far ?? (opts.preset === "outdoor" ? 400 : 100),
  );
  camera.position.set(...(opts.cameraPosition ?? [6, 4, 8]));

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? defaults.exposure;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(settings.pixelRatio);
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.domElement.className = "og-labels";
  Object.assign(labels.domElement.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    overflow: "hidden",
  });
  host.appendChild(labels.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  if (opts.minDistance !== undefined) controls.minDistance = opts.minDistance;
  if (opts.maxDistance !== undefined) controls.maxDistance = opts.maxDistance;
  if (opts.maxPolarAngle !== undefined) controls.maxPolarAngle = opts.maxPolarAngle;
  controls.target.set(...(opts.cameraTarget ?? [0, 0, 0]));
  controls.update();

  // ---- Entorno (IBL) ----
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTargets: THREE.WebGLRenderTarget[] = [];
  scene.environmentIntensity = defaults.environmentIntensity;

  const sunOpts = opts.sun ?? {};
  const sunDir = sunDirection(
    sunOpts.elevationDeg ?? defaults.sunElevationDeg,
    sunOpts.azimuthDeg ?? defaults.sunAzimuthDeg,
  );

  if (opts.preset === "studio") {
    scene.background = new THREE.Color(opts.background ?? 0x0b111c);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    envTargets.push(target);
    scene.environment = target.texture;
    room.dispose();
  } else {
    const sky = new Sky();
    sky.scale.setScalar(450000);
    const u = sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.82;
    (u.sunPosition.value as THREE.Vector3).set(...sunDir);
    // El cielo se hornea a PMREM desde una escena aparte y luego se agrega a la principal.
    const skyScene = new THREE.Scene();
    skyScene.add(sky);
    const target = pmrem.fromScene(skyScene);
    envTargets.push(target);
    scene.environment = target.texture;
    skyScene.remove(sky);
    scene.add(sky);
  }

  // ---- Luces ----
  const hemi = new THREE.HemisphereLight(
    opts.preset === "outdoor" ? 0xcfe3ff : 0x9fb6d8,
    opts.preset === "outdoor" ? 0x4a3a28 : 0x10151f,
    defaults.hemisphereIntensity,
  );
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1dc, sunOpts.intensity ?? defaults.sunIntensity);
  const sunTarget = new THREE.Vector3(...(sunOpts.target ?? [0, 0, 0]));
  const sunDistance = (sunOpts.shadowBox ?? defaults.shadowBox) * 3;
  sun.position.copy(sunTarget).addScaledVector(new THREE.Vector3(...sunDir), sunDistance);
  sun.target.position.copy(sunTarget);
  const box = sunOpts.shadowBox ?? defaults.shadowBox;
  const cam = sun.shadow.camera;
  cam.left = -box;
  cam.right = box;
  cam.top = box;
  cam.bottom = -box;
  cam.near = 0.5;
  cam.far = sunDistance * 2;
  cam.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  applyShadowFlag(renderer, sun, scene, settings.shadows, settings.shadowMapSize);

  // ---- Niebla de polvo (outdoor) ----
  const fog = opts.fog ?? (opts.preset === "outdoor" ? { density: 0.006, color: 0xc8b698 } : false);
  if (fog) scene.fog = new THREE.FogExp2(fog.color ?? 0xc8b698, fog.density);

  // ---- Tamaño: ResizeObserver sobre el host, no window.resize ----
  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  // ---- Bucle único ----
  const callbacks = new Set<FrameCallback>();
  const clock = new THREE.Clock();
  let elapsed = 0;
  let frameId = 0;
  let disposed = false;

  const frame = () => {
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), MAX_DT);
    elapsed += dt;
    for (const cb of callbacks) cb(dt, elapsed);
    controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
  };
  const start = () => {
    if (disposed || frameId) return;
    clock.getDelta();
    frameId = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);
  if (!document.hidden) start();

  return {
    scene,
    camera,
    renderer,
    controls,
    labels,
    sun,
    host,
    onFrame(cb) {
      callbacks.add(cb);
      return () => callbacks.delete(cb);
    },
    setQuality(q) {
      quality = q;
      settings = resolveQuality(q, window.devicePixelRatio);
      renderer.setPixelRatio(settings.pixelRatio);
      applyShadowFlag(renderer, sun, scene, settings.shadows, settings.shadowMapSize);
      resize();
    },
    quality: () => quality,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      callbacks.clear();
      controls.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) for (const m of mat) disposeMaterial(m);
        else if (mat) disposeMaterial(mat);
        (o as { dispose?: () => void }).dispose?.();
      });
      if (scene.background && (scene.background as THREE.Texture).isTexture) {
        (scene.background as THREE.Texture).dispose();
      }
      scene.environment = null;
      for (const t of envTargets) t.dispose();
      pmrem.dispose();
      scene.clear();
      renderer.dispose();
      // Libera el contexto GL ya mismo: los navegadores limitan los activos (~16).
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labels.domElement.remove();
    },
  };
}
