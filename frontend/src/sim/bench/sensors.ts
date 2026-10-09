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
  shortLabelEs: string;
  /** Full title used in the side panel. */
  label: string;
  labelEs: string;
  /** GDY106 manual item number shown with every label. */
  item: string;
  /** Marker color (three.js hex). */
  color: number;
  /** Same color as CSS hex for overlay labels + side panel dots. */
  cssColor: string;
  /** Marker anchor in scene units [x, y, z]. */
  position: [number, number, number];
  /** No-drill mount explanation (side panel). */
  mount: string;
  mountEs: string;
  /** What the channel measures (side panel). */
  signal: string;
  signalEs: string;
}

export const BENCH_SENSORS: BenchSensor[] = [
  {
    id: "pressure",
    shortLabel: "Pressure · T-adapter (item 56)",
    shortLabelEs: "Presion · adaptador T (item 56)",
    label: "Pressure — oil drain pipe plug item 56, 6 o'clock",
    labelEs: "Presion — tapon de drenaje item 56, 6 en punto",
    item: "56",
    color: 0xff3b30,
    cssColor: "#ff3b30",
    position: [-1.4, 1.28, 0.42],
    mount:
      "T-adapter threaded into the existing oil drain pipe plug port (item 56) at 6 o'clock. " +
      "The plug is preserved (still removable for 250 h manual checks); the transducer reads gallery pressure " +
      "through the T branch. No drilling. TD930E-P improvement: recessed-tube fitting removes the " +
      "120 mm protrusion strike hazard of the legacy T branch.",
    mountEs:
      "Adaptador en T en el tapon de drenaje existente (item 56) a las 6 en punto. " +
      "El tapon se conserva (extraible para controles de 250 h); el transductor lee presion por la rama T. Sin perforar. " +
      "Mejora TD930E-P: conexion de tubo empotrado elimina el riesgo de golpe de la protuberancia de 120 mm.",
    signal: "10 Hz oil pressure. Primary level proxy + abrupt-drop trigger.",
    signalEs: "Presion de aceite 10 Hz. Proxy principal de nivel + disparo por caida brusca.",
  },
  {
    id: "temperature",
    shortLabel: "Temp · mag plug (item 41)",
    shortLabelEs: "Temp · tapon magnetico (item 41)",
    label: "Temperature — magnetic pipe plug item 41",
    labelEs: "Temperatura — tapon magnetico item 41",
    item: "41",
    color: 0xff9f0a,
    cssColor: "#ff9f0a",
    position: [0.45, 1.4, 0.36],
    mount:
      "Type-K thermocouple probe fitted at the magnetic pipe plug port (item 41). Same thread, " +
      "same port — debris-capture duty is kept via an external inspection note. No drilling.",
    mountEs:
      "Sonda termopar tipo K en el tapon magnetico (item 41). Misma rosca y puerto — la captura de particulas " +
      "se conserva por nota de inspeccion externa. Sin perforar.",
    signal: "10 Hz oil temperature. Viscosity/density compensation for fusion.",
    signalEs: "Temperatura de aceite 10 Hz. Compensacion de viscosidad/densidad para la fusion.",
  },
  {
    id: "vibration",
    shortLabel: "Vibration · cover (items 39/36)",
    shortLabelEs: "Vibracion · tapa (items 39/36)",
    label: "Vibration — sun inspection cover items 39/36",
    labelEs: "Vibracion — tapa de inspeccion del sol items 39/36",
    item: "39/36",
    color: 0x22d3ee,
    cssColor: "#22d3ee",
    position: [-2.14, 2.3, 0.34],
    mount:
      "Triaxial MEMS puck bonded with epoxy to the sun inspection cover (items 39/36). Removable " +
      "with heat + solvent, housing untouched. No drilling.",
    mountEs:
      "Sensor MEMS triaxial adherido con epoxi a la tapa de inspeccion del sol (items 39/36). Removible " +
      "con calor + solvente, carcasa intacta. Sin perforar.",
    signal: "1 kHz on edge (features/decimated for transport). Move/rest rules + settling shape.",
    signalEs: "1 kHz en borde (rasgos/diezmado para transporte). Reglas de movimiento/reposo + forma de asentamiento.",
  },
  {
    id: "current",
    shortLabel: "Current · Hall clamp (traction cable)",
    shortLabelEs: "Corriente · pinza Hall (cable de traccion)",
    label: "Current — Hall clamp on traction power cable",
    labelEs: "Corriente — pinza Hall en cable de potencia de traccion",
    item: "cable",
    color: 0xa78bfa,
    cssColor: "#a78bfa",
    position: [1.0, 2.34, 0.5],
    mount:
      "Split-core Hall clamp snapped around the traction power cable. Fully non-invasive, " +
      "no electrical splice, no housing contact. No drilling.",
    mountEs:
      "Pinza Hall de nucleo dividido sobre el cable de potencia de traccion. Totalmente no invasiva, " +
      "sin empalme electrico ni contacto con la carcasa. Sin perforar.",
    signal: "Motor current draw. Operational var: engine-on / load context for rest gating.",
    signalEs: "Consumo de corriente del motor. Variable operativa: motor encendido / contexto de carga.",
  },
];

