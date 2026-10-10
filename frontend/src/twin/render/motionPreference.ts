export interface MotionQueryEvent {
  matches: boolean;
}

export interface MotionQueryList {
  readonly matches: boolean;
  addEventListener(type: "change", listener: (event: MotionQueryEvent) => void): void;
  removeEventListener(type: "change", listener: (event: MotionQueryEvent) => void): void;
}

export interface ReducedMotionPreference {
  readonly reduced: boolean;
  dispose(): void;
}

export function resolveMotionAlpha(reduced: boolean, normalAlpha: number): number {
  return reduced ? 1 : normalAlpha;
}

export function observeReducedMotion(
  media: MotionQueryList,
  onChange?: (reduced: boolean) => void,
): ReducedMotionPreference {
  let reduced = media.matches;
  const handleChange = (event: MotionQueryEvent) => {
    reduced = event.matches;
    onChange?.(reduced);
  };
  media.addEventListener("change", handleChange);

  return {
    get reduced() {
      return reduced;
    },
    dispose() {
      media.removeEventListener("change", handleChange);
    },
  };
}
