import { describe, expect, test } from "bun:test";
import { settlingTau } from "../../sim/bench/settling";
import { WHEEL_RPM_MAX } from "../../sim/signals";
import { pressureKpaFromVolume } from "../../twin/physics";
import {
  BENCH_LIMITS,
  PROTOCOL_STEP_IDS,
  benchReading,
  holdUpL,
  protocolLevelSteps,
  stopTransient,
  viscosityProxyFromTemperature,
} from "./logic";

describe("viscosity proxy", () => {
  test("is nominal at the 75 C bench reference and stays inside the 0.5 to 2.0 proxy range", () => {
    expect(viscosityProxyFromTemperature(75)).toBeCloseTo(1, 10);
    expect(viscosityProxyFromTemperature(-40)).toBe(2);
    expect(viscosityProxyFromTemperature(200)).toBe(0.5);
  });

  test("oil is slower to settle when it is colder", () => {
    expect(viscosityProxyFromTemperature(40)).toBeGreaterThan(viscosityProxyFromTemperature(75));
    expect(viscosityProxyFromTemperature(75)).toBeGreaterThan(viscosityProxyFromTemperature(95));
  });
});

describe("hold-up", () => {
  test("is zero at rest and reaches the 6 L assumption at maximum wheel speed", () => {
    expect(holdUpL(0)).toBe(0);
    expect(holdUpL(WHEEL_RPM_MAX)).toBeCloseTo(6, 10);
    expect(holdUpL(WHEEL_RPM_MAX / 2)).toBeCloseTo(3, 10);
    expect(holdUpL(WHEEL_RPM_MAX * 3)).toBeCloseTo(6, 10);
    expect(holdUpL(-5)).toBe(0);
  });
});

describe("bench reading", () => {
  test("maps the fill volume to kPa through twin/physics at rest", () => {
    const reading = benchReading({ fillL: 95, temperatureC: 75, wheelRpm: 0 });
    expect(reading.restPressureKpa).toBe(pressureKpaFromVolume(95, 75));
    expect(reading.restPressureKpa).toBeGreaterThan(2.4);
    expect(reading.restPressureKpa).toBeLessThan(2.8);
    expect(reading.pressureNowKpa).toBe(reading.restPressureKpa);
    expect(reading.holdUpL).toBe(0);
    expect(reading.restGate).toBe(true);
    expect(reading.headMm).toBeGreaterThan(250);
  });

  test("reads lower while the wheel turns and closes the rest gate", () => {
    const reading = benchReading({ fillL: 95, temperatureC: 75, wheelRpm: WHEEL_RPM_MAX });
    expect(reading.restGate).toBe(false);
    expect(reading.holdUpL).toBeCloseTo(6, 10);
    expect(reading.restPressureKpa - reading.pressureNowKpa).toBeGreaterThan(0.05);
    expect(reading.restPressureKpa - reading.pressureNowKpa).toBeLessThan(0.2);
  });

  test("derives the settling time constant from the viscosity proxy", () => {
    const reading = benchReading({ fillL: 80, temperatureC: 60, wheelRpm: 0 });
    expect(reading.tauS).toBeCloseTo(settlingTau(reading.viscosityProxy), 10);
    expect(reading.settleMs).toBeGreaterThan(1500);
  });

  test("clamps inputs to the slider limits so a typed value cannot leave the model range", () => {
    const reading = benchReading({ fillL: 500, temperatureC: 500, wheelRpm: 500 });
    expect(reading.input.fillL).toBe(BENCH_LIMITS.fillL.max);
    expect(reading.input.temperatureC).toBe(BENCH_LIMITS.temperatureC.max);
    expect(reading.input.wheelRpm).toBe(BENCH_LIMITS.wheelRpm.max);
  });
});

describe("stop transient", () => {
  test("recovers from the held-up reading to the rest asymptote over four seconds", () => {
    const curve = stopTransient({ fillL: 95, temperatureC: 75, wheelRpm: WHEEL_RPM_MAX });
    const reading = benchReading({ fillL: 95, temperatureC: 75, wheelRpm: WHEEL_RPM_MAX });
    expect(curve.length).toBe(41);
    expect(curve[0].timeS).toBe(0);
    expect(curve[curve.length - 1].timeS).toBe(4);
    expect(curve[0].pressureKpa).toBeCloseTo(reading.pressureNowKpa, 10);
    expect(curve[curve.length - 1].pressureKpa).toBeCloseTo(reading.restPressureKpa, 2);
    for (let index = 1; index < curve.length; index += 1) {
      expect(curve[index].pressureKpa).toBeGreaterThanOrEqual(curve[index - 1].pressureKpa);
    }
  });

  test("is flat when the wheel is already at rest", () => {
    const curve = stopTransient({ fillL: 95, temperatureC: 75, wheelRpm: 0 });
    expect(curve[0].pressureKpa).toBe(curve[40].pressureKpa);
  });

  test("colder oil settles slower", () => {
    const cold = stopTransient({ fillL: 95, temperatureC: 30, wheelRpm: 60 });
    const hot = stopTransient({ fillL: 95, temperatureC: 95, wheelRpm: 60 });
    const gap = (curve: typeof cold) => curve[0].asymptoteKpa - curve[10].pressureKpa;
    expect(gap(cold)).toBeGreaterThan(gap(hot));
  });
});

describe("protocol", () => {
  test("lists the eight drain-and-weigh steps of docs/calibration.md", () => {
    expect(PROTOCOL_STEP_IDS.length).toBe(8);
  });

  test("tabulates expected pressure at every weighed level step of the protocol", () => {
    const steps = protocolLevelSteps(75);
    expect(steps.map((step) => step.volumeL)).toEqual([95, 90, 80, 70, 47.5, 28.5]);
    expect(steps[0].percent).toBe(100);
    expect(steps[5].percent).toBe(30);
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index].pressureKpa).toBeLessThan(steps[index - 1].pressureKpa);
    }
  });
});
