import { describe, expect, test } from "bun:test";

const bunMock = (await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
    restore: () => void;
  };
}).mock;

interface HookSlot {
  value?: unknown;
  dependencies?: readonly unknown[];
  cleanup?: () => void;
}

const slots: HookSlot[] = [];
let cursor = 0;
let pendingEffects: Array<{ index: number; callback: () => void | (() => void) }> = [];

bunMock.module("preact/hooks", () => ({
  useState<T>(initial: T): [T, (next: T | ((previous: T) => T)) => void] {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { value: initial };
    return [
      slots[index].value as T,
      (next) => {
        const previous = slots[index].value as T;
        slots[index].value = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      },
    ];
  },
  useRef<T>(initial: T): { current: T } {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { value: { current: initial } };
    return slots[index].value as { current: T };
  },
  useEffect(callback: () => void | (() => void), dependencies?: readonly unknown[]): void {
    const index = cursor++;
    const previous = slots[index]?.dependencies;
    const changed = dependencies === undefined || !previous ||
      dependencies.length !== previous.length ||
      dependencies.some((value, i) => !Object.is(value, previous[i]));
    if (!changed) return;
    slots[index] ??= {};
    slots[index].dependencies = dependencies;
    pendingEffects.push({ index, callback });
  },
}));

const { useThrottledSceneAccessibility } = await import("./useThrottledSceneAccessibility");

describe("useThrottledSceneAccessibility", () => {
  test("cancels a delayed prior timer before queuing a newer announcement", () => {
    let now = 0;
    let nextTimerId = 1;
    const timers = new Map<number, { at: number; callback: () => void }>();
    const originalNow = Date.now;
    const originalWindow = globalThis.window;
    Date.now = () => now;
    globalThis.window = {
      setTimeout(callback: TimerHandler, delay?: number): number {
        const id = nextTimerId++;
        timers.set(id, { at: now + Number(delay ?? 0), callback: callback as () => void });
        return id;
      },
      clearTimeout(id: number): void {
        timers.delete(id);
      },
    } as unknown as Window & typeof globalThis;

    const render = (copy: { label: string; caption: string }) => {
      cursor = 0;
      pendingEffects = [];
      const value = useThrottledSceneAccessibility(copy);
      for (const { index, callback } of pendingEffects) {
        const slot = slots[index];
        slot.cleanup?.();
        slot.cleanup = callback() ?? undefined;
      }
      return value;
    };

    const runDueTimers = () => {
      for (const [id, timer] of [...timers]) {
        if (timer.at > now) continue;
        timers.delete(id);
        timer.callback();
      }
    };

    try {
      const first = { label: "first", caption: "first caption" };
      const queued = { label: "queued", caption: "queued caption" };
      const immediate = { label: "immediate", caption: "immediate caption" };
      const later = { label: "later", caption: "later caption" };

      render(first);
      now = 500;
      render(queued);

      // Los temporizadores del navegador pueden quedar vencidos mientras la página está en segundo plano.
      now = 1500;
      render(immediate);
      expect(render(immediate)).toEqual(immediate);

      // El temporizador anterior no debe publicar esta actualización antes de un segundo.
      now = 1550;
      expect(render(later)).toEqual(immediate);
      runDueTimers();
      expect(render(later)).toEqual(immediate);
    } finally {
      Date.now = originalNow;
      globalThis.window = originalWindow;
      bunMock.restore();
      slots.length = 0;
      cursor = 0;
      pendingEffects = [];
    }
  });
});
