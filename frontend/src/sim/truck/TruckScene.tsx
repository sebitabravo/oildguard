import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
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
import { MAX_STEER, dumpTiltDeg, payloadFor, smooth01, steerFor } from "./motion";
import { t, useLang } from "../../i18n";
import { createStage } from "../../twin/render/stage";
import { createMaterials } from "../../twin/render/materials";
import { createLabel, setLabelActive, setLabelText } from "../../twin/render/labels";
import { build930E, type AnchorName } from "../../twin/truck930e/build930E";
import { S, wheelOmega } from "../../twin/truck930e/spec";

// Escena camión + foso (Sim B). Camión 930E-4SE paramétrico (twin/truck930e)
// a escala real en metros, sobre un circuito de acarreo con pads CARGA / ACARREO /
// DESCARGA / ESPERA. El FSM del ciclo recorre waypoints; la insignia RECAL
// sigue la quietud medida (detenido + nivelado + motor encendido). La tolva
// sube 0→45°→0 durante DUMP, la carga va llena en HAUL, las ruedas giran a la
// velocidad real (v / radio de rodadura) y la dirección sigue la guiñada.
//
// WAIT es el retorno vacío (estado en movimiento): RECAL queda bloqueado en
// WAIT y solo se enciende en CARGA / DESCARGA. Ver docs/t5-modes-cameras.md.
//
// Modo (azul movimiento / verde reposo): anillo en el suelo, barra de acento del
// camión y tinte del sol. Cámaras: Foso / 3/4 / Cabina / Lateral / Rueda con lerp
// sobre las anclas del modelo; si el usuario orbita, vuelve a modo libre.
// El circuito sigue siendo el ilustrativo de antes, escalado WORLD veces para
// que el camión tenga metros reales; el foso real llega con la escena de mina.
//
// Parámetros de URL para capturas reproducibles: ?cam=pit|hero|cab|side|wheel,
// ?t=<s> (reloj del ciclo), ?pause=1 y ?debug=1|truck (llamadas de dibujo).

interface TruckSceneProps {
  paused: boolean;
  /** Increment to advance the FSM clock 1 s (only meaningful while paused). */
  stepTick: number;
  onPhase: (state: HaulState) => void;
  /** Controles inferiores (pausa, paso, reinicio) que dibuja la vista. */
  dock?: ComponentChildren;
  /** Insignias de honestidad visual, bajo la insignia RECAL. */
  badge?: ComponentChildren;
}

type CamPreset = "pit" | "hero" | "cab" | "side" | "wheel" | "free" | "custom";

/** Nombre en español de cada fase del ciclo (el id del FSM sigue en inglés). */
export const STATE_ES: Record<HaulState, string> = {
  LOAD: "CARGA",
  HAUL: "ACARREO",
  DUMP: "DESCARGA",
  WAIT: "ESPERA",
};

const CAM_PRESETS: Array<Exclude<CamPreset, "free" | "custom">> = ["pit", "hero", "cab", "side", "wheel"];

/** Factor del circuito ilustrativo (cycle.ts) a metros reales del camión. */
const WORLD = 8;

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

type Vec3 = [number, number, number];

interface PresetDef {
  /** Ancla del modelo que se mira; sin ancla se usa `target` en el marco del camión. */
  anchor?: AnchorName;
  /** Offset de la cámara respecto del ancla (o punto absoluto si no hay ancla), marco del camión. */
  cam: Vec3;
  target?: Vec3;
}

const PRESET_DEFS: Record<Exclude<CamPreset, "pit" | "free">, PresetDef> = {
  custom: { cam: [20, 5.8, -17], target: [3.5, 3.6, 0] },
  hero: { cam: [20, 5.8, -17], target: [3.5, 3.6, 0] },
  cab: { anchor: "cab", cam: [10.5, 2.8, -8.5] },
  side: { cam: [1.5, 4.2, -27], target: [1, 3.6, 0] },
  wheel: { anchor: "rearRightWheelMotor", cam: [-7.5, 1.4, 8.2] },
};

interface UrlParams {
  cam: CamPreset | null;
  t: number;
  debug: "scene" | "truck" | null;
}

const parseVec = (raw: string | null): Vec3 | null => {
  const v = raw?.split(",").map(Number);
  return v && v.length === 3 && v.every(Number.isFinite) ? (v as Vec3) : null;
};

