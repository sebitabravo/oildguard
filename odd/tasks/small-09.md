# SMALL-09 — Favicon and developer-route production exclusion

**Status: COMPLETE — requested implementation and verification are committed.**

## Objective
Fix the favicon 404 (V3-025) and remove the unlinked developer UI from the production build (V3-024). The parent decision is to delete only `frontend/src/pages/dev/ui.astro`; preserve every component it imports. Since the page is no longer reachable, skip the 390px overflow fix (V3-020).

## Scope and acceptance
- Authorized: new `frontend/public/favicon.svg` recreated from the sidebar CSS mark; favicon link only in `frontend/src/layouts/BaseLayout.astro`; deletion of `frontend/src/pages/dev/ui.astro` only; one guard/build-output regression test; removal of the obsolete layout-only test with explicit user authorization; this task file.
- No Astro config changes, dependencies, `AGENTS.md` edits, or edits to imported developer-kit components. UI is Spanish-only.
- Acceptance: `/favicon.svg` returns 200 in dev and is linked from the base layout; production build has no `dist/dev/ui/index.html`; V3-020 is skipped because its page is deleted.

## Tasks, route, and checks
- [x] S09-1 — Added and linked an SVG favicon that matches the CSS mark's amber-to-deep-amber gradient, dark OG text, 4px radius (scaled in the SVG viewBox), and JetBrains Mono stack.
- [x] S09-2 — Captured RED, added the production guard test, deleted only the developer route, and removed its obsolete layout-only test with explicit user authorization.
- [x] S09-3 — Tests/build/route/favicon checks passed; skipped the 390px page screenshot because the route is deleted.
- Route: delegated direct for the multi-file implementation; one inline SVG-only fidelity correction after independent verification.
- TDD: on; source `_rules.md`; frontend runner `cd frontend && bun test src`.
- Checks: RED guard test; full tests; production build plus `dist/dev/ui` absence; dev favicon HTTP check; visual capture; diff check.
- Delivery: `ask-on-risk`; estimated authored change below 200 lines.

## Progress and verification evidence
The user amendments selected deletion of only `frontend/src/pages/dev/ui.astro`; imported components remain untouched and V3-020 is skipped. The obsolete `ui.layout.test.ts` tested only the removed page and was deleted with explicit authorization. An independent check found the first favicon rendition did not reproduce the CSS gradient/font stack; the SVG was corrected in a bounded follow-up.

- RED guard failure before route deletion: `/tmp/og-goal/evidence/SMALL-09/red.txt`.
- Initial suite and build: 670 pass / 0 fail in `/tmp/og-goal/evidence/SMALL-09/parent-bun-test.txt`; build exit 0 in `/tmp/og-goal/evidence/SMALL-09/build.txt`.
- Final suite: 670 pass / 0 fail in `/tmp/og-goal/evidence/SMALL-09/correction-bun-test.txt`; parent spot-check 670 pass / 0 fail in `/tmp/og-goal/evidence/SMALL-09/parent-correction-bun-test.txt`.
- Final build: exit 0, 45 pages in `/tmp/og-goal/evidence/SMALL-09/correction-build.txt`.
- Dist guard output: `ABSENT: frontend/dist/dev/ui/index.html` (`TEST_EXIT_CODE=1` is expected) in `/tmp/og-goal/evidence/SMALL-09/correction-dist-check.txt`.
- Dev favicon HTTP 200: `/tmp/og-goal/evidence/SMALL-09/favicon-curl.txt`; initial visual capture: `/tmp/og-goal/evidence/SMALL-09/favicon-chromium-256.png`.
- Final diff check: exit 0 in `/tmp/og-goal/evidence/SMALL-09/correction-diff-check.txt`.
- Implementation commits: `ffee386` (`fix(web): add favicon and exclude dev ui`); `e3ff5c8` (`fix(web): match favicon to sidebar mark`).
- Post-commit scoped RDD assessment for `e3ff5c8`: risk `medium`, `review_due=false`, reason `under_budget`; no review was due.
- Engram mirror pending because no memory tools or authoritative runtime session identity are available.

## Next step
No implementation work remains. Preserve the pre-existing `AGENTS.md` modification; do not stage it. Update the Engram mirror only when an authoritative runtime session identity and memory tools become available.
