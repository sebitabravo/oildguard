import * as THREE from "three";

// Polvo de camino: puntos con tamaño y opacidad por partícula en un anillo de buffers
// fijo. Barato por diseño (un solo draw call, sin sombras, sin depth write).

export interface Dust {
  points: THREE.Points;
  /** Emite `n` partículas en `pos` con deriva `drift` (m/s). */
  emit(pos: THREE.Vector3, drift: THREE.Vector3, n: number, strength: number): void;
  update(dt: number): void;
  dispose(): void;
}

const VERT = `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * (320.0 / max(1.0, -mv.z));
}`;

const FRAG = `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float a = smoothstep(1.0, 0.1, r) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createDust(capacity = 700, color = 0xc9b48c): Dust {
  const pos = new Float32Array(capacity * 3);
  const size = new Float32Array(capacity);
  const alpha = new Float32Array(capacity);
  const vel = new Float32Array(capacity * 3);
  const age = new Float32Array(capacity).fill(1e9);
  const life = new Float32Array(capacity).fill(1);
  const base = new Float32Array(capacity);
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage);
  const alphaAttr = new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("aSize", sizeAttr);
  geo.setAttribute("aAlpha", alphaAttr);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2000);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uColor: { value: new THREE.Color(color) } },
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  let head = 0;
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  return {
    points,
    emit(p, drift, n, strength) {
      for (let k = 0; k < n; k++) {
        const i = head;
        head = (head + 1) % capacity;
        pos[i * 3] = p.x + (rnd() - 0.5) * 3;
        pos[i * 3 + 1] = p.y + 0.4 + rnd() * 0.8;
        pos[i * 3 + 2] = p.z + (rnd() - 0.5) * 3;
        vel[i * 3] = drift.x + (rnd() - 0.5) * 0.8;
        vel[i * 3 + 1] = 0.5 + rnd() * 0.9;
        vel[i * 3 + 2] = drift.z + (rnd() - 0.5) * 0.8;
        age[i] = 0;
        life[i] = 2.4 + rnd() * 1.6;
        base[i] = strength * (0.6 + rnd() * 0.4);
      }
    },
    update(dt) {
      for (let i = 0; i < capacity; i++) {
        if (age[i] > life[i]) {
          alpha[i] = 0;
          continue;
        }
        age[i] += dt;
        const f = age[i] / life[i];
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt * (1 - f * 0.7);
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        size[i] = 4 + f * 11;
        alpha[i] = base[i] * (1 - f) * Math.min(1, f * 8) * 0.55;
      }
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      points.removeFromParent();
    },
  };
}
