import { describe, expect, test } from "bun:test";
import { signingBadgeState } from "./signingBadge";

describe("measurement signing badge state", () => {
  test("does not render when the backend does not provide signing status", () => {
    expect(signingBadgeState(undefined)).toBe(null);
  });

  test("shows the enforced healthy state with rejection count", () => {
    expect(signingBadgeState({
      enforced: true,
      devices: 2,
      verified_total: 14,
      rejected_total: 0,
      rejected_reasons: {},
    })).toEqual({ kind: "verified", tone: "ok", rejected: 0 });
  });

  test("marks enforcement-off and rejected states distinctly", () => {
    expect(signingBadgeState({
      enforced: false,
      devices: 1,
      verified_total: 3,
      rejected_total: 2,
      rejected_reasons: {},
    })).toEqual({ kind: "off", tone: "crit", rejected: 2 });
    expect(signingBadgeState({
      enforced: true,
      devices: 1,
      verified_total: 3,
      rejected_total: 2,
      rejected_reasons: { bad_signature: 2 },
    })).toEqual({ kind: "verified", tone: "crit", rejected: 2 });
  });
});
