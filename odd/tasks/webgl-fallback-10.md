# WEBGL-FALLBACK-10 — Static poster when WebGL is unavailable

**Status: IMPLEMENTED — runtime checks passed; implementation commit pending.**

## Objective
Show an honest static fallback for `/mine` and `/wheel` when WebGL is unavailable, preserve non-WebGL controls, and prevent uncaught renderer errors.

## Problem and scope
The routes can leave a black viewport and throw when renderer creation fails. `/mine` uses `cycle.svg`; `/wheel` uses `assembly.svg` (reuse only). Authorized scope: the two scene mounts, moving/re-exporting the shared WebGL detector if needed, one Spanish dictionary caption, the fallback test, and this task file.

## Constraints and acceptance
Move `detectWebGL` to `frontend/src/ui/webgl.ts` and re-export it from landing because `sceneHost.ts` also imports story progress. Gate both mounts, show the selected poster plus the Spanish WebGL caption, catch renderer-creation failures, keep non-WebGL controls honest, and preserve working WebGL behavior. No image edits/downloads, physics/geometry/control changes, or `AGENTS.md` edits.

## Tasks, route, TDD, and checks
- [x] W10-1 — Audited assets; 2nd dispatch selected existing `cycle.svg` and `assembly.svg`.
- [x] W10-2 — Move/re-export detection; gate both scene mounts and catch renderer creation failures.
- [x] W10-3 — Add fallback tests; run frontend suite/build, browser checks, and detector.
- Route: delegated direct; mapping completed; one writer handles the multi-file implementation.
- TDD: on; runner `cd frontend && bun test src`; RED output at `/tmp/og-goal/evidence/WEBGL-FALLBACK-10/red.txt`.
- Results: 673 frontend tests pass; build exits 0 with 45 pages. At 1024×768, WebGL-disabled `/mine` and `/wheel` show `cycle.svg`/`assembly.svg` plus the Spanish caption; each has 0 console errors, 0 uncaught errors, and 0 canvases. Normal `/wheel` has 1 canvas and 0 console/uncaught errors.
- Screenshots: `mine-webgl-disabled.png`, `wheel-webgl-disabled.png`, `wheel-webgl-enabled.png` under `/tmp/og-goal/evidence/WEBGL-FALLBACK-10/`.
- Test commit: `f780a97`; implementation commit: `afc6d15`.
- Verification evidence: `/tmp/og-goal/evidence/WEBGL-FALLBACK-10/` (including detector result `[]`).
- Delivery: `ask-on-risk`; forecast under 200 authored lines. Engram mirror pending (memory tools/session identity unavailable).

## Next step
Task complete; delivery and any further review remain parent-owned.
