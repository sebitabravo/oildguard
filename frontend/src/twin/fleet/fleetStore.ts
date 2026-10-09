import { FleetSim, type FleetSnapshot } from "./fleetSim";

// Almacén observable para la UI: `subscribe` / `getSnapshot` calzan con
// useSyncExternalStore. La simulación avanza en cada frame con `tick`, pero los
// snapshots se publican a ~5 Hz para no re-renderizar React 60 veces por segundo.
// La escena 3D lee el estado vivo con `live()` y no pasa por React.

export const PUBLISH_HZ = 5;
export const TIME_SCALES = [1, 10, 30] as const;
export type TimeScale = (typeof TIME_SCALES)[number];

export interface FleetStoreState {
  fleet: FleetSnapshot;
  paused: boolean;
  timeScale: number;
  selectedId: string | null;
  /** Incrementa en cada publicación; sirve de clave para memoizar. */
  version: number;
}

export interface FleetStore {
  readonly sim: FleetSim;
  subscribe(listener: () => void): () => void;
  getSnapshot(): FleetStoreState;
  /** Estado vivo (no publicado) del simulador, para el bucle de render. */
  live(): FleetSnapshot;
  /** Avanza `dtReal` segundos de reloj real, multiplicados por la compresión de tiempo. */
  tick(dtReal: number): void;
  /** Avanza `simSeconds` de simulación sin importar la pausa (para el botón de paso). */
  step(simSeconds: number): void;
  setPaused(paused: boolean): void;
  setTimeScale(scale: number): void;
  select(id: string | null): void;
}

export function createFleetStore(sim: FleetSim, opts: { timeScale?: number; paused?: boolean; selectedId?: string | null } = {}): FleetStore {
  const listeners = new Set<() => void>();
  let timeScale = opts.timeScale ?? 10;
  let paused = opts.paused ?? false;
  let selectedId: string | null = opts.selectedId ?? null;
  let sincePublish = 0;
  let version = 0;
  let state: FleetStoreState = { fleet: sim.snapshot(timeScale), paused, timeScale, selectedId, version };

  const publish = () => {
    version += 1;
    sincePublish = 0;
    state = { fleet: sim.snapshot(timeScale), paused, timeScale, selectedId, version };
    for (const l of listeners) l();
  };

  return {
    sim,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    live: () => sim.snapshot(timeScale),
    tick(dtReal) {
      sincePublish += dtReal;
      if (!paused) sim.advance(dtReal * timeScale);
      if (sincePublish >= 1 / PUBLISH_HZ) publish();
    },
    step(simSeconds) {
      sim.advance(simSeconds);
      publish();
    },
    setPaused(next) {
      paused = next;
      publish();
    },
    setTimeScale(scale) {
      timeScale = scale;
      publish();
    },
    select(id) {
      selectedId = id;
      publish();
    },
  };
}
