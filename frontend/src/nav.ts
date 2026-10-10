import type { DictKey } from "./i18n";
import type { RouteId } from "./routes";

export interface NavItem {
  id: RouteId;
  href: string;
  label: DictKey;
  detail: DictKey;
}

export interface NavGroup {
  label: DictKey;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "nav.group.operation",
    items: [
      { id: "fleet", href: "/fleet", label: "nav.fleet", detail: "nav.fleetDetail" },
      { id: "monitoring", href: "/monitoring", label: "nav.monitoringLive", detail: "nav.monitoringDetail" },
      { id: "wheel-history", href: "/wheel/history", label: "nav.history", detail: "nav.historyDetail" },
      { id: "rul", href: "/rul", label: "nav.rul", detail: "nav.rulDetail" },
      { id: "calibration", href: "/calibration", label: "nav.calibration", detail: "nav.calibrationDetail" },
    ],
  },
  {
    label: "nav.group.twin",
    items: [
      { id: "mine", href: "/mine", label: "nav.mine", detail: "nav.mineDetail" },
      { id: "wheel", href: "/wheel", label: "nav.wheel", detail: "nav.wheelDetail" },
    ],
  },
  {
    label: "nav.group.alerts",
    items: [
      { id: "alerts", href: "/alerts", label: "nav.alerts", detail: "nav.alertsDetail" },
      { id: "alert-rules", href: "/alerts/rules", label: "nav.alertRules", detail: "nav.alertRulesDetail" },
    ],
  },
  {
    label: "nav.group.platform",
    items: [
      { id: "devices", href: "/devices", label: "nav.devices", detail: "nav.devicesDetail" },
      { id: "link", href: "/link", label: "nav.link", detail: "nav.linkDetail" },
    ],
  },
  {
    label: "nav.group.lab",
    items: [
      { id: "lab-sim", href: "/lab/sim", label: "nav.simulation", detail: "nav.simulationDetail" },
      { id: "lab-validation", href: "/lab/validation", label: "nav.validation", detail: "nav.validationDetail" },
      { id: "lab-bench", href: "/lab/bench", label: "nav.bench", detail: "nav.benchDetail" },
    ],
  },
];

export function activeRoute(pathname: string): RouteId | null {
  if (pathname === "/") return null;
  const item = navGroups.flatMap((group) => group.items).find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  return item?.id ?? null;
}
