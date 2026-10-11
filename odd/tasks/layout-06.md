# LAYOUT-06 — Remove reported text collisions and overflow

## Objective
Resolve the QA-OPENCODE-02 P1-01..P1-06 and P1-10 layout defects on Alerts, Lab Validation, Lab Simulation, Monitoring, and Dev UI without changing copy, data, thresholds, or other pages.

## Problem and why
At the specified widths, KPI labels and values collide, form labels become cramped, and Dev UI creates document horizontal overflow. The QA screenshots and DOM measurements are under `/tmp/og-goal/evidence/QA-OPENCODE-02/shots/`.

## Scope and constraints
- Only files authorized by `/tmp/og-goal/briefs/LAYOUT-06.md`: listed page CSS/markup, new adjacent `*.layout.test.ts` files, and this document. Do not touch `AGENTS.md` or shared shell/global styles.
- Preserve Spanish-only copy, existing design tokens, values, and behavior; use structural CSS only and no new dependency.
- TDD is on from `_rules.md`; runner: `cd frontend && bun test src`.
- Route: delegated direct; mapping spans five route areas and implementation/test work spans multiple non-trivial files. Skill: Impeccable layout/Operate.
- Estimated authored change: about 220 lines; delivery strategy: `ask-on-risk`.
- Engram mirror pending because no authoritative runtime session identity or memory tools are available.

## Acceptance criteria
- Reproduce and record before collision counts at Alerts 1024/390, Validation 1440, Lab Simulation 1024, Monitoring 1024, and Dev UI 390 using a scratch leaf-text intersection probe.
- Structural tests fail before the layout changes and pass afterward.
- After counts are zero for each specified route/viewport; screenshots are saved under `/tmp/og-goal/evidence/LAYOUT-06/`.
- Full frontend suite and build pass; no copy/data/threshold changes or out-of-scope edits.

## Tasks and progress
- [x] L06-1 Capture route/viewport baseline collision pairs and screenshots. `/tmp/og-goal/evidence/LAYOUT-06/collisions-before.txt`: Alerts 1024=12, Alerts 390=13, Validation 1440=2, Lab Simulation 1024=2, Monitoring 1024=1, Dev UI 390=0 pairs; Dev UI document width=453/390. Six before screenshots saved in `evidence/LAYOUT-06/shots/`.
- [x] L06-2 Add failing structural layout tests for each affected page and save RED evidence. `cd frontend && bun test src` exited 1 before layout changes: 652 pass, 6 fail (one or more route-contract assertions per affected area); full output is `/tmp/og-goal/evidence/LAYOUT-06/red.txt`.
- [ ] L06-3 Apply the smallest allowed CSS/markup fixes; preserve existing visual system and content.
- [ ] L06-4 Capture after collision counts/screenshots and run all required checks.
- [ ] L06-5 Create the requested test and fix commits; record commit IDs and RDD assessment outcomes.

## Verification
- `cd frontend && bun test src`; `cd frontend && bun run build`.
- Scratch probe: leaf text boxes intersecting by more than 2px on both axes; zero expected after fix.
- Impeccable layout detector before and after; explain any remaining finding.
- Keep RED, before/after collision counts, screenshots, and full verification output in `/tmp/og-goal/evidence/LAYOUT-06/`.

## Next step
Commit the tests and baseline evidence references; then continue with L06-3 layout changes only.
