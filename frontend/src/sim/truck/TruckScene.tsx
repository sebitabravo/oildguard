import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import {
  DUMP_POS,
  HAUL_DURATIONS,
  HAUL_STATE_CSS,
  HAUL_STATE_HEX,
  LOAD_POS,
  WAIT_PATH,
  isMovingState,
  isRecalState,
  stateAt,
  type HaulState,
} from "./cycle";
import { t, useLang } from "../../i18n";
import { createStage } from "../../twin/render/stage";
import { createMaterials } from "../../twin/render/materials";
import { createLabel, setLabelActive, setLabelText } from "../../twin/render/labels";

// Escena camión + foso (Sim B). Camión 930E simplificado (chasis + cabina +
// tolva basculante + 6 ruedas cilíndricas, par trasero = unidades GDY106
// motorizadas) sobre un circuito de acarreo con pads CARGA / ACARREO /
// DESCARGA / ESPERA. El FSM del ciclo recorre waypoints; la insignia RECAL
// sigue la quietud medida (detenido + nivelado + motor encendido) y el giro
// de ruedas es ilustrativo: las RPM reales van como texto.
//
// WAIT es el retorno vacío (estado en movimiento): RECAL queda bloqueado en
// WAIT y solo se enciende en CARGA / DESCARGA. Ver docs/t5-modes-cameras.md.
//
// Modo (azul movimiento / verde reposo): anillo en el suelo, tinte de la
// cabina y del sol. Cámaras: Foso / Cabina / Lateral / Rueda con lerp; si el
// usuario orbita, vuelve a modo libre. El render lo da twin/render/stage.ts.
//
// La carrocería es procedural y provisional hasta el modelo paramétrico 930E.
// Las cifras de la vista son del paquete 930E-4SE de cycle.ts (solo display).

interface TruckSceneProps {
  paused: boolean;
  /** Increment to advance the FSM clock 1 s (only meaningful while paused). */
  stepTick: number;
  onPhase: (state: HaulState) => void;
  /** Controles inferiores (pausa, paso, reinicio) que dibuja la vista. */
  dock?: ReactNode;
  /** Insignias de honestidad visual, bajo la insignia RECAL. */
  badge?: ReactNode;
}

type CamPreset = "pit" | "cab" | "side" | "wheel" | "free";

/** Nombre en español de cada fase del ciclo (el id del FSM sigue en inglés). */
export const STATE_ES: Record<HaulState, string> = {
  LOAD: "CARGA",
  HAUL: "ACARREO",
  DUMP: "DESCARGA",
  WAIT: "ESPERA",
};

const CAM_PRESETS: Array<Exclude<CamPreset, "free">> = ["pit", "cab", "side", "wheel"];

interface ZoneDef {
  id: HaulState;
  label: string;
  labelEs: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
}

const ZONES: ZoneDef[] = [
  { id: "LOAD", label: "LOAD · loader", labelEs: "CARGA · cargador", cx: -8, cz: -3, w: 4.6, d: 4.4 },
  { id: "HAUL", label: "HAUL · loaded lane", labelEs: "ACARREO · pista cargada", cx: 0, cz: -3, w: 11.4, d: 3.0 },
  { id: "DUMP", label: "DUMP · crusher", labelEs: "DESCARGA · chancadora", cx: 8, cz: -3, w: 4.6, d: 4.4 },
  { id: "WAIT", label: "WAIT · return queue", labelEs: "ESPERA · retorno", cx: 0, cz: 3.2, w: 15.5, d: 3.0 },
];

const DUMP_TILT = 0.5;
const WHEEL_SPIN = 7; // rad/s, illustrative (see RPM narrative below)

const smooth01 = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

const shortestAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

/** Truck slot [x, z] for a phase at tInState seconds. */
function pathPos(state: HaulState, tInState: number): [number, number] {
  if (state === "HAUL") {
    const t = smooth01(tInState / HAUL_DURATIONS.HAUL);
    return [LOAD_POS[0] + (DUMP_POS[0] - LOAD_POS[0]) * t, LOAD_POS[1]];
  }
  if (state === "WAIT") {
    const pts = WAIT_PATH;
    const segs: number[] = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(len);
      total += len;
    }
    const target = smooth01(tInState / HAUL_DURATIONS.WAIT) * total;
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = segs[i - 1];
      if (target <= acc + seg || i === pts.length - 1) {
        const f = seg < 1e-6 ? 0 : Math.min(1, (target - acc) / seg);
        return [
          pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f,
          pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f,
        ];
      }
      acc += seg;
    }
    return pts[pts.length - 1];
  }
  if (state === "DUMP") return [DUMP_POS[0], DUMP_POS[1]];
  return [LOAD_POS[0], LOAD_POS[1]];
}

