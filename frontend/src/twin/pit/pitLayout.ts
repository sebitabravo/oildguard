import { assembleRoute, type Route, type RouteLeg } from "../fleet/route";
import { arcPoints, smoothPath, type Pt } from "../fleet/smooth";
import { P } from "./pitSpec";
import {
  PLAN,
  RAMP,
  createTerrain,
  marchRamp,
  offsetPolyline,
  type FlatZone,
  type PocketCut,
  type PileBump,
  type RampSample,
  type RoadSample,
  type Terrain,
} from "./pitTerrain";

// Disposición del foso: eje de la rampa, extensiones planas arriba (explanada de la
// chancadora) y abajo (piso con la pala), y el lazo de acarreo por carriles.
// Todo en datos puros; buildPit.ts solo lo dibuja.

/** Marco local: origen, rumbo (u) y derecha (v) en planta con z hacia abajo. */
export interface Frame {
  ox: number;
  oz: number;
  ux: number;
  uz: number;
}

export const frameAt = (ox: number, oz: number, heading: number): Frame => ({
  ox,
  oz,
  ux: Math.cos(heading),
  uz: Math.sin(heading),
});

export const toWorld = (f: Frame, u: number, v: number): Pt => [f.ox + f.ux * u - f.uz * v, f.oz + f.uz * u + f.ux * v];

export const frameHeading = (f: Frame): number => Math.atan2(f.uz, f.ux);

const dir = (a: Pt, b: Pt) => Math.atan2(b[1] - a[1], b[0] - a[0]);

/** Separación entre ejes de carril: la mitad del ancho de dos carriles. */
export const LANE = P.road.width / 2;
/** Radio del giro de la explanada y del piso (ASSUMPTION: >= radio mínimo de curva). */
export const TURN_R = Math.max(P.ramp.minRadius, 25);

export interface PlazaLayout {
  frame: Frame;
  /** Largo recto desde la cabecera hasta el inicio del giro. */
  u0: number;
  /** Punto de espera antes de retroceder. */
  p0: Pt;
  /** Punto de descarga: eje trasero del camión con la tolva sobre el bolsillo. */
  dump: Pt;
  /** Rumbo del camión al descargar (mira hacia afuera del bolsillo). */
  dumpHeading: number;
  /** Rumbo desde el eje trasero hacia el bolsillo (cola del camión). */
  pocketDir: Pt;
  /** Labio del bolsillo: punto del suelo donde empieza el hueco. */
  lip: Pt;
}

export interface FloorLayout {
  frame: Frame;
  uShovel: number;
  uTurn: number;
  shovelSpot: Pt;
  /** Rumbo del camión al cargar. */
  loadHeading: number;
}

export interface PitWorld {
  terrain: Terrain;
  ramp: RampSample[];
  /** Eje del camino completo (ramp + extensiones) de arriba hacia abajo. */
  center: Array<RampSample>;
  plaza: PlazaLayout;
  floor: FloorLayout;
  route: Route;
  legs: RouteLeg[];
  flats: FlatZone[];
  piles: PileBump[];
  shovel: { pos: Pt; yawPile: number; yawTruck: number };
  pilePos: Pt;
  plazaFlat: FlatZone;
  pocket: PocketCut;
}

const ROAD_HW = P.road.width / 2 + P.road.shoulder;

export interface PitOptions {
  seed?: number;
  /** Largo recto de la cabecera a la explanada (m). */
  plazaU0?: number;
  /** Giro hacia el interior del foso al pie de la rampa (rad). */
  bottomTurn?: number;
  /** Posiciones sobre el piso, desde el marco de salida del pie (m). */
  uShovel?: number;
  uTurn?: number;
}

const FLOOR_Y = -P.bench.count * P.bench.height;

/** Prolonga una polilínea con puntos a paso `step` a lo largo de su rumbo final. */
function extend(from: Pt, heading: number, length: number, step: number): Pt[] {
  const out: Pt[] = [];
  for (let t = step; t <= length + 1e-6; t += step) out.push([from[0] + Math.cos(heading) * t, from[1] + Math.sin(heading) * t]);
  return out;
}

