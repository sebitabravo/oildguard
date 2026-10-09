export interface WheelUrlState {
  sensorId: string | null;
  oilLitres: number;
  mode: "move" | "rest";
  cutaway: boolean;
  exploded: boolean;
}

export function parseWheelUrl(search: string): WheelUrlState {
  const params = new URLSearchParams(search);
  const oilParam = params.get("oil");
  const rawOil = oilParam === null ? Number.NaN : Number(oilParam);
  return {
    sensorId: params.get("sensor"),
    oilLitres: Number.isFinite(rawOil) ? Math.min(95, Math.max(0, rawOil)) : 66.5,
    mode: params.get("mode") === "move" ? "move" : "rest",
    cutaway: params.get("cutaway") !== "0",
    exploded: params.get("exploded") === "1",
  };
}
