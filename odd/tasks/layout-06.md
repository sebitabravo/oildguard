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
- [x] L06-1 Capture route/viewport baseline collision pairs and screenshots. Comparable visible-text probe (excluding closed `<details>`, SVG text, and chart furniture per QA methods) in `/tmp/og-goal/evidence/LAYOUT-06/collisions-before.txt`: Alerts 1024=12, Alerts 390=0, Validation 1440=1, Lab Simulation 1024=1, Monitoring 1024=1, Dev UI 390=0; Dev UI document width=453/390. Original unfiltered baseline is preserved in `collisions-before-unfiltered.txt`; six comparable screenshots are in `visible-before/shots/`.
- [x] L06-2 Add failing structural layout tests for each affected page and save RED evidence. `cd frontend && bun test src` exited 1 before layout changes: 652 pass, 6 fail (one or more route-contract assertions per affected area); full output is `/tmp/og-goal/evidence/LAYOUT-06/red.txt`.
- [x] L06-3 Apply the smallest allowed CSS/markup fixes; preserve existing visual system and content. Alerts tiles now reflow and source badges wrap; validation metrics use three columns through 1500px; simulation fields stack through 1180px; wheel evidence lines wrap as separate rows; Dev UI constrains notice/banner content in a route-local wrapper.
- [x] L06-4 Capture after collision counts/screenshots and run all required checks. The same filtered visible-text probe reports zero pairs on all six target viewports; Dev UI document width is 390/390. Screenshots and counts: `/tmp/og-goal/evidence/LAYOUT-06/shots/*-after.png` and `collisions-after.txt`. `bun test src`: 659 pass, 0 fail; `bun run build`: exit 0; Impeccable layout detector: `[]`. Full output is saved in `bun-test.txt`, `build.txt`, and `impeccable-layout.txt`.
- [x] L06-5 Create and record the test/fix work-unit commits: `c86bfc6678b030cefcfaa89758db9738b1403855` and `8aad9e63e5699b89d5dfd232c34b95c4e4dfb018`. RDD assessment for the cumulative committed range from `84b8ee2`: medium, `review_due=false`, `under_budget` (353 changed lines); evidence: `assess-fix-commit.txt`. `_rules.md` caps subjects at 50 characters, so the Conventional subjects were shortened and page names retained in commit bodies.

## Verification
- `cd frontend && bun test src`; `cd frontend && bun run build`.
- Scratch probe: visible leaf text boxes intersecting by more than 2px on both axes; same exclusions and method used before/after; zero expected after fix.
- Impeccable layout detector before and after; explain any remaining finding.
- Keep RED, before/after collision counts, screenshots, and full verification output in `/tmp/og-goal/evidence/LAYOUT-06/`.

## Next step
No further implementation work remains. The final task-record closeout is committed separately as documentation.
