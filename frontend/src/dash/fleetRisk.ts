export interface WheelProxyMetrics {
  oilLitres: number;
  temperatureC: number;
  vibrationMmS: number;
  currentA: number;
}

export type RiskChannel = "low-oil" | "high-temperature" | "high-vibration";

export interface CombinedRisk {
  alert: boolean;
  channels: RiskChannel[];
}

export const DEMO_RISK_THRESHOLDS = {
  lowOilLitres: 47.5,
  highTemperatureC: 90,
  highVibrationMmS: 7,
  channelsRequired: 2,
} as const;

export function evaluateCombinedRisk(metrics: WheelProxyMetrics): CombinedRisk {
  const channels: RiskChannel[] = [];
  if (metrics.oilLitres <= DEMO_RISK_THRESHOLDS.lowOilLitres) channels.push("low-oil");
  if (metrics.temperatureC >= DEMO_RISK_THRESHOLDS.highTemperatureC) channels.push("high-temperature");
  if (metrics.vibrationMmS >= DEMO_RISK_THRESHOLDS.highVibrationMmS) channels.push("high-vibration");
  return { alert: channels.length >= DEMO_RISK_THRESHOLDS.channelsRequired, channels };
}

export interface FleetWheelProxy {
  truckId: string;
  wheelId: string;
  oilLitres: number;
  temperatureC: number[];
  vibrationMmS: number[];
  currentA: number[];
}

export const DEMO_FLEET_WHEELS: FleetWheelProxy[] = [
  { truckId: "OG-01", wheelId: "FL", oilLitres: 70.2, temperatureC: [68, 69, 70, 71], vibrationMmS: [3.0, 3.1, 3.2, 3.1], currentA: [398, 402, 410, 406] },
  { truckId: "OG-01", wheelId: "FR", oilLitres: 69.8, temperatureC: [69, 70, 71, 71], vibrationMmS: [3.1, 3.2, 3.2, 3.3], currentA: [400, 405, 408, 411] },
  { truckId: "OG-01", wheelId: "RL", oilLitres: 68.9, temperatureC: [70, 71, 72, 73], vibrationMmS: [3.2, 3.4, 3.6, 3.7], currentA: [405, 412, 419, 421] },
  { truckId: "OG-01", wheelId: "RR", oilLitres: 69.1, temperatureC: [70, 71, 72, 73], vibrationMmS: [3.2, 3.3, 3.4, 3.5], currentA: [406, 410, 416, 418] },
  { truckId: "OG-03", wheelId: "FL", oilLitres: 68.4, temperatureC: [71, 72, 73, 74], vibrationMmS: [3.4, 3.5, 3.6, 3.7], currentA: [412, 416, 420, 424] },
  { truckId: "OG-03", wheelId: "FR", oilLitres: 68.1, temperatureC: [72, 73, 74, 75], vibrationMmS: [3.3, 3.5, 3.6, 3.8], currentA: [414, 419, 423, 428] },
  { truckId: "OG-03", wheelId: "RL", oilLitres: 67.8, temperatureC: [73, 74, 75, 76], vibrationMmS: [3.7, 3.8, 4.0, 4.1], currentA: [418, 423, 426, 431] },
  { truckId: "OG-03", wheelId: "RH", oilLitres: 46.8, temperatureC: [84, 86, 89, 91], vibrationMmS: [4.1, 4.3, 4.5, 4.7], currentA: [425, 432, 438, 443] },
  { truckId: "OG-05", wheelId: "FL", oilLitres: 69.5, temperatureC: [70, 71, 72, 73], vibrationMmS: [3.1, 3.2, 3.3, 3.4], currentA: [401, 408, 413, 419] },
  { truckId: "OG-05", wheelId: "FR", oilLitres: 69.1, temperatureC: [71, 72, 73, 74], vibrationMmS: [3.3, 3.4, 3.5, 3.7], currentA: [407, 412, 416, 422] },
  { truckId: "OG-05", wheelId: "RL", oilLitres: 68.7, temperatureC: [82, 85, 89, 93], vibrationMmS: [4.0, 4.8, 6.2, 7.2], currentA: [422, 430, 440, 451] },
  { truckId: "OG-05", wheelId: "RR", oilLitres: 69.0, temperatureC: [72, 73, 74, 75], vibrationMmS: [3.4, 3.5, 3.6, 3.7], currentA: [408, 414, 419, 424] },
];

export function latestWheelMetrics(wheel: FleetWheelProxy): WheelProxyMetrics {
  return {
    oilLitres: wheel.oilLitres,
    temperatureC: wheel.temperatureC.at(-1) ?? 0,
    vibrationMmS: wheel.vibrationMmS.at(-1) ?? 0,
    currentA: wheel.currentA.at(-1) ?? 0,
  };
}
