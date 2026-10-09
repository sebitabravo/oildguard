// T3 settling-transient stub (Sim A, part 2 of 2).
//
// On a move->rest transition the oil surface wobbles, then settles as a
// damped sine over ~2-4 s. The shape parameter `viscosityProxy` stands in
// for oil condition: 0.5 = dilute (fast settle) … 2.0 = degraded (slow).
// The real viscosity extractor lands in S3/T7; this stub only drives the
// bench visualization + exposes the shape honestly labeled as a proxy.

/** Dilute / fast end of the proxy range. */
export const VISC_MIN = 0.5;

/** Degraded / slow end of the proxy range. */
export const VISC_MAX = 2.0;

/** Nominal (fresh 85W-140) proxy value. */
export const VISC_NOMINAL = 1.0;

/** Wobble amplitude at the move->rest instant (scene units of tilt). */
export const WOBBLE_AMPLITUDE = 0.06;

/** Envelope is "settled" below this tilt (scene units). */
export const WOBBLE_EPSILON = 0.002;

/** Decay time constant (s): slower oil rings longer. 0.60 … 1.05 s. */
export function settlingTau(viscosityProxy: number): number {
  return 0.3 * viscosityProxy + 0.45;
}

/** Wobble frequency (Hz): degraded oil sloshes slower. 2.2 … 1.6 Hz. */
export function settlingFreq(viscosityProxy: number): number {
  return 2.2 - 0.4 * (viscosityProxy - VISC_MIN);
}

/**
 * Surface tilt (radians, signed) at `t` seconds after the move->rest
 * transition. Damped sine; ~0 once the envelope decays past epsilon.
 */
export function wobbleAt(
  t: number,
  viscosityProxy: number,
  amplitude = WOBBLE_AMPLITUDE
): number {
  if (t < 0) return 0;
  const tau = settlingTau(viscosityProxy);
  const freq = settlingFreq(viscosityProxy);
  return amplitude * Math.exp(-t / tau) * Math.sin(2 * Math.PI * freq * t);
}

/**
 * Predicted settling time (ms): envelope decay past epsilon,
 * t = tau * ln(A/eps). Ranges ~2040 ms (0.5, dilute) to ~3570 ms
 * (2.0, degraded) — inside the 2-4 s Done-criteria window.
 */
export function estimateSettlingMs(viscosityProxy: number): number {
  const tau = settlingTau(viscosityProxy);
  return Math.round(
    tau * Math.log(WOBBLE_AMPLITUDE / WOBBLE_EPSILON) * 1000
  );
}

/** Honest proxy label for the readout (never called "viscosity"). */
export function viscosityLabel(viscosityProxy: number, lang: "en" | "es" = "en"): string {
  if (viscosityProxy < 0.8) return lang === "es" ? "diluido · asentamiento rápido" : "dilute · fast settling";
  if (viscosityProxy < 1.5) return "nominal";
  return lang === "es" ? "degradado · asentamiento lento" : "degraded · slow settling";
}
