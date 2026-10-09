// T2 sensor catalog for the S1 bench-rig scene (Sim A).
//
// Mount points are NO-DRILL by design (feature doc, physics anchors):
// pressure via drain-plug T-adapter, temperature thermocouple at the
// magnetic plug, vibration MEMS epoxied to the sun-pinion cover, and a
// non-invasive Hall clamp on the motor cable.
//
// Marker `position` values are scene units matched to the simplified GDY106
// housing built in BenchScene.tsx. Geometry is physically plausible, NOT
// CAD-exact (explicit non-goal).

export interface BenchSensor {
  id: "pressure" | "temperature" | "vibration" | "current";
  /** Short text used for the in-scene HTML overlay label. */
  shortLabel: string;
  /** Full title used in the side panel. */
  label: string;
  /** Marker color (three.js hex). */
  color: number;
  /** Same color as CSS hex for overlay labels + side panel dots. */
  cssColor: string;
  /** Marker anchor in scene units [x, y, z]. */
  position: [number, number, number];
  /** No-drill mount explanation (side panel). */
  mount: string;
  /** What the channel measures (side panel). */
  signal: string;
}

export const BENCH_SENSORS: BenchSensor[] = [
  {
    id: "pressure",
    shortLabel: "Pressure · T-adapter",
    label: "Pressure — drain-plug T-adapter",
    color: 0xff3b30,
    cssColor: "#ff3b30",
    position: [-1.4, 1.28, 0.42],
    mount:
      "T-adapter threaded into the existing drain-plug port. The plug is preserved " +
      "(still removable for 250 h manual checks); the transducer reads gallery pressure " +
      "through the T branch. No drilling.",
    signal: "10 Hz oil pressure. Primary level proxy + abrupt-drop trigger.",
  },
  {
    id: "temperature",
    shortLabel: "Temp · mag plug",
    label: "Temperature — magnetic-plug thermocouple",
    color: 0xff9f0a,
    cssColor: "#ff9f0a",
    position: [0.45, 1.4, 0.36],
    mount:
      "Type-K thermocouple probe fitted in place of the magnetic plug. Same thread, " +
      "same port — debris-capture duty is kept via an external inspection note. No drilling.",
    signal: "10 Hz oil temperature. Viscosity/density compensation for fusion.",
  },
  {
    id: "vibration",
    shortLabel: "Vibration · pinion cover",
    label: "Vibration — sun-pinion cover MEMS",
    color: 0x22d3ee,
    cssColor: "#22d3ee",
    position: [-2.14, 2.3, 0.34],
    mount:
      "Triaxial MEMS puck bonded with epoxy to the sun-pinion cover plate. Removable " +
      "with heat + solvent, housing untouched. No drilling.",
    signal: "1 kHz on edge (features/decimated for transport). Move/rest rules + settling shape.",
  },
  {
    id: "current",
    shortLabel: "Current · Hall clamp",
    label: "Current — Hall clamp on cable",
    color: 0xa78bfa,
    cssColor: "#a78bfa",
    position: [1.0, 2.34, 0.5],
    mount:
      "Split-core Hall clamp snapped around the motor cable. Fully non-invasive, " +
      "no electrical splice, no housing contact. No drilling.",
    signal: "Motor current draw. Operational var: engine-on / load context for rest gating.",
  },
];

/** Side-panel narrative: why the rig proves feasibility without touching a real wheel. */
export const NO_DRILL_NARRATIVE =
  "All four sensing points mount without drilling the GDY106 housing: the pressure " +
  "transducer rides a T-adapter that preserves the drain plug, the thermocouple replaces " +
  "the magnetic plug in its own thread, the vibration MEMS sits on an epoxy base on the " +
  "sun-pinion cover, and the Hall clamp is non-invasive on the cable. The bench rig " +
  "reproduces these exact mount points so calibration (T3/S7 drain-and-weigh) transfers " +
  "to the field without housing modifications.";

/** Environment note: documented in T2, engineered later (field pilot / T13). */
export const ENV_NOTE =
  "120 °C / EMI note (documented, not built): wheel-motor environment reaches ~120 °C " +
  "with strong EMI from the traction drive. Field sensors need high-temp rating + " +
  "shielded cabling. The bench scene does not simulate heat or EMI.";