function readUrlParams(): UrlParams {
  const q = new URLSearchParams(window.location.search);
  const cam = q.get("cam");
  const valid = cam && ["pit", "hero", "cab", "side", "wheel", "free", "custom"].includes(cam);
  // ?cam=custom&cp=x,y,z&ct=x,y,z: cámara y blanco en el marco del camión (depuración).
  const cp = parseVec(q.get("cp"));
  const ct = parseVec(q.get("ct"));
  if (cp) PRESET_DEFS.custom.cam = cp;
  if (ct) PRESET_DEFS.custom.target = ct;
  const debug = q.get("debug");
  return {
    cam: valid ? (cam as CamPreset) : null,
    t: Number(q.get("t")) || 0,
    debug: debug === "truck" ? "truck" : debug ? "scene" : null,
  };
}

const shortestAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

/** Truck slot [x, z] (metros) for a phase at tInState seconds. */
function pathPos(state: HaulState, tInState: number): [number, number] {
  const [x, z] = pathPosUnits(state, tInState);
  return [x * WORLD, z * WORLD];
}

function pathPosUnits(state: HaulState, tInState: number): [number, number] {
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

/** Domo de cielo en degradé que sigue a la cámara (el Sky del stage queda fuera del far plane). */
function createSkyDome(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x4a7fc0) },
      horizon: { value: new THREE.Color(0xd8c8aa) },
    },
    vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform vec3 top; uniform vec3 horizon; varying vec3 vDir; void main(){ float h = clamp(vDir.y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.5)), 1.0); #include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  return dome;
}

