import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BENCH_SENSORS } from "./sensors";

// T2 bench-rig scene (Sim A, part 1 of 2).
// Steel test-rig frame + simplified GDY106 wheel/motor housing with four
// no-drill sensor markers. Physically-plausible proportions, NOT CAD-exact.
// Oil volume + settling-transient animation land in T3; this scene is the
// static rig + markers + labels.

interface BenchSceneProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const HOUSING_Y = 2.09; // motor axis height above ground

export default function BenchScene({ selectedId, onSelect }: BenchSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  // Refs mirror props for use inside the three.js effect (no re-subscribe).
  const selectedRef = useRef<string | null>(selectedId);
  selectedRef.current = selectedId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

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
    });
    const gearboxMat = new THREE.MeshStandardMaterial({
      color: 0x6b80a0,
      metalness: 0.25,
      roughness: 0.55,
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
        const y = (-proj.y * 0.5 + 0.5) * h;
        el.style.display = visible ? "block" : "none";
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(12px, -50%)`;
      }
    };

    let frameId = 0;
    const animate = () => {
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
            {sensor.shortLabel}
          </div>
        ))}
      </div>
    </div>
  );
}
