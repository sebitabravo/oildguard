// T11 RUL panel (S6 slice).
//
// Hours / haul-cycles / shifts + confidence when the trend gate passes;
// the honest suppressed note (anomaly-only) otherwise — never a silent
// zero. Matches ai/rul.py gating + GET /rul shapes.

import type { RulData } from "../sim/api";

const panel: React.CSSProperties = {
  border: "1px solid #2a3a55",
  borderRadius: 6,
  padding: "10px 12px",
  background: "#0e1420",
};

export default function RulPanel({ rul }: { rul: RulData | null }) {
  if (!rul) {
    return (
      <div style={panel}>
        <strong>RUL</strong>
        <p style={{ margin: "6px 0 0", color: "#9fb0c9", fontSize: 13 }}>
          No RUL payload yet.
        </p>
      </div>
    );
  }
  if (rul.status !== "ok") {
    return (
      <div style={{ ...panel, borderColor: "#f5a623" }}>
        <div style={{ fontWeight: 700 }}>
          RUL suppressed ·{" "}
          <span style={{ color: "#f5a623" }}>anomaly-only</span>
        </div>
        <p style={{ margin: "6px 0", color: "#c7d3e8", fontSize: 13 }}>
          {rul.note}
        </p>
        <p style={{ margin: 0, color: "#9fb0c9", fontSize: 12 }}>
          model={rul.model} (UNPROVEN until S7 bench) · surface N1/N2/N4
          anomaly alerts instead of a countdown.
        </p>
      </div>
    );
  }
  return (
    <div style={{ ...panel, borderColor: "#2fbf71" }}>
      <div style={{ fontWeight: 700 }}>
        RUL · <span style={{ color: "#2fbf71" }}>{rul.hours} h to critical</span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 8,
          fontSize: 13,
          color: "#c7d3e8",
        }}
      >
        <span>
          warn in <strong style={{ color: "#e8edf5" }}>{rul.hours_to_warning} h</strong>
        </span>
        <span>
          <strong style={{ color: "#e8edf5" }}>{rul.haul_cycles}</strong> haul cycles (29 s)
        </span>
        <span>
          <strong style={{ color: "#e8edf5" }}>{rul.shifts}</strong> shifts (8 h)
        </span>
        <span>
          conf <strong style={{ color: "#e8edf5" }}>{rul.confidence}</strong>
        </span>
      </div>
      <p style={{ margin: "8px 0 0", color: "#9fb0c9", fontSize: 12 }}>
        slope {rul.slope_L_per_h} L/h · R² {rul.r2} · level {rul.current_level_L} L ·
        model={rul.model} (synthetic-proxy, UNPROVEN until S7 bench)
      </p>
    </div>
  );
}
