// T11 RUL panel (S6 slice).
//
// Hours / haul-cycles / shifts + confidence when the trend gate passes;
// the honest suppressed note (anomaly-only) otherwise — never a silent
// zero. Matches ai/rul.py gating + GET /rul shapes. Bilingual EN/ES.

import type { CSSProperties } from "preact";
import type { RulData } from "../sim/api";
import { useLang } from "../i18n";

const panel: CSSProperties = {
  border: "1px solid #2a3a55",
  borderRadius: 6,
  padding: "10px 12px",
  background: "#0e1420",
};

export default function RulPanel({ rul }: { rul: RulData | null }) {
  const [lang] = useLang();
  const es = lang === "es";
  if (!rul) {
    return (
      <div style={panel}>
        <strong>{es ? "Vida util remanente (RUL)" : "RUL"}</strong>
        <p style={{ margin: "6px 0 0", color: "#9fb0c9", fontSize: 13 }}>
          {es ? "Sin datos RUL aun." : "No RUL payload yet."}
        </p>
      </div>
    );
  }
  if (rul.status !== "ok") {
    return (
      <div style={{ ...panel, borderColor: "#f5a623" }}>
        <div style={{ fontWeight: 700 }}>
          {es ? "RUL suprimido · " : "RUL suppressed · "}
          <span style={{ color: "#f5a623" }}>{es ? "solo anomalias" : "anomaly-only"}</span>
        </div>
        <p style={{ margin: "6px 0", color: "#c7d3e8", fontSize: 13 }}>
          {rul.note}
        </p>
        <p style={{ margin: 0, color: "#9fb0c9", fontSize: 12 }}>
          model={rul.model} ({es ? "NO PROBADO hasta el banco" : "UNPROVEN until the bench"}) ·{" "}
          {es ? "mostrar alertas N1/N2/N4 en vez de cuenta regresiva." : "surface N1/N2/N4 anomaly alerts instead of a countdown."}
        </p>
      </div>
    );
  }
  return (
    <div style={{ ...panel, borderColor: "#2fbf71" }}>
      <div style={{ fontWeight: 700 }}>
        {es ? "Vida util remanente (RUL)" : "RUL"} ·{" "}
        <span style={{ color: "#2fbf71" }}>
          {rul.hours} h {es ? "a critico" : "to critical"}
        </span>
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
          {es ? "aviso en " : "warn in "}
          <strong style={{ color: "#e8edf5" }}>{rul.hours_to_warning} h</strong>
        </span>
        <span>
          <strong style={{ color: "#e8edf5" }}>{rul.haul_cycles}</strong>{" "}
          {es ? "ciclos (29 s)" : "haul cycles (29 s)"}
        </span>
        <span>
          <strong style={{ color: "#e8edf5" }}>{rul.shifts}</strong>{" "}
          {es ? "turnos (8 h)" : "shifts (8 h)"}
        </span>
        <span>
          {es ? "conf " : "conf "}
          <strong style={{ color: "#e8edf5" }}>{rul.confidence}</strong>
        </span>
      </div>
      <p style={{ margin: "8px 0 0", color: "#9fb0c9", fontSize: 12 }}>
        slope {rul.slope_L_per_h} L/h · R² {rul.r2} · level {rul.current_level_L} L ·
        model={rul.model} ({es ? "sustituto sintetico, NO PROBADO hasta el banco" : "synthetic-proxy, UNPROVEN until the bench"})
      </p>
    </div>
  );
}
