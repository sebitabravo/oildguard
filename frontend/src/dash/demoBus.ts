// T11 demo link bus (S6 slice).
//
// One-click demo scenario drives BOTH the dashboard alerts and the 3D oil
// fill: Dashboard emits DEMO_OIL_EVENT with the staged fill fraction and
// BenchView listens and syncs its oil slider. Decoupled via window events
// so neither tab needs to mount the other.

export type DemoStageId = "idle" | "clean" | "slow-leak" | "abrupt-drop" | "done";

export interface DemoOilDetail {
  /** Driven fill fraction 0..1 against the 95 L reference. */
  frac: number;
  stage: DemoStageId;
}

export const DEMO_OIL_EVENT = "oilguard:demo-oil";

export function emitDemoOil(frac: number, stage: DemoStageId): void {
  const clamped = Math.min(1, Math.max(0, frac));
  window.dispatchEvent(
    new CustomEvent<DemoOilDetail>(DEMO_OIL_EVENT, {
      detail: { frac: clamped, stage },
    })
  );
}

export function parseDemoOil(e: Event): DemoOilDetail | null {
  const detail = (e as CustomEvent<DemoOilDetail>).detail;
  if (!detail || typeof detail.frac !== "number") return null;
  return detail;
}
