import * as THREE from "three";
import { S } from "./spec";
import { Bin, beam, cyl, rbox, tube, xf } from "./geom";

// Chasis, cubierta superior y equipo del 930E-4SE. Dos bins: `chassis` (sigue la
// suspensión: se hunde con la carga) y `axle` (queda a la altura del suelo:
// caja del eje trasero, carcasas GDY106, brazos y vástagos). Claves de material:
// yellow, dark, machined, cast, glass, black, orange, white, amber, red, accent, rail.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const AX = S.tire.axleHeight;
const DECK_Y = S.chassis.deckHeight;

function frame(b: Bin) {
  const x0 = S.chassis.frameRearEndX;
  const x1 = S.chassis.frameFrontEndX;
  const depth = S.chassis.frameRailDepth;
  const top = S.chassis.frameRailTopY;
  for (const side of [-1, 1]) {
    b.add("dark", rbox(x1 - x0, depth, S.chassis.frameRailWidth, 0.03), xf((x0 + x1) / 2, top - depth / 2, side * S.chassis.frameRailHalfSpacing));
  }
  for (const x of [-2.3, 0.6, 2.2, 4.2, 6.6, 9.0]) {
    b.add("dark", rbox(0.4, 0.5, S.chassis.frameRailHalfSpacing * 2, 0.04), xf(x, top - 0.55, 0));
  }
  // Travesaño trasero y luces de cola.
  b.add("dark", rbox(0.5, 0.55, 2.9, 0.05), xf(x0 - 0.05, top - 0.5, 0));
  for (const side of [-1, 1]) {
    b.add("red", new THREE.BoxGeometry(0.05, 0.18, 0.42), xf(x0 - 0.32, top - 0.45, side * 1.0));
  }
}

function deck(b: Bin) {
  const len = S.deck.frontX - S.deck.rearX;
  const cx = (S.deck.frontX + S.deck.rearX) / 2;
  b.add("cast", rbox(len, S.deck.thickness, S.deck.halfWidth * 2, 0.03), xf(cx, DECK_Y - S.deck.thickness / 2, 0));
  // Faldones laterales amarillos sobre los neumáticos delanteros.
  for (const side of [-1, 1]) {
    b.add("yellow", rbox(S.front.podRearX - S.deck.rearX, 0.3, 0.09, 0.02), xf((S.front.podRearX + S.deck.rearX) / 2, DECK_Y - 0.3, side * S.deck.halfWidth));
  }
}

