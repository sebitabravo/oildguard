export interface DustParameters {
  capacity: number;
  count: number;
  strength: number;
  dt: number;
}

const DEFAULT_CAPACITY = 700;
const MAX_CAPACITY = 4096;
const MAX_DT = 0.1;

const finiteOr = (value: number, fallback: number): number => (Number.isFinite(value) ? value : fallback);

export function shouldAdvanceDust(paused: boolean): boolean {
  return !paused;
}

export function stepDustFrame(paused: boolean, emitDust: () => void, updateDust: () => void): void {
  if (!shouldAdvanceDust(paused)) return;
  emitDust();
  updateDust();
}

export function normalizeDustParameters(
  capacity: number,
  count: number,
  strength: number,
  dt: number,
): DustParameters {
  const safeCapacity = Math.trunc(finiteOr(capacity, DEFAULT_CAPACITY));
  const boundedCapacity = Math.min(MAX_CAPACITY, Math.max(1, safeCapacity));
  return {
    capacity: boundedCapacity,
    count: Math.min(boundedCapacity, Math.max(0, Math.trunc(finiteOr(count, 0)))),
    strength: Math.min(1, Math.max(0, finiteOr(strength, 0))),
    dt: Math.min(MAX_DT, Math.max(0, finiteOr(dt, 0))),
  };
}

export interface DustParticleAppearance {
  age: number;
  size: number;
  alpha: number;
}

export function stepDustParticle(age: number, life: number, baseAlpha: number, dt: number): DustParticleAppearance {
  const nextAge = age + dt;
  if (!Number.isFinite(nextAge) || !Number.isFinite(life) || life <= 0 || nextAge >= life) {
    return { age: Number.isFinite(nextAge) ? nextAge : age, size: 4, alpha: 0 };
  }
  const fraction = Math.min(1, Math.max(0, nextAge / life));
  return {
    age: nextAge,
    size: 4 + fraction * 11,
    alpha: Math.max(0, baseAlpha) * (1 - fraction) * Math.min(1, fraction * 8) * 0.55,
  };
}
