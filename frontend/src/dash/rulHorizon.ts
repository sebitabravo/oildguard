export type RulHorizon = "critical" | "warning" | "beyond";

export function classifyRulHorizon(
  hoursToCritical: number,
  hoursToWarning: number,
  shiftHours = 8,
): RulHorizon {
  if (hoursToCritical < shiftHours) return "critical";
  if (hoursToWarning < shiftHours) return "warning";
  return "beyond";
}
