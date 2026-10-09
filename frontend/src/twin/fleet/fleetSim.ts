import { P, kmhToMps, mpsToKmh } from "../pit/pitSpec";
import { GDY106_TRAIN, trainRatio } from "../physics";
import { mulberry32 } from "../render/noise";
import { S } from "../truck930e/spec";
import { aheadDistance, sampleRoute, wrapS, type Route, type RouteSample } from "./route";

// Simulación de flota por lazo cerrado. Lógica pura: sin three.js, sin Math.random.
//
// Cada camión recorre la ruta con límites de aceleración y velocidad por pendiente
// y carga, y su estado sigue los ocho estados del Payload Meter III (OM sección 60,
// twin-reference §4). Los nombres en inglés son los del código; entre paréntesis
// van los del manual en español. Donde el manual no define una transición se usa la
// lectura propuesta en la investigación y se rotula ASSUMPTION.

/** Estados del PLM III. */
export type PlmState =
  | "tare_zone" // Zona de tara
  | "empty" // Vacío
  | "loading" // Cargando
  | "maneuvering" // Maniobrando (zona de 160 m)
  | "final_zone" // Zona final
  | "hauling" // Acarreando
  | "dumping" // Vaciando
  | "after_dump"; // Post-vaciado

export const PLM_ORDER: readonly PlmState[] = [
  "tare_zone",
  "empty",
  "loading",
  "maneuvering",
  "final_zone",
  "hauling",
  "dumping",
  "after_dump",
];

/** Actividad física del camión, independiente del estado del medidor. */
export type Phase = "driving" | "queued" | "spotting" | "loading" | "backing" | "waiting_bay" | "dumping";

// Constantes del PLM III, tomadas tal cual del manual (twin-reference §4).
export const PLM = {
  /** Payload útil nominal (t); base de los porcentajes del medidor. */
  ratedPayloadT: 290.3,
  /** Carga bajo la cual el medidor considera el camión vacío. */
  emptyFraction: 0.2,
  /** Carga mínima detectable de un golpe de pala: 10 % del nominal. */
  swingFraction: 0.1,
  /** Permanencia en post-vaciado. */
  afterDumpS: 10,
  /** Velocidad sobre la cual el medidor calcula tara o peso cargado. */
  computeSpeedKmh: 5,
  /** Zona de maniobra bajo la pala. */
  maneuverZoneM: 160,
} as const;

// ASSUMPTION: tiempos de cálculo que el manual no cuantifica.
const TARE_COMPUTE_S = 5;
const FINAL_COMPUTE_S = 5;

export const FLEET = {
  /** Separación mínima dura entre centros de camión (m): largo 15.6 m más holgura. */
  minSpacingM: 24,
  /** Distancia centro a centro a la que un camión se detiene tras el líder en cola. */
  queueSpacingM: 28,
  /** Tolerancia de llegada a una parada (m). */
  arriveM: 0.3,
  /** Un camión se considera detenido bajo esta velocidad (mismo umbral que sim/detect.py). */
  stoppedMps: 0.5,
  /** Nivelado: |inclinación| bajo este valor (grados), como sim/detect.py. */
  leveledDeg: 2,
  maxSubstepS: 0.25,
  // Descarga en la chancadora. ASSUMPTION: duraciones típicas de un camión de 290 t.
  dumpSettleS: 3,
  dumpRaiseS: 22,
  dumpHoldS: 12,
  dumpLowerS: 18,
  /** Pausa tras el último golpe antes de que el operador arranque. */
  loadReleaseS: 4,
  /** Fracción del golpe en que el cucharón vuelca sobre la tolva. */
  dumpAtPassFraction: 0.7,
} as const;

export const WHEEL_SIDES = ["RL", "RR"] as const;
export type WheelSide = (typeof WHEEL_SIDES)[number];

export interface WheelRef {
  side: WheelSide;
  /** Identificador completo, p. ej. `OG-03-RL`. */
  id: string;
  /** Rueda marcada como unidad de la demo de fuga. */
  leakDemo: boolean;
}

