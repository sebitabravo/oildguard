import { Box3, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "bun:test";
import { fitReferenceTruckCamera } from "./reference-truck";

const box = new Box3(new Vector3(-2.25, 0, -1.1), new Vector3(2.25, 2.4, 1.1));
const screenMargin = 0.05;
const ndcLimit = 1 - screenMargin * 2;

describe("fitReferenceTruckCamera", () => {
  it("keeps every model corner inside the viewer with a margin at wide and tall aspects", () => {
    for (const aspect of [1440 / 900, 390 / 844]) {
      const camera = new PerspectiveCamera(32, aspect, 0.1, 100);
      fitReferenceTruckCamera(camera, box, screenMargin);
      camera.updateMatrixWorld(true);

      for (const corner of boxCorners(box)) {
        const projected = corner.project(camera);
        expect(Math.abs(projected.x)).toBeLessThanOrEqual(ndcLimit);
        expect(Math.abs(projected.y)).toBeLessThanOrEqual(ndcLimit);
      }
    }
  });
});

function boxCorners(bounds: Box3): Vector3[] {
  const { min, max } = bounds;
  return [
    new Vector3(min.x, min.y, min.z),
    new Vector3(min.x, min.y, max.z),
    new Vector3(min.x, max.y, min.z),
    new Vector3(min.x, max.y, max.z),
    new Vector3(max.x, min.y, min.z),
    new Vector3(max.x, min.y, max.z),
    new Vector3(max.x, max.y, min.z),
    new Vector3(max.x, max.y, max.z),
  ];
}
