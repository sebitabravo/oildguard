import { t } from "../i18n";
import { Notice } from "./foundation";

// El título y el detalle permanecen en un único hijo para que el aviso envuelva como una sola unidad.
export default function BackendOutageNotice() {
  return (
    <div className="og-analyzer-notice" role="alert">
      <Notice kind="error">
        <span>
          <strong>{t("dash.backend.outage.title")}</strong>{" "}
          {t("dash.backend.outage.detail")}
        </span>
      </Notice>
    </div>
  );
}
