export type TelemetryReading = {
  t_s: number;
  pressure_kpa: number;
  temperature_c: number;
  vib_rms_g: number;
  level_liters: number;
};

export function makeTelemetrySeries<T extends { t_s: number }>(rows: readonly T[], maxPoints: number): T[] {
  if (rows.length <= maxPoints || maxPoints < 2) return rows.slice(0, Math.max(0, maxPoints));
  return Array.from({ length: maxPoints }, (_, index) => rows[Math.round(index * (rows.length - 1) / (maxPoints - 1))]);
}
