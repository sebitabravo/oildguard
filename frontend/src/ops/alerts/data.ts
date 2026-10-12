import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { demoDataset } from "../../demo/dataset";
import { getAlerts } from "../../sim/api";
import { loadWithTimeout } from "../../ui/backendOrDemo";
import {
  appendLocalAction, applyLocalActions, buildDemoAlerts, liveToRecord, mergeAlerts, nextLocalActionTime,
  parseLocalActions, type AlertRecord, type LifecycleAction, type LocalActionMap,
} from "./logic";

const STORAGE_KEY = "oilguard-alert-actions";

function readActions(): LocalActionMap {
  try {
    return parseLocalActions(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

function writeActions(actions: LocalActionMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch {
    // Sin almacenamiento la acción vive solo en memoria durante la sesión.
  }
}

export interface AlertData {
  records: AlertRecord[];
  demoRecords: AlertRecord[];
  liveCount: number;
  liveLoaded: boolean;
  act: (id: string, action: LifecycleAction) => void;
  resetActions: () => void;
}

export function useAlertData(): AlertData {
  const [actions, setActions] = useState<LocalActionMap>(readActions);
  const [live, setLive] = useState<AlertRecord[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const firstSeen = useRef(new Map<string, number>());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await loadWithTimeout(() => getAlerts());
        if (!active) return;
        const now = Date.now();
        const records = (response.status === "ok" ? response.data.alerts : []).flatMap((alert) => {
          // Se conserva la primera observación para que la antigüedad crezca entre sondeos.
          const seen = firstSeen.current.get(alert.alert_id) ?? now;
          firstSeen.current.set(alert.alert_id, seen);
          const payload = alert as typeof alert & { action?: unknown; recipient?: unknown };
          const record = liveToRecord(alert, seen, { action: payload.action, recipient: payload.recipient });
          return record ? [record] : [];
        });
        setLive(records);
        setLiveLoaded(true);
      } catch {
        if (active) {
          setLive([]);
          setLiveLoaded(true);
        }
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const baseDemo = useMemo(() => buildDemoAlerts(demoDataset), []);
  const demoRecords = useMemo(
    () => baseDemo.map((record) => applyLocalActions(record, actions[record.id])),
    [baseDemo, actions],
  );
  const records = useMemo(() => mergeAlerts(live, demoRecords), [live, demoRecords]);

  const act = useCallback((id: string, action: LifecycleAction) => {
    setActions((current) => {
      const next = appendLocalAction(current, id, action, nextLocalActionTime(current));
      writeActions(next);
      return next;
    });
  }, []);

  const resetActions = useCallback(() => {
    writeActions({});
    setActions({});
  }, []);

  return { records, demoRecords, liveCount: live.length, liveLoaded, act, resetActions };
}
