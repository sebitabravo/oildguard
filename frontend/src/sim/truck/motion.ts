import { S } from "../../twin/truck930e/spec";
import type { HaulState } from "./cycle";

// Animación del ciclo en funciones puras: levante de la tolva, carga y dirección.
// El ciclo (cycle.ts) manda los tiempos; acá solo se traducen a ángulos y fracciones.

export const smooth01 = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Levante 0 -> 45° -> 0 dentro de DUMP: sube 40 %, sostiene 20 %, baja 40 %. */
export function dumpTiltDeg(tInState: number, duration: number): number {
  const f = tInState / duration;
  if (f <= 0 || f >= 1) return 0;
  const up = 0.4;
  const hold = 0.6;
  if (f < up) return S.body.dumpAngle * smooth01(f / up);
  if (f < hold) return S.body.dumpAngle;
  return S.body.dumpAngle * (1 - smooth01((f - hold) / (1 - hold)));
}

/** Carga (0..1): sube mientras se llena en LOAD, 1 en HAUL, se vacía durante el levante en DUMP. */
export function payloadFor(state: HaulState, tInState: number, duration: number): number {
  switch (state) {
    case "LOAD":
      return smooth01((tInState - 1) / (duration - 2));
    case "HAUL":
      return 1;
    case "DUMP":
      return 1 - smooth01((tInState - 0.2 * duration) / (0.35 * duration));
    default:
      return 0;
  }
}

export const MAX_STEER = 0.42;

/** Ángulo medio de dirección (rad) para la velocidad de guiñada y la velocidad lineal (bicicleta). */
export function steerFor(yawRate: number, speed: number): number {
  const v = Math.max(Math.abs(speed), 1.5);
  const delta = Math.atan((S.chassis.wheelbase * yawRate) / v);
  return Math.min(MAX_STEER, Math.max(-MAX_STEER, delta));
}