export interface TruckTick {
  id: string;
  index: number;
  plm: PlmState;
  phase: Phase;
  /** Posición a lo largo del lazo (m). */
  s: number;
  x: number;
  y: number;
  z: number;
  /** Guiñada del vehículo (rad, convención de three.js). */
  heading: number;
  facing: 1 | -1;
  speedMps: number;
  speedKmh: number;
  /** Cabeceo del vehículo (grados; positivo = morro arriba). */
  pitchDeg: number;
  /** Pendiente de la vía en el sentido de marcha (%; positiva = subiendo). */
  gradePct: number;
  payloadT: number;
  /** Carga 0..1 respecto del nominal. */
  payloadFrac: number;
  tiltDeg: number;
  /** Ángulo medio de dirección (rad, positivo = izquierda). */
  steer: number;
  engineOn: boolean;
  stopped: boolean;
  leveled: boolean;
  /** Ventana de recalibración: detenido, nivelado y con motor encendido (misma regla que sim/detect.py). */
  recal: boolean;
  /** Segundos continuos en reposo nivelado con motor encendido. */
  restHoldS: number;
  /** El camión está sobre una pendiente (no nivelado). */
  onGrade: boolean;
  wheelRpm: number;
  rotorRpm: number;
  /** Golpes de pala ya volcados en este camión. */
  loadPasses: number;
  wheels: WheelRef[];
  leakDemo: boolean;
  /** Ciclos completos (descargas) del camión. */
  cycles: number;
}

export interface ShovelTick {
  /** Camión bajo la pala, o null si está libre. */
  truckId: string | null;
  /** Golpes completos ya volcados (0..passes). */
  pass: number;
  /** Progreso del golpe en curso (0..1): excavar, girar, volcar, volver. */
  swing: number;
  passes: number;
}

export interface FleetSnapshot {
  /** Reloj de simulación (s). */
  clockS: number;
  timeScale: number;
  trucks: TruckTick[];
  shovel: ShovelTick;
  /** Camión descargando en el bolsillo, o null. */
  crusherTruckId: string | null;
  /** Camiones esperando en cola (detenidos fuera de la pala y del bolsillo). */
  queued: number;
}

export interface FleetConfig {
  route: Route;
  trucks?: number;
  seed?: number;
  /** Golpes de pala por camión. */
  passes?: number;
  /** Camión y rueda de la demo de fuga. */
  leak?: { truckId: string; wheel: WheelSide };
  /** Cómo repartir los camiones al inicio. `spread` los distribuye a lo largo del lazo. */
  spawn?: "spread" | "queue";
  /** Posiciones iniciales explícitas; sustituyen a `spawn` (cantidad = largo de la lista). */
  initial?: Array<{ s: number; loaded?: boolean }>;
}

interface Truck {
  id: string;
  index: number;
  s: number;
  v: number;
  payloadT: number;
  targetPayloadT: number;
  tiltDeg: number;
  plm: PlmState;
  phase: Phase;
  engineOn: boolean;
  passesDone: number;
  passT: number;
  dumpedThisPass: boolean;
  loadHoldT: number;
  loadReleased: boolean;
  dumpT: number;
  dumpActive: boolean;
  afterDumpT: number;
  tareMoveT: number;
  finalMoveT: number;
  maneuverDist: number;
  restHoldS: number;
  cycles: number;
  /** Detenido a la fuerza (avería o bloqueo en la vía). */
  held: boolean;
}

const smooth01 = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Límite de velocidad (m/s) por pendiente y carga: potencia limitada en subida, retardador en bajada. */
export function gradeSpeedLimitMps(grade: number, loaded: boolean): number {
  const sp = P.speed;
  const rr = 0.02;
  const refGrade = P.ramp.grade;
  if (loaded) {
    if (grade > rr) return kmhToMps(Math.min(sp.loadedFlat, (sp.loadedUphill * (refGrade + rr)) / (grade + rr)));
    if (grade < -rr) return kmhToMps(Math.min(sp.loadedFlat, 20));
    return kmhToMps(sp.loadedFlat);
  }
  if (grade > rr) return kmhToMps(Math.min(sp.emptyFlat, (sp.emptyUphill * (refGrade + rr)) / (grade + rr)));
  if (grade < -rr) {
    const k = clamp((-grade - rr) / (refGrade - rr), 0, 1);
    return kmhToMps(sp.emptyFlat + (sp.emptyDownhill - sp.emptyFlat) * k);
  }
  return kmhToMps(sp.emptyFlat);
}

