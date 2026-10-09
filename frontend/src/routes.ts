// Secciones del producto y alias de hash heredados (#truck, #bench, #dash...).

export type Section = "mine" | "wheel" | "monitoring";

export function modeFromHash(hash: string): Section {
  if (hash.startsWith("#monitoring") || hash.startsWith("#dash")) return "monitoring";
  if (hash === "#mine" || hash === "#truck") return "mine";
  return "wheel";
}
