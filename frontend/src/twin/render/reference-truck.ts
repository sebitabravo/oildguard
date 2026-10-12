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

export function fitReferenceTruckCamera(
  camera: PerspectiveCamera,
  bounds: Box3,
  screenMargin = 0.05,
): void {
  const target = bounds.getCenter(new Vector3());
  const direction = new Vector3(1, 0.42, 1).normalize();
  const forward = direction.clone().negate();
  const right = forward.clone().cross(camera.up).normalize();
  const cameraUp = right.clone().cross(forward).normalize();
  const ndcLimit = 1 - screenMargin * 2;
  const verticalTangent = Math.tan((camera.fov * Math.PI) / 360);
  const horizontalTangent = verticalTangent * camera.aspect;
  let distance = 0;

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const relative = new Vector3(x, y, z).sub(target);
        const depthOffset = relative.dot(forward);
        distance = Math.max(
          distance,
          Math.abs(relative.dot(right)) / (ndcLimit * horizontalTangent) - depthOffset,
          Math.abs(relative.dot(cameraUp)) / (ndcLimit * verticalTangent) - depthOffset,
        );
      }
    }
  }

  camera.position.copy(target).addScaledVector(direction, Math.max(distance * (1 + 1e-10), 0.01));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

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
  let modelBounds: Box3 | undefined;
  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (modelBounds) fitReferenceTruckCamera(camera, modelBounds);
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
    model.updateMatrixWorld(true);
    modelBounds = new Box3().setFromObject(model);
    fitReferenceTruckCamera(camera, modelBounds);
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
