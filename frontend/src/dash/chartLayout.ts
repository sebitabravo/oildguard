export const BASE_WIDTH = 640;
const BASE_HEIGHT = 220;

export interface ChartLayout {
  width: number;
  height: number;
  scale: number;
  padding: { left: number; right: number; top: number; bottom: number };
}

export function chartLayoutForWidth(width: number): ChartLayout {
  const scale = width / BASE_WIDTH;
  return {
    width,
    height: BASE_HEIGHT * scale,
    scale,
    padding: {
      left: 44 * scale,
      right: 208 * scale,
      top: 34 * scale,
      bottom: 26 * scale,
    },
  };
}

// Variante "inline": etiquetas dentro del área de trazado, tamaño de texto fijo en px.
export function inlineLayoutForWidth(width: number): ChartLayout {
  return {
    width,
    height: Math.min(320, Math.max(200, width * 0.32)),
    scale: 1,
    padding: { left: 56, right: 16, top: 16, bottom: 30 },
  };
}
