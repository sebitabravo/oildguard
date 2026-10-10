export function clampLabelCenterX(
  anchorX: number,
  labelWidth: number,
  preferredCenter: number,
  boundsLeft: number,
  boundsRight: number,
): number {
  if (
    !Number.isFinite(anchorX) ||
    !Number.isFinite(labelWidth) ||
    labelWidth <= 0 ||
    !Number.isFinite(preferredCenter) ||
    !Number.isFinite(boundsLeft) ||
    !Number.isFinite(boundsRight) ||
    boundsRight <= boundsLeft
  ) {
    return preferredCenter;
  }

  const minCenter = (anchorX + labelWidth - boundsRight) / labelWidth;
  const maxCenter = (anchorX - boundsLeft) / labelWidth;
  const boundedMin = Math.max(0, minCenter);
  const boundedMax = Math.min(1, maxCenter);

  if (boundedMin <= boundedMax) {
    return Math.max(boundedMin, Math.min(boundedMax, preferredCenter));
  }

  return Math.max(0, Math.min(1, maxCenter));
}
