import { Icon, Notice } from "../../ui/foundation";
import "./lab.css";

export function LabBanner({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="lab-banner" role="note">
      <Notice kind="warning">
        <Icon name="warning" />
        <span className="lab-banner__text">
          <strong>{title}</strong>
          <span>{detail}</span>
        </span>
      </Notice>
    </div>
  );
}