/** Perfil de velocidad máxima a lo largo de la ruta con frenada anticipada (pasada hacia atrás). */
export function speedProfile(route: Route, loaded: boolean): Float64Array {
  const n = route.n;
  const lim = new Float64Array(n);
  const brake = P.speed.brake * 0.8;
  for (let i = 0; i < n; i++) {
    let v: number;
    if (route.facing[i] < 0) v = kmhToMps(P.speed.reverse);
    else v = gradeSpeedLimitMps(Math.tan((route.slopeDeg[i] * Math.PI) / 180), loaded);
    const k = Math.abs(route.curvature[i]);
    if (k > 1e-4) v = Math.min(v, Math.sqrt(P.speed.lateralAccel / k));
    lim[i] = v;
  }
  // Dos vueltas al lazo hacia atrás: la restricción más baja se propaga hacia las muestras previas.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) {
      const next = lim[(i + 1) % n];
      const cap = Math.sqrt(next * next + 2 * brake * route.ds);
      if (lim[i] > cap) lim[i] = cap;
    }
  }
  return lim;
}

/** RPM de rueda para una velocidad lineal (m/s), con el radio de rodadura del 930E. */
export const wheelRpmFromSpeed = (speedMps: number): number => (speedMps / S.tire.rollingRadius) * (60 / (2 * Math.PI));

/** RPM del rotor del motor de rueda: rueda x relación del tren GDY106 (32.62:1). */
export const rotorRpmFromWheelRpm = (wheelRpm: number): number => wheelRpm * trainRatio(GDY106_TRAIN);

export class FleetSim {
  readonly route: Route;
  readonly passes: number;
  private readonly trucks: Truck[] = [];
  private readonly rng: () => number;
  private readonly profileLoaded: Float64Array;
  private readonly profileEmpty: Float64Array;
  private readonly leak: { truckId: string; wheel: WheelSide };
  private clock = 0;
  private scratch: RouteSample = { x: 0, y: 0, z: 0, yaw: 0, heading: 0, slopeDeg: 0, curvature: 0, facing: 1 };

  constructor(cfg: FleetConfig) {
    this.route = cfg.route;
    this.passes = cfg.passes ?? P.shovel.passes;
    this.rng = mulberry32(cfg.seed ?? 1);
    this.leak = cfg.leak ?? { truckId: "OG-03", wheel: "RL" };
    this.profileLoaded = speedProfile(cfg.route, true);
    this.profileEmpty = speedProfile(cfg.route, false);
    if (cfg.initial) {
      cfg.initial.forEach((p, i) => {
        const t = this.spawn(i, cfg.initial!.length, "queue");
        t.s = wrapS(cfg.route, p.s);
        if (p.loaded) {
          t.payloadT = t.targetPayloadT;
          t.plm = "hauling";
        }
        this.trucks.push(t);
      });
    } else {
      const count = cfg.trucks ?? 5;
      for (let i = 0; i < count; i++) this.trucks.push(this.spawn(i, count, cfg.spawn ?? "spread"));
    }
  }

  get clockS(): number {
    return this.clock;
  }

  /** Apaga o enciende el motor de un camión (para pruebas y para simular una parada). */
  setEngine(truckId: string, on: boolean): void {
    const t = this.trucks.find((k) => k.id === truckId);
    if (t) t.engineOn = on;
  }

  /** Detiene a la fuerza un camión (avería o vía bloqueada); los de atrás hacen cola. */
  setHold(truckId: string, on: boolean): void {
    const t = this.trucks.find((k) => k.id === truckId);
    if (t) t.held = on;
  }

