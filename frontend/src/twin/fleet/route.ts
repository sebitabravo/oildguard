// Ruta cerrada de acarreo en datos puros (sin three.js).
//
// La ruta es el camino de un camión, carril incluido: el lazo recorre el carril
// de subida cargado, gira en la explanada de la chancadora, retrocede al bolsillo
// de descarga (tramo `facing = -1`), baja por el otro carril y vuelve al
// cargador. El avance `s` siempre crece; el sentido del vehículo lo da `facing`.

export interface RouteMarks {
  /** Posición de parada del camión que carga bajo la pala. */
  sShovel: number;
  /** Posición de parada del camión que descarga (fin del tramo en retroceso). */
  sDump: number;
  /** Inicio del tramo en retroceso. */
  sRevStart: number;
  /**
   * Entrada a la explanada de descarga (inicio del giro). El bolsillo es de un solo camión a la vez:
   * si está ocupado, el siguiente espera aquí, antes de que su giro cruce el retroceso del líder.
   */
  sBayEntry: number;
  /** Pasado este punto el bolsillo vuelve a quedar libre para el siguiente camión. */
  sBayClear: number;
}

export interface Route {
  length: number;
  /** Separación uniforme entre muestras (m). */
  ds: number;
  n: number;
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  /** Guiñada (rad) de la tangente en el sentido de avance de `s`; convención de three.js (atan2(-dz, dx)). */
  yaw: Float64Array;
  /** Pendiente (grados) a lo largo de +s; positiva si sube. */
  slopeDeg: Float64Array;
  /** Curvatura (1/m) a lo largo de +s; positiva = giro a la izquierda. */
  curvature: Float64Array;
  /** +1 avanzando de frente, -1 retrocediendo. */
  facing: Int8Array;
  marks: RouteMarks;
}

export interface RouteSample {
  x: number;
  y: number;
  z: number;
  /** Guiñada de la tangente de la ruta. */
  yaw: number;
  /** Guiñada del vehículo: la tangente más media vuelta si retrocede. */
  heading: number;
  slopeDeg: number;
  curvature: number;
  facing: 1 | -1;
}

const TWO_PI = Math.PI * 2;

export const wrapS = (route: Route, s: number): number => ((s % route.length) + route.length) % route.length;

/** Distancia hacia adelante de `from` a `to` sobre el lazo, en [0, length). */
export const aheadDistance = (route: Route, from: number, to: number): number => wrapS(route, to - from);

export function shortestAngle(a: number): number {
  let r = (a + Math.PI) % TWO_PI;
  if (r < 0) r += TWO_PI;
  return r - Math.PI;
}

/** Muestra interpolada de la ruta en `s` (se envuelve sobre el lazo). */
export function sampleRoute(route: Route, s: number, out?: RouteSample): RouteSample {
  const o = out ?? { x: 0, y: 0, z: 0, yaw: 0, heading: 0, slopeDeg: 0, curvature: 0, facing: 1 };
  const w = wrapS(route, s) / route.ds;
  const i = Math.min(route.n - 1, Math.floor(w));
  const j = (i + 1) % route.n;
  const f = w - i;
  const lerp = (arr: Float64Array) => arr[i] + (arr[j] - arr[i]) * f;
  o.x = lerp(route.x);
  o.y = lerp(route.y);
  o.z = lerp(route.z);
  o.slopeDeg = lerp(route.slopeDeg);
  o.curvature = lerp(route.curvature);
  o.yaw = route.yaw[i] + shortestAngle(route.yaw[j] - route.yaw[i]) * f;
  // Dentro de un tramo la cara es constante; en el borde se toma la de la muestra más cercana.
  o.facing = route.facing[f < 0.5 ? i : j] as 1 | -1;
  o.heading = o.facing === 1 ? o.yaw : o.yaw + Math.PI;
  return o;
}

export interface RouteLeg {
  /** Puntos [x, z] de la polilínea del tramo, en orden de avance. */
  pts: Array<[number, number]>;
  reverse: boolean;
}

export interface LegMark {
  leg: number;
  end?: boolean;
  offset: number;
}

export interface AssembleOptions {
  /** Altura del terreno (o del camino) bajo un punto en planta. */
  heightAt(x: number, z: number): number;
  ds?: number;
  /** Tramo y desplazamiento (m) desde su inicio, o desde su final con `end`, de cada marca de parada. */
  marks: { shovel: LegMark; dump: LegMark; bayEntry: LegMark; bayClearAfterDump: number };
}

