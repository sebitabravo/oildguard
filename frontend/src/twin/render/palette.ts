// Paleta compartida de materiales: valores sRGB hex, fuente única para la
// escena 3D. Los tests fijan los rangos para que un cambio de color sea
// una decisión consciente.
export const PALETTE = {
  komatsuYellow: 0xf2b705,
  paintedSteelDark: 0x2a313c,
  machinedSteel: 0xbcc2cc,
  castIron: 0x3a3e45,
  rubberTire: 0x141414,
  glassTinted: 0x1c3a4a,
  oilAmber: 0xc9822a,
  oilAttenuation: 0x7a3d06,
  dirt: 0x7a5d3c,
  rock: 0x857260,
  studioFloor: 0x1a2230,
} as const;

export type PaletteKey = keyof typeof PALETTE;
