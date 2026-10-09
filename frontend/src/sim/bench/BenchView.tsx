import { useState } from "react";
import BenchScene, { type BenchMode } from "./BenchScene";
import { BENCH_SENSORS, ENV_NOTE, NO_DRILL_NARRATIVE } from "./sensors";
import {
  formatOilText,
  oilCssFor,
  oilStateFor,
  oilStateLabel,
} from "./oil";
import {
  VISC_MAX,
  VISC_MIN,
  VISC_NOMINAL,
  estimateSettlingMs,
  viscosityLabel,
} from "./settling";

// T3 bench view (Sim A, part 2 of 2): cutaway internals + oil volume +
// settling transient, driven by Oil + Viscosity sliders and a Move/Rest
// toggle. Sensor markers + no-drill narrative carry over from T2.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function BenchView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [oilPct, setOilPct] = useState(70);
  const [viscosity, setViscosity] = useState(VISC_NOMINAL);
  const [mode, setMode] = useState<BenchMode>("rest");
  const [cutaway, setCutaway] = useState(true);

  const frac = clamp01(oilPct / 100);
  const oilState = oilStateFor(frac);
  const oilCss = oilCssFor(oilState);
  const settlingMs = estimateSettlingMs(viscosity);
  const resting = mode === "rest";

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "#9fb0c9" }}>
        S1 bench rig (T3): cutaway GDY106 housing with sun gear, planetary
        pinions, rotor barrel, and 95 L oil fill. Drag to orbit, scroll to
        zoom, click a marker (or a list entry) to highlight it. Move the
        rig, then stop it, and watch the oil surface wobble before it
        settles into the recalibration window.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 520px",
            minWidth: 320,
            border: "1px solid #2a3a55",
          }}
        >
          <BenchScene
            selectedId={selectedId}
            onSelect={setSelectedId}
            oilLevel={frac}
            viscosityProxy={viscosity}
            mode={mode}
            cutaway={cutaway}
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              padding: "12px 16px",
              borderTop: "1px solid #2a3a55",
              background: "#111a2c",
            }}
          >
            <label style={{ flex: "1 1 200px", fontSize: 13, color: "#c7d3e8" }}>
              Oil fill: {formatOilText(frac)}
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={oilPct}
                onChange={(e) => setOilPct(Number(e.target.value))}
                style={{ width: "100%", accentColor: oilCss }}
              />
            </label>
            <label style={{ flex: "1 1 200px", fontSize: 13, color: "#c7d3e8" }}>
              Viscosity proxy: {viscosity.toFixed(2)} ({viscosityLabel(viscosity)})
              <input
                type="range"
                min={VISC_MIN}
                max={VISC_MAX}
                step={0.05}
                value={viscosity}
                onChange={(e) => setViscosity(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#f5a623" }}
              />
            </label>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                paddingBottom: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setMode(resting ? "move" : "rest")}
                style={{
                  cursor: "pointer",
                  color: resting ? "#0e1420" : "#e8edf5",
                  background: resting ? "#2fbf71" : "#f5a623",
                  border: "1px solid transparent",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontWeight: 700,
                }}
              >
                {resting ? "Resting — start Move" : "Moving — stop to Rest"}
              </button>
              <label
                style={{
                  fontSize: 13,
                  color: "#c7d3e8",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  paddingBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={cutaway}
                  onChange={(e) => setCutaway(e.target.checked)}
                />
                Cutaway
              </label>
            </div>
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
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Oil readout</h2>
          <div
            style={{
              border: `1px solid ${oilCss}`,
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: oilCss }}>
              {formatOilText(frac)}
            </div>
            <div style={{ fontSize: 13, color: "#c7d3e8", marginTop: 4 }}>
              {oilStateLabel(oilState)} · 95 L reference
            </div>
            <div style={{ fontSize: 13, color: "#c7d3e8", marginTop: 4 }}>
              Settling ≈ {settlingMs} ms · viscosity proxy{" "}
              {viscosity.toFixed(2)} ({viscosityLabel(viscosity)})
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
                color: resting ? "#2fbf71" : "#8b98ad",
              }}
            >
              {resting
                ? "RECALIBRATING (stopped+leveled+engine-on)"
                : "Moving — recalibration gated"}
            </div>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            Sensor markers (no-drill)
          </h2>
          <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
            {BENCH_SENSORS.map((sensor) => {
              const active = sensor.id === selectedId;
              return (
                <li key={sensor.id} style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId(active ? null : sensor.id)
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "#e8edf5",
                      background: active ? "#1b2946" : "transparent",
                      border: `1px solid ${
                        active ? sensor.cssColor : "#2a3a55"
                      }`,
                      borderRadius: 6,
                      padding: "8px 10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: sensor.cssColor,
                        marginRight: 8,
                      }}
                    />
                    <strong>{sensor.label}</strong>
                    <br />
                    <span style={{ color: "#9fb0c9", fontSize: 13 }}>
                      {sensor.signal}
                    </span>
                    <br />
                    <span style={{ color: "#c7d3e8", fontSize: 13 }}>
                      {sensor.mount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            No-drill narrative
          </h2>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            {NO_DRILL_NARRATIVE}
          </p>
          <p
            style={{
              margin: 0,
              color: "#9fb0c9",
              fontSize: 13,
              borderTop: "1px solid #2a3a55",
              paddingTop: 12,
            }}
          >
            {ENV_NOTE}
          </p>
        </aside>
      </div>
    </div>
  );
}
