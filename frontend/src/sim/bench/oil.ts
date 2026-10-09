// T3 oil-volume helpers (Sim A, part 2 of 2).
//
// Physics anchors (feature doc, do not contradict without evidence):
// 95 L SAE 85W-140 per wheel motor; warning < 50%, critical < 30%,
// plus abrupt pressure-drop trigger (trigger wiring lands in S5/T10).

/** Reference fill: 95 L per GDY106 wheel motor. */
export const OIL_CAPACITY_L = 95;

/** Green at >= 50%. */
export const OIL_WARN_FRAC = 0.5;

/** Amber in [30%, 50%); red below 30%. */
export const OIL_CRIT_FRAC = 0.3;

export type OilState = "normal" | "warning" | "critical";

/** Threshold band for a 0..1 fill fraction. */
export function oilStateFor(frac: number): OilState {
  if (frac < OIL_CRIT_FRAC) return "critical";
  if (frac < OIL_WARN_FRAC) return "warning";
  return "normal";
}

/** Liters for a 0..1 fill fraction against the 95 L reference. */
export function oilLiters(frac: number): number {
  return frac * OIL_CAPACITY_L;
}

/** Three.js marker/fill color per band. */
export function oilColorFor(state: OilState): number {
  switch (state) {
    case "critical":
      return 0xff3b30;
    case "warning":
      return 0xf5a623;
    case "normal":
      return 0x2fbf71;
  }
}

/** CSS twin of oilColorFor (readout chips + overlay). */
export function oilCssFor(state: OilState): string {
  switch (state) {
    case "critical":
      return "#ff3b30";
    case "warning":
      return "#f5a623";
    case "normal":
      return "#2fbf71";
  }
}

/** Human band label for the readout panel. */
export function oilStateLabel(state: OilState): string {
  switch (state) {
    case "critical":
      return "CRITICAL (<30%)";
    case "warning":
      return "WARNING (30–50%)";
    case "normal":
      return "NORMAL (≥50%)";
  }
}

/** "62.7 L · 66%" display text for a 0..1 fill fraction. */
export function formatOilText(frac: number): string {
  const liters = oilLiters(frac);
  const pct = Math.round(frac * 100);
  return `${liters.toFixed(1)} L · ${pct}%`;
}
