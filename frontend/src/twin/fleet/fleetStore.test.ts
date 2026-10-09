import { describe, expect, test } from "bun:test";
import { PUBLISH_HZ, createFleetStore } from "./fleetStore";
import { FleetSim } from "./fleetSim";
import { syntheticRoute } from "./syntheticRoute";

const make = (opts = {}) => createFleetStore(new FleetSim({ route: syntheticRoute(), trucks: 5, seed: 1 }), opts);

describe("fleet store", () => {
  test("publishes snapshots at about 5 Hz, not on every frame", () => {
    const store = make({ timeScale: 10 });
    let notified = 0;
    store.subscribe(() => (notified += 1));
    // 10 s de reloj real a 60 fps.
    for (let i = 0; i < 600; i++) store.tick(1 / 60);
    expect(notified).toBeGreaterThanOrEqual(PUBLISH_HZ * 10 - 6);
    expect(notified).toBeLessThanOrEqual(PUBLISH_HZ * 10 + 6);
  });

  test("getSnapshot is stable between publications (same object)", () => {
    const store = make();
    const a = store.getSnapshot();
    store.tick(0.01);
    expect(store.getSnapshot()).toBe(a);
    store.tick(0.25);
    expect(store.getSnapshot()).not.toBe(a);
    expect(store.getSnapshot().version).toBe(a.version + 1);
  });

  test("time compression multiplies the sim clock; pause freezes it; step advances it anyway", () => {
    const store = make({ timeScale: 30 });
    store.tick(1);
    expect(store.sim.clockS).toBeCloseTo(30, 3);
    store.setPaused(true);
    store.tick(1);
    expect(store.sim.clockS).toBeCloseTo(30, 3);
    store.step(5);
    expect(store.sim.clockS).toBeCloseTo(35, 3);
    expect(store.getSnapshot().fleet.clockS).toBeCloseTo(35, 3);
    store.setTimeScale(1);
    store.setPaused(false);
    store.tick(2);
    expect(store.sim.clockS).toBeCloseTo(37, 3);
    expect(store.getSnapshot().timeScale).toBe(1);
  });

  test("selection is published and unsubscribing stops notifications", () => {
    const store = make();
    let n = 0;
    const off = store.subscribe(() => (n += 1));
    store.select("OG-03");
    expect(store.getSnapshot().selectedId).toBe("OG-03");
    expect(n).toBe(1);
    off();
    store.select(null);
    expect(n).toBe(1);
  });
});