function frontEnd(b: Bin) {
  const podLen = S.front.frontEndX - S.front.podRearX;
  const podH = DECK_Y - S.front.podBottomY;
  const podW = S.front.podHalfWidth - (S.front.gridHalfWidth + 0.1);
  const podZ = S.front.gridHalfWidth + 0.1 + podW / 2;
  for (const side of [-1, 1]) {
    b.add("yellow", rbox(podLen, podH, podW, 0.07), xf(S.front.podRearX + podLen / 2, S.front.podBottomY + podH / 2, side * podZ));
    // Faros y luces de posición en la cara frontal de la caja lateral.
    b.add("white", new THREE.BoxGeometry(0.05, 0.24, 0.55), xf(S.front.frontEndX + 0.015, S.front.podBottomY + 0.55, side * (podZ - 0.2)));
    b.add("white", new THREE.BoxGeometry(0.05, 0.24, 0.55), xf(S.front.frontEndX + 0.015, S.front.podBottomY + 0.95, side * (podZ - 0.2)));
    b.add("amber", new THREE.BoxGeometry(0.05, 0.2, 0.3), xf(S.front.frontEndX + 0.015, DECK_Y - 0.35, side * (podZ + 0.35)));
    b.add("dark", rbox(0.08, 0.4, 1.0, 0.02), xf(S.front.frontEndX + 0.01, S.front.podBottomY + 0.2, side * podZ));
  }

  // Bumper con baterías y placa inferior.
  const bumperY = S.chassis.bumperHeight + 0.3;
  b.add("yellow", rbox(0.5, 0.55, S.front.bumperHalfWidth * 2, 0.06), xf(S.front.gridFaceX + 0.15, bumperY, 0));
  for (const z of [-1.6, 1.6]) b.add("dark", rbox(0.4, 0.35, 1.1, 0.04), xf(S.front.gridFaceX + 0.2, bumperY - 0.45, z));

  // Radiador: marco amarillo, fondo negro, rejilla de lamas y divisores.
  const gh = DECK_Y - 0.25 - (S.chassis.grilleBottom + 0.15);
  const gcy = S.chassis.grilleBottom + 0.15 + gh / 2;
  const gw = S.front.gridHalfWidth * 2;
  b.add("black", rbox(0.06, gh, gw, 0.01), xf(S.front.gridFaceX - 0.12, gcy, 0));
  const slats = 26;
  for (let i = 0; i < slats; i++) {
    const y = S.chassis.grilleBottom + 0.2 + ((gh - 0.1) * i) / (slats - 1);
    b.add("dark", new THREE.BoxGeometry(0.06, 0.05, gw - 0.08), xf(S.front.gridFaceX - 0.07, y, 0));
  }
  for (let i = 0; i <= 8; i++) {
    const z = -S.front.gridHalfWidth + 0.04 + ((gw - 0.08) * i) / 8;
    b.add("cast", new THREE.BoxGeometry(0.07, gh, 0.045), xf(S.front.gridFaceX - 0.05, gcy, z));
  }
  b.add("yellow", rbox(0.34, 0.3, gw + 0.4, 0.05), xf(S.front.gridFaceX + 0.05, DECK_Y - 0.15, 0));
  b.add("yellow", rbox(0.3, 0.2, gw + 0.2, 0.04), xf(S.front.gridFaceX + 0.05, S.chassis.grilleBottom + 0.05, 0));
  for (const side of [-1, 1]) {
    b.add("yellow", rbox(0.3, gh + 0.2, 0.16, 0.04), xf(S.front.gridFaceX + 0.05, gcy, side * (S.front.gridHalfWidth + 0.04)));
  }
  // Barra de luz del modo (acento) sobre el encabezado.
  b.add("accent", rbox(0.06, 0.08, gw - 0.3, 0.02), xf(S.front.gridFaceX + 0.24, DECK_Y - 0.15, 0));
}

function stairs(b: Bin) {
  const x = S.deck.stairX;
  const w = S.deck.stairWidth / 2;
  const z0 = S.deck.stairBottomZ;
  const z1 = S.deck.stairTopZ;
  const y0 = S.deck.stairBottomY;
  const y1 = DECK_Y;
  const n = 17;
  for (const sx of [-w, w]) {
    b.add("dark", beam(V(x + sx, y0, z0), V(x + sx, y1, z1), 0.06, 0.22));
  }
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    b.add("cast", new THREE.BoxGeometry(S.deck.stairWidth, 0.04, 0.2), xf(x, y0 + (y1 - y0) * f, z0 + (z1 - z0) * f));
  }
  const rail = S.deck.railHeight;
  for (const sx of [-w - 0.03, w + 0.03]) {
    b.add("rail", tube(V(x + sx, y0 + rail, z0), V(x + sx, y1 + rail, z1), 0.03, 8));
    b.add("rail", tube(V(x + sx, y0 + rail * 0.5, z0), V(x + sx, y1 + rail * 0.5, z1), 0.022, 6));
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const y = y0 + (y1 - y0) * f;
      const z = z0 + (z1 - z0) * f;
      b.add("rail", tube(V(x + sx, y, z), V(x + sx, y + rail, z), 0.025, 6));
    }
  }
  // Descanso superior sobre el deck derecho.
  b.add("cast", rbox(S.deck.stairX - S.deck.frontX + 0.5, 0.08, 1.3, 0.02), xf((S.deck.stairX + S.deck.frontX) / 2 + 0.25, y1 - 0.04, z1 + 0.35));
  // Escalera vertical al suelo bajo el extremo inferior.
  for (const sx of [-w * 0.8, w * 0.8]) {
    b.add("rail", tube(V(x + sx, 0.05, z0 - 0.15), V(x + sx, y0, z0 - 0.15), 0.025, 6));
  }
  for (let i = 1; i <= 4; i++) {
    b.add("rail", tube(V(x - w * 0.8, (y0 * i) / 5, z0 - 0.15), V(x + w * 0.8, (y0 * i) / 5, z0 - 0.15), 0.02, 6));
  }
}

