import { useEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import * as THREE from "three";
import { BENCH_SENSORS } from "./sensors";
import { t, type DictKey, useLang } from "../../i18n";
import { formatOilText, oilCssFor, oilStateFor, oilStateLabel } from "./oil";
import { wobbleAt } from "./settling";
import { createStage } from "../../twin/render/stage";
import { createMaterials } from "../../twin/render/materials";
import { createLabel, setLabelActive, setLabelText } from "../../twin/render/labels";
import { CAPACITY_L, headFromVolume, stageSpeeds } from "../../twin/physics";
import { buildWheelSceneAccessibilityCopy } from "../sceneAccessibility";
import { useThrottledSceneAccessibility } from "../useThrottledSceneAccessibility";

// Escena del banco GDY106 (Sim A): bastidor, carcasa con corte e internos.
// El render (tone mapping, IBL, sombras) viene de twin/render/stage.ts.
// Steel test-rig frame + GDY106 wheel/motor housing with four
// no-drill sensor markers. Physically-plausible proportions, NOT CAD-exact.
// Manual-faithful chain per GDY106 Fig.95 GEK-91680A longitudinal section:
// alternator AC motor -> drive shaft -> high-speed carrier -> sun pinion GE1288
// -> low-speed carrier/planetaries -> torque tube -> wheel hub on inboard/outboard
// tapered roller bearings -> tires; wet brakes + spring parking brake.
// Sensor points snap to manual items: pressure T at oil drain pipe plug item 56
// (6 o'clock), temperature at magnetic pipe plug item 41, vibration at sun
// inspection cover items 39/36, Hall clamp on traction power cable.

export type BenchMode = "move" | "rest";

interface BenchSceneProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Driven oil fill, 0..1 (slider in BenchView; fused value in S6). */
  oilLevel: number;
  /** Settling shape proxy: 0.5 dilute/fast … 2.0 degraded/slow. */
  viscosityProxy: number;
  /** Move churns the oil + spins the gear set; rest lets it settle. */
  mode: BenchMode;
  /** Semi-transparent housing shell revealing internals + oil. */
  cutaway: boolean;
  exploded: boolean;
  /** Controles inferiores (sliders, marcha/reposo, corte) que dibuja la vista. */
  dock?: ComponentChildren;
  /** Insignias de honestidad visual, bajo la insignia RECAL. */
  badge?: ComponentChildren;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function oilPoolGeometry(volumeL: number): THREE.BufferGeometry {
  const radius = 0.6;
  const h = headFromVolume(Math.min(CAPACITY_L, Math.max(0, volumeL)));
  const y = h - radius;
  const halfChord = Math.sqrt(Math.max(0, radius * radius - y * y));
  const asin = Math.asin(y / radius);
  const shape = new THREE.Shape();
  shape.moveTo(-halfChord, y);
  for (let i = 0; i <= 36; i++) {
    const angle = Math.PI - asin + ((Math.PI + 2 * asin) * i) / 36;
    shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  shape.closePath();
  const innerRadius = 0.22;
  if (y > -innerRadius) {
    const hole = new THREE.Path();
    if (y >= innerRadius) {
      hole.absellipse(0, 0, innerRadius, innerRadius, 0, Math.PI * 2, true, 0);
    } else {
      const innerChord = Math.sqrt(Math.max(0, innerRadius * innerRadius - y * y));
      const innerAsin = Math.asin(y / innerRadius);
      hole.moveTo(-innerChord, y);
      for (let i = 0; i <= 24; i++) {
        const angle = Math.PI - innerAsin + ((Math.PI + 2 * innerAsin) * i) / 24;
        hole.lineTo(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle));
      }
      hole.closePath();
    }
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.15, bevelEnabled: false, curveSegments: 36 });
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

const HOUSING_Y = 2.09; // motor axis height above ground

export default function BenchScene({
  selectedId,
  onSelect,
  oilLevel,
  viscosityProxy,
  mode,
  cutaway,
  exploded,
  dock,
  badge,
}: BenchSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [lang] = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;
  // Refs mirror props for use inside the three.js effect (no re-subscribe).
  const selectedRef = useRef<string | null>(selectedId);
  selectedRef.current = selectedId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const oilLevelRef = useRef(oilLevel);
  oilLevelRef.current = oilLevel;
  const viscosityRef = useRef(viscosityProxy);
  viscosityRef.current = viscosityProxy;
  const modeRef = useRef<BenchMode>(mode);
  modeRef.current = mode;
  const cutawayRef = useRef(cutaway);
  cutawayRef.current = cutaway;
  const explodedRef = useRef(exploded);
  explodedRef.current = exploded;
  const accessibilityCopy = buildWheelSceneAccessibilityCopy({ oilLevel, mode }, lang);
  const publishedAccessibilityCopy = useThrottledSceneAccessibility(accessibilityCopy);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const stage = createStage(host, {
      preset: "studio",
      cameraPosition: [4.4, 3.4, 5.4],
      cameraTarget: [0, 1.6, 0],
      sun: { shadowBox: 5, target: [0, 1, 0] },
      minDistance: 1.5,
      maxDistance: 16,
      maxPolarAngle: Math.PI * 0.495,
    });
    const { scene, camera, renderer, controls } = stage;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", accessibilityCopy.label);
    renderer.domElement.setAttribute("aria-describedby", "wheel-scene-description");
    const mats = createMaterials();

    // Studio floor + faint technical grid (receives the rig shadows).
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), mats.get("studioFloor"));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(10, 10, 0x3a4a63, 0x223048);
    grid.position.y = 0.003;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    // Shared PBR materials (IBL lights them now, so real metalness is fine).
    const steel = new THREE.MeshStandardMaterial({
      color: 0x6f7886,
      metalness: 0.85,
      roughness: 0.4,
    });
    const darkSteel = mats.get("paintedSteelDark");
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x5b7ba6,
      metalness: 0.55,
      roughness: 0.42,
      transparent: true,
    });
    const gearboxMat = new THREE.MeshStandardMaterial({
      color: 0x6b80a0,
      metalness: 0.55,
      roughness: 0.42,
      transparent: true,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xd9b13b,
      metalness: 0.9,
      roughness: 0.3,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x1c2433,
      metalness: 0.2,
      roughness: 0.7,
    });

    const box = (
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    const cylX = (
      r: number,
      len: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      segments = 32
    ) => {
      // CylinderGeometry is Y-axis; rotate to lie along X (motor axis).
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, len, segments),
        mat
      );
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };

    // ---- Steel rig frame: table + legs + cross beams + saddle stands ----
    box(4.6, 0.12, 2.4, steel, 0, 0.9, 0); // table top
    for (const sx of [-2.1, 2.1]) {
      for (const sz of [-1.0, 1.0]) {
        box(0.12, 0.9, 0.12, steel, sx, 0.45, sz); // legs
      }
    }
    box(4.4, 0.1, 0.1, steel, 0, 0.25, -1.0); // cross beams
    box(4.4, 0.1, 0.1, steel, 0, 0.25, 1.0);
    for (const sx of [-0.55, 0.55]) {
      box(0.34, 0.5, 0.95, darkSteel, sx, 1.21, 0); // saddle stands
      box(0.5, 0.08, 1.05, steel, sx, 1.5, 0); // stand caps
    }

    // ---- Simplified GDY106 wheel/motor housing (NOT CAD-exact) ----
    // Motor barrel along X with cooling ribs, gearbox + cover plate on the
    // left (-X), output flange + shaft stub on the right (+X).
    // barrelMesh/gearboxMesh opacity is driven per-frame by `cutaway`.
    cylX(0.55, 1.7, housingMat, 0, HOUSING_Y, 0); // barrel
    for (const rx of [-0.5, 0, 0.5]) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(0.57, 0.03, 12, 40),
        darkSteel
      );
      rib.rotation.y = Math.PI / 2;
      rib.position.set(rx, HOUSING_Y, 0);
      scene.add(rib);
    }
    const gearboxShell = box(1.1, 1.15, 1.15, gearboxMat, -1.4, HOUSING_Y, 0); // gearbox
    box(0.08, 0.95, 0.95, darkSteel, -1.99, HOUSING_Y, 0); // sun-pinion cover
    cylX(0.8, 0.26, housingMat, 1.0, HOUSING_Y, 0); // output flange
    cylX(0.22, 0.5, steel, 1.35, HOUSING_Y, 0); // shaft stub

    // ---- No-drill mount hardware (visual anchors for the markers) ----
    // Pressure T-adapter (brass) below gearbox drain port.
    const tAdapter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.18, 16),
      brass
    );
    tAdapter.position.set(-1.4, 1.42, 0.35);
    scene.add(tAdapter);
    box(0.14, 0.1, 0.12, darkSteel, -1.4, 1.42, 0.47); // transducer body
    // Temperature probe where the magnetic plug was.
    const probe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16),
      brass
    );
    probe.position.set(0.45, 1.56, 0.3);
    scene.add(probe);
    // Vibration MEMS puck on epoxy base, on the sun-pinion cover.
    box(0.04, 0.16, 0.16, cableMat, -2.045, 2.25, 0.3); // epoxy base
    cylX(0.09, 0.05, darkSteel, -2.08, 2.25, 0.3, 20); // MEMS puck
    // Motor cable (tube) + Hall clamp box.
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.25, 2.62, 0),
      new THREE.Vector3(0.8, 2.45, 0.3),
      new THREE.Vector3(1.4, 1.9, 0.65),
      new THREE.Vector3(1.8, 1.02, 0.9),
    ]);
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(cableCurve, 32, 0.035, 8),
      cableMat
    );
    scene.add(cable);
    box(0.2, 0.14, 0.14, darkSteel, 0.25, 2.6, 0); // junction box
    box(0.16, 0.12, 0.12, darkSteel, 1.0, 2.2, 0.45); // Hall clamp body

    // ---- Cutaway internals (simplified GDY106, NOT CAD-exact) ----
    // Sun gear on the motor axis inside the gearbox, three planetary
    // pinions around it, ring-gear hint, and the rotor barrel volume in the
    // motor housing. Low-poly cylinders + box teeth.
    const gearMat = new THREE.MeshStandardMaterial({
      color: 0x9aa7bd,
      metalness: 0.9,
      roughness: 0.35,
    });
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0xa0622d,
      metalness: 0.8,
      roughness: 0.4,
    });
    // SAE 85W-140: amber/brown transmissive oil. The fill state (normal /
    // warning / critical) is conveyed by the HUD, not by tinting the oil.
    const oilMat = mats.get("oil85W140");

    const spinGroup = (rate: number) => {
      const group = new THREE.Group();
      scene.add(group);
      return { group, rate };
    };
    const rotorRpm = 3000;
    const speeds = stageSpeeds(rotorRpm);
    const toRadPerSecond = (rpm: number) => (rpm * Math.PI * 2) / 60;
    const spinners = [
      spinGroup(toRadPerSecond(rotorRpm)),
      spinGroup(toRadPerSecond(rotorRpm)),
      spinGroup(toRadPerSecond(speeds.hsCarrierRpm)),
      spinGroup(toRadPerSecond(speeds.wheelRpm)),
    ];
    const pinionSpinners = [0, 1, 2].map(() => spinGroup(toRadPerSecond(speeds.hsPlanetRelRpm)));
    const lowPlanetSpinners = [0, 1, 2, 3].map(() => spinGroup(toRadPerSecond(speeds.lsPlanetRelRpm)));
    const gearAt = (
      parent: THREE.Group,
      x: number,
      y: number,
      z: number,
      discR: number,
      thick: number,
      teeth: number
    ) => {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(discR, discR, thick, 16),
        gearMat
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.set(x, y, z);
      parent.add(disc);
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(thick * 0.9, 0.07, 0.09),
          gearMat
        );
        tooth.position.set(x, y + Math.cos(a) * (discR + 0.03), z + Math.sin(a) * (discR + 0.03));
        tooth.rotation.x = -a;
        parent.add(tooth);
      }
    };

    // Sun shaft along the motor axis + sun gear disc inside the gearbox.
    const sunShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 2.6, 12),
      gearMat
    );
    sunShaft.rotation.z = Math.PI / 2;
    sunShaft.position.set(-0.3, HOUSING_Y, 0);
    spinners[0].group.add(sunShaft);
    gearAt(spinners[0].group, -1.4, HOUSING_Y, 0, 0.2, 0.14, 10);
    // Tres engranajes planetarios de alta velocidad, separados 120° alrededor del sol.
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      gearAt(
        pinionSpinners[k].group,
        -1.4,
        HOUSING_Y + Math.cos(a) * 0.34,
        Math.sin(a) * 0.34,
        0.11,
        0.3,
        8
      );
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      gearAt(lowPlanetSpinners[k].group, -1.08, HOUSING_Y + Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.13, 0.34, 8);
    }
    // Ring-gear hint (static torus around the pinion set).
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.47, 0.05, 10, 24),
      darkSteel
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(-1.4, HOUSING_Y, 0);
    scene.add(ring);
    // Rotor barrel volume inside the motor housing + end rings.
    const rotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 1.2, 20),
      rotorMat
    );
    rotor.rotation.z = Math.PI / 2;
    rotor.position.set(0, HOUSING_Y, 0);
    spinners[1].group.add(rotor);
    for (const rx of [-0.6, 0.6]) {
      const endRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.37, 0.03, 10, 24),
        gearMat
      );
      endRing.rotation.y = Math.PI / 2;
      endRing.position.set(rx, HOUSING_Y, 0);
      spinners[1].group.add(endRing);
    }
    // ---- GDY106 Fig.95 chain extension (manual-faithful order) ----
    // High-speed carrier disc on the drive shaft, sun pinion GE1288 (the
    // spinning sun gear above is the GE1288 pinion), low-speed carrier plate
    // behind the planetaries, torque tube to the outboard side, wheel hub on
    // inboard/outboard tapered roller bearings, tire torus, wet brake discs
    // + spring parking-brake can. All low-poly, same PBR rule.
    const hsCarrier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.1, 18),
      gearMat
    );
    hsCarrier.rotation.z = Math.PI / 2;
    hsCarrier.position.set(-0.85, HOUSING_Y, 0);
    spinners[2].group.add(hsCarrier);
    const lsCarrier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.08, 20),
      gearMat
    );
    lsCarrier.rotation.z = Math.PI / 2;
    lsCarrier.position.set(-1.15, HOUSING_Y, 0);
    spinners[3].group.add(lsCarrier);
    const torqueTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 1.1, 14),
      gearMat
    );
    torqueTube.rotation.z = Math.PI / 2;
    torqueTube.position.set(0.75, HOUSING_Y, 0);
    scene.add(torqueTube);
    // Wheel hub + inboard/outboard tapered roller bearing cones.
    for (const [bx, br] of [[0.45, 0.26], [1.05, 0.3]] as Array<[number, number]>) {
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(br, br * 0.78, 0.12, 16),
        brass
      );
      cone.rotation.z = Math.PI / 2;
      cone.position.set(bx, HOUSING_Y, 0);
      scene.add(cone);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.7, 18),
      darkSteel
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0.75, HOUSING_Y, 0);
    scene.add(hub);
    // Tire torus outboard + wet brake discs + spring parking-brake can.
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.2, 12, 28),
      cableMat
    );
    tire.rotation.y = Math.PI / 2;
    tire.position.set(1.35, HOUSING_Y, 0);
    scene.add(tire);
    for (const bx of [1.18, 1.28]) {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.05, 20),
        gearMat
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.set(bx, HOUSING_Y, 0);
      scene.add(disc);
    }
    const springCan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12),
      brass
    );
    springCan.position.set(1.0, HOUSING_Y + 0.55, 0);
    scene.add(springCan);
    // Modified-cover oil transfer duct: thin tube from the outer cavity into
    // the sun inspection cover (items 39/36), through the sun pinion interior.
    const ductCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.9, HOUSING_Y - 0.45, 0.3),
      new THREE.Vector3(-1.95, HOUSING_Y + 0.1, 0.28),
      new THREE.Vector3(-1.4, HOUSING_Y + 0.2, 0.0),
      new THREE.Vector3(-0.9, HOUSING_Y, 0.0),
    ]);
    const duct = new THREE.Mesh(
      new THREE.TubeGeometry(ductCurve, 24, 0.025, 8),
      brass
    );
    scene.add(duct);

    // ---- Oil volume: fill slab inside the barrel ----
    // Height tracks the driven fill fraction (the <50% warning / <30%
    // critical bands of oil.ts are shown in the HUD). The slab tilts with
    // the settling wobble driven in the animation loop below.
    const oilMesh = new THREE.Mesh(oilPoolGeometry(oilLevelRef.current * CAPACITY_L), oilMat);
    oilMesh.position.set(-2.0, HOUSING_Y, 0);
    scene.add(oilMesh);

    // ---- Sensor markers: small emissive spheres (clickable) ----
    const markerMeshes: THREE.Mesh[] = [];
    for (const sensor of BENCH_SENSORS) {
      const mat = new THREE.MeshStandardMaterial({
        color: sensor.color,
        emissive: sensor.color,
        emissiveIntensity: 0.55,
        roughness: 0.3,
        metalness: 0.1,
      });
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 20, 16),
        mat
      );
      marker.position.set(...sensor.position);
      marker.userData.sensorId = sensor.id;
      scene.add(marker);
      markerMeshes.push(marker);
    }

    // Click (with drag guard so orbiting never selects).
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(markerMeshes, false)[0];
      const id = hit
        ? (hit.object.userData.sensorId as string)
        : null;
      if (id !== selectedRef.current) onSelectRef.current(id);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.style.cursor = "grab";

    // CSS2D sensor labels. Pressure + temperature markers sit close together
    // from the default camera, so each label gets a small vertical nudge
    // (pressure up, temperature down) to keep both readable.
    const LABEL_DY: Record<string, number> = {
      pressure: -14,
      temperature: 16,
    };
    const sensorLabels = BENCH_SENSORS.map((sensor) => {
      const label = createLabel({
        text: t(`bench.sensor.${sensor.id}.short` as DictKey, langRef.current),
        color: sensor.cssColor,
      });
      label.center.set(0, 0.5);
      label.element.style.marginLeft = "14px";
      label.element.style.marginTop = `${LABEL_DY[sensor.id] ?? 0}px`;
      label.position.set(...sensor.position);
      scene.add(label);
      return label;
    });

    // Sombras: todo proyecta y recibe salvo las carcasas translúcidas (si
    // proyectaran, oscurecerían los engranajes de adentro) y el aceite.
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m === floor || m.material === oilMat) return;
      if (m.material === housingMat || m.material === gearboxMat) return;
      if (markerMeshes.includes(m)) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });

    // Motion state: spin + slosh while moving; damped-sine wobble after a
    // move->rest transition, then still oil (recalibration window).
    let elapsed = 0;
    let prevMode: BenchMode = modeRef.current;
    let restStart = -10;
    let lastOilLitres = oilLevelRef.current * CAPACITY_L;
    const compactGearboxX = gearboxShell.position.x;
    const compactRingX = ring.position.x;
    const compactHubX = hub.position.x;
    const compactTireX = tire.position.x;

    const stopFrame = stage.onFrame((dt) => {
      elapsed += dt;
      const benchMode = modeRef.current;
      if (prevMode === "move" && benchMode === "rest") {
        restStart = elapsed;
      }
      prevMode = benchMode;

      let tilt: number;
      if (benchMode === "move") {
        // Churn: gear set spins, oil surface sloshes continuously.
        for (const s of spinners) s.group.rotation.x += dt * s.rate;
        for (const p of pinionSpinners) p.group.rotation.x += dt * p.rate;
        for (const p of lowPlanetSpinners) p.group.rotation.x += dt * p.rate;
        tilt =
          0.08 * Math.sin(elapsed * 7) + 0.03 * Math.sin(elapsed * 11.3);
      } else {
        // Rest: still gear set; wobble decays as a damped sine shaped by
        // the viscosity proxy (settling.ts), then the surface goes flat.
        const tRest = elapsed - restStart;
        tilt = tRest < 8 ? wobbleAt(tRest, viscosityRef.current) : 0;
      }
      oilMesh.rotation.x = tilt;
      const oilLitres = clamp01(oilLevelRef.current) * CAPACITY_L;
      if (Math.abs(oilLitres - lastOilLitres) > 0.05) {
        const previous = oilMesh.geometry;
        oilMesh.geometry = oilPoolGeometry(oilLitres);
        previous.dispose();
        lastOilLitres = oilLitres;
      }

      const spread = explodedRef.current ? 0.5 : 0;
      gearboxShell.position.x += (compactGearboxX - spread - gearboxShell.position.x) * 0.12;
      ring.position.x += (compactRingX - spread * 0.35 - ring.position.x) * 0.12;
      hub.position.x += (compactHubX + spread - hub.position.x) * 0.12;
      tire.position.x += (compactTireX + spread * 1.5 - tire.position.x) * 0.12;

      // Cutaway fades the housing shell so internals + oil stay visible.
      const shellTarget = cutawayRef.current ? 0.22 : 1;
      housingMat.opacity += (shellTarget - housingMat.opacity) * 0.15;
      gearboxMat.opacity += (shellTarget - gearboxMat.opacity) * 0.15;

      for (const marker of markerMeshes) {
        const active = marker.userData.sensorId === selectedRef.current;
        const target = active ? 1.5 : 1.0;
        marker.scale.setScalar(
          marker.scale.x + (target - marker.scale.x) * 0.2
        );
      }
      BENCH_SENSORS.forEach((sensor, i) => {
        setLabelText(
          sensorLabels[i],
          t(`bench.sensor.${sensor.id}.short` as DictKey, langRef.current)
        );
        setLabelActive(sensorLabels[i], sensor.id === selectedRef.current);
      });
    });

    return () => {
      stopFrame();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      stage.dispose();
      mats.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = hostRef.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", publishedAccessibilityCopy.label);
    canvas.setAttribute("aria-describedby", "wheel-scene-description");
  }, [publishedAccessibilityCopy.label, publishedAccessibilityCopy.caption]);

  const oilState = oilStateFor(clamp01(oilLevel));
  const oilCss = oilCssFor(oilState);
  const resting = mode === "rest";

  return (
    <div className="og-scene">
      <div ref={hostRef} className="og-scene__host" />
      <p id="wheel-scene-description" className="og-visually-hidden" aria-live="polite" aria-atomic="true">
        {publishedAccessibilityCopy.caption}
      </p>
      <div className="og-overlay">
        <div
          className="og-hud og-hud--tl"
          style={{ ["--tone" as string]: oilCss }}
        >
          <div className="og-hud__meta">{t("hud.oil", lang)}</div>
          <div className="og-hud__title">
            <span className="og-dot" />
            <span className="og-value og-value--lg" style={{ color: oilCss }}>
              {formatOilText(clamp01(oilLevel))}
            </span>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--og-body)" }}>
            {oilStateLabel(oilState, lang)}
          </div>
        </div>
        <div className="og-stack og-stack--tr">
          <div
            className={`og-badge ${resting ? "og-badge--ok" : "og-badge--ghost"}`}
            style={{ height: "auto", minHeight: 24, padding: "4px 10px", whiteSpace: "normal" }}
          >
            {resting ? t("hud.recal", lang) : t("hud.standby", lang)}
          </div>
          {badge}
        </div>
        {dock && <div className="og-dock">{dock}</div>}
      </div>
    </div>
  );
}
