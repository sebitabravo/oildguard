// Secciones del producto y alias de hash heredados (#truck, #bench, #dash...).

export type Section = "mine" | "wheel" | "monitoring";

export function modeFromHash(hash: string): Section {
  if (hash.startsWith("#monitoring") || hash.startsWith("#dash")) return "monitoring";
  if (hash === "#mine" || hash === "#truck") return "mine";
  return "wheel";
}

export function pathFromHash(hash: string, search = ""): string {
  const section = modeFromHash(hash);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (hash.startsWith("#dash-demo") || hash.startsWith("#monitoring-demo")) {
    params.set("demo", "1");
  }

  const query = params.toString();
  return `/${section}${query ? `?${query}` : ""}`;
}
