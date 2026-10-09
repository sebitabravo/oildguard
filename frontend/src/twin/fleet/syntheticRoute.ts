import { assembleRoute, type Route, type RouteLeg } from "./route";
import { arcPoints, smoothPath, type Pt } from "./smooth";

// Ruta sintética para pruebas: misma topología que el foso real (carril cargado,
// giro en T con retroceso al bolsillo, carril de vacío, giro en U al pie), pero en
// líneas rectas sobre un eje X. La rampa sube 30 m en 300 m (10 %).

const LANE = 15.2;
const R = 25;

export const syntheticHeight = (x: number): number => {
  if (x <= 150) return -30;
  if (x >= 450) return 0;
  return -30 + (x - 150) * 0.1;
};

export function syntheticRoute(): Route {
  const loadedZ = 0;
  const returnZ = -LANE;
  // Tramo 0: pala (x = 0) -> rampa -> explanada -> giro a la derecha hasta p0.
  const turn = arcPoints([520, loadedZ], 0, R, Math.PI / 2, 14);
  const leg0: Pt[] = [[0, loadedZ], [150, loadedZ], [300, loadedZ], [450, loadedZ], [520, loadedZ], ...turn.slice(1)];
  const p0 = turn[turn.length - 1];
  const dump: Pt = [p0[0], returnZ - R];
  // Tramo 1: retroceso en línea recta al punto de descarga.
  const leg1: Pt[] = [p0, dump];
  // Tramo 2: salida en arco, carril de vacío hacia el piso, giro en U y aproximación a la pala.
  const exit = arcPoints(dump, Math.PI / 2, R, Math.PI / 2, 14);
  const uCenterX = -160;
  const toU: Pt[] = [[520, returnZ], [450, returnZ], [300, returnZ], [150, returnZ], [0, returnZ], [uCenterX, returnZ]];
  const u1 = arcPoints([uCenterX, returnZ], Math.PI, R, -Math.PI / 2, 12);
  const u2 = arcPoints(u1[u1.length - 1], Math.PI / 2, R, -Math.PI / 2, 12);
  const uEnd = u2[u2.length - 1];
  const approach = smoothPath(
    [uEnd, [uCenterX + 40, uEnd[1] - 14], [-90, 6], [-70, loadedZ], [-40, loadedZ], [0, loadedZ]],
    14,
  );
  const leg2: Pt[] = [...exit, ...toU.slice(1), ...u1.slice(1), ...u2.slice(1), ...approach.slice(1)];
  const legs: RouteLeg[] = [
    { pts: leg0, reverse: false },
    { pts: leg1, reverse: true },
    { pts: leg2, reverse: false },
  ];
  return assembleRoute(legs, {
    heightAt: (x) => syntheticHeight(x),
    ds: 1,
    marks: { shovel: { leg: 0, offset: 0 }, dump: { leg: 1, end: true, offset: 0 }, bayEntry: { leg: 0, end: true, offset: 50 }, bayClearAfterDump: 90 },
  });
}