  private spawn(index: number, count: number, mode: "spread" | "queue"): Truck {
    const { route } = this;
    const id = `OG-${String(index + 1).padStart(2, "0")}`;
    const marks = route.marks;
    let s: number;
    if (mode === "queue") s = wrapS(route, marks.sShovel - index * FLEET.queueSpacingM);
    else s = wrapS(route, marks.sShovel + (route.length * index) / count);
    // Tramo cargado: de la pala a la chancadora. Fuera de él el camión va vacío.
    const loadedStretch = aheadDistance(route, marks.sShovel, s) < aheadDistance(route, marks.sShovel, marks.sDump);
    const targetPayloadT = this.drawPayload();
    const loaded = mode === "spread" && loadedStretch && index > 0;
    return {
      id,
      index,
      s,
      v: 0,
      payloadT: loaded ? targetPayloadT : 0,
      targetPayloadT,
      tiltDeg: 0,
      plm: loaded ? "hauling" : "empty",
      phase: "driving",
      engineOn: true,
      passesDone: 0,
      passT: 0,
      dumpedThisPass: false,
      loadHoldT: 0,
      loadReleased: false,
      dumpT: 0,
      dumpActive: false,
      afterDumpT: 0,
      tareMoveT: 0,
      finalMoveT: 0,
      maneuverDist: 0,
      restHoldS: 0,
      cycles: 0,
      held: false,
    };
  }

  /** Carga objetivo del camión: nominal con ±3 % (el operador de pala no clava el valor). */
  private drawPayload(): number {
    return PLM.ratedPayloadT * (0.97 + 0.06 * this.rng());
  }

  /** Avanza `dt` segundos de simulación en subpasos acotados. */
  advance(dt: number): void {
    let left = dt;
    while (left > 1e-9) {
      const h = Math.min(FLEET.maxSubstepS, left);
      this.substep(h);
      left -= h;
    }
  }

  private isLoaded(t: Truck): boolean {
    return t.payloadT > PLM.emptyFraction * PLM.ratedPayloadT;
  }

  /** El camión debe parar bajo la pala: viene vacío y aún no cargó. */
  private needsShovel(t: Truck): boolean {
    return t.plm === "tare_zone" || t.plm === "empty";
  }

  /** El camión viene cargado hacia la chancadora. */
  private needsDump(t: Truck): boolean {
    return t.plm === "maneuvering" || t.plm === "final_zone" || t.plm === "hauling";
  }

  /** Bolsillo ocupado: otro camión entre la entrada a la explanada y la salida despejada. */
  private bayBusyFor(self: Truck): boolean {
    const { marks } = this.route;
    const span = marks.sBayClear - marks.sBayEntry + 0.5;
    return this.trucks.some((o) => o !== self && aheadDistance(this.route, marks.sBayEntry - 0.5, o.s) <= span);
  }

  private substep(dt: number): void {
    const { route } = this;
    const n = this.trucks.length;
    const order = [...this.trucks].sort((a, b) => a.s - b.s);
    const leaderOf = new Map<Truck, Truck>();
    for (let k = 0; k < n; k++) if (n > 1) leaderOf.set(order[k], order[(k + 1) % n]);
    const oldS = new Map<Truck, number>(order.map((t) => [t, t.s]));
    const oldV = new Map<Truck, number>(order.map((t) => [t, t.v]));

    for (const t of this.trucks) {
      this.controlTruck(t, dt, leaderOf.get(t), oldS, oldV);
    }
    this.clock += dt;
  }

  private routeSample(s: number): RouteSample {
    return sampleRoute(this.route, s, this.scratch);
  }

