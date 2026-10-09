import { FleetSim } from "../../twin/fleet/fleetSim";
import { createFleetStore, type FleetStore } from "../../twin/fleet/fleetStore";
import { createPitWorld, type PitWorld } from "../../twin/pit/pitLayout";

// Mundo compartido de la vista Mina y flota: el foso (datos puros) y el almacén de
// la flota viven a nivel de módulo, así la flota sigue su ciclo al cambiar de pestaña
// y el panel de monitoreo puede leer el mismo almacén sin pasar por la escena 3D.

export type MineCam = "pit" | "hero" | "cab" | "side" | "wheel" | "chase" | "shovel" | "crusher" | "ramp" | "free" | "custom";

export interface MineUrl {
  cam: MineCam | null;
  /** Segundos de simulación a avanzar antes de mostrar (capturas reproducibles). */
  t: number;
  pause: boolean;
  scale: number | null;
  sel: string | null;
  debug: "scene" | null;
  seed: number;
}

const CAMS: MineCam[] = ["pit", "hero", "cab", "side", "wheel", "chase", "shovel", "crusher", "ramp", "free", "custom"];

export function normalizeMineCam(raw: string | null): MineCam | null {
  return raw && (CAMS as string[]).includes(raw) ? (raw as MineCam) : null;
}

export function readMineUrl(search: string = window.location.search): MineUrl {
  const q = new URLSearchParams(search);
  const cam = q.get("cam");
  const scale = Number(q.get("scale"));
  const time = Number(q.get("t"));
  const rawSeed = q.get("seed");
  const seed = rawSeed?.trim() ? Number(rawSeed) : 1;
  return {
    cam: normalizeMineCam(cam),
    t: Number.isFinite(time) && time > 0 ? time : 0,
    pause: q.get("pause") === "1",
    scale: Number.isFinite(scale) && scale > 0 ? scale : null,
    sel: q.get("sel"),
    debug: q.get("debug") ? "scene" : null,
    seed: Number.isFinite(seed) ? seed : 1,
  };
}

let world: { seed: number; value: PitWorld } | null = null;
export function getPitWorld(seed = readMineUrl().seed): PitWorld {
  if (!world || world.seed !== seed) world = { seed, value: createPitWorld({ seed }) };
  return world.value;
}

let store: FleetStore | null = null;

function makeStore(url: MineUrl): FleetStore {
  const sim = new FleetSim({ route: getPitWorld(url.seed).route, trucks: 5, seed: url.seed });
  const fleet = createFleetStore(sim, { timeScale: url.scale ?? 10, paused: url.pause, selectedId: url.sel ?? "OG-03" });
  // Avance en pasos de 1 s: el mismo ?t= reproduce siempre el mismo instante.
  if (url.t > 0) fleet.step(url.t);
  return fleet;
}

/** Almacén único de la flota (se crea con los parámetros de la URL la primera vez). */
export function getFleetStore(): FleetStore {
  if (!store) store = makeStore(readMineUrl());
  return store;
}

/** Reinicia la flota al estado inicial (botón Reiniciar). */
export function resetFleetStore(): FleetStore {
  const prev = store;
  const url = readMineUrl();
  store = makeStore({ ...url, t: 0 });
  store.select(prev?.getSnapshot().selectedId ?? "OG-03");
  store.setPaused(prev?.getSnapshot().paused ?? false);
  store.setTimeScale(prev?.getSnapshot().timeScale ?? 10);
  return store;
}
