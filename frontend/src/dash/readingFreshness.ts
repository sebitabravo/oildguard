// Antigüedad de la lectura mostrada en el Dashboard (A02): el `stale: false`
// constante trataba cualquier lectura en vivo como fresca. El corte de
// 120 s (120_000 ms) no es física ni umbral de alerta: es el mismo corte de
// inactividad ya implementado en el inventario de dispositivos (`isStale` en
// platform/devices/logic.ts y DeviceInventoryPage.tsx, etiqueta
// "devices.stale": "Nodes stale > 120 s") y el que separan los fixtures
// DEMO (demo/demoData.ts, desde demo/demo-data.json: rueda "stale" con lastComm a -180 s,
// fresca a -8 s; demo/dataset.test.ts exige > 120 s en las obsoletas).
export const READING_STALE_AFTER_MS = 120_000;

export function isReadingStale(
  lastUpdateMs: number | null | undefined,
  nowMs: number,
  staleAfterMs: number = READING_STALE_AFTER_MS,
): boolean {
  // Sin marca temporal no hay telemetría reciente: obsoleto, sin inventar edad.
  if (lastUpdateMs === null || lastUpdateMs === undefined) return true;
  if (!Number.isFinite(lastUpdateMs) || !Number.isFinite(nowMs)) return true;
  return nowMs - lastUpdateMs > staleAfterMs;
}

// Estado obsoleto en la ruta de producción del Dashboard: solo la rueda en
// vivo fuera de la demo usa el reloj mural con la marca real del backend
// (`level.data.t_iso`, servido en backend/main.py desde la fila ingerida).
// La demo reproduce un recorrido sintético anclado a DEMO_REFERENCE_MS y las
// ruedas DEMO ya traen su validez del dataset, así que nunca se evalúan
// contra el reloj mural.
export function resolveReadingStale(input: {
  live: boolean;
  demoActive: boolean;
  lastUpdateMs: number | null;
  nowMs: number;
}): boolean {
  if (!input.live || input.demoActive) return false;
  return isReadingStale(input.lastUpdateMs, input.nowMs);
}
