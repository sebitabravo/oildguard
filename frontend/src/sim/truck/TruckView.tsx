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

// T4 truck view (Sim B, S2): 930E open-pit haul-cycle FSM with a state
// readout, wheel-speed narrative, and recalibration-window panel.

export default function TruckView() {
  const [current, setCurrent] = useState<HaulState>("LOAD");
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "#9fb0c9" }}>
        S2 truck sim (T4): a simplified 930E loops LOAD (6 s) → HAUL (12 s) →
        DUMP (6 s) → WAIT (5 s) around the pit. Drag to orbit, scroll to
        zoom. The WAIT pad sits on the return lane: the empty truck drives it
        back to the loader, so the RECAL badge follows measured stillness and
        stays gated while the truck moves.
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
          <p style={{ margin: 0, color: "#c7d3e8", fontSize: 13 }}>
            The HUD badge lights only when the truck is stopped + leveled +
            engine on (LOAD at the loader, DUMP at the crusher — the chassis
            never tilts, only the bed). HAUL and the WAIT return drive stay
            gated. S3/T7 consumes the same stillness signal for move/rest
            detection.
          </p>
        </aside>
      </div>
    </div>
  );
}
