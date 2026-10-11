import { describe, expect, test } from "bun:test";
import {
  CYCLE_TOTAL,
  HAUL_CYCLE_PAUSES,
  HAUL_CYCLE_PHASES,
  HAUL_CYCLE_SOURCE,
  HAUL_DURATIONS,
  assertHaulPausesSupported,
  createHaulCyclePlayer,
  haulOilVisual,
  isHaulPause,
  oilStateFor,
} from "./haulCycle";
import {
  HAUL_DURATIONS as TRUCK_DURATIONS,
  HAUL_ORDER,
  isMovingState,
  isRecalState,
  stateAt,
} from "../../../sim/truck/cycle";

// Escena del ciclo de acarreo (B06): solo las pausas LOAD/DUMP soportadas y
// aceite agitado en movimiento frente a asentado en detención.
describe("haul cycle phases", () => {
  test("uses only the four cycle.ts phases in order", () => {
    expect([...HAUL_CYCLE_PHASES]).toEqual([...HAUL_ORDER]);
    expect(HAUL_CYCLE_PHASES.length).toBe(4);
    expect(HAUL_DURATIONS.LOAD).toBe(6);
    expect(HAUL_DURATIONS.HAUL).toBe(12);
    expect(HAUL_DURATIONS.DUMP).toBe(6);
    expect(HAUL_DURATIONS.WAIT).toBe(5);
    expect(HAUL_DURATIONS).toEqual(TRUCK_DURATIONS);
    expect(CYCLE_TOTAL).toBe(29);
  });

  test("supports exactly the LOAD/DUMP stationary pauses", () => {
    expect([...HAUL_CYCLE_PAUSES]).toEqual(["LOAD", "DUMP"]);
    assertHaulPausesSupported([...HAUL_CYCLE_PAUSES]);
    for (const pause of HAUL_CYCLE_PAUSES) {
      expect(isHaulPause(pause)).toBe(true);
      expect(isRecalState(pause)).toBe(true);
      expect(isMovingState(pause)).toBe(false);
    }
    expect(isHaulPause("HAUL")).toBe(false);
    expect(isHaulPause("WAIT")).toBe(false);
    expect(isMovingState("HAUL")).toBe(true);
    expect(isMovingState("WAIT")).toBe(true);
  });

  test("traces the pauses to cycle.ts and the B01 evidence report", () => {
    expect(HAUL_CYCLE_SOURCE).toContain("frontend/src/sim/truck/cycle.ts");
    expect(HAUL_CYCLE_SOURCE).toContain("landing-claims");
    expect(HAUL_CYCLE_SOURCE).toContain("WAIT");
  });

  test("negative: an extra pause fails the supported-pauses gate", () => {
    expect(() => assertHaulPausesSupported(["LOAD", "DUMP", "WAIT"])).toThrow();
    expect(() => assertHaulPausesSupported(["LOAD", "DUMP", "HAUL"])).toThrow();
    expect(() => assertHaulPausesSupported(["LOAD"])).toThrow();
    expect(() => assertHaulPausesSupported([])).toThrow();
    expect(() => assertHaulPausesSupported(["LOAD", "DUMP", "LOAD"])).toThrow();
  });
});

describe("haul oil settled versus agitated", () => {
  test("stopped oil reads settled on the LOAD/DUMP pauses", () => {
    expect(oilStateFor("LOAD")).toBe("settled");
    expect(oilStateFor("DUMP")).toBe("settled");
  });

  test("moving oil reads agitated on HAUL and the WAIT return leg", () => {
    expect(oilStateFor("HAUL")).toBe("agitated");
    expect(oilStateFor("WAIT")).toBe("agitated");
  });

  test("the settled visual is flat and distinguishable from the agitated one", () => {
    const stopped = haulOilVisual("LOAD");
    const moving = haulOilVisual("HAUL");
    expect(stopped.settled).toBe(true);
    expect(moving.settled).toBe(false);
    expect(stopped.tiltDeg).toBe(0);
    expect(moving.tiltDeg).toBeGreaterThan(0);
    expect(stopped.opacity).not.toBe(moving.opacity);
    expect(haulOilVisual("DUMP").state).toBe("settled");
    expect(haulOilVisual("WAIT").state).toBe("agitated");
  });

  test("negative: moving and stopped oil states must differ", () => {
    expect(oilStateFor("HAUL")).not.toBe(oilStateFor("LOAD"));
    expect(oilStateFor("WAIT")).not.toBe(oilStateFor("DUMP"));
    expect(haulOilVisual("HAUL").tiltDeg).not.toBe(haulOilVisual("LOAD").tiltDeg);
  });
});

describe("haul cycle reversible player", () => {
  test("starts at LOAD settled and steps forward through the four phases", () => {
    const player = createHaulCyclePlayer(0, 1);
    expect(player.getPhase().state).toBe("LOAD");
    expect(player.getOilState()).toBe("settled");
    expect(player.isPausePhase()).toBe(true);
    player.advance(7);
    expect(player.getPhase().state).toBe("HAUL");
    expect(player.getOilState()).toBe("agitated");
    expect(player.isPausePhase()).toBe(false);
    expect(player.getPhase()).toEqual(stateAt(player.getElapsed()));
  });

  test("reaches DUMP settled and WAIT agitated moving forward", () => {
    const player = createHaulCyclePlayer(0, 1);
    player.advance(19);
    expect(player.getPhase().state).toBe("DUMP");
    expect(player.getOilState()).toBe("settled");
    player.advance(6);
    expect(player.getPhase().state).toBe("WAIT");
    expect(player.getOilState()).toBe("agitated");
  });

  test("plays in reverse and wraps the 29 s loop both ways", () => {
    const player = createHaulCyclePlayer(0, 1);
    player.advance(29);
    expect(player.getPhase().state).toBe("LOAD");
    player.setDirection(-1);
    expect(player.getDirection()).toBe(-1);
    player.advance(1);
    expect(player.getPhase().state).toBe("WAIT");
    expect(player.getOilState()).toBe("agitated");
    player.advance(28);
    expect(player.getPhase().state).toBe("LOAD");
  });

  test("negative: an invalid play direction throws instead of drifting", () => {
    const player = createHaulCyclePlayer(0, 1);
    expect(() => player.setDirection(0 as unknown as 1)).toThrow();
    expect(player.getDirection()).toBe(1);
    expect(() => createHaulCyclePlayer(0, 0 as unknown as 1)).toThrow();
  });
});
