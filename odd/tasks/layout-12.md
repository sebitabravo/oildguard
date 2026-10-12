# LAYOUT-12 — Responsive layout fixes

**Status: IMPLEMENTED — checks green; commit pending.**

## Objective
Fix mobile alert-card wrapping, breadcrumbs, chart tick spacing, and table scroll cues; preserve all content.

## Scope and constraints
Authorized files are limited to the LAYOUT-12 brief. Do not touch `AGENTS.md`, shared chart styles/components outside scope, or physics/visual tokens. UI remains Spanish-only; reuse `landing.tableScrollCue` where appropriate. Keep `/report` chart spacing scoped within the allowed `ReportPage.tsx` rather than changing shared chart styling.

## Tasks, route, TDD, and checks
- [x] W12-1 — Mapped affected routes and captured baseline screenshots/measurements.
- [x] W12-2 — Confirmed V3-004 validation tiles already wrap 3×2 with zero measured overflow/overlap.
- [x] W12-3 — Added failing layout contracts, then fixed V3-003, V3-009, V3-010, and V3-012 in the allowed files. V3-010 report spacing remains scoped in `ReportPage.tsx`.
- Route: delegated direct; 4+ files need mapping and the fixes span multiple pages/stylesheets.
- TDD: on; targeted RED captured in `/tmp/og-goal/evidence/LAYOUT-12/red.txt`; targeted GREEN 10 pass / 0 fail.
- Baseline evidence: `/tmp/og-goal/evidence/LAYOUT-12/`.
- Baseline: V3-003 3 card-label overflows; V3-004 0 tile overflow/overlap; V3-009 4/4 breadcrumbs clipped; V3-010 6 history and 4 report text overlaps; V3-012 2 wide tables and 0 scroll cues.
- After: V3-003 0 overflow / 0 text overlaps; V3-004 0 / 0 unchanged; V3-009 0/4 clipped; V3-010 0 history / 0 report overlaps; V3-012 cues present on both tables (fleet 1217/332 px; alerts 1227/332 px).
- Verification: `cd frontend && bun test src` 679 pass / 0 fail; `cd frontend && bun run build` exit 0; layout detector `[]` exit 0. Full outputs and after screenshots/measurements are under `/tmp/og-goal/evidence/LAYOUT-12/`.
- Acceptance: all content retained; mobile labels/crumbs/ticks do not clip or overlap; wide tables show a visible scroll cue; test suite and build pass.
- Delivery: local work-unit commits only on `feat/integrity-narrative`; no remote operations, PRs, or chain strategy per user. Run the full frontend suite and build before the first commit. Engram mirror pending (memory tools and authoritative session identity unavailable).

## Next step
Commit the verified work unit locally on `feat/integrity-narrative`; then report the commit identity for parent task tracking. Engram mirror remains pending because the tools and authoritative session identity are unavailable.
