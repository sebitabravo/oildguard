# ALERTS-POLISH-20 — clarify the seven-day disclosure and source split

- Objective: make the collapsed seven-day distribution discoverable and keep each level's live/demo split on one line.
- Why: the 1024px inbox screenshot shows a disclosure title without a cue and wrapped provenance counts.
- Scope: only the task-brief files, focused regression test, and this tracker; no value or data-source changes.
- Decision: keep the distribution collapsed; show “Ver distribución de siete días (22 alertas)” with a visible chevron.
- Constraints: Spanish-only UI; preserve existing values, badge meaning, and surrounding layout; do not touch `AGENTS.md`.
- TDD: enabled by `_rules.md`; runner is `cd frontend && bun test src`; capture RED before implementation.
- RDD: on by default (2026-10-12); assess each work-unit commit from the latest reviewed boundary.
- Route: delegated direct; mapping and multi-file writer triggers apply across component, CSS, dictionary, and regression test.
- Delivery: local commits only; use concise Conventional Commit subjects within the 50-character rule, staging explicit paths.
- Mirror: Engram unavailable without a registered runtime session identity; pending.

## Checklist
- [x] AP20-1 Add focused disclosure/split regression; RED: 705 pass, 2 fail (`red.txt`).
- [x] AP20-1 Implement visible collapsed summary/chevron and one-line split; values unchanged.
- [x] AP20-1 Verify: `bun test src` 707/0; `bun run build` 45 pages; honesty 3/0.
- [x] AP20-1 Capture `/alerts`: 1024px and 390px, no browser errors.
- [x] AP20-1 Commit test `1c769cd`; implementation/tracker commit recorded below.

## Acceptance and progress
- Acceptance: visible summary + chevron; each EN VIVO/DEMO split is a single element/line; all specified checks pass.
- Progress: implementation complete; source split stays grouped via a scoped nowrap modifier.
- RDD: `1c769cd` assessment corrected after inventory resolution: medium, not due (`under_budget`), 11 paths/254 lines.
- Evidence: `/tmp/og-goal/evidence/ALERTS-POLISH-20/{red.txt,test-src.txt,build.txt,honesty.txt,alerts-chromium-1024.png,alerts-chromium-390.png}`.
- Next: assess the implementation commit against `0c88f2c`; Engram mirror remains pending (no session ID).
