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

export const HAUL_STATE_BLURB_ES: Record<HaulState, string> = {
  LOAD: "Detenido en el cargador, nivelado, motor encendido. Ventana RECAL.",
  HAUL: "En movimiento, cargado, del cargador a la chancadora. Recalibracion bloqueada.",
  DUMP: "Detenido en la chancadora, tolva bascula, chasis nivelado. Ventana RECAL.",
  WAIT: "Retorno vacio por la pista de cola. Recalibracion bloqueada.",
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

// ---- 930E-4SE fidelity constants (manual-faithful, display only) ----
// Dimensions in metres; weights in kg; body-up height; payload/volume.
// Scene units are illustrative (pit layout preserved); the side panel
// states the true manual dimensions so proportions read correctly.

/** Overall dims L x W x H (m): 15.29 x 8.89 x 8.10; body-up 14.80 m. */
export const TRUCK_DIMS_M = { L: 15.29, W: 8.89, H: 8.1, bodyUp: 14.8 };

export const TRUCK_WEIGHTS_KG = {
  empty: 215308,
  emptyF: 104460,
  emptyR: 110848,
  loaded: 505611,
  loadedF: 165958,
  loadedR: 339653,
  payload: 290303,
  volumeM3: 211,
  maxT: 320,
  overloadT: 348,
};

export interface TruckCallout {
  n: number;
  en: string;
  es: string;
}

/** Simplified top-view component callouts 1-22 (EN/ES). */
export const TRUCK_CALLOUTS: TruckCallout[] = [
  { n: 1, en: "Cab + operator station", es: "Cabina + puesto del operador" },
  { n: 2, en: "Access stairs + walkway", es: "Escaleras de acceso + pasarela" },
  { n: 3, en: "Front bumper + tow points", es: "Parachoques delantero + puntos de remolque" },
  { n: 4, en: "QSK78 engine compartment", es: "Compartimiento motor QSK78" },
  { n: 5, en: "GTA-39 alternator (AC)", es: "Alternador GTA-39 (AC)" },
  { n: 6, en: "Control cabinet (PCS/PLM/AID/VHMS/IM)", es: "Gabinete de control (PCS/PLM/AID/VHMS/IM)" },
  { n: 7, en: "Inverter + condenser group", es: "Grupo inversor + condensadores" },
  { n: 8, en: "Cooling blower 453 m3/min", es: "Soplador de enfriamiento 453 m3/min" },
  { n: 9, en: "Retard grids (5400 short / 3300 cont hp)", es: "Rejillas de retardo (5400 corto / 3300 cont hp)" },
  { n: 10, en: "Fuel tank (see fluids footnote)", es: "Estanque combustible (ver nota de fluidos)" },
  { n: 11, en: "Hydraulic tank 1324/1325 L", es: "Estanque hidraulico 1324/1325 L" },
  { n: 12, en: "Dump body 211 m3", es: "Tolva 211 m3" },
  { n: 13, en: "Hoist cylinders (HOLD/FLOAT)", es: "Cilindros de levante (HOLD/FLOAT)" },
  { n: 14, en: "Front axle + Hydrair II suspension", es: "Eje delantero + suspension Hydrair II" },
  { n: 15, en: "Rear axle box + GDY106 pair", es: "Caja eje trasero + par GDY106" },
  { n: 16, en: "AC traction motors (MT)", es: "Motores de traccion AC (MT)" },
  { n: 17, en: "Wet service brakes (all wheels <8 km/h)", es: "Frenos humedos (todas las ruedas <8 km/h)" },
  { n: 18, en: "Spring parking brake (rear, stopped-only)", es: "Freno estacionamiento por resorte (trasero, solo detenido)" },
  { n: 19, en: "Tires + rims (hub on tapered rollers)", es: "Neumaticos + llantas (maza en rodillos conicos)" },
  { n: 20, en: "VHMS snapshot (blue) + red link", es: "VHMS captura (azul) + enlace rojo" },
  { n: 21, en: "RSC turtle/rabbit + yellow switch", es: "RSC tortuga/liebre + interruptor amarillo" },
  { n: 22, en: "E-stop + engine service (blue) + PLM", es: "Parada emergencia + servicio motor (azul) + PLM" },
];
