import * as THREE from "three";

export function configureTransmissionRenderTargetMipmap(target: {
  samples: number;
  texture: THREE.Texture | THREE.Texture[];
}): boolean {
  if (Array.isArray(target.texture)) return false;

  const texture = target.texture;
  if (
    target.samples !== 4 ||
    !texture.generateMipmaps ||
    texture.minFilter !== THREE.LinearMipmapLinearFilter
  ) {
    return false;
  }

  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return true;
}
