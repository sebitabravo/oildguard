# WEBGL-FALLBACK-10 — Static poster when WebGL is unavailable

**Status: IN PROGRESS — poster assets and fallback strategy approved.**

## Objective
Show an honest static fallback for `/mine` and `/wheel` when WebGL is unavailable, preserve non-WebGL controls, and prevent uncaught renderer errors.

## Problem and scope
The routes can leave a black viewport and throw when renderer creation fails. `/mine` uses `cycle.svg`; `/wheel` uses `assembly.svg` (reuse only). Authorized scope: the two scene mounts, moving/re-exporting the shared WebGL detector if needed, one Spanish dictionary caption, the fallback test, and this task file.

## Constraints and acceptance
Move `detectWebGL` to `frontend/src/ui/webgl.ts` and re-export it from landing because `sceneHost.ts` also imports story progress. Gate both mounts, show the selected poster plus the Spanish WebGL caption, catch renderer-creation failures, keep non-WebGL controls honest, and preserve working WebGL behavior. No image edits/downloads, physics/geometry/control changes, or `AGENTS.md` edits.

## Tasks, route, TDD, and checks
- [x] W10-1 — Audited assets; 2nd dispatch selected existing `cycle.svg` and `assembly.svg`.
- [ ] W10-2 — Add RED fallback tests, then move/re-export detection and gate both mounts.
- [ ] W10-3 — Run frontend tests/build, browser checks, detector, and record evidence.
- Route: delegated direct; mapping completed; one writer handles the multi-file implementation.
- TDD: on; runner `cd frontend && bun test src`; RED output at `/tmp/og-goal/evidence/WEBGL-FALLBACK-10/red.txt`.
- Verification evidence: `/tmp/og-goal/evidence/WEBGL-FALLBACK-10/`.
- Delivery: `ask-on-risk`; forecast under 200 authored lines. Engram mirror pending (memory tools/session identity unavailable).

## Next step
Commit the test and this task document first; pause for the parent’s scoped RDD assessment before source implementation.