export default function TruckScene({ paused, stepTick, onPhase, dock, badge }: TruckSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onPhaseRef = useRef(onPhase);
  onPhaseRef.current = onPhase;
  const [lang] = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;
  const urlRef = useRef<UrlParams | null>(null);
  if (!urlRef.current) urlRef.current = readUrlParams();
  const url = urlRef.current;
  // Camera preset is mirrored in a ref: the mount effect runs once, so the
  // animation loop reads presetRef (live) while buttons render presetUi.
  const [presetUi, setPresetUi] = useState<CamPreset>(url.cam ?? "pit");
  const presetRef = useRef<CamPreset>(url.cam ?? "pit");
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
      cameraPosition: [0, 95, 120],
      cameraTarget: [0, 0, 0],
      near: 0.5,
      far: 1400,
      sun: { shadowBox: 28, target: [0, 0, 0] },
      fog: { density: 0.0035, color: 0xcdbb9c },
      minDistance: 3,
      maxDistance: 320,
      maxPolarAngle: Math.PI * 0.49,
    });
    const { scene, camera, controls, sun, renderer } = stage;
    scene.environmentIntensity = 0.42;
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
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x8d97a6,
      metalness: 0.55,
      roughness: 0.5,
    });
    // Mode ring: flat glow under the truck, blue while moving, green at
    // rest. Follows the truck automatically (child of the truck group).
    const modeRingMat = new THREE.MeshBasicMaterial({
      color: 0x2fbf71,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    const sky = createSkyDome();
    scene.add(sky);

    // Everything that is not the truck lives in `env` so ?debug=truck can hide it.
    const env = new THREE.Group();
    scene.add(env);

    // Ground: large textured plane (fog hides the far edge).
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600),
      mats.ground("dirt", [400, 400])
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    env.add(ground);

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
      const pad = new THREE.Mesh(new THREE.BoxGeometry(zone.w * WORLD, 0.1, zone.d * WORLD), mat);
      pad.position.set(zone.cx * WORLD, 0.05, zone.cz * WORLD);
      pad.receiveShadow = true;
      env.add(pad);
      padMats.push(mat);
    }
    // End crossovers (plain road paint, static).
    const laneMat = new THREE.MeshStandardMaterial({
      color: 0x3a4356,
      metalness: 0.1,
      roughness: 0.9,
    });
    for (const cx of [-10.4, 10.4]) {
      const link = new THREE.Mesh(new THREE.BoxGeometry(1.6 * WORLD, 0.08, 9.4 * WORLD), laneMat);
      link.position.set(cx * WORLD, 0.04, 0.1 * WORLD);
      link.receiveShadow = true;
      env.add(link);
    }

    // Open-pit terraces (north wall) + loader / crusher props.
    const terraceA = mats.ground("rock", [32, 1]);
    const terraceB = terraceA.clone();
    terraceB.color.setHex(0xc9b8a6);
    for (let i = 0; i < 3; i++) {
      const terrace = new THREE.Mesh(
        new THREE.BoxGeometry(48 * WORLD, 1.4 * WORLD, 3.4 * WORLD),
        i % 2 === 0 ? terraceA : terraceB
      );
      terrace.position.set(0, (0.7 + i * 1.4) * WORLD, (-11.5 - i * 3.4) * WORLD);
      terrace.castShadow = true;
      terrace.receiveShadow = true;
      env.add(terrace);
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
      const m = new THREE.Mesh(new THREE.BoxGeometry(w * WORLD, h * WORLD, d * WORLD), mat);
      m.position.set(x * WORLD, y * WORLD, z * WORLD);
      m.castShadow = true;
      m.receiveShadow = true;
      env.add(m);
      return m;
    };
    prop(1.8, 1.0, 1.8, darkSteel, -8, 0.5, -8.2); // loader base
    prop(0.5, 0.5, 2.6, cabMat, -8, 1.2, -7.0); // loader arm
    prop(2.2, 2.4, 2.2, darkSteel, 8, 1.2, -8.3); // crusher block
    prop(1.4, 0.8, 1.4, bedMat, 8, 2.8, -8.3); // crusher hopper

    // ---- Truck: parametric 930E-4SE (forward = +X, origin = rear-axle centre) ----
    const truck = build930E(mats);
    const rig = truck.group;
    scene.add(rig);
    const anchors = truck.getAnchors();
    const modeRing = new THREE.Mesh(new THREE.RingGeometry(9.2, 9.9, 72), modeRingMat);
    modeRing.rotation.x = -Math.PI / 2;
    modeRing.position.set(3.2, 0.12, 0);
    rig.add(modeRing);

    // ---- CSS2D labels: one per zone + a leader tag above the truck ----
    const zoneLabels = ZONES.map((zone) => {
      const label = createLabel({
        text: zone.label,
        color: HAUL_STATE_CSS[zone.id],
      });
      label.position.set(zone.cx * WORLD, 3, zone.cz * WORLD);
      env.add(label);
      return label;
    });
    const truckLabel = createLabel({ text: "930E · GDY106", tone: "accent", leader: true });
    truckLabel.position.set(3.5, S.chassis.overallHeight + 1.4, 0);
    rig.add(truckLabel);

    // FSM clock + animation.
    let elapsed = url.t;
    let yaw = 0;
    let lastX = LOAD_POS[0] * WORLD;
    let lastZ = LOAD_POS[1] * WORLD;
    let lastElapsed = elapsed;
    let steerSmooth = 0;
    let cur: HaulState = stateAt(elapsed).state;
    let cycle = 1 + Math.floor(elapsed / (HAUL_DURATIONS.LOAD + HAUL_DURATIONS.HAUL + HAUL_DURATIONS.DUMP + HAUL_DURATIONS.WAIT));
    rig.position.set(LOAD_POS[0] * WORLD, 0, LOAD_POS[1] * WORLD);
    onPhaseRef.current(cur);
    setHud({ state: cur, cycle });

    const camGoal = new THREE.Vector3();
    const tgtGoal = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const sunWarm = new THREE.Color(0xfff1dc);
    const sunTint = new THREE.Color();
    const sunOffset = sun.position.clone().sub(sun.target.position);
    // Con ?cam= la primera vista se fija sin interpolar (capturas reproducibles).
    let snap = url.cam !== null && url.cam !== "free";
    let frames = 0;
    let casters = 0;
    rig.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.castShadow) casters += 1;
    });

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
      rig.position.set(px, 0, pz);
      // Face travel direction while moving; hold heading when stopped.
      const dx = px - lastX;
      const dz = pz - lastZ;
      lastX = px;
      lastZ = pz;
      const dElapsed = elapsed - lastElapsed;
      lastElapsed = elapsed;
      const speed = dElapsed > 1e-6 ? Math.hypot(dx, dz) / dElapsed : 0;
      let yawRate = 0;
      if (speed > 0.05) {
        const target = Math.atan2(-dz, dx);
        const dYaw = shortestAngle(target - yaw) * Math.min(1, dt * 4);
        yaw += dYaw;
        yawRate = dt > 0 ? dYaw / dt : 0;
      }
      rig.rotation.y = yaw;
      rig.updateMatrixWorld(true);

      // Mode tint: blue while moving (HAUL + WAIT return drive), green at
      // rest (LOAD / DUMP). Same stillness signal as the RECAL badge.
      const movingLive = isMovingState(cur);
      truck.setModeTint(movingLive ? "moving" : "rest");
      sun.color.copy(sunWarm).lerp(sunTint.setHex(movingLive ? 0xd8e6ff : 0xd9f2e3), 0.3);
      modeRingMat.color.setHex(movingLive ? 0x3a7bd5 : 0x2fbf71);

      // Dump bed tilts 0 -> 45 -> 0 over DUMP; payload follows the phase.
      truck.setBodyTilt(cur === "DUMP" ? dumpTiltDeg(info.tInState, HAUL_DURATIONS.DUMP) : 0);
      truck.setPayload(payloadFor(cur, info.tInState, HAUL_DURATIONS[cur]));

      // Wheels roll at the true speed; steering follows the yaw rate (Ackermann).
      steerSmooth += (steerFor(yawRate, speed) - steerSmooth) * Math.min(1, dt * 6);
      truck.setSteer(Math.max(-MAX_STEER, Math.min(MAX_STEER, steerSmooth)));
      truck.setWheelSpin(wheelOmega(speed));
      truck.advance(dt);

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

      // La sombra del sol sigue al camión: mapa denso donde importa.
      sun.target.position.set(px, 0, pz);
      sun.position.copy(sun.target.position).add(sunOffset);
      sun.target.updateMatrixWorld();
      sky.position.copy(camera.position);

      // Camera presets: exponential lerp of position + target. Pit is a
      // static overview; the others track the truck through the model anchors
      // (offsets in the truck frame, so they rotate with the heading). dt keeps
      // flowing while paused so presets + step stay usable with the FSM frozen.
      const preset = presetRef.current;
      if (preset !== "free") {
        if (preset === "pit") {
          camGoal.set(0, 95, 120);
          tgtGoal.set(0, 0, -6);
        } else {
          const def = PRESET_DEFS[preset];
          if (def.anchor) {
            anchors[def.anchor].getWorldPosition(tgtGoal);
            rig.worldToLocal(tmp.copy(tgtGoal));
            camGoal.set(tmp.x + def.cam[0], tmp.y + def.cam[1], tmp.z + def.cam[2]);
            rig.localToWorld(camGoal);
          } else {
            camGoal.set(...def.cam);
            rig.localToWorld(camGoal);
            tgtGoal.set(...(def.target as Vec3));
            rig.localToWorld(tgtGoal);
          }
        }
        const k = snap ? 1 : 1 - Math.exp(-3.2 * dt);
        snap = false;
        camera.position.lerp(camGoal, k);
        controls.target.lerp(tgtGoal, k);
      }

      frames += 1;
      if (url.debug && frames > 2) {
        const stats = renderer.info.render;
        // info.render cuenta solo el pase principal; el pase de sombras suma una llamada por emisor.
        const text = `calls ${stats.calls} + ${casters} shadow · triangles ${stats.triangles}`;
        if (debugRef.current && debugRef.current.textContent !== text) {
          debugRef.current.textContent = text;
          console.log(`[og-debug] ${text}`);
        }
      }
    });

    if (url.debug === "truck") env.visible = false;

    return () => {
      stopFrame();
      truck.dispose();
      stage.dispose();
      mats.dispose();
      terraceB.dispose();
      sky.geometry.dispose();
      (sky.material as THREE.Material).dispose();
    };
  }, []);

  const css = HAUL_STATE_CSS[hud.state];
  const recal = isRecalState(hud.state);
  const moving = isMovingState(hud.state);

  return (
    <div className="og-scene">
      <div ref={hostRef} className="og-scene__host" />
      <div className="og-overlay">
        <div className="og-hud og-hud--tl" style={{ width: 340, ["--tone" as string]: css }}>
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
              ? "Rotor ≈3000 RPM · rueda ≈92 RPM (32.62:1) · giro de rueda según velocidad real · 15.60×8.69×7.37 m (folleto)"
              : "Rotor ≈3000 RPM · wheel ≈92 RPM (32.62:1) · wheel spin follows true speed · 15.60×8.69×7.37 m (brochure)"}
          </div>
          <div className="og-hud og-hud--caption">
            <span className="og-dot" style={{ ["--tone" as string]: "#f5a623", marginRight: 6 }} />
            {lang === "es"
              ? "Eje trasero motorizado (GDY106) · motor ENCENDIDO · chasis nivelado · tolva arriba 14.02 m (folleto)"
              : "Rear axle motorized (GDY106) · engine ON · chassis leveled · body-up 14.02 m (brochure)"}
          </div>
          {url.debug && <div ref={debugRef} className="og-hud og-hud--caption og-num" />}
        </div>
        {dock && <div className="og-dock og-dock--right">{dock}</div>}
      </div>
    </div>
  );
}

const CAM_LABELS: Record<"en" | "es", Record<Exclude<CamPreset, "free" | "custom">, string>> = {
  en: { pit: "Pit", hero: "3/4", cab: "Cab", side: "Side", wheel: "Wheel" },
  es: { pit: "Foso", hero: "3/4", cab: "Cabina", side: "Lateral", wheel: "Rueda" },
};
