// Secciones del producto y alias de hash heredados (#truck, #bench, #dash...).

export type Section = "mine" | "wheel" | "monitoring";
export type RouteId =
  | "fleet" | "monitoring" | "wheel-history" | "rul" | "calibration"
  | "mine" | "wheel" | "alerts" | "alert-rules" | "devices" | "link"
  | "lab-sim" | "lab-validation" | "lab-bench" | "report" | "login";

export interface RouteDefinition {
  id: RouteId | "home" | "alert-detail";
  path: string;
  ready: boolean;
}

export const routeRegistry: RouteDefinition[] = [
  { id: "home", path: "/", ready: true },
  { id: "login", path: "/login", ready: false },
  { id: "fleet", path: "/fleet", ready: true },
  { id: "monitoring", path: "/monitoring", ready: true },
  { id: "wheel-history", path: "/wheel/history", ready: true },
  { id: "rul", path: "/rul", ready: true },
  { id: "calibration", path: "/calibration", ready: true },
  { id: "mine", path: "/mine", ready: true },
  { id: "wheel", path: "/wheel", ready: true },
  { id: "alerts", path: "/alerts", ready: false },
  { id: "alert-detail", path: "/alerts/detail", ready: false },
  { id: "alert-rules", path: "/alerts/rules", ready: false },
  { id: "devices", path: "/devices", ready: false },
  { id: "link", path: "/link", ready: false },
  { id: "lab-sim", path: "/lab/sim", ready: true },
  { id: "lab-validation", path: "/lab/validation", ready: false },
  { id: "lab-bench", path: "/lab/bench", ready: false },
  { id: "report", path: "/report", ready: true },
];

export function isLegacyHash(hash: string): boolean {
  return (
    hash === "#mine" ||
    hash === "#truck" ||
    hash === "#wheel" ||
    hash === "#bench" ||
    hash.startsWith("#monitoring") ||
    hash.startsWith("#dash")
  );
}

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