function handrails(b: Bin) {
  const r = S.deck.railHeight;
  const hw = S.deck.halfWidth - 0.05;
  const xs = [S.deck.rearX + 0.1, 5.6, 6.6, 7.6, 8.6, 9.6, S.deck.frontX - 0.12];
  for (const side of [-1, 1]) {
    for (const x of xs) b.add("rail", tube(V(x, DECK_Y, side * hw), V(x, DECK_Y + r, side * hw), 0.03, 6));
    b.add("rail", tube(V(xs[0], DECK_Y + r, side * hw), V(xs[xs.length - 1], DECK_Y + r, side * hw), 0.035, 8));
    b.add("rail", tube(V(xs[0], DECK_Y + r * 0.5, side * hw), V(xs[xs.length - 1], DECK_Y + r * 0.5, side * hw), 0.025, 6));
  }
  // Baranda frontal con apertura para el descanso de la escalera.
  const xf0 = S.deck.frontX - 0.12;
  const spans: Array<[number, number]> = [
    [-hw, S.deck.stairTopZ - 0.85],
    [S.deck.stairTopZ + 1.0, hw],
  ];
  for (const [za, zb] of spans) {
    b.add("rail", tube(V(xf0, DECK_Y + r, za), V(xf0, DECK_Y + r, zb), 0.035, 8));
    b.add("rail", tube(V(xf0, DECK_Y + r * 0.5, za), V(xf0, DECK_Y + r * 0.5, zb), 0.025, 6));
    const n = Math.max(1, Math.round((zb - za) / 1.0));
    for (let i = 0; i <= n; i++) {
      const z = za + ((zb - za) * i) / n;
      b.add("rail", tube(V(xf0, DECK_Y, z), V(xf0, DECK_Y + r, z), 0.03, 6));
    }
  }
  // Antena del FMS.
  b.add("rail", tube(V(9.6, DECK_Y, hw - 0.2), V(9.6, DECK_Y + 1.9, hw - 0.2), 0.016, 5));
  b.add("black", new THREE.SphereGeometry(0.06, 8, 6), xf(9.6, DECK_Y + 1.92, hw - 0.2));
}

function cab(b: Bin) {
  const { x, z, length: L, height: H, width: W } = S.cab;
  const cy = DECK_Y + H / 2;
  b.add("yellow", rbox(L, H, W, 0.1), xf(x, cy, z));
  // Visera del techo y bloque de aire acondicionado.
  b.add("yellow", rbox(L + 0.5, 0.09, W + 0.3, 0.03), xf(x + 0.25, DECK_Y + H + 0.02, z));
  b.add("dark", rbox(0.95, 0.26, 1.05, 0.05), xf(x - 0.55, DECK_Y + H + 0.18, z));
  // Parabrisas, ventanas laterales y trasera con marco negro.
  const fx = x + L / 2;
  b.add("black", rbox(0.07, 1.22, W - 0.18, 0.02), xf(fx + 0.005, cy + 0.2, z));
  b.add("glass", rbox(0.08, 1.1, W - 0.3, 0.02), xf(fx + 0.025, cy + 0.2, z));
  for (const side of [-1, 1]) {
    const sz = z + (side * W) / 2;
    b.add("black", rbox(L - 0.5, 1.12, 0.07, 0.02), xf(x - 0.05, cy + 0.2, sz));
    b.add("glass", rbox(L - 0.65, 1.0, 0.08, 0.02), xf(x - 0.05, cy + 0.2, sz + side * 0.015));
  }
  b.add("glass", rbox(0.08, 0.8, W - 0.6, 0.02), xf(x - L / 2 - 0.01, cy + 0.25, z));
  // Faros de trabajo en el techo y baliza del modo.
  for (const dz of [-0.55, 0.55]) b.add("white", new THREE.BoxGeometry(0.1, 0.12, 0.3), xf(fx + 0.25, DECK_Y + H + 0.1, z + dz));
  b.add("accent", cyl(0.11, 0.12, "y", 12), xf(x - 0.1, DECK_Y + H + 0.57, z - 0.5));
  b.add("black", cyl(0.14, 0.05, "y", 12), xf(x - 0.1, DECK_Y + H + 0.5, z - 0.5));
  // Peldaños de acceso a la cabina (trasero izquierdo).
  b.add("cast", rbox(0.9, 0.06, 0.5, 0.01), xf(x - L / 2 - 0.2, DECK_Y + 0.5, z));
}

