import {
  CYCLE_TOTAL,
  HAUL_DURATIONS,
  HAUL_ORDER,
  isMovingState,
  isRecalState,
  stateAt,
  type HaulState,
  type PhaseInfo,
} from "../../../sim/truck/cycle";

// Escena del ciclo de acarreo (B06): reutiliza las cuatro fases del FSM sin
// inventar pausas; solo LOAD/DUMP son pausas estacionarias y el aceite se lee
// agitado en movimiento y asentado en detención.
export const HAUL_CYCLE_PHASES: readonly HaulState[] = [...HAUL_ORDER];

export const HAUL_CYCLE_PAUSES = ["LOAD", "DUMP"] as const;

export type HaulCyclePause = (typeof HAUL_CYCLE_PAUSES)[number];

// Trazabilidad B01 §2: cuatro fases con duraciones del FSM; WAIT es retorno
// vacío en movimiento, nunca una pausa.
export const HAUL_CYCLE_SOURCE =
  "Four phases LOAD 6 s / HAUL 12 s / DUMP 6 s / WAIT 5 s (29 s loop) from " +
  "frontend/src/sim/truck/cycle.ts:1-31; only LOAD/DUMP stationary " +
  "(isRecalState, cycle.ts:63-65), WAIT moving (isMovingState, cycle.ts:54-56); " +
  "traced in docs/research/landing-claims.md §2 and docs/t4-truck-cycle.md:5-8.";

export type HaulOilState = "agitated" | "settled";

export function isHaulPause(state: HaulState): boolean {
  return state === "LOAD" || state === "DUMP";
}

// La compuerta rechaza cualquier tercera o cuarta pausa y cualquier pausa
// fuera de los estados detenidos LOAD/DUMP.
export function assertHaulPausesSupported(pauses: readonly string[]): void {
  const expected: readonly string[] = [...HAUL_CYCLE_PAUSES];
  const missing = expected.filter((pause) => !pauses.includes(pause));
  const extra = pauses.filter((pause) => !expected.includes(pause));
  if (missing.length > 0 || extra.length > 0 || pauses.length !== expected.length) {
    throw new Error(
      `Haul cycle supports exactly the LOAD/DUMP pauses, got: ${pauses.join(", ")}`,
    );
  }
  for (const pause of pauses) {
    if (!isRecalState(pause as HaulState) || isMovingState(pause as HaulState)) {
      throw new Error(`Haul pause must be stationary (LOAD/DUMP), got: ${pause}`);
    }
  }
}

// En movimiento el aceite se lee agitado; detenido se lee asentado. La
// distinción sale del FSM (RECAL = detenido), no de un umbral inventado.
export function oilStateFor(state: HaulState): HaulOilState {
  return isRecalState(state) ? "settled" : "agitated";
}

export interface HaulOilVisual {
  readonly state: HaulOilState;
  /** Inclinación ilustrativa de la superficie: 0 en reposo, visible en marcha. */
  readonly tiltDeg: number;
  readonly opacity: number;
  readonly settled: boolean;
}

// Visual mínima y distinguible: la superficie asentada queda plana y la
// agitada queda inclinada; el test exige que difieran.
export function haulOilVisual(state: HaulState): HaulOilVisual {
  const oil = oilStateFor(state);
  if (oil === "settled") return { state: oil, tiltDeg: 0, opacity: 0.85, settled: true };
  return { state: oil, tiltDeg: 6, opacity: 0.55, settled: false };
}

export type HaulPlayDirection = 1 | -1;

export interface HaulCyclePlayer {
  getElapsed(): number;
  getDirection(): HaulPlayDirection;
  setDirection(direction: HaulPlayDirection): void;
  advance(deltaSeconds: number): void;
  getPhase(): PhaseInfo;
  getOilState(): HaulOilState;
  isPausePhase(): boolean;
}

// Reproductor reversible del ciclo: avanza o retrocede sobre el mismo reloj
// de 29 s del FSM, con envoltura en ambos sentidos.
export function createHaulCyclePlayer(
  initial = 0,
  direction: HaulPlayDirection = 1,
): HaulCyclePlayer {
  if (direction !== 1 && direction !== -1) throw new Error("Haul direction must be 1 or -1");
  let elapsed = ((initial % CYCLE_TOTAL) + CYCLE_TOTAL) % CYCLE_TOTAL;
  let dir: HaulPlayDirection = direction;
  return {
    getElapsed: () => elapsed,
    getDirection: () => dir,
    setDirection(next) {
      if (next !== 1 && next !== -1) throw new Error("Haul direction must be 1 or -1");
      dir = next;
    },
    advance(deltaSeconds) {
      if (!Number.isFinite(deltaSeconds)) throw new Error("Haul advance must be finite seconds");
      elapsed = (((elapsed + dir * deltaSeconds) % CYCLE_TOTAL) + CYCLE_TOTAL) % CYCLE_TOTAL;
    },
    getPhase: () => stateAt(elapsed),
    getOilState: () => oilStateFor(stateAt(elapsed).state),
    isPausePhase: () => isHaulPause(stateAt(elapsed).state),
  };
}

export { CYCLE_TOTAL, HAUL_DURATIONS };
