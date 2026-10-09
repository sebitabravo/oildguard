// Suavizado Catmull-Rom centrípeto en planta (puro, sin three.js).

export type Pt = [number, number];

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Punto de Barry-Goldman para el segmento p1->p2 con parámetro de nudos centrípeto. */
function segmentPoint(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const t0 = 0;
  const t1 = t0 + Math.sqrt(dist(p0, p1)) || 1e-4;
  const t2 = t1 + Math.sqrt(dist(p1, p2)) || t1 + 1e-4;
  const t3 = t2 + Math.sqrt(dist(p2, p3)) || t2 + 1e-4;
  const t = t1 + (t2 - t1) * u;
  const mix = (a: Pt, b: Pt, ta: number, tb: number): Pt => {
    const f = (t - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  const a1 = mix(p0, p1, t0, t1);
  const a2 = mix(p1, p2, t1, t2);
  const a3 = mix(p2, p3, t2, t3);
  const b1 = mix(a1, a2, t0, t2);
  const b2 = mix(a2, a3, t1, t3);
  return mix(b1, b2, t1, t2);
}

/** Curva suave que pasa por todos los puntos; los extremos se prolongan reflejando el vecino. */
export function smoothPath(points: Pt[], perSegment = 24): Pt[] {
  if (points.length < 3) return points.slice();
  const first = points[0];
  const last = points[points.length - 1];
  const pre: Pt = [2 * first[0] - points[1][0], 2 * first[1] - points[1][1]];
  const post: Pt = [2 * last[0] - points[points.length - 2][0], 2 * last[1] - points[points.length - 2][1]];
  const ext = [pre, ...points, post];
  const out: Pt[] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    for (let k = 0; k < perSegment; k++) out.push(segmentPoint(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], k / perSegment));
  }
  out.push(last);
  return out;
}

/** Arco de círculo como polilínea: de `from` con rumbo `heading` (rad, atan2(dz, dx)), giro `sweep` rad (+ = horario en planta con z hacia abajo). */
export function arcPoints(from: Pt, heading: number, radius: number, sweep: number, steps = 16): Pt[] {
  const sign = Math.sign(sweep) || 1;
  // El centro queda a la derecha (sweep > 0) o a la izquierda del rumbo, con z hacia abajo.
  const cx = from[0] - Math.sin(heading) * radius * sign;
  const cz = from[1] + Math.cos(heading) * radius * sign;
  const a0 = Math.atan2(from[1] - cz, from[0] - cx);
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (sweep * i) / steps;
    pts.push([cx + Math.cos(a) * radius, cz + Math.sin(a) * radius]);
  }
  return pts;
}
