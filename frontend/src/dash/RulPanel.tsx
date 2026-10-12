// T11 RUL panel (S6 slice).
//
// Hours / haul-cycles / shifts + confidence when the trend gate passes;
// the honest suppressed note (anomaly-only) otherwise — never a silent
// zero. Matches ai/rul.py gating + GET /rul shapes. Bilingual EN/ES.

import type { CSSProperties } from "preact";
import type { RulData } from "../sim/api";
import { t } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { localizeBackendMessage } from "./backendNotes";
import { localizeUnevaluatedReason } from "./evaluationReason";
import { classifyRulHorizon } from "./rulHorizon";

const panel: CSSProperties = {
  border: "1px solid var(--og-line-dashboard)",
  borderRadius: "var(--og-radius-panel)",
  padding: "10px 12px",
  background: "var(--og-panel-inset)",
};

export default function RulPanel({
  rul,
  analyzerUnavailable = false,
  evaluationReason,
}: {
  rul: RulData | null;
  analyzerUnavailable?: boolean;
  evaluationReason?: string;
}) {
  const reasonCopy = localizeUnevaluatedReason(evaluationReason);
  const noteCopy = rul
    ? localizeBackendMessage(rul.note_message, rul.note)
    : undefined;
  const detailCopy = rul?.reason_message
    ? localizeBackendMessage(rul.reason_message, rul.reason ?? "")
    : undefined;
  if (analyzerUnavailable || rul?.status === "unavailable") {
    return (
      <div style={{ ...panel, borderColor: "var(--og-red)" }}>
        <strong>{t("rul.title")}</strong>
        <p style={{ margin: "6px 0 0", color: "var(--og-body)", fontSize: 13 }}>
          {analyzerUnavailable
            ? reasonCopy ?? t("dash.analyzer.unavailable")
            : rul?.note_message
              ? noteCopy
              : reasonCopy ?? t("dash.analyzer.unavailable")}
        </p>
      </div>
    );
  }
  if (!rul) {
    return (
      <div style={panel}>
        <strong>{t("rul.title")}</strong>
        <p style={{ margin: "6px 0 0", color: "var(--og-muted)", fontSize: 13 }}>
          {t("rul.unavailable")}
        </p>
      </div>
    );
  }
  if (rul.status !== "ok") {
    return (
      <div style={{ ...panel, borderColor: "var(--og-amber)" }}>
        <div style={{ fontWeight: 700 }}>
          {t("rul.suppressed")}
        </div>
        <p style={{ margin: "6px 0", color: "var(--og-body)", fontSize: 13 }}>
          {rul.note_message
            ? noteCopy
            : reasonCopy ?? (noteCopy?.trim() ? noteCopy : t("rul.suppressedNote"))}
        </p>
        {detailCopy && (
          <p style={{ margin: "0 0 6px", color: "var(--og-body)", fontSize: 13 }}>
            {detailCopy}
          </p>
        )}
        <p style={{ margin: 0, color: "var(--og-muted)", fontSize: 12 }}>
          {t("rul.panel.suppressedDetail", {
            model: rul.model === "synthetic-proxy" ? t("rul.model.syntheticProxy") : rul.model,
            qualifier: t("rul.unproven"),
          })}
        </p>
      </div>
    );
  }
  const horizon = ({
    critical: { color: "var(--og-red)", copy: "rul.panel.horizon.critical" },
    warning: { color: "var(--og-amber)", copy: "rul.panel.horizon.warning" },
    beyond: { color: "var(--og-green)", copy: "rul.panel.horizon.beyond" },
  } as const)[classifyRulHorizon(rul.hours_to_critical, rul.hours_to_warning)];

  return (
    <div style={{ ...panel, borderColor: horizon.color }}>
      <div style={{ fontWeight: 700 }}>
        {t("rul.title")} ·{" "}
        <span style={{ color: horizon.color }}>
          {t("rul.panel.hoursToCritical", { hours: formatNumber(rul.hours, 2) })}
        </span>{" "}
        <span role="status" style={{ color: horizon.color, fontSize: 12 }}>
          {t(horizon.copy)}
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
          {t("rul.panel.warningIn", { hours: formatNumber(rul.hours_to_warning, 2) })}
        </span>
        <span>
          {t("rul.panel.haulCycles", { cycles: formatNumber(rul.haul_cycles, 1) })}
        </span>
        <span>
          {t("rul.panel.shifts", { shifts: formatNumber(rul.shifts, 2) })}
        </span>
        <span>
          {t("rul.panel.confidenceValue", { confidence: formatNumber(rul.confidence, 3) })}
        </span>
        {rul.confidence_band.hours_to_critical_low !== null
          && rul.confidence_band.hours_to_critical_high !== null && (
            <>
              <span>
                {t("rul.panel.confidenceValue", {
                  confidence: `${formatNumber(rul.confidence_band.level * 100, 0)} %`,
                })}
              </span>
              <span>
                {t("rul.panel.hoursToCritical", {
                  hours: `${formatNumber(rul.confidence_band.hours_to_critical_low, 2)}–${formatNumber(rul.confidence_band.hours_to_critical_high, 2)}`,
                })}
              </span>
            </>
          )}
      </div>
      <p style={{ margin: "8px 0 0", color: "var(--og-muted)", fontSize: 12 }}>
        {t("rul.panel.summary", {
          slope: formatNumber(rul.slope_L_per_h, 3),
          r2: formatNumber(rul.r2, 3),
          level: formatNumber(rul.current_level_L, 3),
          model: rul.model === "synthetic-proxy" ? t("rul.model.syntheticProxy") : rul.model,
          qualifier: t("rul.unproven"),
        })}
      </p>
    </div>
  );
}
