// Especificación dimensional del Komatsu 930E-4SE para el modelo paramétrico.
//
// Fuente única de cada cota, en metros salvo que la unidad diga otra cosa.
// Cada campo lleva su procedencia: VERIFIED (folleto AESS778-02 / manual de
// operación / curso INCAEX), DERIVED (aritmética sobre campos verificados) o
// ASSUMPTION (estimación de foto o criterio visual, sin cifra publicada).
// Las fuentes remiten a docs/research/twin-reference.md (§1).
//
// Marco: origen en el punto del suelo bajo el centro del eje trasero, +X hacia
// adelante, +Y arriba, +Z hacia la DERECHA del camión (marco diestro). La cabina
// va a la izquierda, es decir en Z negativo.

export type Provenance = "VERIFIED" | "DERIVED" | "ASSUMPTION";
export type Unit = "m" | "deg" | "m3" | "count" | "ratio" | "s";

export interface Dim {
  value: number;
  unit: Unit;
  tag: Provenance;
  source: string;
}

const dim = (value: number, unit: Unit, tag: Provenance, source: string): Dim => ({
  value,
  unit,
  tag,
  source,
});
const m = (value: number, tag: Provenance, source: string): Dim => dim(value, "m", tag, source);

const BRO = "brochure AESS778-02 dimension drawing (twin-reference §1.1)";
const CRS = "INCAEX 930E-4SE course (twin-reference §1.1)";
const PHOTO = "photo/top-view estimate hi-course-14/17 (twin-reference §1.4)";

const round3 = (v: number) => Math.round(v * 1000) / 1000;

// --- Magnitudes de partida; las derivadas se calculan acá para que no diverjan ---
const OD = 3.78;
const FREE_RADIUS = round3(OD / 2);
const SAG = 0.05;
const AXLE_HEIGHT = round3(FREE_RADIUS - SAG);
const HINGE_Y = 3.3;
const CANOPY_TIP_X = round3(-4.8 + 9.38 + 3.97);
const CANOPY_TIP_Y = 7.37;
const BODY_UP = 14.02;
// La bisagra se despeja de: altura(45°) = hy + (dx + dy)·sin45 con dx, dy desde la bisagra a la punta de la visera.
const HINGE_X = round3(CANOPY_TIP_X + CANOPY_TIP_Y - HINGE_Y - (BODY_UP - HINGE_Y) * Math.SQRT2);
const LOADING_HEIGHT = 7.06;
const INTERIOR_DEPTH = 3.2;
const FLOOR_DEEP_Y = round3(LOADING_HEIGHT - INTERIOR_DEPTH);

