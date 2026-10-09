// T11 RUL panel (S6 slice).
//
// Hours / haul-cycles / shifts + confidence when the trend gate passes;
// the honest suppressed note (anomaly-only) otherwise — never a silent
// zero. Matches ai/rul.py gating + GET /rul shapes. Bilingual EN/ES.

import type { CSSProperties } from "preact";
import type { RulData } from "../sim/api";
import { t, useLang } from "../i18n";

const panel: CSSProperties = {
  border: "1px solid var(--og-line-dashboard)",
  borderRadius: 6,
  padding: "10px 12px",
  background: "var(--og-panel-inset)",
};

export default function RulPanel({ rul }: { rul: RulData | null }) {
  const [lang] = useLang();
  const es = lang === "es";
  if (!rul) {
    return (
      <div style={panel}>
        <strong>{t("rul.title", lang)}</strong>
        <p style={{ margin: "6px 0 0", color: "var(--og-muted)", fontSize: 13 }}>
          {t("rul.unavailable", lang)}
        </p>
      </div>
    );
  }
  if (rul.status !== "ok") {
    return (
      <div style={{ ...panel, borderColor: "var(--og-amber)" }}>
        <div style={{ fontWeight: 700 }}>
          {t("rul.suppressed", lang)}
        </div>
        <p style={{ margin: "6px 0", color: "var(--og-body)", fontSize: 13 }}>
          {es
            ? t(rul.model === "synthetic-proxy" ? "rul.syntheticNote" : "rul.suppressedNote", lang)
            : rul.note}
        </p>
        <p style={{ margin: 0, color: "var(--og-muted)", fontSize: 12 }}>
          {es ? "Modelo" : "Model"}={rul.model} ({t("rul.unproven", lang)}) ·{" "}
          {es ? "mostrar alertas de anomalía N1/N2/N4 en lugar de una cuenta regresiva." : "surface N1/N2/N4 anomaly alerts instead of a countdown."}
        </p>
      </div>
    );
  }
  return (
    <div style={{ ...panel, borderColor: "var(--og-green)" }}>
      <div style={{ fontWeight: 700 }}>
        {t("rul.title", lang)} ·{" "}
        <span style={{ color: "var(--og-green)" }}>
          {rul.hours} h {es ? "hasta crítico" : "to critical"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 8,
          fontSize: 13,
          color: "var(--og-body)",
        }}
      >
        <span>
          {es ? "advertencia en " : "warn in "}
          <strong style={{ color: "var(--og-text)" }}>{rul.hours_to_warning} h</strong>
        </span>
        <span>
          <strong style={{ color: "var(--og-text)" }}>{rul.haul_cycles}</strong>{" "}
          {es ? "ciclos (29 s)" : "haul cycles (29 s)"}
        </span>
        <span>
          <strong style={{ color: "var(--og-text)" }}>{rul.shifts}</strong>{" "}
          {es ? "turnos (8 h)" : "shifts (8 h)"}
        </span>
        <span>
          {es ? "confianza " : "confidence "}
          <strong style={{ color: "var(--og-text)" }}>{rul.confidence}</strong>
        </span>
      </div>
      <p style={{ margin: "8px 0 0", color: "var(--og-muted)", fontSize: 12 }}>
        {es ? "pendiente" : "slope"} {rul.slope_L_per_h} L/h · R² {rul.r2} · {es ? "nivel" : "level"} {rul.current_level_L} L ·
        {es ? "modelo" : "model"}={rul.model} ({es ? `${t("badge.proxy", lang)}, ${t("rul.unproven", lang)}` : "synthetic-proxy, UNPROVEN until the bench"})
      </p>
    </div>
  );
}