  private controlTruck(t: Truck, dt: number, leader: Truck | undefined, oldS: Map<Truck, number>, oldV: Map<Truck, number>): void {
    const { route } = this;
    const marks = route.marks;
    const idx = Math.min(route.n - 1, Math.floor(wrapS(route, t.s) / route.ds));
    const profile = this.isLoaded(t) ? this.profileLoaded : this.profileEmpty;
    let vCmd = Math.min(profile[idx], profile[(idx + 1) % route.n]);
    let stopDist = Infinity;
    let stopAt: "shovel" | "dump" | "bay" | null = null;

    if (this.needsShovel(t)) {
      stopDist = aheadDistance(route, t.s, marks.sShovel);
      stopAt = "shovel";
      if (stopDist < 30) vCmd = Math.min(vCmd, kmhToMps(P.speed.spot));
    } else if (this.needsDump(t)) {
      const dDump = aheadDistance(route, t.s, marks.sDump);
      const dRev = aheadDistance(route, t.s, marks.sBayEntry);
      if (dRev < dDump && this.bayBusyFor(t)) {
        stopDist = dRev;
        stopAt = "bay";
      } else {
        stopDist = dDump;
        stopAt = "dump";
        if (dDump < 12) vCmd = Math.min(vCmd, kmhToMps(3));
      }
    }

    // Una parada sobre este mismo punto: llegar, anclarse y trabajar.
    let arrived = false;
    if (stopAt && (stopDist <= FLEET.arriveM || stopDist > route.length - FLEET.arriveM) && t.v < 1.2) {
      arrived = true;
    } else if (stopAt) {
      const brake = P.speed.brake * 0.7;
      const braking = Math.sqrt(2 * brake * Math.max(0, stopDist - FLEET.arriveM));
      vCmd = Math.min(vCmd, Math.max(braking, 0.55));
    }

    const lockedByWork = t.phase === "loading" || t.phase === "dumping";
    if (lockedByWork || t.held) vCmd = 0;
    if (t.held) arrived = false;

    // Líder en cola: nunca más rápido de lo que permite frenar detrás de él.
    let gap = Infinity;
    if (leader) {
      gap = aheadDistance(route, oldS.get(t) ?? t.s, oldS.get(leader) ?? leader.s);
      if (gap === 0) gap = route.length;
      const room = Math.max(0, gap - FLEET.queueSpacingM);
      const follow = Math.sqrt((oldV.get(leader) ?? 0) ** 2 + 2 * P.speed.brake * 0.6 * room);
      vCmd = Math.min(vCmd, follow);
    }

    if (arrived) {
      t.s = stopAt === "shovel" ? marks.sShovel : stopAt === "dump" ? marks.sDump : marks.sBayEntry;
      t.v = 0;
      this.onArrive(t, stopAt);
    } else {
      if (vCmd > t.v) t.v = Math.min(vCmd, t.v + P.speed.accel * dt);
      else t.v = Math.max(vCmd, t.v - P.speed.brake * dt);
      let step = t.v * dt;
      if (stopAt && step >= stopDist) {
        step = stopDist;
        t.v = 0;
      }
      if (leader) step = Math.min(step, Math.max(0, gap - FLEET.minSpacingM));
      if (step < t.v * dt - 1e-9) t.v = Math.min(t.v, step / dt);
      t.s = wrapS(route, t.s + step);
      if (stopAt && Math.abs(aheadDistance(route, t.s, stopAt === "shovel" ? marks.sShovel : stopAt === "dump" ? marks.sDump : marks.sBayEntry)) <= FLEET.arriveM) {
        t.v = 0;
      }
    }

    this.runWork(t, dt);
    this.runPlm(t, dt);
    this.runRest(t, dt);
    this.updatePhase(t, stopAt, arrived);
  }

  private onArrive(t: Truck, stopAt: "shovel" | "dump" | "bay" | null): void {
    if (stopAt === "shovel" && t.phase !== "loading") {
      t.phase = "loading";
      t.passesDone = 0;
      t.passT = 0;
      t.dumpedThisPass = false;
      t.loadHoldT = 0;
      t.loadReleased = false;
    } else if (stopAt === "dump" && t.phase !== "dumping") {
      t.phase = "dumping";
      t.dumpT = 0;
      t.dumpActive = true;
    }
  }

