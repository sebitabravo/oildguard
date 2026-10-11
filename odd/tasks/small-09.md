# SMALL-09 — Favicon and developer-route production exclusion

**Status: IMPLEMENTED — all requested checks are green; commit pending.**

## Objective
Fix the favicon 404 (V3-025) and remove the unlinked developer UI from the production build (V3-024). The parent decision is to delete only `frontend/src/pages/dev/ui.astro`; preserve every component it imports. Since the page will no longer be reachable, skip the 390px overflow fix (V3-020).

## Scope and acceptance
- Authorized: new `frontend/public/favicon.svg` recreated from the sidebar CSS mark; favicon link only in `frontend/src/layouts/BaseLayout.astro`; deletion of `frontend/src/pages/dev/ui.astro` only; one guard/build-output regression test; this task file.
- No Astro config changes, dependencies, `AGENTS.md` edits, or edits to imported developer-kit components. UI is Spanish-only.
- Acceptance: `/favicon.svg` returns 200 in dev and is linked from the base layout; production build has no `dist/dev/ui/index.html`; V3-020 is skipped because its page is deleted.

## Tasks, route, and checks
- [x] S09-1 — Added an SVG favicon using the sidebar colors and linked it from the base layout.
- [x] S09-2 — Captured RED, added the production guard test, deleted only the developer route, and removed its obsolete layout-only test with explicit user authorization.
- [x] S09-3 — Tests/build/route/favicon checks pass; skip the 390px page screenshot because the route is deleted.
- Route: delegated direct; read-only route/build/test mapping completed; one writer handles the multi-file implementation. The parent explicitly authorized deriving the SVG from the existing HTML/CSS mark.
- TDD: on; source `_rules.md`; frontend runner `cd frontend && bun test src`.
- Checks: RED guard test, full tests, production build plus `dist/dev/ui` absence, dev favicon HTTP check, and diff check.
- Delivery: `ask-on-risk`; estimated authored change below 200 lines.

## Progress and next step
The parent amendments select deletion of only `frontend/src/pages/dev/ui.astro`; imported components remain untouched and V3-020 is skipped. The favicon is recreated as `frontend/public/favicon.svg` from the sidebar CSS colors and linked in `BaseLayout.astro`. The obsolete `ui.layout.test.ts` tested only the deleted page and was removed with explicit user authorization. Evidence: RED `/tmp/og-goal/evidence/SMALL-09/red.txt`; parent spot-check `bun test src` 670 pass/0 fail `/tmp/og-goal/evidence/SMALL-09/parent-bun-test.txt`; build exit 0 `/tmp/og-goal/evidence/SMALL-09/build.txt`; `dist/dev/ui` absent `/tmp/og-goal/evidence/SMALL-09/dist-route.txt`; favicon SVG HTTP 200 `/tmp/og-goal/evidence/SMALL-09/favicon-curl.txt`; visual capture `/tmp/og-goal/evidence/SMALL-09/favicon-chromium-256.png`. Engram mirror pending because this runtime exposes no memory tools or registered session identity. Commit and post-commit RDD assessment remain pending.
