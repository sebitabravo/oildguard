// T11 RUL panel (S6 slice).
//
// Hours / haul-cycles / shifts + confidence when the trend gate passes;
// the honest suppressed note (anomaly-only) otherwise — never a silent
// zero. Matches ai/rul.py gating + GET /rul shapes. Bilingual EN/ES.

import type { CSSProperties } from "preact";
import type { RulData } from "../sim/api";
import { t, useLang } from "../i18n";
import { localizeDashboardBackendText } from "./backendNotes";

const panel: CSSProperties = {
  border: "1px solid var(--og-line-dashboard)",
  borderRadius: 6,
  padding: "10px 12px",
  background: "var(--og-panel-inset)",
};

export default function RulPanel({
  rul,
  analyzerUnavailable = false,
}: {
  rul: RulData | null;
  analyzerUnavailable?: boolean;
}) {
  const [lang] = useLang();
  if (analyzerUnavailable || rul?.status === "unavailable") {
    return (
      <div style={{ ...panel, borderColor: "var(--og-red)" }}>
        <strong>{t("rul.title", lang)}</strong>
        <p style={{ margin: "6px 0 0", color: "var(--og-body)", fontSize: 13 }}>
          {t("dash.analyzer.unavailable", lang)}
        </p>
      </div>
    );
  }
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
          {rul.note.trim() ? localizeDashboardBackendText(rul.note, lang) : t("rul.suppressedNote", lang)}
        </p>
        <p style={{ margin: 0, color: "var(--og-muted)", fontSize: 12 }}>
          {t("rul.panel.suppressedDetail", lang, {
            model: rul.model === "synthetic-proxy" ? t("rul.model.syntheticProxy", lang) : rul.model,
            qualifier: t("rul.unproven", lang),
          })}
        </p>
      </div>
    );
  }
  return (
    <div style={{ ...panel, borderColor: "var(--og-green)" }}>
      <div style={{ fontWeight: 700 }}>
        {t("rul.title", lang)} ·{" "}
        <span style={{ color: "var(--og-green)" }}>
          {t("rul.panel.hoursToCritical", lang, { hours: rul.hours })}
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
          {t("rul.panel.warningIn", lang, { hours: rul.hours_to_warning })}
        </span>
        <span>
          {t("rul.panel.haulCycles", lang, { cycles: rul.haul_cycles })}
        </span>
        <span>
          {t("rul.panel.shifts", lang, { shifts: rul.shifts })}
        </span>
        <span>
          {t("rul.panel.confidenceValue", lang, { confidence: rul.confidence })}
        </span>
      </div>
      <p style={{ margin: "8px 0 0", color: "var(--og-muted)", fontSize: 12 }}>
        {t("rul.panel.summary", lang, {
          slope: rul.slope_L_per_h,
          r2: rul.r2,
          level: rul.current_level_L,
          model: rul.model === "synthetic-proxy" ? t("rul.model.syntheticProxy", lang) : rul.model,
          qualifier: t("rul.unproven", lang),
        })}
      </p>
    </div>
  );
}