function equipment(b: Bin) {
  const e = S.deckEquipment;
  // Gabinete de control con puertas.
  const cy = DECK_Y + e.cabinetHeight / 2;
  b.add("yellow", rbox(e.cabinetLength, e.cabinetHeight, e.cabinetWidth, 0.05), xf(e.cabinetX, cy, 0));
  const fx = e.cabinetX + e.cabinetLength / 2 + 0.012;
  for (const z of [-0.65, 0, 0.65]) b.add("dark", new THREE.BoxGeometry(0.02, e.cabinetHeight - 0.2, 0.035), xf(fx, cy, z));
  for (const z of [-0.95, -0.33, 0.33, 0.95]) {
    b.add("black", rbox(0.03, 0.45, 0.5, 0.01), xf(fx + 0.005, cy + 0.55, z));
  }
  // Caja de rejillas de retardo con louvers y soplador.
  const gy = DECK_Y + e.gridBoxHeight / 2;
  b.add("yellow", rbox(e.gridBoxLength, e.gridBoxHeight, e.gridBoxWidth, 0.05), xf(e.gridBoxX, gy, e.gridBoxZ));
  const gfx = e.gridBoxX + e.gridBoxLength / 2 + 0.01;
  for (let i = 0; i < 7; i++) {
    b.add("black", new THREE.BoxGeometry(0.03, 0.07, e.gridBoxWidth - 0.3), xf(gfx, DECK_Y + 0.35 + i * 0.2, e.gridBoxZ));
  }
  b.add("black", rbox(e.gridBoxLength - 0.5, 0.05, e.gridBoxWidth - 0.4, 0.01), xf(e.gridBoxX, DECK_Y + e.gridBoxHeight + 0.02, e.gridBoxZ));
  b.add("dark", cyl(0.42, 0.25, "y", 16), xf(e.gridBoxX - 0.3, DECK_Y + e.gridBoxHeight + 0.15, e.gridBoxZ));

  // Estanque de combustible (derecha) y estanque hidráulico (izquierda), bajo la tolva.
  const ty = S.chassis.frameRailTopY - 0.0 - e.fuelTankHeight / 2 + 0.1;
  b.add("yellow", rbox(e.fuelTankLength, e.fuelTankHeight, e.fuelTankWidth, 0.06), xf(e.fuelTankX, ty, 1.35 + e.fuelTankWidth / 2));
  b.add("dark", rbox(0.06, 0.5, 0.7, 0.01), xf(e.fuelTankX + e.fuelTankLength / 2 + 0.02, ty + 0.2, 1.35 + e.fuelTankWidth / 2));
  const hy = S.chassis.frameRailTopY - 0.0 - e.hydTankHeight / 2 + 0.1;
  b.add("yellow", cyl(e.hydTankRadius, e.hydTankHeight, "y", 24), xf(e.hydTankX, hy, -(1.35 + e.hydTankRadius + 0.2)));
  b.add("machined", cyl(e.hydTankRadius + 0.02, 0.06, "y", 24), xf(e.hydTankX, hy + e.hydTankHeight / 2 - 0.1, -(1.35 + e.hydTankRadius + 0.2)));
}

