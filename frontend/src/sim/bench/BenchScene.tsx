import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  BENCH_SENSORS,
  GDY106_CHAIN_EN,
  GDY106_CHAIN_ES,
  OIL_DUCT_NARRATIVE,
  OIL_DUCT_NARRATIVE_ES,
} from "./sensors";
import { useLang } from "../../i18n";
import {
  formatOilText,
  oilColorFor,
  oilCssFor,
  oilStateFor,
  oilStateLabel,
} from "./oil";
import { wobbleAt } from "./settling";

// T2 bench-rig scene (Sim A, part 1 of 2) + T3 cutaway internals (part 2).
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
}

/** Oil fill slab geometry inside the barrel (scene units). */
const OIL_BOTTOM = 1.6;
const OIL_MIN_H = 0.04;
const OIL_MAX_H = 0.94;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const HOUSING_Y = 2.09; // motor axis height above ground

export default function BenchScene({
  selectedId,
  onSelect,
  oilLevel,
  viscosityProxy,
  mode,
  cutaway,
}: BenchSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1420);

    const camera = new THREE.PerspectiveCamera(
      45,
      host.clientWidth / host.clientHeight,
      0.1,
      100
    );
    camera.position.set(4.4, 3.4, 5.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    // Lights (T2 done criteria: ambient + directional).
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const directional = new THREE.DirectionalLight(0xffffff, 1.6);
    directional.position.set(4, 6, 3);
    scene.add(directional);

    // Ground grid.
    const grid = new THREE.GridHelper(10, 10, 0x3a4a63, 0x223048);
    scene.add(grid);

    // Shared materials. NOTE: metalness kept low on purpose — high-metal
    // PBR surfaces render near-black without an environment map, and T2
    // uses only ambient + directional lights (done criteria).
    const steel = new THREE.MeshStandardMaterial({
      color: 0x9aa6bb,
      metalness: 0.45,
      roughness: 0.4,
    });
    const darkSteel = new THREE.MeshStandardMaterial({
      color: 0x46566e,
      metalness: 0.3,
      roughness: 0.55,
    });
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x5b7ba6,
      metalness: 0.25,
      roughness: 0.55,
      transparent: true,
    });
    const gearboxMat = new THREE.MeshStandardMaterial({
      color: 0x6b80a0,
      metalness: 0.25,
      roughness: 0.55,
      transparent: true,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xd9b13b,
      metalness: 0.6,
      roughness: 0.35,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x1c2433,
      metalness: 0.2,
      roughness: 0.7,
    });

    const disposables: Array<{ dispose: () => void }> = [
      steel,
      darkSteel,
      housingMat,
      gearboxMat,
      brass,
      cableMat,
      grid.geometry,
      (grid as THREE.GridHelper).material as THREE.Material,
    ];
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
      disposables.push(mesh.geometry);
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
      disposables.push(mesh.geometry);
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
      disposables.push(rib.geometry);
    }
    box(1.1, 1.15, 1.15, gearboxMat, -1.4, HOUSING_Y, 0); // gearbox
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
    disposables.push(tAdapter.geometry);
    box(0.14, 0.1, 0.12, darkSteel, -1.4, 1.42, 0.47); // transducer body
    // Temperature probe where the magnetic plug was.
    const probe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16),
      brass
    );
    probe.position.set(0.45, 1.56, 0.3);
    scene.add(probe);
    disposables.push(probe.geometry);
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
    disposables.push(cable.geometry);
    box(0.2, 0.14, 0.14, darkSteel, 0.25, 2.6, 0); // junction box
    box(0.16, 0.12, 0.12, darkSteel, 1.0, 2.2, 0.45); // Hall clamp body

    // ---- T3 cutaway internals (simplified GDY106, NOT CAD-exact) ----
    // Sun gear on the motor axis inside the gearbox, three planetary
    // pinions around it, ring-gear hint, and the rotor barrel volume in the
    // motor housing. Low-poly cylinders + box teeth, same low-metalness
    // PBR rule as T2 (no environment map in this scene).
    const gearMat = new THREE.MeshStandardMaterial({
      color: 0x8f9db5,
      metalness: 0.3,
      roughness: 0.5,
    });
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0x7a6a4f,
      metalness: 0.3,
      roughness: 0.5,
    });
    const oilMat = new THREE.MeshStandardMaterial({
      color: oilColorFor(oilStateFor(clamp01(oilLevelRef.current))),
      emissive: oilColorFor(oilStateFor(clamp01(oilLevelRef.current))),
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
    });
    disposables.push(gearMat, rotorMat, oilMat);

    const spinGroup = (rate: number) => {
      const group = new THREE.Group();
      scene.add(group);
      return { group, rate };
    };
    const spinners = [
      spinGroup(3), // sun shaft + sun gear
      spinGroup(6), // rotor barrel (illustrative speed; real 3000 RPM aliases)
    ];
    const pinionSpinners = [spinGroup(-6), spinGroup(-6), spinGroup(-6)];
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
      disposables.push(disc.geometry);
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(thick * 0.9, 0.07, 0.09),
          gearMat
        );
        tooth.position.set(x, y + Math.cos(a) * (discR + 0.03), z + Math.sin(a) * (discR + 0.03));
        tooth.rotation.x = -a;
        parent.add(tooth);
        disposables.push(tooth.geometry);
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
    disposables.push(sunShaft.geometry);
    gearAt(spinners[0].group, -1.4, HOUSING_Y, 0, 0.2, 0.14, 10);
    // Three planetary pinions at 120° around the sun (carrier fixed).
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
    // Ring-gear hint (static torus around the pinion set).
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.47, 0.05, 10, 24),
      darkSteel
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(-1.4, HOUSING_Y, 0);
    scene.add(ring);
    disposables.push(ring.geometry);
    // Rotor barrel volume inside the motor housing + end rings.
    const rotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 1.2, 20),
      rotorMat
    );
    rotor.rotation.z = Math.PI / 2;
    rotor.position.set(0, HOUSING_Y, 0);
    spinners[1].group.add(rotor);
    disposables.push(rotor.geometry);
    for (const rx of [-0.6, 0.6]) {
      const endRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.37, 0.03, 10, 24),
        gearMat
      );
      endRing.rotation.y = Math.PI / 2;
      endRing.position.set(rx, HOUSING_Y, 0);
      spinners[1].group.add(endRing);
      disposables.push(endRing.geometry);
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
    spinners[0].group.add(hsCarrier);
    disposables.push(hsCarrier.geometry);
    const lsCarrier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.08, 20),
      gearMat
    );
    lsCarrier.rotation.z = Math.PI / 2;
    lsCarrier.position.set(-1.15, HOUSING_Y, 0);
    scene.add(lsCarrier);
    disposables.push(lsCarrier.geometry);
    const torqueTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 1.1, 14),
      gearMat
    );
    torqueTube.rotation.z = Math.PI / 2;
    torqueTube.position.set(0.75, HOUSING_Y, 0);
    scene.add(torqueTube);
    disposables.push(torqueTube.geometry);
    // Wheel hub + inboard/outboard tapered roller bearing cones.
    for (const [bx, br] of [[0.45, 0.26], [1.05, 0.3]] as Array<[number, number]>) {
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(br, br * 0.78, 0.12, 16),
        brass
      );
      cone.rotation.z = Math.PI / 2;
      cone.position.set(bx, HOUSING_Y, 0);
      scene.add(cone);
      disposables.push(cone.geometry);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.7, 18),
      darkSteel
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0.75, HOUSING_Y, 0);
    scene.add(hub);
    disposables.push(hub.geometry);
    // Tire torus outboard + wet brake discs + spring parking-brake can.
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.2, 12, 28),
      cableMat
    );
    tire.rotation.y = Math.PI / 2;
    tire.position.set(1.35, HOUSING_Y, 0);
    scene.add(tire);
    disposables.push(tire.geometry);
    for (const bx of [1.18, 1.28]) {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.05, 20),
        gearMat
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.set(bx, HOUSING_Y, 0);
      scene.add(disc);
      disposables.push(disc.geometry);
    }
    const springCan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12),
      brass
    );
    springCan.position.set(1.0, HOUSING_Y + 0.55, 0);
    scene.add(springCan);
    disposables.push(springCan.geometry);
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
    disposables.push(duct.geometry);

    // ---- T3 oil volume: fill slab inside the barrel ----
    // Height tracks the driven fill fraction; color follows the
    // <50% warning / <30% critical bands (oil.ts). The slab tilts with
    // the settling wobble driven in the animation loop below.
    const oilMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1, 0.9),
      oilMat
    );
    scene.add(oilMesh);
    disposables.push(oilMesh.geometry);

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
      disposables.push(marker.geometry, mat);
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

    // HTML overlay labels, positioned imperatively each frame (no re-render).
    // T5 fix: pressure + temperature markers sit close together from the
    // default camera, so their labels overlapped. Each label gets a small
    // vertical nudge (pressure up, temperature down) to keep both readable.
    const LABEL_DY: Record<string, number> = {
      pressure: -14,
      temperature: 16,
    };
    const proj = new THREE.Vector3();
    const placeLabels = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      for (const sensor of BENCH_SENSORS) {
        const el = labelRefs.current.get(sensor.id);
        if (!el) continue;
        proj.set(...sensor.position).project(camera);
        const visible = proj.z < 1;
        const x = (proj.x * 0.5 + 0.5) * w;
        const y = (-proj.y * 0.5 + 0.5) * h + (LABEL_DY[sensor.id] ?? 0);
        el.style.display = visible ? "block" : "none";
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(12px, -50%)`;
      }
    };

    // T3 motion state: spin + slosh while moving; damped-sine wobble
    // after a move->rest transition, then still oil (recalibration window).
    const clock = new THREE.Clock();
    let elapsed = 0;
    let prevMode: BenchMode = modeRef.current;
    let restStart = -10;
    let lastFrac = -1;

    let frameId = 0;
    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
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
        tilt =
          0.08 * Math.sin(elapsed * 7) + 0.03 * Math.sin(elapsed * 11.3);
      } else {
        // Rest: still gear set; wobble decays as a damped sine shaped by
        // the viscosity proxy (settling.ts), then the surface goes flat.
        const tRest = elapsed - restStart;
        tilt = tRest < 8 ? wobbleAt(tRest, viscosityRef.current) : 0;
      }
      oilMesh.rotation.z = tilt;

      // Oil fill height + threshold color follow the driven fraction.
      const frac = clamp01(oilLevelRef.current);
      if (frac !== lastFrac) {
        lastFrac = frac;
        const hex = oilColorFor(oilStateFor(frac));
        oilMat.color.setHex(hex);
        oilMat.emissive.setHex(hex);
      }
      const h = OIL_MIN_H + frac * (OIL_MAX_H - OIL_MIN_H);
      oilMesh.scale.y = h;
      oilMesh.position.set(0, OIL_BOTTOM + h / 2, 0);

      // Cutaway fades the housing shell so internals + oil stay visible.
      const shellTarget = cutawayRef.current ? 0.22 : 1;
      housingMat.opacity += (shellTarget - housingMat.opacity) * 0.15;
      gearboxMat.opacity += (shellTarget - gearboxMat.opacity) * 0.15;

      controls.update();
      for (const marker of markerMeshes) {
        const active = marker.userData.sensorId === selectedRef.current;
        const target = active ? 1.5 : 1.0;
        marker.scale.setScalar(
          marker.scale.x + (target - marker.scale.x) * 0.2
        );
      }
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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  const oilState = oilStateFor(clamp01(oilLevel));
  const oilCss = oilCssFor(oilState);
  const resting = mode === "rest";
  const [lang] = useLang();
  const chain = lang === "es" ? GDY106_CHAIN_ES : GDY106_CHAIN_EN;
  const ductNote = lang === "es" ? OIL_DUCT_NARRATIVE_ES : OIL_DUCT_NARRATIVE;

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
            fontSize: 13,
            fontWeight: 600,
            color: "#e8edf5",
            background: "rgba(10, 16, 28, 0.82)",
            border: `1px solid ${oilCss}`,
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: oilCss,
              marginRight: 8,
            }}
          />
          {lang === "es" ? "Aceite" : "Oil"} {formatOilText(clamp01(oilLevel))} · {oilStateLabel(oilState, lang)}
        </div>
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            color: resting ? "#0e1420" : "#8b98ad",
            background: resting ? "#2fbf71" : "rgba(10, 16, 28, 0.82)",
            border: `1px solid ${resting ? "#2fbf71" : "#3a4a63"}`,
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          {resting
            ? lang === "es"
              ? "RECALIBRANDO (detenido+nivelado+motor encendido)"
              : "RECALIBRATING (stopped+leveled+engine-on)"
            : lang === "es"
              ? "ESPERA · recalibracion bloqueada (en movimiento)"
              : "STANDBY · recalibration gated (moving)"}
        </div>
        <div
          title={ductNote}
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            maxWidth: 340,
            fontSize: 11,
            color: "#c7d3e8",
            background: "rgba(10, 16, 28, 0.82)",
            border: "1px solid #3a4a63",
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          {lang === "es" ? "Cadena GDY106 Fig.95: " : "GDY106 Fig.95 chain: "}
          {chain.slice(0, 4).join(" → ")} → …
        </div>
        {BENCH_SENSORS.map((sensor) => (
          <div
            key={sensor.id}
            ref={(el) => {
              if (el) labelRefs.current.set(sensor.id, el);
              else labelRefs.current.delete(sensor.id);
            }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              display: "block",
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight:
                sensor.id === selectedId ? 700 : 500,
              color: "#e8edf5",
              background: "rgba(10, 16, 28, 0.78)",
              border: `1px solid ${sensor.cssColor}`,
              borderRadius: 4,
              padding: "2px 8px 2px 6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: sensor.cssColor,
                marginRight: 6,
              }}
            />
            {lang === "es" ? sensor.shortLabelEs : sensor.shortLabel}
          </div>
        ))}
      </div>
    </div>
  );
}
