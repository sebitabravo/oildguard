import * as THREE from "three";
import { S } from "./spec";
import { Bin, canon, cyl, xf } from "./geom";

// Rueda 53/80R63: neumático por revolución (perfil con abombamiento de flanco),
// tacos en chevron (instanciados), aro amarillo con disco embutido, maza
// maquinada y tapa del GDY106. El eje de giro es Z y el lado exterior es +Z.

/** Perfil de media sección [radio, semiancho] desde el talón hasta el centro de la banda. */
export function halfSection(width: number): Array<[number, number]> {
  const half = width / 2;
  const R = S.tire.freeRadius - S.tire.treadDepth;
  const rim = S.tire.rimDiameter / 2;
  return [
    [rim, 0.3],
    [rim + 0.05, 0.46],
    [rim + 0.2, 0.575],
    [1.1, half * 0.97],
    [1.3, half],
    [1.5, half * 0.96],
    [1.68, half * 0.8],
    [R - 0.05, 0.5],
    [R, 0.4],
    [R, 0],
  ];
}

/** Puntos [x = radio, y = axial] para LatheGeometry, de talón a talón por la banda. */
export function tireLathePoints(width: number, samples = 6): THREE.Vector2[] {
  const half = halfSection(width);
  const curve = new THREE.SplineCurve(half.map(([r, h]) => new THREE.Vector2(r, h)));
  const smooth = curve.getPoints((half.length - 1) * samples);
  const left = smooth.map((p) => new THREE.Vector2(p.x, -p.y));
  const right = smooth
    .slice()
    .reverse()
    .slice(1)
    .map((p) => new THREE.Vector2(p.x, p.y));
  return [...left, ...right];
}

export function buildTireGeometry(width: number, segments = 96): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(tireLathePoints(width), segments);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Medio taco de chevron: caja corta inclinada en el plano de la banda. */
export function lugGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(0.15, S.tire.treadDepth + 0.015, 0.5);
}

/** Matrices de los tacos (dos brazos por paso formando V) en el marco de la rueda. */
export function lugMatrices(count: number): THREE.Matrix4[] {
  const R = S.tire.freeRadius - S.tire.treadDepth + (S.tire.treadDepth + 0.015) / 2 - 0.01;
  const skew = (38 * Math.PI) / 180;
  const out: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < count; i++) {
    const phi = (i / count) * Math.PI * 2;
    for (const side of [-1, 1]) {
      // Y local = radial; el brazo se inclina sobre Y para formar el chevron.
      qa.setFromAxisAngle(axisY, side * skew);
      qb.setFromAxisAngle(axisZ, phi - Math.PI / 2);
      q.copy(qb).multiply(qa);
      const pos = new THREE.Vector3(R * Math.cos(phi), R * Math.sin(phi), side * 0.24);
      out.push(new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)));
    }
  }
  return out;
}

/** Revolución de un contorno CCW [radio, axial] alrededor de Z (exterior +Z). */
function revolveZ(pts: Array<[number, number]>, segs = 48): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    segs,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

/** Aro amarillo: canal con pestañas más el disco embutido hacia el lado exterior. */
export function rimYellow(): THREE.BufferGeometry {
  const w = S.tire.rimWidth / 2;
  const base = S.tire.rimDiameter / 2 - 0.06;
  const flange = S.tire.rimDiameter / 2 + 0.1;
  const ring = revolveZ([
    [base - 0.06, -w],
    [flange, -w],
    [flange, -w + 0.05],
    [base, -w + 0.05],
    [base, w - 0.05],
    [flange, w - 0.05],
    [flange, w],
    [base - 0.06, w],
    [base - 0.06, -w],
  ]);
  const disc = revolveZ(
    [
      [0.22, 0.26],
      [base, 0.26],
      [base, 0.36],
      [0.22, 0.36],
      [0.22, 0.26],
    ],
    48,
  );
  const bin = new Bin().add("rim", ring).add("rim", disc);
  return bin.merged().get("rim")!;
}

/** Maza maquinada con anillo de pernos al frente del disco. */
export function hubMachined(): THREE.BufferGeometry {
  const bin = new Bin();
  bin.add("m", revolveZ([[0, 0.34], [0.4, 0.34], [0.4, 0.46], [0.3, 0.5], [0, 0.5], [0, 0.34]], 32));
  const bolts = 20;
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * Math.PI * 2;
    bin.add("m", cyl(0.032, 0.07, "z", 6), xf(0.46 * Math.cos(a), 0.46 * Math.sin(a), 0.38));
  }
  // Tuercas de pestaña alrededor del disco (anillo exterior del aro).
  const lugs = 36;
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    bin.add("m", cyl(0.025, 0.05, "z", 6), xf(0.7 * Math.cos(a), 0.7 * Math.sin(a), 0.38));
  }
  return bin.merged().get("m")!;
}

/** Tapa giratoria del GDY106 (fundición naranja) con su círculo de pernos. */
export function gdyCap(): { cast: THREE.BufferGeometry; bolts: THREE.BufferGeometry } {
  const cast = revolveZ(
    [
      [0, 0.3],
      [S.wheelMotor.capRadius, 0.3],
      [S.wheelMotor.capRadius, 0.56],
      [0.52, 0.6],
      [0.4, 0.6],
      [0.36, 0.66],
      [0.24, 0.72],
      [0, 0.74],
    ],
    40,
  );
  const bin = new Bin();
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    bin.add("b", cyl(0.04, 0.06, "z", 6), xf(0.46 * Math.cos(a), 0.46 * Math.sin(a), 0.6));
  }
  for (let i = 0; i < 4; i++) {
    // Cuatro tapones magnéticos de las posiciones de los planetarios (12/3/6/9).
    const a = (i / 4) * Math.PI * 2;
    bin.add("b", cyl(0.055, 0.08, "z", 8), xf(0.2 * Math.cos(a), 0.2 * Math.sin(a), 0.74));
  }
  return { cast, bolts: bin.merged().get("b")! };
}

export interface WheelGeometries {
  tireRear: THREE.BufferGeometry;
  tireFront: THREE.BufferGeometry;
  lug: THREE.BufferGeometry;
  lugMatrices: THREE.Matrix4[];
  rim: THREE.BufferGeometry;
  hub: THREE.BufferGeometry;
  gdyCast: THREE.BufferGeometry;
  gdyBolts: THREE.BufferGeometry;
}

export function buildWheelGeometries(segments = 96): WheelGeometries {
  const cap = gdyCap();
  return {
    tireRear: buildTireGeometry(S.tire.sectionWidthRear, segments),
    tireFront: buildTireGeometry(S.tire.sectionWidthFront, segments),
    lug: canon(lugGeometry()),
    lugMatrices: lugMatrices(S.tire.lugsPerRing),
    rim: rimYellow(),
    hub: hubMachined(),
    gdyCast: cap.cast,
    gdyBolts: cap.bolts,
  };
}
