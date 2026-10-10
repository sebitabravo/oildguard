import { BACKEND_URL, type LevelSeriesResponse } from "../../sim/api";

export type ValidationSeriesResponse = Omit<LevelSeriesResponse, "series"> & {
  series: Array<LevelSeriesResponse["series"][number] & { truth_liters?: number | null }>;
};

/** Serie fusionada con las señales y, si las filas la traen, la verdad del generador (`truth_liters`). */
export async function getValidationSeries(deviceId: string, signal?: AbortSignal): Promise<ValidationSeriesResponse> {
  const query = `limit=2000&device_id=${encodeURIComponent(deviceId)}&signals=pressure_kpa,temperature_c,vib_rms_g`;
  const response = await fetch(`${BACKEND_URL}/level/series?${query}`, { signal });
  if (!response.ok) throw new Error(`GET /level/series -> ${response.status}`);
  return (await response.json()) as ValidationSeriesResponse;
}
