// T4 haul-cycle FSM (Sim B, S2).
//
// Auto-loop: LOAD (6 s, stopped+leveled+engine-on, RECAL) -> HAUL (12 s,
// moving) -> DUMP (6 s, stopped+tilt, RECAL) -> WAIT (5 s) -> repeat.
// Loop period is 29 s.
//
// WAIT doubles as the empty return drive in this slice. A single moving
// state cannot close a 4-zone loop otherwise: holds at two distinct pads
// need two moves, and the Done criteria allow only HAUL as moving. So the
// WAIT pad is painted on the return lane and the truck drives it back to
// the loader during WAIT. The RECAL badge follows measured stillness (not
// the state name), so it stays STANDBY during the WAIT return and lights
// the moment the truck docks at LOAD / DUMP. See docs/t4-truck-cycle.md.

export type HaulState = "LOAD" | "HAUL" | "DUMP" | "WAIT";

export const HAUL_ORDER: HaulState[] = ["LOAD", "HAUL", "DUMP", "WAIT"];

export const HAUL_DURATIONS: Record<HaulState, number> = {
  LOAD: 6,
  HAUL: 12,
  DUMP: 6,
  WAIT: 5,
};

/** Loop period (s): 6 + 12 + 6 + 5. */
export const CYCLE_TOTAL: number =
  HAUL_DURATIONS.LOAD +
  HAUL_DURATIONS.HAUL +
  HAUL_DURATIONS.DUMP +
  HAUL_DURATIONS.WAIT;

export interface PhaseInfo {
  state: HaulState;
  /** Seconds into the current state. */
  tInState: number;
  /** Seconds into the current 29 s loop. */
  tCycle: number;
}

/** Phase for an elapsed clock (seconds); loops every CYCLE_TOTAL. */
export function stateAt(elapsed: number): PhaseInfo {
  const tCycle = ((elapsed % CYCLE_TOTAL) + CYCLE_TOTAL) % CYCLE_TOTAL;
  let acc = 0;
  for (const s of HAUL_ORDER) {
    const d = HAUL_DURATIONS[s];
    if (tCycle < acc + d) return { state: s, tInState: tCycle - acc, tCycle };
    acc += d;
  }
  return { state: "LOAD", tInState: 0, tCycle: 0 };
}

/** Live-motion states. WAIT is the empty return leg (see note above). */
export function isMovingState(state: HaulState): boolean {
  return state === "HAUL" || state === "WAIT";
}

/**
 * Recalibration window: stopped + leveled + engine-on. The chassis never
 * tilts (only the dump bed does) and the engine stays on for the whole
 * demo loop, so this reduces to the stopped states LOAD / DUMP.
 */
export function isRecalState(state: HaulState): boolean {
  return state === "LOAD" || state === "DUMP";
}

export const HAUL_STATE_CSS: Record<HaulState, string> = {
  LOAD: "#2fbf71",
  HAUL: "#3a7bd5",
  DUMP: "#f5a623",
  WAIT: "#8b98ad",
};

export const HAUL_STATE_HEX: Record<HaulState, number> = {
  LOAD: 0x2fbf71,
  HAUL: 0x3a7bd5,
  DUMP: 0xf5a623,
  WAIT: 0x8b98ad,
};

export const HAUL_STATE_BLURB: Record<HaulState, string> = {
  LOAD: "Stopped at the loader, leveled, engine on. RECAL window.",
  HAUL: "Moving, loaded, loader to crusher. Recalibration gated.",
  DUMP: "Stopped at the crusher, bed tilts, chassis stays level. RECAL window.",
  WAIT: "Empty return drive on the queue lane. Recalibration gated.",
};

/** Truck slot [x, z] at the loader. */
export const LOAD_POS: [number, number] = [-8, -3];

/** Truck slot [x, z] at the crusher. */
export const DUMP_POS: [number, number] = [8, -3];

/** WAIT return polyline (empty drive back to the loader). */
export const WAIT_PATH: Array<[number, number]> = [
  [8, -3],
  [8, 3.2],
  [-8, 3.2],
  [-8, -3],
];