interface Resampled {
  x: number[];
  z: number[];
}

/** Remuestrea una polilínea a paso uniforme `ds` (el último tramo corto queda en el último punto). */
function resample(pts: Array<[number, number]>, ds: number): { out: Resampled; length: number } {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  const count = Math.max(2, Math.round(total / ds));
  const out: Resampled = { x: [], z: [] };
  let seg = 1;
  for (let k = 0; k < count; k++) {
    const d = (k / count) * total;
    while (seg < pts.length - 1 && cum[seg] < d) seg++;
    const span = cum[seg] - cum[seg - 1] || 1;
    const f = (d - cum[seg - 1]) / span;
    out.x.push(pts[seg - 1][0] + (pts[seg][0] - pts[seg - 1][0]) * f);
    out.z.push(pts[seg - 1][1] + (pts[seg][1] - pts[seg - 1][1]) * f);
  }
  return { out, length: total };
}

/**
 * Arma la ruta a partir de tramos ya suavizados. Cada tramo se remuestrea por
 * separado: en el cambio de sentido (cúspide en el bolsillo) la tangente se
 * calcula dentro de cada tramo, nunca a través de la unión.
 */
export function assembleRoute(legs: RouteLeg[], opts: AssembleOptions): Route {
  const ds = opts.ds ?? 1;
  const xs: number[] = [];
  const zs: number[] = [];
  const yaws: number[] = [];
  const kappa: number[] = [];
  const facing: number[] = [];
  const legStart: number[] = [];
  const legCount: number[] = [];

  for (let li = 0; li < legs.length; li++) {
    const leg = legs[li];
    const { out } = resample(leg.pts, ds);
    const n = out.x.length;
    legStart.push(xs.length);
    legCount.push(n);
    const legYaw: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      let dx = out.x[b] - out.x[a];
      let dz = out.z[b] - out.z[a];
      if (i === n - 1) {
        // Cierre del tramo: la tangente continúa hacia el primer punto del tramo siguiente.
        const next = legs[(li + 1) % legs.length].pts[0];
        dx = next[0] - out.x[a];
        dz = next[1] - out.z[a];
        if (Math.hypot(dx, dz) < 0.2) {
          dx = out.x[i] - out.x[a];
          dz = out.z[i] - out.z[a];
        }
      }
      legYaw.push(Math.atan2(-dz, dx));
    }
    for (let i = 0; i < n; i++) {
      xs.push(out.x[i]);
      zs.push(out.z[i]);
      yaws.push(legYaw[i]);
      facing.push(leg.reverse ? -1 : 1);
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      const span = (b - a) * ds || ds;
      kappa.push(shortestAngle(legYaw[b] - legYaw[a]) / span);
    }
  }

  const n = xs.length;
  const x = Float64Array.from(xs);
  const z = Float64Array.from(zs);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = opts.heightAt(x[i], z[i]);

  const slope = new Float64Array(n);
  for (let l = 0; l < legs.length; l++) {
    const s0 = legStart[l];
    const c = legCount[l];
    for (let k = 0; k < c; k++) {
      const a = s0 + Math.max(0, k - 1);
      const b = s0 + Math.min(c - 1, k + 1);
      const run = Math.hypot(x[b] - x[a], z[b] - z[a]);
      slope[s0 + k] = run < 1e-6 ? 0 : (Math.atan2(y[b] - y[a], run) * 180) / Math.PI;
    }
  }

  const markAt = (m: LegMark) => {
    const steps = Math.round(m.offset / ds);
    return (m.end ? legStart[m.leg] + legCount[m.leg] - 1 - steps : legStart[m.leg] + steps) * ds;
  };
  const sDump = markAt(opts.marks.dump);
  const revLeg = legs.findIndex((l) => l.reverse);
  return {
    length: n * ds,
    ds,
    n,
    x,
    y,
    z,
    yaw: Float64Array.from(yaws),
    slopeDeg: slope,
    curvature: Float64Array.from(kappa),
    facing: Int8Array.from(facing),
    marks: {
      sShovel: markAt(opts.marks.shovel),
      sDump,
      sRevStart: revLeg >= 0 ? legStart[revLeg] * ds : sDump,
      sBayEntry: markAt(opts.marks.bayEntry),
      sBayClear: sDump + opts.marks.bayClearAfterDump,
    },
  };
}