function struts(chassis: Bin, axle: Bin) {
  const sag = S.suspension;
  for (const side of [-1, 1]) {
    // Delanteros: cuerpo amarillo en el chasis, vástago maquinado en el eje.
    const fz = side * sag.frontStrutZ;
    chassis.add("yellow", cyl(0.3, 1.5, "y", 20), xf(S.chassis.wheelbase, 3.3, fz));
    chassis.add("machined", cyl(0.31, 0.06, "y", 20), xf(S.chassis.wheelbase, 2.58, fz));
    axle.add("machined", cyl(0.19, 1.1, "y", 14), xf(S.chassis.wheelbase, 2.2, fz));
    axle.add("cast", rbox(0.9, 0.5, 0.9, 0.08), xf(S.chassis.wheelbase, 1.7, fz));
    // Traseros (invertidos): cilindro corto en el bastidor, vástago al eje.
    const rz = side * sag.rearStrutZ;
    chassis.add("yellow", cyl(0.23, 0.95, "y", 18), xf(sag.rearStrutX, 2.95, rz));
    chassis.add("machined", cyl(0.24, 0.05, "y", 18), xf(sag.rearStrutX, 2.46, rz));
    axle.add("machined", cyl(0.15, 0.9, "y", 12), xf(sag.rearStrutX, 2.1, rz));
    axle.add("dark", beam(V(-0.6, AX + 0.1, side * 1.1), V(sag.rearStrutX, 1.75, rz), 0.35, 0.3));
  }
  // Brazo de reacción del eje delantero y travesaño del chasis.
  for (const side of [-1, 1]) {
    axle.add("dark", beam(V(S.chassis.wheelbase - 0.6, 1.55, side * 1.0), V(S.chassis.wheelbase, 1.6, side * 2.35), 0.5, 0.4));
    axle.add("cast", cyl(0.34, 0.9, "z", 16), xf(S.chassis.wheelbase, AX, side * 2.0));
  }
}

function hoistMounts(chassis: Bin) {
  for (const side of [-1, 1]) {
    const z = side * S.hoist.zOffset;
    chassis.add("dark", rbox(0.5, 0.45, 0.45, 0.05), xf(S.hoist.baseX, S.hoist.baseY - 0.05, z));
    chassis.add("dark", beam(V(S.hoist.baseX, S.hoist.baseY, z), V(S.hoist.baseX - 0.1, S.chassis.frameRailTopY - 0.3, side * 1.3), 0.34, 0.3));
    chassis.add("machined", cyl(0.09, 0.62, "z", 10), xf(S.hoist.baseX, S.hoist.baseY, z));
  }
}

function rearAxle(axle: Bin) {
  const hw = S.wheelMotor.axleBoxHalfWidth;
  axle.add("dark", rbox(2.3, 1.75, hw * 2, 0.1), xf(0.2, AX + 0.1, 0));
  axle.add("dark", rbox(1.6, 0.4, hw * 2 - 0.2, 0.05), xf(0.2, AX + 1.15, 0));
  for (const side of [-1, 1]) {
    // Carcasa del GDY106: brida, anillo de freno y manguito entre los aros.
    axle.add("orange", cyl(S.wheelMotor.flangeRadius, 0.22, "z", 40), xf(0, AX, side * (hw + 0.11)));
    axle.add("orange", cyl(0.85, 0.3, "z", 40), xf(0, AX, side * (hw + 0.34)));
    axle.add("orange", cyl(S.wheelMotor.sleeveRadius, 1.9, "z", 32), xf(0, AX, side * 2.2));
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      axle.add("machined", cyl(0.04, 0.07, "z", 6), xf(0.9 * Math.cos(a), AX + 0.9 * Math.sin(a), side * (hw + 0.24)));
    }
  }
}

export function buildChassis(): { chassis: Map<string, THREE.BufferGeometry>; axle: Map<string, THREE.BufferGeometry> } {
  const chassis = new Bin();
  const axle = new Bin();
  frame(chassis);
  deck(chassis);
  frontEnd(chassis);
  stairs(chassis);
  handrails(chassis);
  cab(chassis);
  equipment(chassis);
  struts(chassis, axle);
  hoistMounts(chassis);
  rearAxle(axle);
  return { chassis: chassis.merged(), axle: axle.merged() };
}