/** Side-panel narrative: why the rig proves feasibility without touching a real wheel. */
export const NO_DRILL_NARRATIVE =
  "All four sensing points mount without drilling the GDY106 housing: the pressure " +
  "transducer rides a T-adapter that preserves the drain plug, the thermocouple replaces " +
  "the magnetic plug in its own thread, the vibration MEMS sits on an epoxy base on the " +
  "sun-pinion cover, and the Hall clamp is non-invasive on the cable. The bench rig " +
  "reproduces these exact mount points so calibration (bench drain-and-weigh) transfers " +
  "to the field without housing modifications.";

export const NO_DRILL_NARRATIVE_ES =
  "Los cuatro puntos sensan sin perforar la carcasa GDY106: el transductor de presion usa " +
  "un adaptador en T que conserva el tapon de drenaje, el termopar reemplaza el tapon " +
  "magnetico en su propia rosca, el MEMS de vibracion va en base epoxi sobre la tapa del " +
  "sol, y la pinza Hall es no invasiva en el cable. El banco reproduce estos puntos exactos " +
  "para que la calibracion (drenaje y pesaje en banco) transfiera a campo sin modificar la carcasa.";

/** Environment note: documented in T2, engineered later (field pilot / T13). */
export const ENV_NOTE =
  "120 °C / EMI note (documented, not built): wheel-motor environment reaches ~120 °C " +
  "with strong EMI from the traction drive. Field sensors need high-temp rating + " +
  "shielded cabling. The bench scene does not simulate heat or EMI.";

export const ENV_NOTE_ES =
  "Nota 120 °C / EMI (documentada, no construida): el entorno del motor de rueda alcanza ~120 °C " +
  "con EMI fuerte del accionamiento de traccion. Los sensores de campo requieren rango de alta temperatura + " +
  "cableado blindado. El banco no simula calor ni EMI.";

/**
 * GDY106 Fig.95 GEK-91680A longitudinal-section chain (manual-faithful order).
 * Alternator AC motor -> drive shaft -> high-speed carrier -> sun pinion GE1288
 * -> low-speed carrier/planetaries -> torque tube -> wheel hub on inboard/outboard
 * tapered roller bearings -> tires; wet brakes + spring parking brake.
 */
export const GDY106_CHAIN_EN = [
  "Alternator AC traction motor",
  "Drive shaft",
  "High-speed carrier",
  "Sun pinion GE1288",
  "Low-speed carrier + planetaries",
  "Torque tube",
  "Wheel hub on inboard/outboard tapered roller bearings",
  "Tires",
  "Wet service brakes + spring-applied parking brake",
];

export const GDY106_CHAIN_ES = [
  "Motor de traccion AC (alternador)",
  "Eje de transmision",
  "Portador de alta velocidad",
  "Pinon solar GE1288",
  "Portador de baja + planetarios",
  "Tubo de torsion",
  "Maza sobre rodamientos conicos interior/exterior",
  "Neumaticos",
  "Frenos humedos + freno de estacionamiento por resorte",
];

/** Modified-cover oil transfer duct narrative (low-gear splash path). */
export const OIL_DUCT_NARRATIVE =
  "Modified-cover oil transfer duct: low-gear splash throws oil into the outer cavity, " +
  "it runs inside the sun inspection cover (items 39/36), passes through the sun pinion " +
  "interior, then reaches the retainer/inner washer. Align the arrow-to-pin marks on assembly.";

export const OIL_DUCT_NARRATIVE_ES =
  "Ducto de transferencia en tapa modificada: el chapoteo del engranaje bajo lanza aceite a la cavidad exterior, " +
  "corre por dentro de la tapa del sol (items 39/36), pasa por el interior del pinon solar " +
  "y llega al reten/arandela interior. Alinear marcas flecha-a-pasador en el montaje.";
