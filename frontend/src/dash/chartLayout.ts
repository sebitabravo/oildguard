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