export const SPEC = {
  chassis: {
    wheelbase: m(6.35, "VERIFIED", BRO),
    frontTrack: m(6.15, "VERIFIED", `${BRO}; arrows end at tire centrelines`),
    rearTrack: m(5.36, "VERIFIED", `${BRO}; dual-pair centre to centre`),
    widthOverFrontTires: m(7.52, "VERIFIED", BRO),
    widthOverRearTires: m(8.33, "VERIFIED", BRO),
    rearInnerGap: m(2.39, "VERIFIED", `${BRO}; space between inner rear tires (axle box)`),
    frontOverhang: m(4.47, "VERIFIED", BRO),
    rearOverhang: m(4.8, "VERIFIED", `${BRO}; rear axle to rear of body`),
    overallLength: m(15.6, "VERIFIED", `${BRO}; optional 218 m3 body`),
    overallWidth: m(8.69, "VERIFIED", BRO),
    overallHeight: m(7.37, "VERIFIED", `${BRO}; to canopy tip, empty`),
    bodyUpHeight: m(BODY_UP, "VERIFIED", `${BRO}; body raised 45 deg`),
    frameRailHalfSpacing: m(1.2, "ASSUMPTION", `${PHOTO}; rail centres px 440/570 -> +-1.16`),
    frameRailWidth: m(0.305, "VERIFIED", "brochure FRAME section"),
    frameRailDepth: m(0.864, "VERIFIED", "brochure FRAME section, minimum depth"),
    frameRailTopY: m(3.4, "ASSUMPTION", "body underside 3.30-3.45 rests on the rails; no published height"),
    frameRearEndX: m(-2.6, "ASSUMPTION", `${PHOTO}; top view y_px 745`),
    frameFrontEndX: m(10.2, "ASSUMPTION", "rails end behind the radiator/bumper; no published value"),
    bumperHeight: m(0.94, "VERIFIED", `${BRO}; clearance at the front bumper`),
    grilleBottom: m(1.4, "VERIFIED", `${BRO}; loaded`),
    deckHeight: m(4.27, "VERIFIED", `${BRO}; radiator/deck top, loaded`),
    radiatorWidth: m(3.277, "VERIFIED", "brochure radiator assembly"),
    radiatorHeight: m(2.164, "VERIFIED", "brochure radiator assembly"),
  },

  envelopeCourse: {
    length: m(15.29, "VERIFIED", `${CRS}; labelled alternative, not used in geometry`),
    width: m(8.89, "VERIFIED", `${CRS}; labelled alternative, not used in geometry`),
    height: m(8.1, "VERIFIED", `${CRS}; labelled alternative (taller photographed body)`),
    bodyUp: m(14.8, "VERIFIED", `${CRS}; labelled alternative, not used in geometry`),
  },

  tire: {
    rimDiameter: m(1.6, "VERIFIED", "brochure rim 914 x 1600 x 127 mm (63 in)"),
    rimWidth: m(0.914, "VERIFIED", "brochure rim 914 mm (36 in)"),
    nominalSection: m(1.346, "DERIVED", "53 in x 25.4 mm (designation 53/80R63)"),
    overallDiameter: m(OD, "DERIVED", "Haian HA688 datasheet 3780 mm; nominal 3754 mm (twin-reference §1.2)"),
    sectionWidthRear: m(1.31, "DERIVED", "Bridgestone E3 1311 mm; consistent with 8.33 m over duals (§1.1)"),
    sectionWidthFront: m(1.37, "DERIVED", "front track 6.15 - clear gap 4.78 (§1.1)"),
    freeRadius: m(FREE_RADIUS, "DERIVED", "overallDiameter / 2"),
    staticLoadedRadius: m(1.64, "VERIFIED", "Haian HA688 datasheet static loaded radius 1639 mm"),
    visualSag: m(SAG, "ASSUMPTION", "visual only; the true loaded sag (0.25 m) needs a contact flat the ground plane lacks"),
    axleHeight: m(AXLE_HEIGHT, "DERIVED", "freeRadius - visualSag"),
    rollingRadius: m(round3(FREE_RADIUS * 0.985), "ASSUMPTION", "dynamic/free ratio 0.985 (typical 0.95-0.99)"),
    dualSpacing: m(1.66, "DERIVED", "(8.33 - 5.36)/2 = s/2 + w/2 with w = 1.31 (§1.1); Haian min 1.678"),
    treadDepth: m(0.075, "ASSUMPTION", "lug height for the visual tread pattern"),
    lugsPerRing: dim(44, "count", "ASSUMPTION", "visual chevron pitch"),
  },

  body: {
    interiorWidth: m(8.15, "VERIFIED", "brochure rear view; OM line 5756"),
    interiorDepth: m(INTERIOR_DEPTH, "VERIFIED", "brochure side drawing; OM line 5757"),
    loadingHeight: m(LOADING_HEIGHT, "VERIFIED", "brochure; OM line 5758"),
    dumpAngle: dim(45, "deg", "VERIFIED", "OM line 5759; brochure drawing"),
    heapedCapacity: dim(211, "m3", "VERIFIED", "brochure, heaped 2:1 (standard body)"),
    tailX: m(-4.8, "DERIVED", "rear axle to rear of body 4.80 (brochure)"),
    canopyKneeX: m(round3(-4.8 + 9.38), "DERIVED", "tail + 9.38 m body length to canopy knee (brochure)"),
    canopyTipX: m(CANOPY_TIP_X, "DERIVED", "knee + 3.97 m canopy projection (brochure)"),
    canopyTipHeight: m(CANOPY_TIP_Y, "VERIFIED", "brochure; canopy front edge, empty"),
    canopyHalfWidth: m(round3(8.69 / 2), "DERIVED", "overall width / 2"),
    canopyThickness: m(0.3, "ASSUMPTION", "visual plate thickness"),
    floorDeepY: m(FLOOR_DEEP_Y, "DERIVED", "loading height - interior depth"),
    hingeX: m(HINGE_X, "DERIVED", "solved so 45 deg raises the canopy tip to the brochure body-up height"),
    hingeY: m(HINGE_Y, "ASSUMPTION", "hinge height not published; frame top 3.40 minus pin offset"),
    floorHalfWidth: m(2.7, "ASSUMPTION", "floor width at the underside, from front-view proportions"),
    rimHalfWidth: m(4.15, "DERIVED", "interior width / 2 + 0.075 wall"),
    floorThickness: m(round3(FLOOR_DEEP_Y - 3.3), "DERIVED", "inner floor at the hinge minus underside"),
    wallThickness: m(0.1, "ASSUMPTION", "visual plate thickness"),
    wallSlope: dim(0.42, "ratio", "ASSUMPTION", "half-width gained per metre of height (flared sides)"),
  },

  hoist: {
    baseX: m(2.4, "ASSUMPTION", `${PHOTO}; item 13 and brochure side drawing`),
    baseY: m(1.95, "ASSUMPTION", "retracted length ~1.7 m (twin-reference §1.4)"),
    attachX: m(2.0, "ASSUMPTION", `${PHOTO}`),
    attachY: m(3.55, "ASSUMPTION", "on the body underside bracket"),
    zOffset: m(1.65, "ASSUMPTION", "outboard of the frame rails (brochure: outboard cylinders)"),
    stages: dim(3, "count", "VERIFIED", "brochure: two 3-stage dual-acting cylinders"),
    stageOverlap: m(0.25, "ASSUMPTION", "visual overlap between telescoping stages"),
    stageRadius1: m(0.17, "ASSUMPTION", "visual (outer stage)"),
    stageRadius2: m(0.135, "ASSUMPTION", "visual"),
    stageRadius3: m(0.1, "ASSUMPTION", "visual (rod)"),
  },

  suspension: {
    frontStroke: m(0.328, "VERIFIED", "brochure SUSPENSION; Hydrair II front 12.92 in"),
    rearStroke: m(0.239, "VERIFIED", "brochure SUSPENSION; Hydrair II rear 9.40 in"),
    payloadCompression: m(0.06, "ASSUMPTION", "visual few-cm drop at full payload (stroke fraction ~25 %)"),
    rearStrutX: m(-1.75, "ASSUMPTION", `${PHOTO}; item 10, behind the rear axle`),
    rearStrutZ: m(1.6, "ASSUMPTION", `${PHOTO}`),
    frontStrutZ: m(2.2, "ASSUMPTION", `${PHOTO}; item 21`),
  },

  front: {
    gridHalfWidth: m(1.65, "ASSUMPTION", "front-view proportion 3.3 m of 8.69 m (hi-course-14)"),
    gridFaceX: m(10.6, "DERIVED", "front end 10.82 minus grille recess"),
    frontEndX: m(10.82, "DERIVED", "wheelbase + front overhang"),
    podHalfWidth: m(2.85, "ASSUMPTION", "front view hi-course-14: pods narrower than the tire track, tires show outside"),
    podRearX: m(8.8, "ASSUMPTION", PHOTO),
    podBottomY: m(2.3, "ASSUMPTION", PHOTO),
    bumperHalfWidth: m(2.9, "ASSUMPTION", "front-view proportion"),
  },

  deck: {
    rearX: m(4.5, "DERIVED", "canopy knee region; brochure"),
    frontX: m(10.6, "DERIVED", "grille face"),
    halfWidth: m(3.6, "ASSUMPTION", PHOTO),
    thickness: m(0.15, "ASSUMPTION", "visual plate thickness"),
    railHeight: m(1.05, "ASSUMPTION", "handrail height, visual"),
    stairBottomZ: m(-1.7, "ASSUMPTION", `${PHOTO}; ground end at the truck's left`),
    stairTopZ: m(1.8, "ASSUMPTION", `${PHOTO}; deck end at the truck's right`),
    stairBottomY: m(1.15, "ASSUMPTION", "bumper step height"),
    stairX: m(11.2, "ASSUMPTION", "stair centreline in front of the grille; projects ~0.8 m past the bumper face"),
    stairWidth: m(0.8, "ASSUMPTION", "tread width, visual"),
  },

  cab: {
    x: m(7.6, "ASSUMPTION", `${PHOTO}; item 1`),
    z: m(-2.6, "ASSUMPTION", `${PHOTO}; cab on the left`),
    length: m(2.4, "ASSUMPTION", PHOTO),
    height: m(2.0, "ASSUMPTION", PHOTO),
    width: m(1.8, "ASSUMPTION", PHOTO),
  },

  deckEquipment: {
    cabinetX: m(5.25, "ASSUMPTION", `${PHOTO}; main control cabinet`),
    cabinetLength: m(1.5, "ASSUMPTION", PHOTO),
    cabinetHeight: m(2.0, "ASSUMPTION", PHOTO),
    cabinetWidth: m(2.6, "ASSUMPTION", PHOTO),
    gridBoxX: m(6.0, "ASSUMPTION", `${PHOTO}; retarding-grid box, right side`),
    gridBoxZ: m(2.5, "ASSUMPTION", PHOTO),
    gridBoxLength: m(3.0, "ASSUMPTION", PHOTO),
    gridBoxHeight: m(1.8, "ASSUMPTION", PHOTO),
    gridBoxWidth: m(1.9, "ASSUMPTION", PHOTO),
    fuelTankX: m(3.35, "ASSUMPTION", `${PHOTO}; item 14, right side`),
    fuelTankLength: m(1.3, "ASSUMPTION", "5300 L fits the 5.5 m3 envelope (twin-reference §1.4)"),
    fuelTankHeight: m(2.1, "ASSUMPTION", "capped by the body underside (~3.6 m) at this station"),
    fuelTankWidth: m(2.0, "ASSUMPTION", "5300 L fits the 5.5 m3 envelope"),
    hydTankX: m(3.3, "ASSUMPTION", `${PHOTO}; item 6, left side`),
    hydTankRadius: m(0.55, "ASSUMPTION", "947 L vertical cylinder"),
    hydTankHeight: m(2.2, "ASSUMPTION", "947 L vertical cylinder plus ullage"),
  },

  wheelMotor: {
    flangeRadius: m(0.96, "ASSUMPTION", "GDY106 frame flange ~1.8-1.9 m dia (twin-reference §2.3)"),
    sleeveRadius: m(0.74, "ASSUMPTION", "brake/hub shell below the 1.6 m rim bore (§2.3)"),
    capRadius: m(0.6, "ASSUMPTION", "outboard sun-cover face, flush with the tire (§2.3)"),
    axleBoxHalfWidth: m(1.195, "DERIVED", "rear inner gap / 2"),
  },
} as const;

