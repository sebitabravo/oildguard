import { useEffect, useRef } from "react";
import * as THREE from "three";

// S0 placeholder scene. A rotating box proves the Vite + React + Three.js
// pipeline works. Full Sim A (bench rig + GDY106 wheel internals) lands in
// S1 (T2/T3) and Sim B (930E truck + open-pit haul cycle) lands in S2 (T4/T5).
// See odd/tasks/oilguard-mining-sim.md for the feature plan.
export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1420);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(3, 2.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 1.0);
    directional.position.set(4, 6, 3);
    scene.add(directional);

    // Placeholder for the future GDY106 wheel / 930E truck geometry.
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      roughness: 0.4,
      metalness: 0.2,
    });
    const box = new THREE.Mesh(geometry, material);
    scene.add(box);

    const grid = new THREE.GridHelper(10, 10, 0x3a4a63, 0x223048);
    scene.add(grid);

    let frameId = 0;
    const animate = () => {
      box.rotation.x += 0.01;
      box.rotation.y += 0.015;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        color: "#e8edf5",
        background: "#0e1420",
        minHeight: "100vh",
        margin: 0,
        padding: 24,
      }}
    >
      <h1 style={{ margin: "0 0 8px" }}>OilGuard Mining Sim — S0 Stub</h1>
      <p style={{ margin: "0 0 16px", color: "#9fb0c9" }}>
        Placeholder Three.js canvas. Full Sim A (bench rig + wheel internals)
        arrives in S1 and Sim B (930E truck + haul cycle) arrives in S2.
      </p>
      <div
        ref={mountRef}
        style={{ width: "100%", height: 420, border: "1px solid #2a3a55" }}
      />
      <p style={{ color: "#9fb0c9" }}>
        Orbit note: drag-to-orbit (OrbitControls) is not wired in this S0 stub;
        the box auto-rotates. Orbit + camera presets land with the S1/S2 sim
        scenes.
      </p>
    </div>
  );
}