export default function TruckScene({ paused, stepTick, onPhase, dock, badge }: TruckSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onPhaseRef = useRef(onPhase);
  onPhaseRef.current = onPhase;
  const [lang] = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;
  // Camera preset is mirrored in a ref: the mount effect runs once, so the
  // animation loop reads presetRef (live) while buttons render presetUi.
  const [presetUi, setPresetUi] = useState<CamPreset>("pit");
  const presetRef = useRef<CamPreset>("pit");
  const setPreset = (p: CamPreset) => {
    presetRef.current = p;
    setPresetUi(p);
  };
  // Step requests accumulate here; the loop consumes them as +1 s jumps.
  const pendingStepRef = useRef(0);
  useEffect(() => {
    if (stepTick > 0) pendingStepRef.current += 1;
  }, [stepTick]);
  const [hud, setHud] = useState<{ state: HaulState; cycle: number }>({
    state: "LOAD",
    cycle: 1,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const stage = createStage(host, {
      preset: "outdoor",
      cameraPosition: [0, 17, 22],
      cameraTarget: [0, 0, 0],
      far: 600,
      sun: { shadowBox: 24, target: [0, 0, 0] },
      minDistance: 2.5,
      maxDistance: 80,
      maxPolarAngle: Math.PI * 0.49,
    });
    const { scene, camera, controls, sun } = stage;
    const mats = createMaterials();
    // Any manual orbit drops the camera back to free (presets re-engage
    // from the buttons; no fight between follow-lerp and the user).
    controls.addEventListener("start", () => {
      if (presetRef.current !== "free") {
        presetRef.current = "free";
        setPresetUi("free");
      }
    });

    const darkSteel = mats.get("paintedSteelDark");
    const cabMat = mats.get("komatsuYellow");
    const tireMat = mats.rubberTire();
    const hubMat = mats.get("castIron");
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x8d97a6,
      metalness: 0.55,
      roughness: 0.5,
    });
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      emissive: 0xf5a623,
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.5,
    });
    const oreMat = new THREE.MeshStandardMaterial({
      color: 0x5a3f2a,
      metalness: 0,
      roughness: 1.0,
    });
    // Mode ring: flat glow under the truck, blue while moving, green at
    // rest. Follows the truck automatically (child of the truck group).
    const modeRingMat = new THREE.MeshBasicMaterial({
      color: 0x2fbf71,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    // Ground: large textured plane (fog hides the far edge).
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      mats.ground("dirt", [150, 150])
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Zone pads (colored; the active one glows per-frame).
    const padMats: THREE.MeshStandardMaterial[] = [];
    for (const zone of ZONES) {
      const hex = HAUL_STATE_HEX[zone.id];
      const mat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.18,
        metalness: 0.1,
        roughness: 0.8,
        transparent: true,
        opacity: 0.55,
      });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(zone.w, 0.06, zone.d), mat);
      pad.position.set(zone.cx, 0.03, zone.cz);
      pad.receiveShadow = true;
      scene.add(pad);
      padMats.push(mat);
    }
    // End crossovers (plain road paint, static).
    const laneMat = new THREE.MeshStandardMaterial({
      color: 0x3a4356,
      metalness: 0.1,
      roughness: 0.9,
    });
    for (const cx of [-10.4, 10.4]) {
      const link = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 9.4), laneMat);
      link.position.set(cx, 0.025, 0.1);
      link.receiveShadow = true;
      scene.add(link);
    }

    // Open-pit terraces (north wall) + loader / crusher props.
    const terraceA = mats.ground("rock", [32, 1]);
    const terraceB = terraceA.clone();
    terraceB.color.setHex(0xc9b8a6);
    for (let i = 0; i < 3; i++) {
      const terrace = new THREE.Mesh(
        new THREE.BoxGeometry(48, 1.4, 3.4),
        i % 2 === 0 ? terraceA : terraceB
      );
      terrace.position.set(0, 0.7 + i * 1.4, -11.5 - i * 3.4);
      terrace.castShadow = true;
      terrace.receiveShadow = true;
      scene.add(terrace);
    }
    const prop = (
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    prop(1.8, 1.0, 1.8, darkSteel, -8, 0.5, -6.2); // loader base
    prop(0.5, 0.5, 2.6, cabMat, -8, 1.2, -5.0); // loader arm
    prop(2.2, 2.4, 2.2, darkSteel, 8, 1.2, -6.3); // crusher block
    prop(1.4, 0.8, 1.4, bedMat, 8, 2.8, -6.3); // crusher hopper

    // ---- Truck (forward = +X) ----
    // Procedural 930E-proportioned body: chassis 6.0 long x 3.4 wide keeps
    // the true 930E L/W = 1.72; total height ~3.3 keeps H/L = 0.53. Scene
    // units are illustrative (pit loop preserved), NOT CAD-exact.
    const truck = new THREE.Group();
    scene.add(truck);
    const procedural = new THREE.Group();
    truck.add(procedural);
    const tbox = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    tbox(procedural, 6.0, 0.6, 3.4, darkSteel, 0, 1.35, 0); // chassis (15.29 m class)
    tbox(procedural, 1.8, 1.6, 2.8, cabMat, 2.2, 2.45, 0); // cab
    tbox(procedural, 0.5, 0.7, 2.8, darkSteel, 3.2, 1.2, 0); // bumper
    const modeRing = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 3.1, 40),
      modeRingMat
    );
    modeRing.rotation.x = -Math.PI / 2;
    modeRing.position.y = 0.06;
    truck.add(modeRing);
    // GDY106 rear-axle marker: an amber overlay ring at the rear third
    // (local x = -2.1, same slot as the motorized axle). The HUD "Rear axle
    // motorized (GDY106)" badge is the text fallback.
    const axleMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const axleMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.25, 32),
      axleMarkerMat
    );
    axleMarker.rotation.x = -Math.PI / 2;
    axleMarker.position.set(-2.1, 0.07, 0);
    truck.add(axleMarker);
    // Dump bed on a rear pivot so the front lifts in DUMP.
    const bedPivot = new THREE.Group();
    bedPivot.position.set(-2.8, 1.95, 0);
    procedural.add(bedPivot);
    tbox(bedPivot, 5.0, 0.3, 3.4, bedMat, 2.4, 0.18, 0); // bed floor (211 m3 class)
    tbox(bedPivot, 5.0, 1.0, 0.18, bedMat, 2.4, 0.8, 1.6); // walls
    tbox(bedPivot, 5.0, 1.0, 0.18, bedMat, 2.4, 0.8, -1.6);
    tbox(bedPivot, 0.18, 1.6, 3.4, bedMat, 4.85, 0.9, 0); // headboard
    const ore = tbox(bedPivot, 3.6, 0.9, 2.8, oreMat, 2.2, 0.75, 0); // load

    // 6 cylinder wheels (3 axles x 2 sides); rearmost pair = motorized.
    const wheelGroups: THREE.Group[] = [];
    for (const ax of [2.2, -0.9, -2.1]) {
      for (const sz of [-1.7, 1.7]) {
        const g = new THREE.Group();
        g.position.set(ax, 0.75, sz);
        procedural.add(g);
        const motorized = ax === -2.1;
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.75, 0.55, 20),
          tireMat
        );
        tire.rotation.x = Math.PI / 2;
        tire.castShadow = true;
        g.add(tire);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.57, 14),
          motorized ? motorMat : hubMat
        );
        hub.rotation.x = Math.PI / 2;
        g.add(hub);
        wheelGroups.push(g);
      }
    }

    // ---- CSS2D labels: one per zone + a leader tag above the truck ----
    const zoneLabels = ZONES.map((zone) => {
      const label = createLabel({
        text: zone.label,
        color: HAUL_STATE_CSS[zone.id],
      });
      label.position.set(zone.cx, 0.4, zone.cz);
      scene.add(label);
      return label;
    });
    const truckLabel = createLabel({ text: "930E · GDY106", tone: "accent", leader: true });
    truckLabel.position.set(0, 3.9, 0);
    truck.add(truckLabel);

    // FSM clock + animation.
    let elapsed = 0;
    let wheelSpin = 0;
    let yaw = 0;
    let lastX = LOAD_POS[0];
    let lastZ = LOAD_POS[1];
    let cur: HaulState = "LOAD";
    let cycle = 1;
    truck.position.set(LOAD_POS[0], 0, LOAD_POS[1]);

    const camGoal = new THREE.Vector3();
    const tgtGoal = new THREE.Vector3();
    const sunWarm = new THREE.Color(0xfff1dc);
    const sunTint = new THREE.Color();
    const stopFrame = stage.onFrame((dt) => {
      if (!pausedRef.current) elapsed += dt;
      // Step: each button press jumps the FSM clock +1 s (pause first).
      if (pendingStepRef.current > 0) {
        elapsed += pendingStepRef.current * 1;
        pendingStepRef.current = 0;
      }
      const info = stateAt(elapsed);
      if (info.state !== cur) {
        if (cur === "WAIT" && info.state === "LOAD") cycle += 1;
        cur = info.state;
        onPhaseRef.current(cur);
        setHud({ state: cur, cycle });
      }

      const [px, pz] = pathPos(cur, info.tInState);
      truck.position.set(px, 0, pz);
      // Face travel direction while moving; hold heading when stopped.
      const dx = px - lastX;
      const dz = pz - lastZ;
      lastX = px;
      lastZ = pz;
      const speed = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
      if (speed > 0.05) {
        const target = Math.atan2(-dz, dx);
        yaw += shortestAngle(target - yaw) * Math.min(1, dt * 4);
      }
      truck.rotation.y = yaw;

      // Mode tint: blue while moving (HAUL + WAIT return drive), green at
      // rest (LOAD / DUMP). Same stillness signal as the RECAL badge.
      const movingLive = isMovingState(cur);
      cabMat.emissive.setHex(movingLive ? 0x1a3fa0 : 0x145f3c);
      cabMat.emissiveIntensity = 0.3;
      sun.color.copy(sunWarm).lerp(sunTint.setHex(movingLive ? 0xd8e6ff : 0xd9f2e3), 0.3);
      modeRingMat.color.setHex(movingLive ? 0x3a7bd5 : 0x2fbf71);
      // GDY106 rear-axle overlay pulse.
      axleMarkerMat.opacity = 0.45 + 0.25 * Math.sin(elapsed * 4);

      // Dump bed tilts in DUMP only.
      const tiltTarget = cur === "DUMP" ? DUMP_TILT : 0;
      bedPivot.rotation.z += (tiltTarget - bedPivot.rotation.z) * Math.min(1, dt * 2.5);

      // Illustrative wheel spin while the truck moves (true rotor/wheel
      // speeds stay text narrative).
      const rolling = cur === "HAUL" || cur === "WAIT";
      wheelSpin += dt * (rolling && !pausedRef.current ? WHEEL_SPIN : 0);
      for (const g of wheelGroups) g.rotation.z = -wheelSpin;

      // Ore visible once loaded, riding to the crusher; gone after dumping.
      ore.visible =
        cur === "HAUL" || (cur === "LOAD" && info.tInState > 1.5);

      // Zone highlight follows the FSM state.
      for (let i = 0; i < ZONES.length; i++) {
        const active = ZONES[i].id === cur;
        const m = padMats[i];
        m.emissiveIntensity += ((active ? 0.85 : 0.18) - m.emissiveIntensity) * 0.15;
        setLabelText(zoneLabels[i], langRef.current === "es" ? ZONES[i].labelEs : ZONES[i].label);
        setLabelActive(zoneLabels[i], active);
      }
      const modeText = movingLive ? t("hud.moving", langRef.current) : t("hud.rest", langRef.current);
      setLabelText(truckLabel, `930E · GDY106 · ${modeText}`);
      truckLabel.element.style.setProperty("--tone", movingLive ? "#4a8ef0" : "#2fbf71");

      // Phase progress bar (imperative, no re-render).
      if (barRef.current) {
        const frac = info.tInState / HAUL_DURATIONS[cur];
        barRef.current.style.width = `${Math.round(frac * 100)}%`;
      }

      // Camera presets: exponential lerp of position + target. Pit is a
      // static overview; Cab / Side / Wheel track the truck (offsets in
      // world space, cab/side rotated by heading). dt keeps flowing while
      // paused so presets + step stay usable with the FSM frozen. The wheel
      // close-up targets the rear-axle marker (-2.1 local x), the GDY106 slot.
      const preset = presetRef.current;
      if (preset !== "free") {
        if (preset === "pit") {
          camGoal.set(0, 17, 22);
          tgtGoal.set(0, 0, 0);
        } else if (preset === "side") {
          const fx = Math.cos(yaw);
          const fz = -Math.sin(yaw);
          camGoal.set(px - fz * 9.5, 3.4, pz + fx * 9.5);
          tgtGoal.set(px, 1.2, pz);
        } else if (preset === "cab") {
          const fx = Math.cos(yaw);
          const fz = -Math.sin(yaw);
          camGoal.set(px + fx * 5.4 - fz * 2.8, 3.1, pz + fz * 5.4 + fx * 2.8);
          tgtGoal.set(px + fx * 1.5, 1.9, pz + fz * 1.5);
        } else {
          // Wheel close-up: rear-axle (+Z) motorized wheel in world space.
          // Three.js rotation-Y: x' = x cos + z sin, z' = -x sin + z cos.
          const lx = -2.1;
          const lz = 1.7;
          const c = Math.cos(yaw);
          const s = Math.sin(yaw);
          const wx = px + lx * c + lz * s;
          const wz = pz - lx * s + lz * c;
          camGoal.set(wx + 2.1, 1.7, wz + 2.5);
          tgtGoal.set(wx, 0.7, wz);
        }
        const k = 1 - Math.exp(-3.2 * dt);
        camera.position.lerp(camGoal, k);
        controls.target.lerp(tgtGoal, k);
      }
    });

    return () => {
      stopFrame();
      stage.dispose();
      mats.dispose();
      terraceB.dispose();
    };
  }, []);

  const css = HAUL_STATE_CSS[hud.state];
  const recal = isRecalState(hud.state);
  const moving = isMovingState(hud.state);

  return (
    <div className="og-scene">
      <div ref={hostRef} className="og-scene__host" />
      <div className="og-overlay">
        <div className="og-hud og-hud--tl" style={{ width: 290, ["--tone" as string]: css }}>
          <div className="og-hud__title">
            <span className="og-dot" />
            <span className="og-num">
              {lang === "es" ? STATE_ES[hud.state] : hud.state} · {lang === "es" ? "ciclo" : "cycle"} {hud.cycle}
            </span>
            <span className={`og-badge ${moving ? "og-badge--move" : "og-badge--ok"}`}>
              {moving ? t("hud.moving", lang) : t("hud.rest", lang)}
            </span>
          </div>
          <div className="og-progress">
            <div ref={barRef} className="og-progress__bar" />
          </div>
          <div className="og-hud__row">
            <span className="og-hud__meta">{t("hud.camera", lang)}</span>
            <div className="og-seg og-seg--sm">
              {CAM_PRESETS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="og-seg__btn"
                  aria-pressed={presetUi === id}
                  onClick={() => setPreset(id)}
                >
                  {CAM_LABELS[lang][id]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="og-stack og-stack--tr">
          <div
            className={`og-badge ${recal ? "og-badge--ok" : "og-badge--ghost"}`}
            style={{ height: "auto", minHeight: 24, padding: "4px 10px", whiteSpace: "normal" }}
          >
            {recal ? t("hud.recal", lang) : t("hud.standby", lang)}
          </div>
          {badge}
        </div>
        <div className="og-stack og-stack--bl">
          <div className="og-hud og-hud--caption og-num">
            {lang === "es"
              ? "Rotor ≈3000 RPM · rueda ≈92 RPM (32.62:1) · giro ilustrativo · 15.29×8.89×8.10 m"
              : "Rotor ≈3000 RPM · wheel ≈92 RPM (32.62:1) · spin illustrative · 15.29×8.89×8.10 m"}
          </div>
          <div className="og-hud og-hud--caption">
            <span className="og-dot" style={{ ["--tone" as string]: "#f5a623", marginRight: 6 }} />
            {lang === "es"
              ? "Eje trasero motorizado (GDY106) · motor ENCENDIDO · chasis nivelado · tolva arriba 14.80 m"
              : "Rear axle motorized (GDY106) · engine ON · chassis leveled · body-up 14.80 m"}
          </div>
        </div>
        {dock && <div className="og-dock og-dock--right">{dock}</div>}
      </div>
    </div>
  );
}

const CAM_LABELS: Record<"en" | "es", Record<Exclude<CamPreset, "free">, string>> = {
  en: { pit: "Pit", cab: "Cab", side: "Side", wheel: "Wheel" },
  es: { pit: "Foso", cab: "Cabina", side: "Lateral", wheel: "Rueda" },
};
