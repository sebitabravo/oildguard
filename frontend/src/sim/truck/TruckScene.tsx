import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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

// T4 truck + open-pit scene (Sim B, S2) + T5 modes/cameras polish.
// Simplified 930E (chassis box + cab + tiltable dump bed + 6 cylinder
// wheels, rear-axle pair highlighted as the GDY106 motorized units) on a
// haul-road loop with LOAD / HAUL / DUMP / WAIT ground pads. The haul-cycle
// FSM auto-loops the truck along waypoints; the RECAL badge follows
// measured stillness (stopped + leveled + engine-on), and wheel spin is
// illustrative — true rotor/wheel speeds are shown as text narrative.
// T5 adds: moving (blue) / rest (green) mode tint on the truck + HUD badge,
// camera presets (Pit / Cab / Side / Wheel, lerped; any manual orbit drops
// back to free), and pause + 1 s step support via the stepTick prop.
//
// Honesty note (kept from T4): WAIT is the empty RETURN DRIVE, so it is a
// moving state — the RECAL badge stays gated during WAIT and lights only at
// LOAD / DUMP. See docs/t5-modes-cameras.md.

interface TruckSceneProps {
  paused: boolean;
  /** Increment to advance the FSM clock 1 s (only meaningful while paused). */
  stepTick: number;
  onPhase: (state: HaulState) => void;
}

type CamPreset = "pit" | "cab" | "side" | "wheel" | "free";

const CAM_PRESETS: Array<{ id: Exclude<CamPreset, "free">; label: string }> = [
  { id: "pit", label: "Pit overview" },
  { id: "cab", label: "Cab" },
  { id: "side", label: "Side" },
  { id: "wheel", label: "Wheel close-up" },
];

const MODE_MOVING_CSS = "#3a7bd5";
const MODE_REST_CSS = "#2fbf71";

interface ZoneDef {
  id: HaulState;
  label: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
}