type Groups = typeof SPEC;
type ValueMap = { [G in keyof Groups]: { [K in keyof Groups[G]]: number } };

function valuesOf(spec: Groups): ValueMap {
  const out: Record<string, Record<string, number>> = {};
  for (const [g, fields] of Object.entries(spec)) {
    out[g] = {};
    for (const [k, d] of Object.entries(fields as Record<string, Dim>)) out[g][k] = d.value;
  }
  return out as unknown as ValueMap;
}

/** Valores numéricos planos: `S.chassis.wheelbase` -> 6.35. */
export const S: ValueMap = valuesOf(SPEC);

export interface SpecRow {
  group: string;
  name: string;
  value: number;
  unit: Unit;
  tag: Provenance;
  source: string;
}

/** Aplana SPEC para la tabla de procedencia y los tests. */
export function specRows(): SpecRow[] {
  const rows: SpecRow[] = [];
  for (const [group, fields] of Object.entries(SPEC)) {
    for (const [name, d] of Object.entries(fields as Record<string, Dim>)) {
      rows.push({ group, name, value: d.value, unit: d.unit, tag: d.tag, source: d.source });
    }
  }
  return rows;
}

// --- Magnitudes derivadas de uso común ---

/** Circunferencia de rodadura (m) con el radio dinámico. */
export const tireCircumference = (): number => 2 * Math.PI * S.tire.rollingRadius;

/** Velocidad angular de rueda (rad/s) para una velocidad lineal (m/s). */
export const wheelOmega = (speedMps: number): number => speedMps / S.tire.rollingRadius;

/** RPM de rueda para una velocidad en km/h. */
export const wheelRpmAtKmh = (kmh: number): number => (wheelOmega(kmh / 3.6) * 60) / (2 * Math.PI);
