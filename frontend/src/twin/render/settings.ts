// Ajustes puros del stage (sin WebGL) para poder probarlos con bun test.

export type Quality = "low" | "medium" | "high";
export type StagePreset = "studio" | "outdoor";

export interface QualitySettings {
  pixelRatio: number;
  shadows: boolean;
  /** Lado del shadow map; 0 cuando las sombras están apagadas. */
  shadowMapSize: number;
}

export const MAX_PIXEL_RATIO = 2;

/** Resuelve calidad -> ajustes. 'low' fija ratio 1 y apaga sombras. */
export function resolveQuality(quality: Quality, devicePixelRatio: number): QualitySettings {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  switch (quality) {
    case "low":
      return { pixelRatio: 1, shadows: false, shadowMapSize: 0 };
    case "medium":
      return { pixelRatio: Math.min(dpr, MAX_PIXEL_RATIO), shadows: true, shadowMapSize: 1024 };
    default:
      return { pixelRatio: Math.min(dpr, MAX_PIXEL_RATIO), shadows: true, shadowMapSize: 2048 };
  }
}

/** Dirección unitaria hacia el sol; Y arriba, acimut medido desde +Z hacia +X. */
export function sunDirection(elevationDeg: number, azimuthDeg: number): [number, number, number] {
  const el = (elevationDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

export interface PresetDefaults {
  exposure: number;
  /** Intensidad de la luz del sol/key. */
  sunIntensity: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  /** Semilado de la caja de la cámara de sombra, en unidades de escena. */
  shadowBox: number;
  environmentIntensity: number;
  hemisphereIntensity: number;
}

export const PRESET_DEFAULTS: Record<StagePreset, PresetDefaults> = {
  studio: {
    exposure: 1.0,
    sunIntensity: 2.4,
    sunElevationDeg: 55,
    sunAzimuthDeg: 35,
    shadowBox: 6,
    environmentIntensity: 0.9,
    hemisphereIntensity: 0.25,
  },
  outdoor: {
    exposure: 0.55,
    sunIntensity: 3.2,
    sunElevationDeg: 34,
    sunAzimuthDeg: 135,
    shadowBox: 30,
    environmentIntensity: 0.55,
    hemisphereIntensity: 0.35,
  },
};
