import { useEffect, useRef, useState } from "preact/hooks";
import {
  canPublishSceneAccessibilityUpdate,
  SCENE_ACCESSIBILITY_UPDATE_INTERVAL_MS,
  type SceneAccessibilityCopy,
} from "./sceneAccessibility";

function sameCopy(left: SceneAccessibilityCopy, right: SceneAccessibilityCopy): boolean {
  return left.label === right.label && left.caption === right.caption;
}

export function useThrottledSceneAccessibility(copy: SceneAccessibilityCopy): SceneAccessibilityCopy {
  const [publishedCopy, setPublishedCopy] = useState(copy);
  const latestCopyRef = useRef(copy);
  latestCopyRef.current = copy;
  const publishedCopyRef = useRef(copy);
  const lastPublishedAtRef = useRef(Date.now());
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (sameCopy(publishedCopyRef.current, copy)) return;

    const now = Date.now();
    if (canPublishSceneAccessibilityUpdate(lastPublishedAtRef.current, now)) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      publishedCopyRef.current = copy;
      lastPublishedAtRef.current = now;
      setPublishedCopy(copy);
      return;
    }
    if (timeoutRef.current !== null) return;

    const elapsed = now - lastPublishedAtRef.current;
    timeoutRef.current = window.setTimeout(() => {
      const latest = latestCopyRef.current;
      if (!sameCopy(publishedCopyRef.current, latest)) {
        publishedCopyRef.current = latest;
        lastPublishedAtRef.current = Date.now();
        setPublishedCopy(latest);
      }
      timeoutRef.current = null;
    }, Math.max(0, SCENE_ACCESSIBILITY_UPDATE_INTERVAL_MS - elapsed));
  }, [copy.label, copy.caption]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  return publishedCopy;
}
