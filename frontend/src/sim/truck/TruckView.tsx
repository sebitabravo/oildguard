import { useState } from "react";
import TruckScene from "./TruckScene";
import {
  HAUL_DURATIONS,
  HAUL_ORDER,
  HAUL_STATE_BLURB,
  HAUL_STATE_CSS,
  isMovingState,
  isRecalState,
  type HaulState,
} from "./cycle";

// T4 truck view (Sim B, S2) + T5 modes/cameras polish: 930E open-pit
// haul-cycle FSM with a state readout, wheel-speed narrative, and
// recalibration-window panel. T5 adds moving/rest mode badges, camera
// presets (in-scene), and pause + 1 s step. WAIT stays a moving state: it is
// the empty return drive, so REST covers LOAD / DUMP only (documented).

export default function TruckView() {
  const [current, setCurrent] = useState<HaulState>("LOAD");
  const [paused, setPaused] = useState(false);
  const [stepTick, setStepTick] = useState(0);
  const [runId, setRunId] = useState(0);

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "#9fb0c9" }}>
        S2 truck sim (T4+T5): a simplified 930E loops LOAD (6 s) → HAUL
        (12 s) → DUMP (6 s) → WAIT (5 s) around the pit. Drag to orbit
        (releases the camera preset to free), scroll to zoom, or pick a
        preset (Pit / Cab / Side / Wheel) in the HUD panel. The truck glows
        blue while MOVING and green at REST; the RECAL badge lights only
        stopped + leveled + engine-on (LOAD / DUMP). The WAIT pad sits on
        the return lane: the empty truck drives it back to the loader, so
        WAIT counts as moving and recalibration stays gated until docking.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 520px",
            minWidth: 320,
            border: "1px solid #2a3a55",
          }}
        >
          <TruckScene
            key={runId}
            paused={paused}
            stepTick={stepTick}
            onPhase={setCurrent}
          />
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 16px",
              borderTop: "1px solid #2a3a55",
              background: "#111a2c",
            }}
          >
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              style={{
                cursor: "pointer",
                color: paused ? "#0e1420" : "#e8edf5",
                background: paused ? "#2fbf71" : "#f5a623",
                border: "1px solid transparent",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 700,
              }}
            >
              {paused ? "Resume cycle" : "Pause cycle"}
            </button>
            <button
              type="button"
              disabled={!paused}
              title={
                paused
                  ? "Advance the FSM clock 1 s"
                  : "Pause the cycle first, then step"
              }
              onClick={() => setStepTick((n) => n + 1)}
              style={{
                cursor: paused ? "pointer" : "not-allowed",
                color: "#e8edf5",
                background: "transparent",
                border: `1px solid ${paused ? "#f5a623" : "#3a4a63"}`,
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 600,
                opacity: paused ? 1 : 0.5,
              }}
            >
              Step +1s
            </button>
            <button
              type="button"
              onClick={() => setRunId((n) => n + 1)}
              style={{
                cursor: "pointer",
                color: "#e8edf5",
                background: "transparent",
                border: "1px solid #f5a623",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 600,
              }}
            >
              Restart (LOAD)
            </button>
          </div>
        </div>
        <aside
          style={{
            flex: "1 1 280px",
            minWidth: 260,
            maxWidth: 380,
            border: "1px solid #2a3a55",
            padding: 16,
            background: "#111a2c",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Haul cycle</h2>
          <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
            {HAUL_ORDER.map((s) => {
              const active = s === current;
              const css = HAUL_STATE_CSS[s];
              return (
                <li
                  key={s}
                  style={{
                    marginBottom: 8,
                    border: `1px solid ${active ? css : "#2a3a55"}`,
                    borderRadius: 6,
                    padding: "8px 10px",
                    background: active ? "#1b2946" : "transparent",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: css,
                      marginRight: 8,
                    }}
                  />
                  <strong>
                    {s} · {HAUL_DURATIONS[s]} s ·{" "}
                    {isMovingState(s) ? "moving" : "stopped"}
                  </strong>
                  <br />
                  <span style={{ color: "#9fb0c9", fontSize: 13 }}>
                    {HAUL_STATE_BLURB[s]}
                  </span>
                  <br />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isRecalState(s) ? "#2fbf71" : "#8b98ad",
                    }}
                  >
                    {isRecalState(s) ? "RECAL window" : "recal gated"}
                  </span>
                </li>
              );
            })}
          </ul>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Wheel narrative</h2>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            Rotor up to 3000 RPM, wheel ≈92 RPM through the 32.62:1
            reduction. Canvas spin is illustrative (true speeds would alias
            at 60 fps). The rear-axle wheel pair glows amber: the two GDY106
            motorized units this project instruments.
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            Recalibration windows
          </h2>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            The HUD badge lights only when the truck is stopped + leveled +
            engine on (LOAD at the loader, DUMP at the crusher — the chassis
            never tilts, only the bed). HAUL and the WAIT return drive stay
            gated. S3/T7 consumes the same stillness signal for move/rest
            detection.
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            Modes + cameras (T5)
          </h2>
          <p style={{ margin: 0, color: "#c7d3e8", fontSize: 13 }}>
            MOVING (blue: HAUL + WAIT return) vs REST (green: LOAD / DUMP)
            follows the same live signal as the RECAL badge — WAIT is
            honestly moving, so REST never claims a rolling truck. Camera
            presets lerp position + target (Pit is static; Cab / Side /
            Wheel track the truck); dragging releases to free orbit.
            Pause freezes the FSM clock, Step advances it 1 s per press.
          </p>
        </aside>
      </div>
    </div>
  );
}
