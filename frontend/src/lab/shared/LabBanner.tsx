import type { Lang } from "../../i18n";
import { Icon, Notice } from "../../ui/foundation";
import "./lab.css";

export function LabBanner({ lang, title, detail }: { lang: Lang; title: string; detail: string }) {
  return (
    <div className="lab-banner" role="note">
      <Notice lang={lang} kind="warning">
        <Icon name="warning" />
        <span className="lab-banner__text">
          <strong>{title}</strong>
          <span>{detail}</span>
        </span>
      </Notice>
    </div>
  );
}
