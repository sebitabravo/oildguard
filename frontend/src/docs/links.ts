// Helpers puros de la sección /docs: slugs, rutas, reescritura de enlaces y títulos.

export type DocLink =
  | { kind: "doc"; href: string }
  | { kind: "anchor" | "external"; href: string }
  | { kind: "repo"; href?: undefined };

export function buildSlug(entry: string): string {
  return entry.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
}

export function docRoute(slug: string): string {
  return `/docs/${slug}`;
}

function dirname(slug: string): string[] {
  const parts = slug.split("/");
  parts.pop();
  return parts;
}

// Devuelve null cuando el destino sale de la carpeta docs/.
function resolveRelative(target: string, fromSlug: string): string | null {
  const out = dirname(fromSlug);
  for (const part of target.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length === 0) return null;
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out.join("/");
}

export function resolveDocLink(href: string, fromSlug: string): DocLink {
  if (href.startsWith("#")) return { kind: "anchor", href };
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return { kind: "external", href };

  const hashAt = href.indexOf("#");
  const path = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  // Solo los .md de docs/ se sirven en el sitio; el resto es referencia al repo.
  if (!path.toLowerCase().endsWith(".md")) return { kind: "repo" };

  const slug = resolveRelative(path, fromSlug);
  if (slug === null) return { kind: "repo" };
  return { kind: "doc", href: docRoute(slug) + hash };
}

export function docTitle(body: string | undefined, fallback: string): string {
  let inFence = false;
  for (const line of (body ?? "").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    const match = !inFence && /^#\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) return match[1];
  }
  return fallback;
}

// Astro 7 renderiza el markdown con Sätteri, que no admite plugins rehype sin dependencias
// nuevas; por eso los enlaces y las tablas se ajustan sobre el HTML ya generado.
export function rewriteDocHtml(html: string, fromSlug: string): string {
  return html
    .replace(/<a\b([^>]*?)\shref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (_match, before, href, after, inner) => {
      const link = resolveDocLink(href, fromSlug);
      if (link.kind === "repo") {
        return `<span class="docs-repo-ref" data-path="${href}">${inner}</span>`;
      }
      return `<a${before} href="${link.href}"${after}>${inner}</a>`;
    })
    .replace(/<table\b/g, '<div class="docs-table-wrap"><table')
    .replace(/<\/table>/g, "</table></div>");
}
