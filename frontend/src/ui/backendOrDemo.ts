import { useEffect, useState } from "preact/hooks";
import { getHealth } from "../sim/api";

export type DataSource = "loading" | "live" | "demo";

export interface BackendOrDemoState<T> {
  source: DataSource;
  data: T | null;
  error: Error | null;
}

export function stateAfterLoad<T>(data: T, error: null | Error, demo: T): BackendOrDemoState<T> {
  return error
    ? { source: "demo", data: demo, error }
    : { source: "live", data, error: null };
}

export async function loadWithTimeout<T>(
  load: (signal?: AbortSignal) => Promise<T>,
  timeoutMs = 4_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(controller.signal),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("backend request timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function useBackendOrDemo<T>(
  load: () => Promise<T>,
  demo: T,
  intervalMs = 10_000,
  timeoutMs = 4_000,
): BackendOrDemoState<T> {
  const [state, setState] = useState<BackendOrDemoState<T>>({
    source: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await loadWithTimeout(load, timeoutMs);
        if (active) setState(stateAfterLoad(data, null, demo));
      } catch (error) {
        if (active) {
          setState(stateAfterLoad(
            demo,
            error instanceof Error ? error : new Error(String(error)),
            demo,
          ));
        }
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), intervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [demo, intervalMs, load, timeoutMs]);

  return state;
}

export type BackendState = "checking" | "live" | "demo";

export function useBackendState(timeoutMs = 4_000): BackendState {
  const [state, setState] = useState<BackendState>("checking");
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await loadWithTimeout((signal) => getHealth(signal), timeoutMs);
        if (active) setState("live");
      } catch {
        if (active) setState("demo");
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [timeoutMs]);
  return state;
}

export function backendStateLabel(state: BackendState): string {
  return state === "live"
    ? "Backend en vivo"
    : state === "demo"
      ? "Datos demo locales"
      : "Comprobando backend";
}
