import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import {
  ASSEMBLY_PART_IDS,
  ASSEMBLY_PARTS,
  ASSEMBLY_REDUCTION_SOURCE,
  ASSEMBLY_TOLERANCE_PCT,
  ASSEMBLY_VIEW_LIMITS,
  assemblyReduction,
  assemblyDistanceForViewport,
  assertAssemblyComplete,
  buildAssemblyScene,
  cameraPositionFor,
  createAssemblyControls,
  reductionErrorPct,
  visibleParts,
  type AssemblyPartId,
} from "./assembly";

// Corte del conjunto GDY106: seis piezas legibles, reducción 32.62:1
// trazada a la fuente B01 y controles vivos de órbita/zoom/aislado.
const REQUIRED_PARTS: readonly AssemblyPartId[] = ["hub", "carrier", "planets", "sun", "brakes", "motor"];

describe("assembly cutaway parts", () => {
  test("preserves the documented reduction and illustrative stage split", () => {
    const reduction = assemblyReduction();

    expect(reduction.overall).toBe(32.62);
    expect(reduction.highSpeed).toBeCloseTo(6.75, 3);
    expect(reduction.lowSpeed).toBeCloseTo(4.833, 3);
    expect(reduction.illustrative).toBeCloseTo(32.625, 3);
    expect(reduction.wheelRpmAt3000).toBeCloseTo(3000 / 32.62, 10);
    expect(reduction.withinTolerance).toBe(true);
    expect(reductionErrorPct()).toBeLessThanOrEqual(ASSEMBLY_TOLERANCE_PCT);
    expect(ASSEMBLY_REDUCTION_SOURCE).toContain("docs/thesis-annex.md:22");
    expect(ASSEMBLY_REDUCTION_SOURCE).toContain("docs/research/landing-claims.md");
    expect(ASSEMBLY_REDUCTION_SOURCE).toContain("tooth counts illustrative ASSUMPTION");
  });

  test("exposes exactly the six required parts", () => {
    expect([...ASSEMBLY_PART_IDS].sort()).toEqual([...REQUIRED_PARTS].sort());
    expect(ASSEMBLY_PARTS.length).toBe(6);
    expect(new Set(ASSEMBLY_PART_IDS).size).toBe(6);
    assertAssemblyComplete([...ASSEMBLY_PART_IDS]);
  });

  test("every part carries a Spanish label and provenance", () => {
    for (const part of ASSEMBLY_PARTS) {
      expect(part.id.length).toBeGreaterThan(0);
      expect(part.label.length).toBeGreaterThan(0);
      expect(["VERIFIED", "DERIVED", "ASSUMPTION"] as readonly string[]).toContain(part.provenance);
    }
  });

  test("negative: a missing part fails the completeness gate", () => {
    const withoutBrakes = [...ASSEMBLY_PART_IDS].filter((id) => id !== "brakes");
    expect(() => assertAssemblyComplete(withoutBrakes)).toThrow();
    expect(() => assertAssemblyComplete([])).toThrow();
  });

  test("the built scene reads in cutaway with all six parts", () => {
    const { group, parts, shellOpacity } = buildAssemblyScene();
    expect(group instanceof THREE.Group).toBe(true);
    expect(group.name).toBe("gdy106-assembly-cutaway");
    for (const id of REQUIRED_PARTS) {
      const part = parts[id];
      expect(part instanceof THREE.Group).toBe(true);
      expect(part.userData.partId).toBe(id);
      expect(part.visible).toBe(true);
      expect(part.children.length).toBeGreaterThan(0);
    }
    // Corte: la carcasa queda translúcida para que los internos se lean.
    expect(shellOpacity).toBeLessThan(1);
    expect(shellOpacity).toBeGreaterThan(0);
    // Los planetas de alta (3) y baja (4) del tren GDY106 suman 7 piñones.
    expect(parts.planets.children.length).toBeGreaterThanOrEqual(7);
    expect(parts.planets.children.every((part) => part instanceof THREE.Mesh)).toBe(true);
    expect(parts.planets.children.every((part) => (part as THREE.Mesh).geometry.index !== null)).toBe(true);
  });

  test("uses the landing hairline family for housing edges", () => {
    const { group } = buildAssemblyScene();
    let edgeMaterial: THREE.LineBasicMaterial | undefined;
    group.traverse((object) => {
      if (object instanceof THREE.LineSegments) {
        edgeMaterial = object.material as THREE.LineBasicMaterial;
      }
    });

    expect(edgeMaterial?.color.getHex()).toBe(0x475569);
    expect(edgeMaterial?.opacity).toBeLessThanOrEqual(0.18);
  });
});

