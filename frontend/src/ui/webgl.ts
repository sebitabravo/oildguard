import { h } from "preact";

export function detectWebGL(): boolean {
  // Guardia SSR: sin DOM no hay WebGL y la escena usa su póster estático.
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function createWebGLScene<T>(
  available: boolean,
  createRenderer: () => T,
  onUnavailable: () => void,
): T | null {
  if (!available) {
    onUnavailable();
    return null;
  }

  try {
    return createRenderer();
  } catch {
    onUnavailable();
    return null;
  }
}

type PosterAsset = string | { readonly src: string };

export function WebGLFallback({ poster, caption }: { poster: PosterAsset; caption: string }) {
  const posterSrc = typeof poster === "string" ? poster : poster.src;
  return h(
    "figure",
    {
      className: "og-webgl-fallback",
      style: {
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        margin: 0,
        overflow: "hidden",
        background: "var(--og-bg)",
      },
    },
    h("img", {
      src: posterSrc,
      alt: "",
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        opacity: 0.82,
      },
    }),
    h("figcaption", {
      className: "og-webgl-fallback__caption",
      role: "status",
      style: {
        position: "absolute",
        right: "16px",
        top: "16px",
        left: "16px",
        padding: "10px 12px",
        border: "1px solid var(--og-line)",
        borderRadius: "4px",
        color: "var(--og-text)",
        background: "rgba(11, 15, 20, 0.92)",
        textAlign: "center",
        fontSize: "13px",
      },
    }, caption),
  );
}