  /** Trabajo bajo la pala y en el bolsillo. */
  private runWork(t: Truck, dt: number): void {
    if (t.phase === "loading" && t.v === 0) {
      if (t.passesDone < this.passes) {
        t.passT += dt;
        const passS = P.shovel.passSeconds;
        if (!t.dumpedThisPass && t.passT >= passS * FLEET.dumpAtPassFraction) {
          t.dumpedThisPass = true;
          t.payloadT = Math.min(t.targetPayloadT, t.payloadT + t.targetPayloadT / this.passes);
        }
        if (t.passT >= passS) {
          t.passT = 0;
          t.passesDone += 1;
          t.dumpedThisPass = false;
        }
      } else {
        t.loadHoldT += dt;
        if (t.loadHoldT >= FLEET.loadReleaseS) {
          t.loadReleased = true;
          t.phase = "driving";
        }
      }
    }
    if (t.phase === "dumping" && t.dumpActive) {
      t.dumpT += dt;
      const settle = FLEET.dumpSettleS;
      const raise = FLEET.dumpRaiseS;
      const hold = FLEET.dumpHoldS;
      const lower = FLEET.dumpLowerS;
      const u = t.dumpT - settle;
      if (u <= 0) t.tiltDeg = 0;
      else if (u < raise) t.tiltDeg = S.body.dumpAngle * smooth01(u / raise);
      else if (u < raise + hold) t.tiltDeg = S.body.dumpAngle;
      else t.tiltDeg = S.body.dumpAngle * (1 - smooth01((u - raise - hold) / lower));
      // La carga sale mientras la tolva sube y se sostiene arriba.
      t.payloadT = t.targetPayloadT * (1 - smooth01((u - raise * 0.3) / (raise * 0.7 + hold * 0.6)));
      if (u >= raise + hold + lower) {
        t.tiltDeg = 0;
        t.payloadT = 0;
        t.dumpActive = false;
        t.phase = "driving";
        t.cycles += 1;
        t.targetPayloadT = this.drawPayload();
      }
    }
  }

  /** Transiciones del PLM III. */
  private runPlm(t: Truck, dt: number): void {
    const vKmh = mpsToKmh(t.v);
    const rated = PLM.ratedPayloadT;
    switch (t.plm) {
      case "empty":
        // Vacío -> Cargando: el medidor detecta el golpe de pala (>= 10 % del nominal).
        if (t.payloadT >= PLM.swingFraction * rated) t.plm = "loading";
        break;
      case "tare_zone":
        if (t.payloadT >= PLM.swingFraction * rated) {
          t.plm = "loading";
        } else {
          // Con más de 5 km/h calcula la tara (peso de los Hydrair vacíos).
          if (vKmh > PLM.computeSpeedKmh) t.tareMoveT += dt;
          // ASSUMPTION: el manual no define tare_zone -> empty; se pasa a vacío al calcular la tara.
          if (t.tareMoveT >= TARE_COMPUTE_S) {
            t.plm = "empty";
            t.tareMoveT = 0;
          }
        }
        break;
      case "loading":
        // Cargando -> Maniobrando "en cuanto el camión comienza a moverse".
        if (t.phase !== "loading" && t.v > 0.1) {
          t.plm = "maneuvering";
          t.maneuverDist = 0;
        }
        break;
      case "maneuvering":
        t.maneuverDist += t.v * dt;
        if (t.tiltDeg > 1) t.plm = "dumping";
        else if (t.maneuverDist >= PLM.maneuverZoneM) {
          t.plm = "final_zone";
          t.finalMoveT = 0;
        }
        break;
      case "final_zone":
        if (vKmh > PLM.computeSpeedKmh) t.finalMoveT += dt;
        // ASSUMPTION: final_zone -> hauling al terminar el cálculo del peso cargado.
        if (t.finalMoveT >= FINAL_COMPUTE_S) t.plm = "hauling";
        else if (t.tiltDeg > 1) t.plm = "dumping";
        break;
      case "hauling":
        // ASSUMPTION: hauling -> dumping al subir la tolva.
        if (t.tiltDeg > 1) t.plm = "dumping";
        break;
      case "dumping":
        // Vaciando -> Post-vaciado cuando la tolva comienza a bajar.
        if (t.phase === "dumping" && t.dumpT - FLEET.dumpSettleS >= FLEET.dumpRaiseS + FLEET.dumpHoldS) {
          t.plm = "after_dump";
          t.afterDumpT = 0;
        } else if (t.phase !== "dumping") {
          t.plm = "after_dump";
          t.afterDumpT = 0;
        }
        break;
      case "after_dump":
        t.afterDumpT += dt;
        if (t.afterDumpT >= PLM.afterDumpS && t.payloadT < PLM.emptyFraction * rated) {
          t.plm = "tare_zone";
          t.tareMoveT = 0;
        }
        break;
    }
  }

