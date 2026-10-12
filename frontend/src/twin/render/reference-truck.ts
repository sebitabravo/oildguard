import {
  AmbientLight,
  Box3,
  DirectionalLight,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
  type Mesh,
  type Object3D,
  type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const REFERENCE_TRUCK_URL = "/models/komatsu_hd-465-7eo.glb";
export const REFERENCE_TRUCK_ATTRIBUTION = {
  author: "drcrazzie",
  license: "CC-BY-4.0",
  source: "https://sketchfab.com/3d-models/komatsu-hd-465-7eo-2bf4dcd62e484f01bcb446af263bd65c",
} as const;

function disposeObject(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value && typeof value === "object" && "isTexture" in value && value.isTexture) {
          (value as Texture).dispose();
        }
      }
      material.dispose();
    }
  });
}

export function mountReferenceTruck(
  container: HTMLElement,
  onLoad: () => void,
  onError: (error: unknown) => void,
): () => void {
  const scene = new Scene();
  scene.background = null;
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(7, 4.5, 7);
  camera.lookAt(0, 1.2, 0);
  scene.add(new AmbientLight(0xffffff, 2.1));
  const key = new DirectionalLight(0xffffff, 3.2);
  key.position.set(5, 9, 6);
  scene.add(key);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);

  let disposed = false;
  let model: Object3D | undefined;
  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  void new GLTFLoader().loadAsync(REFERENCE_TRUCK_URL).then((gltf) => {
    if (disposed) {
      disposeObject(gltf.scene);
      return;
    }
    model = gltf.scene;
    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = 4.5 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    scene.add(model);

    const scaledHeight = size.y * scale;
    camera.position.set(7, Math.max(3, scaledHeight * 0.85), 7);
    camera.lookAt(0, scaledHeight * 0.38, 0);
    resize();
    onLoad();
  }).catch((error: unknown) => {
    if (!disposed) onError(error);
  });

  return () => {
    disposed = true;
    observer.disconnect();
    if (model) disposeObject(model);
    renderer.dispose();
    renderer.domElement.remove();
  };
}
