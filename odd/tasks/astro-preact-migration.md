# Astro + Preact migration

## Objective
Replace the React 18 + Vite SPA in `frontend/` with Astro + Preact islands, so
static parts ship as HTML and each section only loads the JavaScript it needs.

## Problem / why
- Current bundle: one 205 KB gzip chunk; React + ReactDOM ~42 KB gzip of it.
- `monitoring` downloads three.js although it renders no 3D scene.
- The user expects future non-interactive content; Astro renders it with zero JS.

## Scope
- In: `frontend/` tooling, entry, routing, components (React to Preact), Dockerfile,
  `docker-compose.yml` frontend service, `frontend/README.md`.
- Out: simulation logic (`src/twin/**`, `src/sim/**/*.ts` non-UI), backend, visual redesign.
- Do not touch the uncommitted `frontend/src/twin/truck930e/build930E.ts` work.

## Constraints
- Behavior and visuals at parity with the React app.
- Legacy hash aliases (`#truck`, `#bench`, `#dash`, ...) keep working via redirect.
- Dev server stays on `0.0.0.0:5173` for Docker.
- Package manager: bun (no lockfile exists; `bun.lock` becomes the lockfile).
- Dependency versions verified against the registry, respecting a 3-day release cooldown.

## TDD
- Mode: off (no project or session configuration enables it).
- Runner: `bun test src` (from `frontend/`).

## Delivery
- Branch: `refactor/astro-preact` (from `feature/oilguard-sim`).
- Strategy: ask-on-risk.
- Writer: Codex (`gpt-6-luna`, effort max) in herdr pane `w1K:p2`; Claude orchestrates and verifies.

## Tasks
- [x] T1 Tooling swap: Astro + `@astrojs/preact`, React imports moved to Preact, one page
  hosting the current app as an island. Parity check. Route: delegated (Codex), writer trigger (2+ files).
- [x] T2 Per-section pages (`/mine`, `/wheel`, `/monitoring`), static shell layout, hash-alias
  redirects, three.js only on 3D pages. Route: delegated (Codex).
- [ ] T3 Docker, compose, README; bundle size per page measured against baseline. Route: delegated (Codex).

## Acceptance criteria
- `bun test src` green.
- `bun run build` (astro check + build) exits 0.
- No `react` / `react-dom` in the dependency tree.
- `/monitoring` page JS contains no three.js.
- Manual visual check of the three sections in the browser.

## Progress / evidence
- Baseline: `dist/assets/index-*.js` 205108 bytes gzip; react-dom 42396 bytes gzip.
- 2026-10-09 — T1 implementation committed as `206ab2a` (`refactor(frontend): migrate react to astro + preact`). The current `App` is mounted as one `client:only="preact"` island; `theme.css` and hash routing remain in place. Per-section pages were not added (T2).
- npm registry versions checked at 2026-10-09 11:09 UTC with the 72-hour release cooldown: Astro `7.3.5`, `@astrojs/preact` `6.0.5`, and Preact `10.29.8` are pinned exactly. Preact 10 is required by the adapter's `^10.6.5` peer range; Preact 11 is incompatible. `@astrojs/check` `0.9.10` is pinned to provide `astro check`; TypeScript remains `5.6.3`.
- `bun install`: exit 0; generated `frontend/bun.lock`.
- `bun test src`: exit 0; 122 passed, 0 failed (14 files, 112950 expectations).
- `bun run build`: exit 0; Astro check reported 0 errors / 0 warnings / 4 hints, and Astro built 1 page. Vite emitted a non-blocking chunk-size warning (>500 kB); the full-app island is intentionally retained until T2.
- `rg -n "from \"react" src`: exit 1 with empty output (expected no matches). `frontend/bun.lock` contains no `react` or `react-dom` packages.
- The pre-existing local Impeccable live-script edit was moved from `frontend/index.html` to `frontend/src/layouts/BaseLayout.astro` and remains unstaged; it is excluded from commit `206ab2a`.
- Engram mirror: pending; no authoritative runtime session ID was supplied, so no attributed memory write was attempted.
- Claude's review of T1 commit `206ab2a` found that Preact range inputs need `onInput` for live drag updates. The two bench sliders were corrected while the checkbox remains on `onChange`, in `c6a13ec` (`fix(frontend): restore live slider updates in preact`). Claude reported `bun test src` and `bun run build` both green; delegated verification also passed both after the fix.
- 2026-10-09 — T2 implementation committed as `c1dfa40` (`refactor(frontend): split sections into astro pages`). `/` renders the default wheel section; `/mine`, `/wheel`, and `/monitoring` load independent section islands. The shared Astro layout owns the static header and language toggle; the existing `oilguard:lang` window event synchronizes the header and separate Preact roots. Legacy hashes map to page paths, including suffixed demo aliases.
- `bun test src`: exit 0; 126 passed, 0 failed, 112967 expectations across 14 files. Parent spot-check also passed with the same result.
- `bun run build`: exit 0; Astro check reported 0 errors, 0 warnings, and 5 hints; Astro built 4 pages. Vite emitted a non-blocking chunk-size warning (>500 kB).
- Built external JS gzip sizes from each page's full reachable chunk graph (inline scripts excluded; add 2547 gzip bytes per page for three inline scripts):

  | Route | Page-specific reachable JS chunks (gzip bytes) | Total external JS gzip bytes |
  |---|---|---:|
  | `/` and `/wheel` | `BenchView.B4hPiD-y.js` 8672; `HonestyBadge.BBURH5b8.js` 143370; `demoBus.C863TM-V.js` 454 | 165473 each |
  | `/mine` | `TruckView.D_IhOu75.js` 20636; `HonestyBadge.BBURH5b8.js` 143370; `cycle.D7vnwOAo.js` 1673 | 178656 |
  | `/monitoring` | `Dashboard.BaVMtoaE.js` 5861; `cycle.D7vnwOAo.js` 1673; `demoBus.C863TM-V.js` 454 | 20965 |

  Every route also reaches shared chunks `client.BUfN-eYz.js` (1516), `preact.module.Bl7PEaKa.js` (4413), `hooks.module.Dg9jNwZI.js` (1233), `jsxRuntime.module.Cw4i040A.js` (2755), `signals.module.D9-naAAZ.js` (2964), and `BaseLayout.astro_astro_type_script_index_1_lang.DmkoAs-p.js` (96). `/monitoring`'s complete reachable graph excludes `HonestyBadge.BBURH5b8.js` (the 143370-byte gzip chunk with a WebGL signature), `BenchView`, and `TruckView`; no Three.js/WebGL signatures were found in its reachable files. The BaseLayout module retains the local Impeccable script URL; that pre-existing live script remains unstaged and outside the commit.
- The cumulative RDD slice assessment from reviewed boundary `206ab2a` is medium risk, 12 changed paths / 349 lines, `review_due: false` (`under_budget`); it remains pending the slice budget. Untracked local files were explicitly excluded from assessment.
- Manual browser visual parity was not checked in this task; only build/test and emitted bundle graphs were verified.

## Next step
Proceed to T3 (Docker, Compose, README), with the T2 browser visual check still pending.
