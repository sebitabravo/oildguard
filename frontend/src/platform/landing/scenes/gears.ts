import * as THREE from "three";

export interface GearGeometryOptions {
  readonly teeth: number;
  readonly rootRadius: number;
  readonly tipRadius: number;
  readonly width: number;
}

export function createGearOutline(
  teeth: number,
  rootRadius: number,
  tipRadius: number,
): THREE.Vector2[] {
  if (!Number.isInteger(teeth) || teeth < 3) throw new Error("A gear needs at least three integer teeth");
  if (!Number.isFinite(rootRadius) || !Number.isFinite(tipRadius) || rootRadius <= 0 || tipRadius <= rootRadius) {
    throw new Error("Gear radii must be finite and positive, with tipRadius above rootRadius");
  }

  const outline: THREE.Vector2[] = [];
  const toothAngle = (Math.PI * 2) / teeth;
  const radii = [rootRadius, rootRadius, tipRadius, tipRadius];
  const phases = [0, 0.22, 0.32, 0.68];
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    for (let corner = 0; corner < radii.length; corner += 1) {
      const angle = (tooth + phases[corner]) * toothAngle;
      outline.push(new THREE.Vector2(Math.cos(angle) * radii[corner], Math.sin(angle) * radii[corner]));
    }
  }
  outline.push(outline[0].clone());
  return outline;
}

export function generateGearGeometry(options: GearGeometryOptions): THREE.BufferGeometry {
  const { teeth, rootRadius, tipRadius, width } = options;
  if (!(width > 0) || !Number.isFinite(width)) throw new Error("Gear width must be a finite value above zero");
  const outline = createGearOutline(teeth, rootRadius, tipRadius).slice(0, -1);
  const count = outline.length;
  const positions: number[] = [];
  const indices: number[] = [];
  const halfWidth = width / 2;

  for (const x of [-halfWidth, halfWidth]) {
    for (const point of outline) positions.push(x, point.x, point.y);
  }
  const frontCenter = positions.length / 3;
  positions.push(-halfWidth, 0, 0);
  const backCenter = positions.length / 3;
  positions.push(halfWidth, 0, 0);

  const backOffset = count;
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    indices.push(frontCenter, next, i);
    indices.push(backCenter, backOffset + i, backOffset + next);
    indices.push(i, next, backOffset + next, i, backOffset + next, backOffset + i);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
