// Anfitrión persistente de escenas del landing: difiere el chunk 3D
// independiente hasta que la escena entra al viewport y conserva el póster
// estático sin WebGL, con movimiento reducido o si el chunk falla.
import { sceneForBeat } from "./storyProgress";
import type { BeatId } from "./beats";
export type LandingSceneId = "assembly" | "sensors" | "cycle" | "oil";

export const LANDING_SCENES: readonly LandingSceneId[] = ["assembly", "sensors", "cycle", "oil"];

// Identidad de origen de cada póster (ruta exacta del repo); el componente
// resuelve la URL empaquetada desde ese mismo archivo.
export const SCENE_POSTERS: Record<LandingSceneId, string> = {
  assembly: "frontend/src/platform/landing/posters/assembly.svg",
  sensors: "frontend/src/platform/landing/posters/sensors.svg",
  cycle: "frontend/src/platform/landing/posters/cycle.svg",
  oil: "frontend/src/platform/landing/posters/oil.svg",
};

export function posterFor(scene: LandingSceneId): string {
  const poster = SCENE_POSTERS[scene];
  if (!poster) throw new Error(`Unknown landing scene: ${String(scene)}`);
  return poster;
}

// El scroll siempre es nativo: el host observa visibilidad, nunca la dirige.
export const SCROLL_CONTRACT = "native" as const;

// Beat activo del relato hacia su escena: mantiene beat, escena y cámara
// de acuerdo sin mover el scroll.
export function storySceneForBeat(beat: BeatId): LandingSceneId | null {
  return sceneForBeat(beat);
}

// La escena acompaña al beat solo cuando es su escena del relato.
export function isSceneActiveForBeat(scene: LandingSceneId, beat: BeatId): boolean {
  return storySceneForBeat(beat) === scene;
}

export type SceneLoadState = "poster" | "loading-3d" | "ready-3d";

export type SceneVisibility = {
  readonly inViewport: boolean;
  readonly webglAvailable: boolean;
  readonly prefersReducedMotion?: boolean;
  readonly moduleLoaded?: boolean;
};

export function shouldDeferScene(view: { readonly inViewport: boolean }): boolean {
  return !view.inViewport;
}

export function resolveSceneState(view: SceneVisibility): { readonly state: SceneLoadState } {
  if (!view.inViewport || !view.webglAvailable || view.prefersReducedMotion) return { state: "poster" };
  return { state: view.moduleLoaded ? "ready-3d" : "loading-3d" };
}

export type SceneModuleImporter = () => Promise<unknown>;

// Importador por escena: el corte del conjunto (B04), los sensores (B05),
// el ciclo de acarreo (B06) y el aceite en corte (B07) ya existen como
// chunks diferidos.
export function sceneImporterFor(scene: LandingSceneId): SceneModuleImporter {
  if (scene === "assembly") return () => import("./scenes/assembly");
  if (scene === "sensors") return () => import("./scenes/sensors");
  if (scene === "cycle") return () => import("./scenes/haulCycle");
  if (scene === "oil") return () => import("./scenes/oil");
  return () => Promise.reject(new Error(`Landing 3D chunk pending: ${scene}`));
}

export type SceneHostOptions = {
  readonly webglAvailable: boolean;
  readonly prefersReducedMotion?: boolean;
  readonly importScene?: SceneModuleImporter;
};

export type SceneHost = {
  readonly scene: LandingSceneId;
  getState(): SceneLoadState;
  onViewportChange(inViewport: boolean): void;
  dispose(): void;
};

export function createSceneHost(scene: LandingSceneId, options: SceneHostOptions): SceneHost {
  // Sin importador explícito se usa el de la escena: cada escena carga su
  // chunk diferido y el póster queda si el chunk falla.
  const importScene: SceneModuleImporter = options.importScene ?? sceneImporterFor(scene);
  let state: SceneLoadState = "poster";
  let loading = false;
  let disposed = false;
  return {
    scene,
    getState: () => state,
    onViewportChange(inViewport: boolean) {
      if (disposed || loading) return;
      const next = resolveSceneState({
        inViewport,
        webglAvailable: options.webglAvailable,
        prefersReducedMotion: options.prefersReducedMotion,
      });
      if (next.state !== "loading-3d") {
        state = "poster";
        return;
      }
      loading = true;
      state = "loading-3d";
      importScene().then(
        () => {
          if (!disposed) state = "ready-3d";
        },
        () => {
          loading = false;
          if (!disposed) state = "poster";
        },
      );
    },
    dispose() {
      disposed = true;
    },
  };
}

export function detectWebGL(): boolean {
  // Guardia SSR: sin DOM no hay WebGL y el póster queda como portada.
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function detectReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
