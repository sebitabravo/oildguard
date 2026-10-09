import { useState } from "react";
import BenchScene from "./BenchScene";
import { BENCH_SENSORS, ENV_NOTE, NO_DRILL_NARRATIVE } from "./sensors";

// T2 bench-rig view (Sim A, part 1 of 2): 3D scene + side panel.
// Side panel carries the no-drill narrative + 120C/EMI note (documented,
// not built). Clicking a marker or a list entry selects the sensor.

export default function BenchView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "#9fb0c9" }}>
        S1 bench rig (T2): steel test frame + simplified GDY106 housing with
        the four no-drill sensor points. Drag to orbit, scroll to zoom, click a
        marker (or a list entry) to highlight it. Oil volume + settling
        animation arrive in T3.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 520px",
            minWidth: 320,
            border: "1px solid #2a3a55",
          }}
        >
          <BenchScene selectedId={selectedId} onSelect={setSelectedId} />
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
