import { describe, expect, test } from "bun:test";
import { P, kmhToMps } from "../pit/pitSpec";
import { stageSpeeds } from "../physics";
import { S } from "../truck930e/spec";
import {
  FLEET,
  FleetSim,
  PLM,
  PLM_ORDER,
  gradeSpeedLimitMps,
  rotorRpmFromWheelRpm,
  speedProfile,
  wheelRpmFromSpeed,
  type FleetSnapshot,
  type PlmState,
} from "./fleetSim";
import { aheadDistance, sampleRoute } from "./route";
import { syntheticRoute } from "./syntheticRoute";

const route = syntheticRoute();

/** Corre la flota y entrega cada snapshot (paso de 1 s de simulación). */
function run(sim: FleetSim, seconds: number, onTick: (snap: FleetSnapshot) => void, stepS = 1) {
  for (let t = 0; t < seconds; t += stepS) {
    sim.advance(stepS);
    onTick(sim.snapshot());
  }
}

describe("synthetic route", () => {
  test("is a closed loop with a reverse leg between the bay entry and the dump spot", () => {
    const m = route.marks;
    expect(m.sShovel).toBe(0);
    expect(m.sRevStart).toBeLessThan(m.sDump);
    expect(m.sDump).toBeLessThan(m.sBayClear);
    expect(sampleRoute(route, m.sDump - 5).facing).toBe(-1);
    expect(sampleRoute(route, m.sDump + 5).facing).toBe(1);
    expect(sampleRoute(route, m.sShovel).facing).toBe(1);
  });

  test("the loaded lane climbs at the 10 % design grade", () => {
    const up = sampleRoute(route, 300);
    expect(Math.tan((up.slopeDeg * Math.PI) / 180)).toBeCloseTo(0.1, 2);
  });
});

describe("speed limits by grade and load", () => {
  test("loaded uphill at 10 % is about 12.5 km/h and empty about 29 km/h", () => {
    expect(gradeSpeedLimitMps(0.1, true) * 3.6).toBeCloseTo(P.speed.loadedUphill, 1);
    expect(gradeSpeedLimitMps(0.1, false) * 3.6).toBeCloseTo(P.speed.emptyUphill, 1);
  });

  test("flat is faster than uphill; empty downhill is retarding-limited below the flat limit", () => {
    expect(gradeSpeedLimitMps(0, true)).toBeGreaterThan(gradeSpeedLimitMps(0.1, true));
    expect(gradeSpeedLimitMps(-0.1, false) * 3.6).toBeCloseTo(P.speed.emptyDownhill, 1);
    expect(gradeSpeedLimitMps(-0.1, false)).toBeLessThan(gradeSpeedLimitMps(0, false));
  });

  test("the profile slows the truck before a curve and the reverse leg", () => {
    const loaded = speedProfile(route, true);
    const reverseIdx = Math.floor(route.marks.sDump - 5);
    expect(loaded[reverseIdx]).toBeCloseTo(kmhToMps(P.speed.reverse), 3);
    // Frenada anticipada: 40 m antes del retroceso la cota ya es menor que el límite plano.
    expect(loaded[Math.floor(route.marks.sRevStart - 40)]).toBeLessThan(kmhToMps(P.speed.loadedFlat) - 0.5);
  });
});

describe("wheel and rotor speed", () => {
  test("rotor rpm goes through the GDY106 train and returns the wheel rpm", () => {
    const v = kmhToMps(40);
    const wheel = wheelRpmFromSpeed(v);
    expect(wheel).toBeCloseTo((v / S.tire.rollingRadius) * (60 / (2 * Math.PI)), 6);
    const rotor = rotorRpmFromWheelRpm(wheel);
    expect(stageSpeeds(rotor).wheelRpm).toBeCloseTo(wheel, 6);
    expect(rotor / wheel).toBeCloseTo(32.62, 1);
  });
});

