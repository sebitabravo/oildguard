import { useEffect, useRef, useState } from "preact/hooks";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import type { BeatId } from "./beats";
import {
  createSceneHost,
  detectReducedMotion,
  detectWebGL,
  type LandingSceneId,
  type SceneLoadState,
} from "./sceneHost";
import type {
  AssemblyControls,
  AssemblyPartId,
  AssemblyReduction,
} from "./scenes/assembly";
import {
  CYCLE_TOTAL,
  createHaulCyclePlayer,
  haulOilVisual,
  type HaulPlayDirection,
} from "./scenes/haulCycle";
import SensorDetails from "./SensorDetails";
import PressurePlot from "./PressurePlot";
import assemblyPoster from "./posters/assembly.svg";
import sensorsPoster from "./posters/sensors.svg";
import cyclePoster from "./posters/cycle.svg";
import oilPoster from "./posters/oil.svg";
import "./landing.css";

// URL empaquetada por escena; la identidad exacta del archivo vive en sceneHost.
type PosterAsset = string | { readonly src: string };

// Astro tipa el SVG como componente con `.src`; el runner de pruebas lo
// entrega como ruta. Ambas formas resuelven a la URL del póster.
function posterUrl(asset: PosterAsset): string {
  return typeof asset === "string" ? asset : asset.src;
}

const SCENE_POSTER_URLS: Record<LandingSceneId, string> = {
  assembly: posterUrl(assemblyPoster),
  sensors: posterUrl(sensorsPoster),
  cycle: posterUrl(cyclePoster),
  oil: posterUrl(oilPoster),
};

type SceneCopy = { readonly alt: string; readonly caption: string; readonly note: string };

// Copia solo español en línea (B03 no toca el diccionario): la portada se
// lee sin JS ni WebGL, sin prometer el 3D que aún no existe.
const SCENE_COPY: Record<LandingSceneId, SceneCopy> = {
  assembly: {
    alt: "Diagrama de corte estático del modelo de estudio del conjunto de rueda GDY106",
    caption: "Conjunto en estudio · vista estática",
    note: "El 3D interactivo carga solo en vista; este póster lo reemplaza sin WebGL.",
  },
  sensors: {
    alt: "Diagrama estático de las cuatro entradas de señal del diseño en la rueda",
    caption: "Entradas de señal · vista estática",
    note: "El 3D interactivo carga solo en vista; este póster lo reemplaza sin WebGL.",
  },
  cycle: {
    alt: "Diagrama estático de las fases de carga, acarreo, descarga y espera",
    caption: "Ciclo de acarreo · vista estática",
    note: "El 3D interactivo carga solo en vista; este póster lo reemplaza sin WebGL.",
  },
  oil: {
    alt: "Diagrama estático del estudio de presión en ventana de asentamiento",
    caption: "Condición del aceite · vista estática",
    note: "El 3D interactivo carga solo en vista; este póster lo reemplaza sin WebGL.",
  },
};