const ZONES: ZoneDef[] = [
  { id: "LOAD", label: "LOAD · loader", cx: -8, cz: -3, w: 4.6, d: 4.4 },
  { id: "HAUL", label: "HAUL · loaded lane", cx: 0, cz: -3, w: 11.4, d: 3.0 },
  { id: "DUMP", label: "DUMP · crusher", cx: 8, cz: -3, w: 4.6, d: 4.4 },
  { id: "WAIT", label: "WAIT · return queue", cx: 0, cz: 3.2, w: 15.5, d: 3.0 },
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

export default function TruckScene({ paused, stepTick, onPhase }: TruckSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const barRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onPhaseRef = useRef(onPhase);
  onPhaseRef.current = onPhase;
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1420);

    const camera = new THREE.PerspectiveCamera(
      45,
      host.clientWidth / host.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 15, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();
    // T5: any manual orbit drops the camera back to free (presets re-engage
    // from the buttons; no fight between follow-lerp and the user).
    controls.addEventListener("start", () => {
      if (presetRef.current !== "free") {
        presetRef.current = "free";
        setPresetUi("free");
      }
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const directional = new THREE.DirectionalLight(0xffffff, 1.6);
    directional.position.set(6, 10, 4);
    scene.add(directional);

    // Shared low-metalness PBR materials (same rule as the bench scenes:
    // high-metal PBR renders near-black under ambient + directional only).
    const darkSteel = new THREE.MeshStandardMaterial({
      color: 0x2b3648,
      metalness: 0.3,
      roughness: 0.6,
    });
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x8a93a5,
      metalness: 0.3,
      roughness: 0.6,
    });
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0xe0a52a,
      metalness: 0.25,
      roughness: 0.5,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1c2433,
      metalness: 0.1,
      roughness: 0.85,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x46566e,
      metalness: 0.3,
      roughness: 0.55,
    });
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      emissive: 0xf5a623,
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.5,
    });
    const oreMat = new THREE.MeshStandardMaterial({
      color: 0x6b4a2f,
      metalness: 0.05,
      roughness: 1.0,
    });
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141c2c,
      metalness: 0.1,
      roughness: 0.95,
    });
    const disposables: Array<{ dispose: () => void }> = [
      darkSteel,
      bedMat,
      cabMat,
      tireMat,
      hubMat,
      motorMat,
      oreMat,
      groundMat,
    ];
    // T5 mode ring: flat glow under the truck, blue while moving, green at
    // rest. Follows the truck automatically (child of the truck group).
    const modeRingMat = new THREE.MeshBasicMaterial({
      color: 0x2fbf71,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    disposables.push(modeRingMat);

    // Ground + grid.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(64, 44), groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    disposables.push(ground.geometry);
    const grid = new THREE.GridHelper(48, 24, 0x3a4a63, 0x223048);
    grid.position.y = 0.01;
    scene.add(grid);
    disposables.push(grid.geometry, grid.material as THREE.Material);

    // Zone pads (colored; the active one glows per-frame).
    const padMats: THREE.MeshStandardMaterial[] = [];
    const padMeshes: THREE.Mesh[] = [];
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
      scene.add(pad);
      padMats.push(mat);
      padMeshes.push(pad);
      disposables.push(pad.geometry, mat);
    }
    // End crossovers (plain road paint, static).
    const laneMat = new THREE.MeshStandardMaterial({
      color: 0x3a4356,
      metalness: 0.1,
      roughness: 0.9,
    });
    disposables.push(laneMat);
    for (const cx of [-10.4, 10.4]) {
      const link = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 9.4), laneMat);
      link.position.set(cx, 0.025, 0.1);
      scene.add(link);
      disposables.push(link.geometry);
    }

    // Open-pit terraces (north wall) + loader / crusher props.
    const terraceA = new THREE.MeshStandardMaterial({
      color: 0x4a3b2c,
      metalness: 0.05,
      roughness: 1.0,
    });
    const terraceB = new THREE.MeshStandardMaterial({
      color: 0x5a4836,
      metalness: 0.05,
      roughness: 1.0,
    });
    disposables.push(terraceA, terraceB);
    for (let i = 0; i < 3; i++) {
      const t = new THREE.Mesh(
        new THREE.BoxGeometry(48, 1.4, 3.4),
        i % 2 === 0 ? terraceA : terraceB
      );
      t.position.set(0, 0.7 + i * 1.4, -11.5 - i * 3.4);
      scene.add(t);
      disposables.push(t.geometry);
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
      scene.add(m);
      disposables.push(m.geometry);
      return m;
    };
    prop(1.8, 1.0, 1.8, darkSteel, -8, 0.5, -6.2); // loader base
    prop(0.5, 0.5, 2.6, cabMat, -8, 1.2, -5.0); // loader arm
    prop(2.2, 2.4, 2.2, darkSteel, 8, 1.2, -6.3); // crusher block
    prop(1.4, 0.8, 1.4, bedMat, 8, 2.8, -6.3); // crusher hopper

    // ---- Simplified 930E truck (forward = +X), NOT CAD-exact ----
    const truck = new THREE.Group();
    scene.add(truck);
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
      parent.add(m);
      disposables.push(m.geometry);
      return m;
    };
    tbox(truck, 4.4, 0.5, 2.2, darkSteel, 0, 1.35, 0); // chassis
    tbox(truck, 1.5, 1.3, 2.0, cabMat, 1.55, 2.25, 0); // cab
    tbox(truck, 0.4, 0.6, 2.0, darkSteel, 2.4, 1.2, 0); // bumper
    const modeRing = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 3.1, 40),
      modeRingMat
    );
    modeRing.rotation.x = -Math.PI / 2;
    modeRing.position.y = 0.06;
    truck.add(modeRing);
    disposables.push(modeRing.geometry);
    // Dump bed on a rear pivot so the front lifts in DUMP.
    const bedPivot = new THREE.Group();
    bedPivot.position.set(-2.0, 1.95, 0);
    truck.add(bedPivot);
    tbox(bedPivot, 3.6, 0.25, 2.3, bedMat, 1.75, 0.15, 0); // bed floor
    tbox(bedPivot, 3.6, 0.8, 0.15, bedMat, 1.75, 0.65, 1.075); // walls
    tbox(bedPivot, 3.6, 0.8, 0.15, bedMat, 1.75, 0.65, -1.075);
    tbox(bedPivot, 0.15, 1.3, 2.3, bedMat, 3.5, 0.75, 0); // headboard
    const ore = tbox(bedPivot, 2.6, 0.7, 1.9, oreMat, 1.6, 0.6, 0); // load

    // 6 cylinder wheels (3 axles x 2 sides); rearmost pair = motorized.
    const wheelGroups: THREE.Group[] = [];
    for (const ax of [1.5, -0.7, -1.6]) {
      for (const sz of [-1.15, 1.15]) {
        const g = new THREE.Group();
        g.position.set(ax, 0.55, sz);
        truck.add(g);
        const motorized = ax === -1.6;
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.42, 20),
          tireMat
        );
        tire.rotation.x = Math.PI / 2;
        g.add(tire);
        disposables.push(tire.geometry);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 0.44, 14),
          motorized ? motorMat : hubMat
        );
        hub.rotation.x = Math.PI / 2;
        g.add(hub);
        disposables.push(hub.geometry);
        wheelGroups.push(g);
      }
    }

    // HTML overlay labels (zones + truck tag), placed per-frame.
    const proj = new THREE.Vector3();
    const truckLabelPos = new THREE.Vector3();
    const placeLabels = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      for (const zone of ZONES) {
        const el = labelRefs.current.get(zone.id);
        if (!el) continue;
        proj.set(zone.cx, 0.4, zone.cz).project(camera);
        const x = (proj.x * 0.5 + 0.5) * w;
        const y = (-proj.y * 0.5 + 0.5) * h;
        el.style.display = proj.z < 1 ? "block" : "none";
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      }
      const truckEl = labelRefs.current.get("truck");
      if (truckEl) {
        truckLabelPos.set(truck.position.x, 3.6, truck.position.z).project(camera);
        const x = (truckLabelPos.x * 0.5 + 0.5) * w;
        const y = (-truckLabelPos.y * 0.5 + 0.5) * h;
        truckEl.style.display = truckLabelPos.z < 1 ? "block" : "none";
        truckEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -130%)`;
      }
    };

    // FSM clock + animation.
    const clock = new THREE.Clock();
    let elapsed = 0;
    let wheelSpin = 0;
    let yaw = 0;
    let lastX = LOAD_POS[0];
    let lastZ = LOAD_POS[1];
    let cur: HaulState = "LOAD";
    let cycle = 1;
    truck.position.set(LOAD_POS[0], 0, LOAD_POS[1]);

    let frameId = 0;
    const camGoal = new THREE.Vector3();
    const tgtGoal = new THREE.Vector3();
    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!pausedRef.current) elapsed += dt;
      // T5 step: each button press jumps the FSM clock +1 s (pause first).
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

      // T5 mode tint: blue while moving (HAUL + WAIT return drive), green
      // at rest (LOAD / DUMP). Same stillness signal as the RECAL badge.
      const movingLive = isMovingState(cur);
      cabMat.emissive.setHex(movingLive ? 0x1a3fa0 : 0x145f3c);
      cabMat.emissiveIntensity = 0.5;
      modeRingMat.color.setHex(movingLive ? 0x3a7bd5 : 0x2fbf71);

      // Dump bed tilts in DUMP only; chassis stays level (recal narrative).
      const tiltTarget = cur === "DUMP" ? DUMP_TILT : 0;
      bedPivot.rotation.z += (tiltTarget - bedPivot.rotation.z) * Math.min(1, dt * 2.5);

      // Illustrative wheel spin while the truck moves.
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
      }

      // Phase progress bar (imperative, no re-render).
      if (barRef.current) {
        const frac = info.tInState / HAUL_DURATIONS[cur];
        barRef.current.style.width = `${Math.round(frac * 100)}%`;
      }

      // T5 camera presets: exponential lerp of position + target. Pit is a
      // static overview; Cab / Side / Wheel track the truck (offsets in
      // world space, cab/side rotated by heading). dt keeps flowing while
      // paused so presets + step stay usable with the FSM frozen.
      const preset = presetRef.current;
      if (preset !== "free") {
        if (preset === "pit") {
          camGoal.set(0, 15, 18);
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
          const lx = -1.6;
          const lz = 1.15;
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

      controls.update();
      placeLabels();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  const css = HAUL_STATE_CSS[hud.state];
  const recal = isRecalState(hud.state);
  const moving = isMovingState(hud.state);
  const modeCss = moving ? MODE_MOVING_CSS : MODE_REST_CSS;

  return (
    <div style={{ position: "relative", width: "100%", height: 480 }}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            width: 264,
            fontSize: 13,
            fontWeight: 700,
            color: "#e8edf5",
            background: "rgba(10, 16, 28, 0.82)",
            border: `1px solid ${css}`,
            borderRadius: 4,
            padding: "6px 10px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: css,
              marginRight: 8,
            }}
          />
          {hud.state} · cycle {hud.cycle}
          <span
            style={{
              display: "inline-block",
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: moving ? "#dbe7ff" : "#0e1420",
              background: modeCss,
              borderRadius: 4,
              padding: "2px 8px",
              verticalAlign: "1px",
            }}
          >
            {moving ? "MOVING" : "REST"}
          </span>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "#223048",
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            <div
              ref={barRef}
              style={{ height: "100%", width: "0%", background: css }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              marginTop: 8,
              pointerEvents: "auto",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#9fb0c9",
                marginRight: 2,
                lineHeight: "22px",
              }}
            >
              Camera:
            </span>
            {CAM_PRESETS.map((p) => {
              const active = presetUi === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  title={
                    presetUi === "free" || !active
                      ? `Fly camera to ${p.label} (lerp)`
                      : `${p.label} (tracking)`
                  }
                  style={{
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#0e1420" : "#e8edf5",
                    background: active ? "#f5a623" : "transparent",
                    border: "1px solid #f5a623",
                    borderRadius: 4,
                    padding: "2px 8px",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            color: recal ? "#0e1420" : "#8b98ad",
            background: recal ? "#2fbf71" : "rgba(10, 16, 28, 0.82)",
            border: `1px solid ${recal ? "#2fbf71" : "#3a4a63"}`,
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          {recal
            ? "RECALIBRATING (stopped+leveled+engine-on)"
            : "STANDBY · recalibration gated (moving)"}
        </div>
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            fontSize: 12,
            color: "#c7d3e8",
            background: "rgba(10, 16, 28, 0.82)",
            border: "1px solid #3a4a63",
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          Rotor ≈3000 RPM · wheel ≈92 RPM (32.62:1) · spin illustrative
        </div>
        <div
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            fontSize: 12,
            color: "#c7d3e8",
            background: "rgba(10, 16, 28, 0.82)",
            border: "1px solid #3a4a63",
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f5a623",
              marginRight: 6,
            }}
          />
          Rear axle motorized (GDY106) · engine ON · chassis leveled
        </div>
        {ZONES.map((zone) => (
          <div
            key={zone.id}
            ref={(el) => {
              if (el) labelRefs.current.set(zone.id, el);
              else labelRefs.current.delete(zone.id);
            }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              display: "block",
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: zone.id === hud.state ? 700 : 500,
              color: "#e8edf5",
              background: "rgba(10, 16, 28, 0.78)",
              border: `1px solid ${HAUL_STATE_CSS[zone.id]}`,
              borderRadius: 4,
              padding: "2px 8px",
            }}
          >
            {zone.label}
          </div>
        ))}
        <div
          ref={(el) => {
            if (el) labelRefs.current.set("truck", el);
            else labelRefs.current.delete("truck");
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            display: "block",
            whiteSpace: "nowrap",
            fontSize: 12,
            fontWeight: 700,
            color: "#0e1420",
            background: "#e0a52a",
            border: `2px solid ${modeCss}`,
            borderRadius: 4,
            padding: "2px 8px",
          }}
        >
          930E · GDY106 · {moving ? "MOVING" : "REST"}
        </div>
      </div>
    </div>
  );
}