describe("assembly controls", () => {
  test("frames the landing assembly responsively without clipping mobile width", () => {
    expect(assemblyDistanceForViewport(1440)).toBeCloseTo(5, 10);
    expect(assemblyDistanceForViewport(390)).toBeCloseTo(7.5, 10);
    expect(assemblyDistanceForViewport(915)).toBeCloseTo(6.25, 10);

    const desktop = createAssemblyControls({}, 1440);
    const mobile = createAssemblyControls({}, 390);
    expect(desktop.getState().distance).toBeCloseTo(5, 10);
    expect(mobile.getState().distance).toBeCloseTo(7.5, 10);
    mobile.zoom(0.5);
    mobile.reset();
    expect(mobile.getState().distance).toBeCloseTo(7.5, 10);
  });

  test("starts framed for the landing viewport", () => {
    const state = createAssemblyControls().getState();
    const position = cameraPositionFor(state);
    const distance = Math.hypot(position.x, position.y - 1.6, position.z);

    expect(state.distance).toBeCloseTo(5, 1);
    expect(distance).toBeCloseTo(state.distance, 10);
  });

  test("orbit moves the camera and clamps the polar angle", () => {
    const controls = createAssemblyControls();
    const before = controls.getState();
    controls.orbit(0.4, 0.2);
    const after = controls.getState();
    expect(after.azimuth).not.toBe(before.azimuth);
    expect(after.polar).not.toBe(before.polar);
    controls.orbit(0, 100);
    expect(controls.getState().polar).toBeLessThanOrEqual(ASSEMBLY_VIEW_LIMITS.maxPolarAngle);
    controls.orbit(0, -100);
    expect(controls.getState().polar).toBeGreaterThanOrEqual(ASSEMBLY_VIEW_LIMITS.minPolarAngle);
  });

  test("zoom moves the distance and clamps to the stage limits", () => {
    const controls = createAssemblyControls();
    const before = controls.getState().distance;
    controls.zoom(0.5);
    expect(controls.getState().distance).toBeLessThan(before);
    controls.zoom(2);
    expect(controls.getState().distance).toBeCloseTo(before, 10);
    controls.zoom(0.0001);
    expect(controls.getState().distance).toBe(ASSEMBLY_VIEW_LIMITS.minDistance);
    controls.zoom(1000);
    expect(controls.getState().distance).toBe(ASSEMBLY_VIEW_LIMITS.maxDistance);
  });

  test("isolate solos one part and restores the full set", () => {
    const controls = createAssemblyControls();
    for (const id of REQUIRED_PARTS) {
      controls.isolate(id);
      expect(controls.getState().isolated).toBe(id);
      expect([...visibleParts(controls.getState())]).toEqual([id]);
    }
    controls.isolate(null);
    expect(controls.getState().isolated).toBe(null);
    expect([...visibleParts(controls.getState())].sort()).toEqual([...REQUIRED_PARTS].sort());
    controls.isolate("sun");
    controls.reset();
    expect(controls.getState().isolated).toBe(null);
  });

  test("negative: isolating an unknown part throws instead of silently dying", () => {
    const controls = createAssemblyControls();
    expect(() => controls.isolate("turbo" as unknown as AssemblyPartId)).toThrow();
  });

  test("negative: dead controls would fail — every control mutates observable state", () => {
    const controls = createAssemblyControls();
    const start = controls.getState();
    controls.orbit(0.1, 0.05);
    controls.zoom(0.9);
    controls.isolate("motor");
    const end = controls.getState();
    expect(end.azimuth).not.toBe(start.azimuth);
    expect(end.distance).not.toBe(start.distance);
    expect(end.isolated).not.toBe(start.isolated);
    const position = cameraPositionFor(end);
    expect(Number.isFinite(position.x)).toBe(true);
    expect(Number.isFinite(position.y)).toBe(true);
    expect(Number.isFinite(position.z)).toBe(true);
  });
});
