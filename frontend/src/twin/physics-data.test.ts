import { describe, expect, test } from "bun:test";
import demoData from "../demo/demo-data.json";
import {
  BETA_RHO_PER_C,
  CAPACITY_L,
  DEFAULT_GEAR_CASE,
  G,
  GDY106_TRAIN,
  GEAR_RATIO,
  HEAD_TOL_M,
  RESEARCH_ROTATING_CAVITY,
  RHO_REF,
  RHO_T_REF_C,
  ROTATING_RIMMING_FROUDE_MIN,
  ROTATING_RPM_MAX,
  ROTATING_SAMPLES_DEFAULT,
  ROTATING_SAMPLES_MAX,
  ROTATING_SAMPLES_MIN,
  ROTATING_STATIC_FROUDE_MAX,
  SLOSH_FROUDE_FACTOR,
  SLOSH_HEIGHT_CAP_FACTOR,
} from "./physics";

describe("frontend physics source parity", () => {
  test("maps every physics constant from the simulator JSON", () => {
    const constants = demoData.physics.constants;
    expect({
      betaRhoPerC: BETA_RHO_PER_C,
      capacityL: CAPACITY_L,
      defaultGearCase: DEFAULT_GEAR_CASE,
      gdy106Train: GDY106_TRAIN,
      gearRatio: GEAR_RATIO,
      gravity: G,
      headToleranceM: HEAD_TOL_M,
      researchRotatingCavity: RESEARCH_ROTATING_CAVITY,
      rhoRef: RHO_REF,
      rhoTRefC: RHO_T_REF_C,
      rotatingRimmingFroudeMin: ROTATING_RIMMING_FROUDE_MIN,
      rotatingRpmMax: ROTATING_RPM_MAX,
      rotatingSamplesDefault: ROTATING_SAMPLES_DEFAULT,
      rotatingSamplesMax: ROTATING_SAMPLES_MAX,
      rotatingSamplesMin: ROTATING_SAMPLES_MIN,
      rotatingStaticFroudeMax: ROTATING_STATIC_FROUDE_MAX,
      sloshFroudeFactor: SLOSH_FROUDE_FACTOR,
      sloshHeightCapFactor: SLOSH_HEIGHT_CAP_FACTOR,
    }).toEqual(constants);
  });
});