  private runRest(t: Truck, dt: number): void {
    const sample = this.routeSample(t.s);
    const pitch = sample.slopeDeg * sample.facing;
    const stopped = t.v < FLEET.stoppedMps;
    const leveled = Math.abs(pitch) < FLEET.leveledDeg;
    t.restHoldS = stopped && leveled && t.engineOn ? t.restHoldS + dt : 0;
  }

  private updatePhase(t: Truck, stopAt: "shovel" | "dump" | "bay" | null, arrived: boolean): void {
    if (t.phase === "loading" || t.phase === "dumping") return;
    const sample = this.routeSample(t.s);
    if (t.v < FLEET.stoppedMps) {
      if (arrived && stopAt === "bay") t.phase = "waiting_bay";
      else t.phase = "queued";
    } else if (sample.facing < 0) {
      t.phase = "backing";
    } else if (stopAt === "shovel" && aheadDistance(this.route, t.s, this.route.marks.sShovel) < 30) {
      t.phase = "spotting";
    } else {
      t.phase = "driving";
    }
  }

  private tick(t: Truck): TruckTick {
    const sample = this.routeSample(t.s);
    const pitchDeg = sample.slopeDeg * sample.facing;
    const stopped = t.v < FLEET.stoppedMps;
    const leveled = Math.abs(pitchDeg) < FLEET.leveledDeg;
    const wheelRpm = wheelRpmFromSpeed(t.v);
    const rotorRpm = rotorRpmFromWheelRpm(wheelRpm);
    const leakDemo = t.id === this.leak.truckId;
    const wheels: WheelRef[] = WHEEL_SIDES.map((side) => ({
      side,
      id: `${t.id}-${side}`,
      leakDemo: leakDemo && side === this.leak.wheel,
    }));
    const wheelbase = S.chassis.wheelbase;
    const steer = Math.atan(wheelbase * sample.curvature * sample.facing) * (t.v > 0.2 ? 1 : 0);
    return {
      id: t.id,
      index: t.index,
      plm: t.plm,
      phase: t.phase,
      s: t.s,
      x: sample.x,
      y: sample.y,
      z: sample.z,
      heading: sample.heading,
      facing: sample.facing,
      speedMps: t.v,
      speedKmh: mpsToKmh(t.v),
      pitchDeg,
      gradePct: Math.tan((sample.slopeDeg * Math.PI) / 180) * 100,
      payloadT: t.payloadT,
      payloadFrac: clamp(t.payloadT / PLM.ratedPayloadT, 0, 1.2),
      tiltDeg: t.tiltDeg,
      steer,
      engineOn: t.engineOn,
      stopped,
      leveled,
      recal: stopped && leveled && t.engineOn,
      restHoldS: t.restHoldS,
      onGrade: Math.abs(sample.slopeDeg) >= FLEET.leveledDeg,
      wheelRpm,
      rotorRpm,
      loadPasses: t.phase === "loading" ? t.passesDone + (t.dumpedThisPass ? 1 : 0) : t.plm === "loading" ? this.passes : 0,
      wheels,
      leakDemo,
      cycles: t.cycles,
    };
  }

  snapshot(timeScale = 1): FleetSnapshot {
    const trucks = this.trucks.map((t) => this.tick(t));
    const loading = this.trucks.find((t) => t.phase === "loading");
    const dumping = this.trucks.find((t) => t.phase === "dumping");
    const queued = this.trucks.filter((t) => t.phase === "queued" || t.phase === "waiting_bay").length;
    return {
      clockS: this.clock,
      timeScale,
      trucks,
      shovel: loading
        ? {
            truckId: loading.id,
            pass: loading.passesDone,
            swing: loading.passesDone < this.passes ? loading.passT / P.shovel.passSeconds : 1,
            passes: this.passes,
          }
        : { truckId: null, pass: 0, swing: 0, passes: this.passes },
      crusherTruckId: dumping?.id ?? null,
      queued,
    };
  }
}
