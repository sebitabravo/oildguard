import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { t, useLang } from "../i18n";

// Panel lateral con pestañas y colapso. Las vistas le pasan el contenido
// ya ordenado en pestañas (Estado / Ficha técnica / Notas).

export interface DrawerTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface DrawerProps {
  tabs: DrawerTab[];
  defaultOpen?: boolean;
  /** Pestaña pedida desde afuera (p. ej. una insignia que enlaza a la ficha técnica). */
  requestedTab?: { id: string; nonce: number };
}

export default function Drawer({ tabs, defaultOpen = true, requestedTab }: DrawerProps) {
  const [lang] = useLang();
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [seenNonce, setSeenNonce] = useState(0);
  if (requestedTab && requestedTab.nonce !== seenNonce) {
    // Ajuste de estado durante el render: se consume una vez por solicitud.
    setSeenNonce(requestedTab.nonce);
    setActive(requestedTab.id);
    setOpen(true);
  }
  const uid = useId();
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const idx = tabs.findIndex((tab) => tab.id === active);
    const next = (idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setActive(tabs[next].id);
    e.preventDefault();
  };

  return (
    <aside
      className={open ? "og-drawer" : "og-drawer og-drawer--closed"}
      aria-label={t("drawer.label", lang)}
    >
      <div className="og-drawer__bar">
        <button
          type="button"
          className="og-icon-btn"
          aria-expanded={open}
          aria-label={open ? t("drawer.collapse", lang) : t("drawer.expand", lang)}
          title={open ? t("drawer.collapse", lang) : t("drawer.expand", lang)}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "›" : "‹"}
        </button>
        {open && (
          <div role="tablist" className="og-drawer__tabs" onKeyDown={onKey}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${uid}-tab-${tab.id}`}
                aria-selected={tab.id === current?.id}
                aria-controls={`${uid}-panel`}
                tabIndex={tab.id === current?.id ? 0 : -1}
                className="og-drawer__tab"
                onClick={() => setActive(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {open && current && (
        <div
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${current.id}`}
          className="og-drawer__body"
          tabIndex={0}
        >
          {current.content}
        </div>
      )}
    </aside>
  );
}
