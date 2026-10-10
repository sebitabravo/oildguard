import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { buildSlug } from "./docs/links";

// La documentación vive en docs/ (raíz del repo, fuera de frontend/). El id conserva
// el sufijo .md para que las URLs coincidan con los enlaces de la landing.
const docs = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "../docs",
    generateId: ({ entry }) => buildSlug(entry),
  }),
});

export const collections = { docs };
