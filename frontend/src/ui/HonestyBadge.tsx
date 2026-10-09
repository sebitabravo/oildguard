import { useId, useState } from "preact/hooks";
import { t, useLang } from "../i18n";

// Insignia compacta de honestidad visual (SYNTHETIC-PROXY, modelo provisional):
// siempre visible, la nota completa se expande al hacer clic y vive en el title.

interface HonestyBadgeProps {
  label: string;
  text: string;
  /** Acción opcional dentro de la nota (p. ej. abrir la ficha técnica). */
  actionLabel?: string;
  onAction?: () => void;
}

export default function HonestyBadge({ label, text, actionLabel, onAction }: HonestyBadgeProps) {
  const [open, setOpen] = useState(false);
  const [lang] = useLang();
  const id = useId();
  return (
    <div className="og-honesty">
      <button
        type="button"
        className="og-badge og-badge--caution"
        aria-expanded={open}
        aria-controls={id}
        title={text}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">ⓘ</span> {label}
      </button>
      {open && (
        <div id={id} role="note" className="og-honesty__pop">
          <p>{text}</p>
          <div style={{ display: "flex", gap: 8 }}>
            {actionLabel && onAction && (
              <button
                type="button"
                className="og-btn og-btn--sm og-btn--primary"
                onClick={() => {
                  onAction();
                  setOpen(false);
                }}
              >
                {actionLabel}
              </button>
            )}
            <button type="button" className="og-btn og-btn--sm" onClick={() => setOpen(false)}>
              {t("badge.close", lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