describe("fleet cycle", () => {
  test("a truck completes the cycle: payload goes 0 -> about 290 t -> 0", () => {
    const sim = new FleetSim({ route, trucks: 1, seed: 3, spawn: "queue" });
    let peak = 0;
    let sawLoaded = false;
    let emptiedAfter = false;
    let cycles = 0;
    run(sim, 3000, (snap) => {
      const t = snap.trucks[0];
      peak = Math.max(peak, t.payloadT);
      if (t.payloadT > 0.9 * PLM.ratedPayloadT) sawLoaded = true;
      if (sawLoaded && t.payloadT === 0) emptiedAfter = true;
      cycles = t.cycles;
    });
    expect(sawLoaded).toBe(true);
    expect(emptiedAfter).toBe(true);
    expect(cycles).toBeGreaterThanOrEqual(2);
    expect(peak).toBeGreaterThan(PLM.ratedPayloadT * 0.96);
    expect(peak).toBeLessThan(PLM.ratedPayloadT * 1.04);
  });

  test("payload rises in as many steps as shovel passes", () => {
    const sim = new FleetSim({ route, trucks: 1, seed: 3, spawn: "queue" });
    const steps: number[] = [];
    let last = 0;
    run(
      sim,
      400,
      (snap) => {
        const p = snap.trucks[0].payloadT;
        if (p > last + 1 && steps.length < 8) steps.push(p);
        last = p;
      },
      0.25,
    );
    // Cada vuelco de cucharón es un escalón; después la carga queda fija hasta descargar.
    const climbs = steps.length;
    expect(climbs).toBeGreaterThanOrEqual(P.shovel.passes);
    expect(steps[P.shovel.passes - 1]).toBeGreaterThan(PLM.ratedPayloadT * 0.95);
  });

  test("follows the PLM III state order through a full cycle", () => {
    const sim = new FleetSim({ route, trucks: 1, seed: 5, spawn: "queue" });
    const seen: PlmState[] = [];
    run(sim, 3000, (snap) => {
      const plm = snap.trucks[0].plm;
      if (seen[seen.length - 1] !== plm) seen.push(plm);
    });
    const expected: PlmState[] = ["empty", "loading", "maneuvering", "final_zone", "hauling", "dumping", "after_dump", "tare_zone", "empty"];
    expect(seen.slice(0, expected.length)).toEqual(expected);
    for (const s of seen) expect(PLM_ORDER.includes(s)).toBe(true);
  });

  test("only one truck loads at a time and only one dumps at a time", () => {
    const sim = new FleetSim({ route, trucks: 5, seed: 11 });
    let maxLoading = 0;
    let maxDumping = 0;
    let loadings = 0;
    run(sim, 4000, (snap) => {
      const l = snap.trucks.filter((t) => t.phase === "loading").length;
      const d = snap.trucks.filter((t) => t.phase === "dumping").length;
      maxLoading = Math.max(maxLoading, l);
      maxDumping = Math.max(maxDumping, d);
      loadings += l;
    });
    expect(maxLoading).toBe(1);
    expect(maxDumping).toBe(1);
    expect(loadings).toBeGreaterThan(0);
  });

  test("trucks never overlap on the path and keep their minimum headway", () => {
    const sim = new FleetSim({ route, trucks: 5, seed: 2 });
    let minGap = Infinity;
    let minPlanar = Infinity;
    run(
      sim,
      4000,
      (snap) => {
        for (let i = 0; i < snap.trucks.length; i++) {
          for (let j = i + 1; j < snap.trucks.length; j++) {
            const a = snap.trucks[i];
            const b = snap.trucks[j];
            minGap = Math.min(minGap, Math.min(aheadDistance(route, a.s, b.s), aheadDistance(route, b.s, a.s)));
            minPlanar = Math.min(minPlanar, Math.hypot(a.x - b.x, a.z - b.z));
          }
        }
      },
      0.5,
    );
    expect(minGap).toBeGreaterThanOrEqual(FLEET.minSpacingM - 0.01);
    // Los camiones miden 15.6 x 8.7 m: con centros a menos de 14 m las huellas se tocarían.
    expect(minPlanar).toBeGreaterThan(14);
  });

  test("a queue forms at the shovel when the fleet outpaces it", () => {
    const sim = new FleetSim({ route, trucks: 5, seed: 4, spawn: "queue" });
    let maxQueued = 0;
    run(sim, 600, (snap) => {
      maxQueued = Math.max(maxQueued, snap.queued);
    });
    expect(maxQueued).toBeGreaterThanOrEqual(2);
  });
});

