import { S } from "./spec";

// Cinemática pura del camión (sin three.js): bisagra de la tolva, cilindros de
// levante, Ackermann y compresión de suspensión. Testeable sin WebGL.

const RAD = Math.PI / 180;

export const clampTiltDeg = (deg: number): number => Math.min(S.body.dumpAngle, Math.max(0, deg));

/** Punto del marco del camión (x, y) tras girar la tolva `deg` grados sobre la bisagra. */
export function tiltPoint(x: number, y: number, deg: number): [number, number] {
  const a = clampTiltDeg(deg) * RAD;
  const dx = x - S.body.hingeX;
  const dy = y - S.body.hingeY;
  return [
    S.body.hingeX + dx * Math.cos(a) - dy * Math.sin(a),
    S.body.hingeY + dx * Math.sin(a) + dy * Math.cos(a),
  ];
}

/** Altura de la punta de la visera con la tolva levantada `deg` grados. */
export function bodyUpHeight(deg: number): number {
  return tiltPoint(S.body.canopyTipX, S.body.canopyTipHeight, deg)[1];
}

export interface HoistPose {
  /** Largo total del cilindro (m). */
  length: number;
  /** Ángulo del eje respecto de la horizontal en el plano X-Y (rad). */
  angle: number;
  base: [number, number];
  top: [number, number];
}

/** Pose del cilindro de levante: base en el chasis, extremo en la ménsula de la tolva. */
export function hoistPose(deg: number): HoistPose {
  const base: [number, number] = [S.hoist.baseX, S.hoist.baseY];
  const top = tiltPoint(S.hoist.attachX, S.hoist.attachY, deg);
  const dx = top[0] - base[0];
  const dy = top[1] - base[1];
  return { length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx), base, top };
}

/** Largos de las tres etapas telescópicas para un largo total dado. */
export function hoistStageLength(totalLength: number): number {
  const n = S.hoist.stages;
  return (totalLength + (n - 1) * S.hoist.stageOverlap) / n;
}

/**
 * Ackermann: ángulo de cada rueda delantera para un ángulo medio `delta` (rad,
 * positivo = giro a la izquierda). Devuelve [izquierda, derecha]; la rueda
 * interior gira más que la exterior.
 */
export function ackermann(delta: number): [number, number] {
  if (Math.abs(delta) < 1e-6) return [0, 0];
  const L = S.chassis.wheelbase;
  const half = S.chassis.frontTrack / 2;
  const R = L / Math.tan(Math.abs(delta));
  const inner = Math.atan(L / (R - half));
  const outer = Math.atan(L / (R + half));
  return delta > 0 ? [inner, outer] : [-outer, -inner];
}

/** Hundimiento del chasis (m) por la compresión de los Hydrair con la carga (0..1). */
export function payloadSag(fraction: number): number {
  return Math.min(1, Math.max(0, fraction)) * S.suspension.payloadCompression;
}
