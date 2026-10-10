import { describe, expect, test } from "bun:test";

describe("reduced-motion preference", () => {
  test("snaps camera-position and controls-target transitions while preserving normal easing", async () => {
    const policy = await import("../twin/render/motionPreference").catch(() => null);
    expect(typeof policy?.resolveMotionAlpha).toBe("function");
    if (!policy) return;

    const positionAlpha = policy.resolveMotionAlpha(true, 0.18);
    const targetAlpha = policy.resolveMotionAlpha(true, 0.18);
    expect(positionAlpha).toBe(1);
    expect(targetAlpha).toBe(1);
    expect(policy.resolveMotionAlpha(false, 0.18)).toBe(0.18);
  });

  test("tracks preference changes while mounted and removes the listener on dispose", async () => {
    const policy = await import("../twin/render/motionPreference").catch(() => null);
    expect(typeof policy?.observeReducedMotion).toBe("function");
    if (!policy) return;

    type Listener = (event: { matches: boolean }) => void;
    const listeners = new Set<Listener>();
    const media = {
      matches: false,
      addEventListener: (_type: "change", listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: "change", listener: Listener) => listeners.delete(listener),
      change(matches: boolean) {
        this.matches = matches;
        for (const listener of listeners) listener({ matches });
      },
    };

    const changes: boolean[] = [];
    const preference = policy.observeReducedMotion(media, (reduced) => changes.push(reduced));
    expect(preference.reduced).toBe(false);
    media.change(true);
    expect(preference.reduced).toBe(true);
    expect(changes).toEqual([true]);
    preference.dispose();
    expect(listeners.size).toBe(0);
    media.change(false);
    expect(preference.reduced).toBe(true);
    expect(changes).toEqual([true]);
  });
});
