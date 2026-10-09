import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// Etiquetas CSS2D con estilo "pill" consistente (clases en theme.css).

export type LabelTone = "neutral" | "ok" | "warn" | "crit" | "move" | "accent";

export interface LabelOptions {
  text: string;
  tone?: LabelTone;
  /** Línea guía vertical desde la píldora hasta el punto 3D anclado. */
  leader?: boolean;
  interactive?: boolean;
  className?: string;
}

/** Composición pura de clases: testeable sin DOM. */
export function labelClassName(opts: Pick<LabelOptions, "tone" | "leader" | "interactive" | "className">): string {
  const parts = ["og-label"];
  parts.push(`og-label--${opts.tone ?? "neutral"}`);
  if (opts.leader) parts.push("og-label--leader");
  if (opts.interactive) parts.push("og-label--interactive");
  if (opts.className) parts.push(opts.className);
  return parts.join(" ");
}

/** Crea el CSS2DObject; con leader el ancla es el extremo inferior de la línea. */
export function createLabel(opts: LabelOptions): CSS2DObject {
  const el = document.createElement("div");
  el.className = labelClassName(opts);
  const pill = document.createElement("span");
  pill.className = "og-label__pill";
  pill.textContent = opts.text;
  el.appendChild(pill);
  if (opts.leader) {
    const line = document.createElement("span");
    line.className = "og-label__line";
    el.appendChild(line);
  }
  const obj = new CSS2DObject(el);
  if (opts.leader) obj.center.set(0.5, 1);
  return obj;
}

export function setLabelText(label: CSS2DObject, text: string): void {
  const pill = label.element.querySelector(".og-label__pill");
  if (pill) pill.textContent = text;
}