export default function LandingScene({
  scene,
  storyBeat,
  storyProgress = 0,
  storyActive = false,
}: {
  scene: LandingSceneId;
  storyBeat?: BeatId;
  storyProgress?: number;
  storyActive?: boolean;
}) {
  const copy = SCENE_COPY[scene];
  const [state, setState] = useState<SceneLoadState>("poster");
  const [reduction, setReduction] = useState<AssemblyReduction | null>(null);
  const [partLabels, setPartLabels] = useState<ReadonlyArray<{ id: AssemblyPartId; label: string }> | null>(null);
  const [isolated, setIsolated] = useState<AssemblyPartId | null>(null);
  const figureRef = useRef<HTMLElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<AssemblyControls | null>(null);
  const mountedRef = useRef<{ syncCamera(): void; dispose(): void } | null>(null);
  const mountingRef = useRef(false);
  // Ciclo de acarreo (B06): el reproductor vive en el módulo y la UI solo
  // refleja su fase y su aceite; avanza solo en cliente y sin movimiento reducido.
  const cyclePlayerRef = useRef<ReturnType<typeof createHaulCyclePlayer> | null>(null);
  if (cyclePlayerRef.current === null) cyclePlayerRef.current = createHaulCyclePlayer(0, 1);
  const [cycleDirection, setCycleDirection] = useState<HaulPlayDirection>(1);
  const [cycleTick, setCycleTick] = useState(0);
  // Aceite en corte (B07): el 3D monta la piscina h(V) y la gráfica vive
  // junto al póster sin exigir WebGL.
  const [oilReady, setOilReady] = useState(false);
  const oilMountedRef = useRef<{ dispose(): void } | null>(null);

  // Números trazados al manual (B01): el total manda, las etapas van
  // redondeadas a tres decimales como en la pantalla del banco.
  const decimal = (value: number, digits: number): string => formatNumber(value, digits);

  useEffect(() => {
    // Sin IntersectionObserver no hay diferido fiable: se conserva el póster.
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const host = createSceneHost(scene, {
      webglAvailable: detectWebGL(),
      prefersReducedMotion: detectReducedMotion(),
    });
    const figure = figureRef.current;
    if (!figure) {
      host.dispose();
      return;
    }
    let alive = true;
    const sync = () => {
      if (alive) setState(host.getState());
    };
    // El corte del conjunto se monta solo en vista, con WebGL y sin
    // movimiento reducido; cualquier fallo conserva el póster B03.
    const mountAssembly = (): void => {
      if (scene !== "assembly" || mountingRef.current || mountedRef.current) return;
      if (!detectWebGL() || detectReducedMotion()) return;
      const mountEl = mountRef.current;
      if (!mountEl) return;
      mountingRef.current = true;
      import("./scenes/assembly").then(
        (mod) => {
          if (!alive) return;
          const controls = mod.createAssemblyControls();
          controlsRef.current = controls;
          try {
            mountedRef.current = mod.mountAssemblyScene(mountEl, controls);
          } catch {
            mountingRef.current = false;
            return;
          }
          setReduction(mod.assemblyReduction());
          setPartLabels(mod.ASSEMBLY_PARTS.map((part) => ({ id: part.id, label: part.label })));
          setIsolated(controls.getState().isolated);
          setState("ready-3d");
        },
        () => {
          mountingRef.current = false;
        },
      );
    };
    // El aceite en corte se monta solo en vista, con WebGL y sin
    // movimiento reducido; cualquier fallo conserva el póster B03.
    const mountOil = (): void => {
      if (scene !== "oil" || mountingRef.current || mountedRef.current || oilMountedRef.current) return;
      if (!detectWebGL() || detectReducedMotion()) return;
      const mountEl = mountRef.current;
      if (!mountEl) return;
      mountingRef.current = true;
      import("./scenes/oil").then(
        (mod) => {
          if (!alive) return;
          try {
            oilMountedRef.current = mod.mountOilScene(mountEl);
          } catch {
            mountingRef.current = false;
            return;
          }
          setOilReady(true);
          setState("ready-3d");
        },
        () => {
          mountingRef.current = false;
        },
      );
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          host.onViewportChange(entry.isIntersecting);
          sync();
          // El chunk B04+ resuelve async: re-sincroniza al asentarse.
          queueMicrotask(sync);
          setTimeout(sync, 0);
          if (entry.isIntersecting) mountAssembly();
          if (entry.isIntersecting) mountOil();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(figure);
    return () => {
      alive = false;
      observer.disconnect();
      host.dispose();
      mountingRef.current = false;
      mountedRef.current?.dispose();
      mountedRef.current = null;
      oilMountedRef.current?.dispose();
      oilMountedRef.current = null;
      controlsRef.current = null;
    };
  }, [scene]);

  // El ciclo avanza en cliente con su reloj de 29 s; con movimiento reducido
  // se queda en la fase inicial y los botones eligen el sentido.
  useEffect(() => {
    if (scene !== "cycle" || typeof window === "undefined") return;
    if (detectReducedMotion()) return;
    const id = window.setInterval(() => {
      cyclePlayerRef.current?.advance(CYCLE_TOTAL / 116);
      setCycleTick((tick) => tick + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [scene, cycleDirection]);

  // Controles del corte: giran o acercan la misma vista del arrastre y
  // aíslan una pieza; el canvas sigue siendo decorativo tras los controles.
  const drive = (apply: (controls: AssemblyControls) => void): void => {
    const controls = controlsRef.current;
    const mounted = mountedRef.current;
    if (!controls || !mounted) return;
    apply(controls);
    mounted.syncCamera();
    setIsolated(controls.getState().isolated);
  };

  const showAssemblyControls = scene === "assembly" && state === "ready-3d" && reduction !== null;

  // Selectores B05: viven junto al póster sin exigir WebGL, con la misma
  // verdad de origen que la tabla de puntos de servicio.
  const showSensorDetails = scene === "sensors";

  // Ciclo B06: vive junto al póster sin exigir WebGL; la fase y el aceite
  // salen del FSM y los botones solo eligen el sentido de reproducción.
  const showCycleDetails = scene === "cycle";
  // Aceite B07: la gráfica de sensibilidad vive junto al póster sin exigir
  // WebGL; el canvas 3D solo reemplaza al póster cuando monta la piscina.
  const showOilDetails = scene === "oil";
  const showOilCanvas = scene === "oil" && oilReady;
  const cyclePhase = cyclePlayerRef.current?.getPhase();
  const cycleVisual =
    cyclePhase !== undefined ? haulOilVisual(cyclePhase.state) : null;
  void cycleTick;

  const steerCycle = (direction: HaulPlayDirection): void => {
    cyclePlayerRef.current?.setDirection(direction);
    setCycleDirection(direction);
  };

  // El relato solo pinta el estado del scroll: la cámara del usuario se
  // conserva para que el gesto rápido no produzca saltos.
  // Sin progreso finito se informa cero en es-CL, no "0.000".
  const storyProgressText = Number.isFinite(storyProgress) ? formatNumber(storyProgress, 3) : formatNumber(0, 3);
  return <figure className="landing__scene" data-scene={scene} data-scene-state={state} data-story-beat={storyBeat ?? scene} data-story-progress={storyProgressText} data-story-active={storyActive ? "true" : "false"} ref={figureRef}>
    {!showAssemblyControls && !showOilCanvas && (
      <img className="landing__scene-poster" src={SCENE_POSTER_URLS[scene]} alt={copy.alt} loading="lazy" />
    )}
    <div className="landing__scene-host" data-deferred="true" aria-hidden="true" ref={mountRef} />
    {showAssemblyControls && reduction && (
      <div className="landing__assembly-controls">
        <p>
          <strong data-reduction="overall">
            {decimal(reduction.overall, 2)}:1
          </strong>
          <span>
            {decimal(reduction.highSpeed, 3)}:1 × {decimal(reduction.lowSpeed, 3)}:1 ·{" "}
            manual Komatsu
          </span>
        </p>
        <div>
          <button
            type="button"
            className="landing__button landing__button--secondary"
            onClick={() => drive((controls) => controls.orbit(-0.4, 0))}
            aria-label="Girar a la izquierda"
          >
            ⟲
          </button>
          <button
            type="button"
            className="landing__button landing__button--secondary"
            onClick={() => drive((controls) => controls.orbit(0.4, 0))}
            aria-label="Girar a la derecha"
          >
            ⟳
          </button>
          <button
            type="button"
            className="landing__button landing__button--secondary"
            onClick={() => drive((controls) => controls.zoom(0.8))}
          >
            Acercar
          </button>
          <button
            type="button"
            className="landing__button landing__button--secondary"
            onClick={() => drive((controls) => controls.zoom(1.25))}
          >
            Alejar
          </button>
          <button
            type="button"
            className="landing__button landing__button--secondary"
            onClick={() => drive((controls) => controls.reset())}
          >
            Restablecer
          </button>
          <label>
            Pieza{" "}
            <select
              value={isolated ?? ""}
              onChange={(event) => {
                const value = (event.target as HTMLSelectElement).value;
                drive((controls) => controls.isolate((value === "" ? null : value) as AssemblyPartId | null));
              }}
            >
              <option value="">Conjunto completo</option>
              {(partLabels ?? []).map((part) => (
                <option key={part.id} value={part.id}>
                  {part.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    )}
    <figcaption><strong>{copy.caption}</strong><span>{showAssemblyControls
      ? "3D interactivo · arrastra para orbitar, usa los controles para zoom y piezas."
      : copy.note}</span></figcaption>
    {showSensorDetails && <SensorDetails />}
    {showCycleDetails && cyclePhase && cycleVisual && (
      <div
        className="landing__cycle-details"
        data-cycle="true"
        data-phase={cyclePhase.state}
        data-oil={cycleVisual.state}
      >
        <p>
          <strong>{t("landing.cycle.title")}</strong>
        </p>
        <p>
          {t("landing.cycle.phase")} · {cyclePhase.state} ·{" "}
          {t("landing.cycle.oil")} ·{" "}
          {t(cycleVisual.state === "settled" ? "landing.cycle.settled" : "landing.cycle.agitated")}
        </p>
        <div
          data-oil-visual={cycleVisual.state}
          aria-hidden="true"
          style={{
            height: "8px",
            borderRadius: "999px",
            background: "currentColor",
            opacity: String(cycleVisual.opacity),
            transform: `rotate(${String(cycleVisual.tiltDeg)}deg)`,
          }}
        />
        <p>{t("landing.cycle.pauseNote")}</p>
        <p>{t("landing.cycle.source")}</p>
        <div className="landing__actions" role="group" aria-label={t("landing.cycle.title")}>
          <button
            type="button"
            className="landing__button landing__button--secondary"
            data-cycle-direction="forward"
            aria-pressed={cycleDirection === 1}
            onClick={() => steerCycle(1)}
          >
            {t("landing.cycle.forward")}
          </button>
          <button
            type="button"
            className="landing__button landing__button--secondary"
            data-cycle-direction="reverse"
            aria-pressed={cycleDirection === -1}
            onClick={() => steerCycle(-1)}
          >
            {t("landing.cycle.reverse")}
          </button>
        </div>
      </div>
    )}
    {showOilDetails && <PressurePlot />}
  </figure>;
}