describe("recalibration gating (stopped + leveled + engine-on)", () => {
  test("recal equals stopped && leveled && engineOn on every tick of every truck", () => {
    const sim = new FleetSim({ route, trucks: 5, seed: 8 });
    let recalTicks = 0;
    run(
      sim,
      3000,
      (snap) => {
        for (const t of snap.trucks) {
          expect(t.recal).toBe(t.stopped && t.leveled && t.engineOn);
          expect(t.stopped).toBe(t.speedMps < FLEET.stoppedMps);
          expect(t.leveled).toBe(Math.abs(t.pitchDeg) < FLEET.leveledDeg);
          if (t.recal) recalTicks += 1;
        }
      },
      0.5,
    );
    expect(recalTicks).toBeGreaterThan(0);
  });

  test("a truck stopped on the ramp is queued but NOT recal (not leveled)", () => {
    // Un camión bloqueado en plena rampa (avería) y otro detrás, que hace cola sobre la pendiente.
    const sim = new FleetSim({
      route,
      seed: 6,
      initial: [
        { s: 260, loaded: true },
        { s: 190, loaded: true },
      ],
    });
    sim.setHold("OG-01", true);
    let stoppedOnRamp = 0;
    run(sim, 200, (snap) => {
      for (const t of snap.trucks) {
        if (t.stopped && t.onGrade) {
          stoppedOnRamp += 1;
          expect(t.recal).toBe(false);
          expect(t.leveled).toBe(false);
          expect(Math.abs(t.pitchDeg)).toBeGreaterThan(5);
        }
      }
    });
    expect(stoppedOnRamp).toBeGreaterThan(100);
    const end = sim.snapshot().trucks;
    expect(end[0].stopped && end[1].stopped).toBe(true);
    expect(end[1].phase).toBe("queued");
  });

  test("a truck stopped on flat ground with the engine on is recal; with the engine off it is not", () => {
    const sim = new FleetSim({ route, seed: 6, initial: [{ s: -40 }, { s: -80 }] });
    sim.setHold("OG-01", true);
    run(sim, 120, () => undefined);
    const flat = sim.snapshot().trucks;
    expect(flat[0].stopped).toBe(true);
    expect(flat[0].onGrade).toBe(false);
    expect(flat[0].recal).toBe(true);
    expect(flat[1].recal).toBe(true);
    sim.setEngine("OG-01", false);
    sim.advance(1);
    expect(sim.snapshot().trucks[0].recal).toBe(false);
    expect(sim.snapshot().trucks[1].recal).toBe(true);
  });
});

describe("determinism and identity", () => {
  test("same seed gives the same history; a different seed changes the payloads", () => {
    const history = (seed: number) => {
      const sim = new FleetSim({ route, trucks: 5, seed });
      sim.advance(2500);
      return JSON.stringify(sim.snapshot().trucks.map((t) => [t.s.toFixed(3), t.payloadT.toFixed(3), t.plm, t.cycles]));
    };
    expect(history(5)).toBe(history(5));
    expect(history(5)).not.toBe(history(6));
  });

  test("ids OG-01..OG-05 carry two wheels each and OG-03 RL is the leak demo unit", () => {
    const sim = new FleetSim({ route, trucks: 5, seed: 1 });
    const trucks = sim.snapshot().trucks;
    expect(trucks.map((t) => t.id)).toEqual(["OG-01", "OG-02", "OG-03", "OG-04", "OG-05"]);
    for (const t of trucks) expect(t.wheels.map((w) => w.side)).toEqual(["RL", "RR"]);
    expect(trucks[2].wheels[0].id).toBe("OG-03-RL");
    const leaks = trucks.flatMap((t) => t.wheels.filter((w) => w.leakDemo).map((w) => w.id));
    expect(leaks).toEqual(["OG-03-RL"]);
    expect(trucks[2].leakDemo).toBe(true);
  });

  test("the dump tilts the body 0 -> 45 -> 0 degrees", () => {
    const sim = new FleetSim({ route, trucks: 1, seed: 3, spawn: "queue" });
    let peak = 0;
    let after = 0;
    run(
      sim,
      1500,
      (snap) => {
        const t = snap.trucks[0];
        peak = Math.max(peak, t.tiltDeg);
        if (t.cycles >= 1) after = t.tiltDeg;
      },
      0.5,
    );
    expect(peak).toBeCloseTo(S.body.dumpAngle, 0);
    expect(after).toBe(0);
  });
});