export function createPitWorld(opts: PitOptions = {}): PitWorld {
  const seed = opts.seed ?? 7;
  const u0 = opts.plazaU0 ?? 70;
  const ramp = marchRamp(PLAN, RAMP);

  // ---- Cabecera: extensión recta al exterior del borde (h = 0) ----
  const top: Pt = [ramp[0].x, ramp[0].z];
  const ascHeading = dir([ramp[8].x, ramp[8].z], top);
  const topExt = extend(top, ascHeading, u0 + 2 * TURN_R + 90, 4);

  // ---- Pie: giro hacia el interior (a la izquierda del sentido de bajada) y recta ----
  const last = ramp[ramp.length - 1];
  const prev = ramp[ramp.length - 9];
  const descHeading = dir([prev.x, prev.z], [last.x, last.z]);
  const turn = opts.bottomTurn ?? (90 * Math.PI) / 180;
  const arcR = 60;
  // El centro de la elipse queda a la izquierda al bajar en sentido antihorario: giro con sweep negativo.
  const bottomArc = arcPoints([last.x, last.z], descHeading, arcR, -turn, 14).slice(1);
  const arcEnd = bottomArc[bottomArc.length - 1];
  const endHeading = descHeading - turn;
  const floorFrame = frameAt(arcEnd[0], arcEnd[1], endHeading);
  const floorStraight: Pt[] = [];
  const floorLen = (opts.uTurn ?? 105) + 2 * TURN_R + 30;
  for (let u = 4; u <= floorLen; u += 4) floorStraight.push(toWorld(floorFrame, u, 0));

  // ---- Eje del camino completo con alturas ----
  const center: RampSample[] = [];
  const topRev = [...topExt].reverse();
  topRev.forEach((p, i) => center.push({ x: p[0], z: p[1], h: 0, dist: -(topRev.length - i) * 4, grade: 0 }));
  center.push(...ramp);
  bottomArc.forEach((p) => center.push({ x: p[0], z: p[1], h: FLOOR_Y, dist: 0, grade: 0 }));
  floorStraight.forEach((p) => center.push({ x: p[0], z: p[1], h: FLOOR_Y, dist: 0, grade: 0 }));

  const roads: RoadSample[] = center.map((c) => ({ x: c.x, z: c.z, h: c.h, hw: ROAD_HW }));

  // ---- Explanada de la chancadora ----
  const pf = frameAt(top[0], top[1], ascHeading);
  const R = TURN_R;
  const loadedV = LANE / 2;
  const returnV = -LANE / 2;
  const p0 = toWorld(pf, u0 + R, loadedV + R);
  const dump = toWorld(pf, u0 + R, returnV - R);
  const dumpHeading = frameHeading(pf) + Math.PI / 2; // mira hacia +v
  const pocketDir: Pt = [-(-pf.uz), -pf.ux]; // hacia -v
  const tailOver = 4.8 - P.crusher.tailOverlap;
  const lip = [dump[0] + pocketDir[0] * tailOver, dump[1] + pocketDir[1] * tailOver] as Pt;
  const plaza: PlazaLayout = { frame: pf, u0, p0, dump, dumpHeading, pocketDir, lip };

  // Explanada plana: cubre el giro, el retroceso, el bolsillo, el edificio y el acopio.
  const plazaFlat: FlatZone = (() => {
    const vMax = loadedV + R + 8;
    const vMin = returnV - R - 100;
    const c = toWorld(pf, u0 + R / 2, (vMax + vMin) / 2);
    return { cx: c[0], cz: c[1], hu: R + 44, hv: (vMax - vMin) / 2, yaw: frameHeading(pf), h: 0, blend: 22 };
  })();

  // Bolsillo de descarga: hueco de 11.4 m de ancho y 14 m de largo detrás del labio.
  const pocketDepth = 10;
  const pocketLen = 14;
  const lipV = returnV - R - tailOver;
  const pocketC = toWorld(pf, u0 + R, lipV - pocketLen / 2);
  const pocket: PocketCut = { cx: pocketC[0], cz: pocketC[1], hu: P.crusher.pocketWidth / 2, hv: pocketLen / 2, yaw: frameHeading(pf), depth: pocketDepth, blend: 1.4 };

  // ---- Piso: pala, pila de mineral y lazo de giro ----
  const uShovel = opts.uShovel ?? 30;
  const uTurn = opts.uTurn ?? 105;
  const shovelSpot = toWorld(floorFrame, uShovel, -LANE / 2);
  const loadHeading = frameHeading(floorFrame) + Math.PI; // carga viajando hacia el pie de la rampa
  const shovelPos = toWorld(floorFrame, uShovel, -LANE / 2 - 20);
  const pilePos = toWorld(floorFrame, uShovel + 26, -LANE / 2 - 36);
  const threeYaw = (from: Pt, to: Pt) => Math.atan2(-(to[1] - from[1]), to[0] - from[0]);
  const shovel = { pos: shovelPos, yawPile: threeYaw(shovelPos, pilePos), yawTruck: threeYaw(shovelPos, shovelSpot) };
  const floor: FloorLayout = { frame: floorFrame, uShovel, uTurn, shovelSpot, loadHeading };

  const piles: PileBump[] = [{ x: pilePos[0], z: pilePos[1], radius: 20, height: 8 }];
  const flats: FlatZone[] = [plazaFlat];

  const terrain = createTerrain({ plan: PLAN, roads, flats, piles, pockets: [pocket], seed });

  // ---- Carriles y tramos de la ruta ----
  const centerPts: Pt[] = center.map((c) => [c.x, c.z]);
  // Carril de bajada (vacíos) a la derecha del sentido de bajada; carril cargado a la izquierda.
  const downLane = offsetPolyline(centerPts, LANE / 2);
  const upLaneDesc = offsetPolyline(centerPts, -LANE / 2);
  const upLane = [...upLaneDesc].reverse();

  // Índices del eje: cabecera (fin de la extensión), pie (rampa) y arranque del piso.
  const iTop = topExt.length; // índice de la primera muestra de la rampa
  const iBottom = iTop + ramp.length + bottomArc.length; // primera muestra de la recta del piso
  const iPlazaStartDesc = iTop - Math.round(u0 / 4); // dentro de la extensión, a u0 de la cabecera
  const iPlazaStartAsc = center.length - 1 - iPlazaStartDesc; // mismo punto, en el carril de subida

  // Tramo 0 (cargado): desde la pala por el piso, la rampa y el recto hasta el inicio del giro.
  const iShovelOnCenter = iBottom + Math.round(uShovel / 4) - 1; // eje a u = uShovel
  const upFromShovel = upLane.slice(center.length - 1 - iShovelOnCenter, iPlazaStartAsc + 1);
  const shovelLaneStart = toWorld(floorFrame, uShovel, -LANE / 2);
  const turnStart = toWorld(pf, u0, loadedV);
  const arcRight = arcPoints(turnStart, frameHeading(pf), R, Math.PI / 2, 14);
  const leg0Pts: Pt[] = [shovelLaneStart, ...upFromShovel.slice(1), ...arcRight.slice(1)];

  // Tramo 1 (retroceso): de p0 al punto de descarga, en línea recta.
  const leg1Pts: Pt[] = [p0, dump];

  // Tramo 2 (vacío): salida en arco, carril de bajada, piso, giro en U y vuelta a la pala.
  const exitArc = arcPoints(dump, frameHeading(pf) + Math.PI / 2, R, Math.PI / 2, 14);
  const downFromPlaza = downLane.slice(iPlazaStartDesc, iBottom + Math.round(uTurn / 4));
  const uStart = toWorld(floorFrame, uTurn, LANE / 2);
  const uArc1 = arcPoints(uStart, frameHeading(floorFrame), R, -Math.PI / 2, 12);
  const uArc2 = arcPoints(uArc1[uArc1.length - 1], frameHeading(floorFrame) - Math.PI / 2, R, -Math.PI / 2, 12);
  const uEnd = uArc2[uArc2.length - 1];
  const sCurve = smoothPath(
    [
      uEnd,
      toWorld(floorFrame, uTurn - 25, -LANE / 2 - 30),
      toWorld(floorFrame, uShovel + 105, -LANE / 2 - 8),
      toWorld(floorFrame, uShovel + 80, -LANE / 2),
      toWorld(floorFrame, uShovel + 50, -LANE / 2),
      shovelLaneStart,
    ],
    14,
  );
  const leg2Pts: Pt[] = [...exitArc, ...downFromPlaza.slice(1), ...uArc1.slice(1), ...uArc2.slice(1), ...sCurve.slice(1)];

  const legs: RouteLeg[] = [
    { pts: leg0Pts, reverse: false },
    { pts: leg1Pts, reverse: true },
    { pts: leg2Pts, reverse: false },
  ];

  const route = assembleRoute(legs, {
    heightAt: terrain.heightAt,
    ds: 1,
    marks: {
      shovel: { leg: 0, offset: 0 },
      dump: { leg: 1, end: true, offset: 0 },
      bayEntry: { leg: 0, end: true, offset: 50 },
      bayClearAfterDump: 90,
    },
  });

  return { terrain, ramp, center, plaza, floor, route, legs, flats, piles, shovel, pilePos, plazaFlat, pocket };
}
