## Development

When starting the dev server, use background mode:

```
cd frontend && bunx astro dev --background
```

The Docker frontend service also serves `frontend/` on `:5173` through a bind mount; when it is running, start the local server with `--port 5174`.

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Code comments

Write code comments in Spanish, matching the existing codebase (`.astro`, `.ts`, `.tsx`, `.mjs`, CSS and HTML). Only comments that explain why survive; no line-by-line narration. Identifiers, commits and docs stay in English. UI copy is Spanish-only (see `odd/tasks/spanish-only.md`). Visible copy goes through the dictionary in `frontend/src/i18n/index.ts` (`t(key)`); do not add English strings or a `lang` argument.

Never use `document.querySelector` or `document.querySelectorAll` directly. Always use the `$` and `$$` utilities from `frontend/src/lib/dom-selector.ts` instead. No `@` path alias is configured, so import them with a relative path.

## Documentation

Full documentation: <https://docs.astro.build>

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using Preact and other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
