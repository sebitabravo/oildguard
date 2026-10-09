import type { SigningStatus } from "../sim/api";

export interface SigningBadgeState {
  kind: "verified" | "off";
  tone: "ok" | "warn" | "crit";
  rejected: number;
}

export function signingBadgeState(
  signing: SigningStatus | undefined,
): SigningBadgeState | null {
  if (!signing) return null;
  const rejected = Number.isFinite(signing.rejected_total)
    ? Math.max(0, Math.trunc(signing.rejected_total))
    : 0;
  if (!signing.enforced) {
    return { kind: "off", tone: rejected > 0 ? "crit" : "warn", rejected };
  }
  return {
    kind: "verified",
    tone: rejected > 0 ? "crit" : "ok",
    rejected,
  };
}
