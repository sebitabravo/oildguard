# Integrity narrative close-out

**Outcome: partial, not closed.** The implementation and recorded checks are substantial, but the human comprehension check and B11 visual sign-off remain open. The source record also documents an unreviewed range and two non-blocking review suggestions.

## Task register

`DONE` means the repository task record or captured evidence reports completion; it is not a claim of field performance. `GAP` means the task-specific evidence or commit identity could not be independently located in the captured record. Paths are repository-relative unless prefixed with `/tmp`.

| Task | Status | Commit | Verification evidence |
|---|---|---|---|
| A01 | DONE | `5122505` | `odd/tasks/integrity-narrative.md` §3.1; `/tmp/og-goal/evidence/AUD-01/` |
| A02 | DONE | `9a4d7a8` | `odd/tasks/integrity-narrative.md` §3.1; `/tmp/og-goal/evidence/AUD-01/` |
| A03 | DONE | `8ef515f` | `odd/tasks/integrity-narrative.md` §3.1; `/tmp/og-goal/evidence/AUD-01/` |
| A04 | DONE | `4ed5b1a` | `odd/tasks/integrity-narrative.md` §3.1; `docs/reports/front-a-integrity.md` |
| A05 | DONE | `b7df2af` | `odd/tasks/integrity-narrative.md` §3.1; `docs/reports/front-a-integrity.md` |
| A06 | DONE | `71e0719` | `odd/tasks/integrity-narrative.md` §3.1; `docs/reports/front-a-integrity.md` |
| A07 | DONE | `e116e53` | `odd/tasks/integrity-narrative.md` §3.1; `docs/calibration.md`; `docs/thesis-annex.md` |
| A08 | DONE | `e116e53` | `odd/tasks/integrity-narrative.md` §3.1; `docs/thesis-annex.md` |
| A09 | DONE | `dec47dc` | `odd/tasks/integrity-narrative.md` §3.1; `docs/feasibility.md` |
| A10 | DONE | `dec47dc` | `odd/tasks/integrity-narrative.md` §3.1; `odd/tasks/oilguard-pro-twin.md` |
| A11 | DONE | `4f735ef` | `odd/tasks/integrity-narrative.md` §3.1; `docs/bench/stress.md`; `tests/test_stress_deltas.py` |
| A12 | PARTIAL — raw scan / policy decision unresolved | `4f735ef` | `odd/tasks/integrity-narrative.md` §3.1; `docs/integrity-inventory.md`; `frontend/src/honesty.test.ts` |
| A13 | DONE | `a752832` | `docs/reports/front-a-integrity.md`; `/tmp/og-goal/evidence/AUD-01/parent-final-verification.txt` |
| S01–S06 | DONE (shared localization migration) | `8dc5f4f` | `odd/tasks/integrity-narrative.md` §3.1; full-suite/build summary in that record |
| B01 | DONE | `a752832` | `docs/research/landing-claims.md` |
| B02 | DONE (formal parent pass recorded) | `8dc5f4f` | `odd/tasks/integrity-narrative.md` §3.1; `d60dd75` parent pass record |
| B03 | DONE | `9e911c9` | `docs/bench/landing-performance.md`; `/tmp/og-goal/evidence/B09/` |
| B04 | DONE (formal parent pass recorded) | `8dc5f4f` | `d60dd75`; `/tmp/og-goal/evidence/B04-FIX/` |
| B05 | DONE (formal parent pass recorded) | `8dc5f4f` | `d60dd75`; source trace in `docs/research/landing-claims.md` |
| B06 | DONE (formal parent pass recorded) | `8dc5f4f` | `d60dd75`; `docs/research/landing-claims.md` |
| B07 | DONE (formal parent pass recorded) | `8dc5f4f` | `d60dd75`; `docs/calibration.md` |
| B08 | DONE (formal parent pass recorded) | `8dc5f4f` | `d60dd75`; `/tmp/og-goal/evidence/B09/` |
| B09 | DONE WITH SCOPE DEVIATION; specific proof GAP | `5b10932`, `26bd557` | `/tmp/og-goal/evidence/B09/default-order-full.txt`; `default-order-browser-integration.txt`; `scope-check.txt` |
| B10 | DONE (evidence summary) | `8dc5f4f` | `/tmp/og-goal/evidence/B10/audit.txt`; `bun-test.txt`; `browser.log` |
| B10b | DONE (keyboard selector fix) | `027c4a1` | `/tmp/og-goal/evidence/B10b/green-focused.txt`; `select-check-after.txt`; `full-tests.txt` |
| B11 | PARTIAL — human visual sign-off open | `26f70b5`, `c2a57cf` | `/tmp/og-goal/evidence/B11/`; `/tmp/og-goal/evidence/B11-FIX-01/` |
| B12 | PARTIAL — this report; human test not run | `bd9869751994f4ebbce34beb99418bc01cce6fc8` | `docs/reports/integrity-narrative-closeout.md`; `/tmp/og-goal/evidence/B12/` |
| DASH-FIX-01 | DONE | `0841a21`, `dca2505`, `0b7d41b`, `52e607c` | `/tmp/og-goal/evidence/DASH-FIX-01/task-document-closeout-review.txt`; `bun-test-final.txt`; `build-final.txt` |
| ALERT-FIX-01 | DONE | `b9dcfaa`, `5260c99` | `/tmp/og-goal/evidence/ALERT-FIX-01/focused-final.txt`; `bun-test-src-final.txt`; `screenshots-final.txt` |
| ALERT-FIX-02 | DONE | `5b1a35b` | `/tmp/og-goal/evidence/ALERT-FIX-02/green.txt`; `bun-test-src.txt`; `screenshots.txt` |
| B04-FIX | DONE | `8de0692` | `/tmp/og-goal/evidence/B04-FIX/final-landing-tests.txt`; `final-full-suite.txt`; `final-browser-standard.txt` |
| B04-COPY | DONE | `1303ae2` | `/tmp/og-goal/evidence/B04-COPY/green.txt`; `frontend-tests.txt`; `screenshots.txt` |
| ASM-FIX | DONE | `db57c8d` | `/tmp/og-goal/evidence/ASM-FIX/green.txt`; `bun-test-src.txt`; `screenshot-1440.txt` |
| CUT-01 | DONE; ratio provenance corrected later | `b31914b`, `b6747da` | `/tmp/og-goal/evidence/CUT-01/green.txt`; `full-tests.txt`; `ratio-trace.md` |
| PROV-01 | DONE | `f5a8942`, `8db0631` | `/tmp/og-goal/evidence/PROV-01/final-audit.txt`; `bun-test-src.txt`; `docs-diff-review.txt` |
| FIX-01 | DONE | `7013502` | `/tmp/og-goal/evidence/FIX-01/grep-users.txt`; `bun-test-src.txt`; `build.txt` |
| REV-FIX-01 | DONE | `5876cda`, `8a45537`, `b1c1c73`, `f5a8942` | `/tmp/og-goal/evidence/REV-FIX-01/green.txt`; `bun-test-src-green.txt`; `build-green.txt` |
| REV-FIX-02 | DONE; both suggestions addressed | `fad4f74`, `0f45186` | `/tmp/og-goal/evidence/REV-FIX-02/green.txt`; `final-all-tests.txt`; `ack-out.json` |
| B11-FIX-01 | DONE | `d50a1de`, `26f70b5`, `c2a57cf` | `/tmp/og-goal/evidence/B11-FIX-01/overflow-final.txt`; `bun-test-final.txt`; `bun-build-final.txt` |

## Product understanding

- **Problem:** Manual oil-level checks require a stopped truck, level ground, and stabilization; the stated interval is 250 h. The proposed system supplements those checks rather than replacing them (`PRODUCT.md`).
- **Hypothesis:** Use pressure, temperature, vibration, and operating-state signals, with natural stopped/level windows as recalibration opportunities. This remains a hypothesis about future field sensing; the working demo uses synthetic inputs (`PRODUCT.md`, `docs/feasibility.md`).
- **What the simulator demonstrates:** Rest-window gating, temperature-compensated pressure residual anomaly logic, and the alert/RUL path on generated scenarios. T9 documents 262 of 620 scored rest samples flagged in a 30%/h lab-accelerated leak scenario and 135 of 228 in an abrupt-drop scenario; at the stated 0.5%/h rate the short-run signal is below useful detection (`docs/t9-anomaly.md`). These are synthetic logic demonstrations, not field performance.
- **What it does not demonstrate:** Physical pressure-to-volume accuracy, field leak detection, sensor/mount survivability, customer outcomes, or industrial security/compliance. No weighed-oil bench run is recorded (`docs/calibration.md`).
- **TRL:** UNRESOLVED. No numeric TRL is stated or inferred, per the author decision recorded in `docs/research/landing-claims.md`.

## Scope deviation

B09 changed shared `frontend/src/twin/render/stage.ts` beyond the additive landing-scope default. The task record calls out this deviation; the parent-verified twin suite run after commit `856154e` reported 128 pass, 0 fail across 17 files (`cd frontend && bun test src/twin`). The parent-verified browser check recorded one canvas and 31 in-view animation frames each on `/mine` and `/wheel`, with no page errors. The check script is `/tmp/og-goal/scratch/twin-check.mjs`; its screenshots are `/tmp/og-goal/evidence/B09/twin-mine.png` and `/tmp/og-goal/evidence/B09/twin-wheel.png`. The shared-stage symbols and landing imports are inventoried in `/tmp/og-goal/evidence/B09/scope-check.txt`; route build output is in `/tmp/og-goal/evidence/B09/default-order-build.txt`. These are the supplied parent verification facts and recorded screenshots, not a fresh visual run.

## Approved and acknowledged review ranges

Each capture records `state=approved`, and its matching acknowledgement records `action=acknowledged` and `authority=burned`. The captures bind tree endpoints; Git maps those trees to these base-exclusive, candidate-inclusive commit ranges:

| Commit range | Captured base tree → candidate tree | Evidence |
|---|---|---|
| `2ed430f..f5a8942` | `a317e3c4b05c55f090da2ec7e4d67911671fa67d` → `b22be67431afc0bfd05104d5dd064574d243f37e` | `/tmp/og-goal/evidence/r3-capture-out.json`; `/tmp/og-goal/evidence/r3-ack-out.json` |
| `f5a8942..d548d6a` | `b22be67431afc0bfd05104d5dd064574d243f37e` → `28446a99e80163f4ff4c89ee1253ebd6924824eb` | `/tmp/og-goal/evidence/r5-capture-out.json`; `/tmp/og-goal/evidence/r5-ack-out.json` |
| `d548d6a..b339eb9` | `28446a99e80163f4ff4c89ee1253ebd6924824eb` → `c0ab8b9a88588f3bef80c6b389224c9fb59cc8f0` | `/tmp/og-goal/evidence/REV-FIX-02/capture-out.json`; `/tmp/og-goal/evidence/REV-FIX-02/ack-out.json` |

The endpoint-to-commit mapping was read back from Git commit tree fields; the complete output is in `/tmp/og-goal/evidence/B12/review-range-map.txt`. The tree IDs themselves are not commits; the mapped Git history establishes the commit ranges.

## Open items and owners

| Item | Owner | State / next action |
|---|---|---|
| B11 human visual sign-off | Human reviewer | Open; review the required viewport/language/motion captures and record the sign-off. |
| B12 three-minute comprehension test | Human participant / author | **HUMAN ONLY — NOT RUN HERE.** Record whether the participant can explain the problem, location, difficulty, and physical-validation gap; model-written notes are not evidence. |
| Range before `2ed430f`, including `8dc5f4f` (122 files) | Maintainer / review owner | Open; the broad candidate has no approved receipt. The task record documents `lens_context_budget_exceeded`; do not imply it was reviewed. |
| REV-FIX-02 R3-001 and R3-002 | Maintainer | Open follow-ups: assert exact translated mount-error copy; document or remove the redundant sync guard. See `/tmp/og-goal/evidence/REV-FIX-02/capture-out.json`. |
| Komatsu HD-465 GLB decision | Author / licensing owner | Open decision. Asset is CC-BY-4.0, exterior only, and is not used; decide whether it should remain unused or be adopted under its terms. |
| A12 raw banned-term scan / policy conflict | Author / policy owner | Unresolved. Keep the distinction between policy literals and claims; do not represent a semantic guard as a zero-match raw scan. |
| Clean-tree proof and feature completion | Repository owner | Not established here. The historical task record notes `.codex/hooks.json` as user-owned state; this closeout does not claim that the goal is complete. |

## Closeout verification

For this document task, checks are recorded in `/tmp/og-goal/evidence/B12/`. The required frontend honesty guard is run as a closeout check; it is not a substitute for the full B12 integrated suite or human sign-off. This task's final commit and post-commit status do not retroactively prove the pre-commit clean-tree requirement.

## Orchestrator decisions

1. **Unreviewed range before `2ed430f` (includes `8dc5f4f`, Spanish-only, 122 files).** Functional gates accepted as the record for this range (`bun test src` 620 pass, `bun run build` 44 pages, honesty guard green). No history rewrite. The range stays unreviewed by native RDD because the review contract covers only ranges ending at HEAD and the full range exceeded the context budget (`lens_context_budget_exceeded`, observed 2026-10-11). Authority: the user delegated decisions to the orchestrator ("sientete libre de tomar decisiones"); the user may revoke this at any time.

2. **GLB `docs/reference-models/komatsu_hd-465-7eo.glb`.** NOT used in the landing. Reason: third-party HD-465-7EO exterior, no internal drivetrain or motor geometry, license CC-BY-4.0 with source not independently re-verified (`docs/models.md`). The landing keeps the parametric study cutaway (`scenes/assembly.ts`, `scenes/gears.ts`). Reopen only if the license and labelling are confirmed.

Still requires a human: three-minute comprehension test (B12) and visual approval of B11.

## Final state (CLOSE-17)

**Pre-doc-closeout HEAD:** `92c5615a84a18b24bd6e28ad4758d404e3fb5dcf` (`fix(ops): gate chart card live badge on reading validity`). This is the code-change HEAD before this documentation closeout, not the closeout commit.

| Target | Status and measured result | Evidence |
|---|---|---|
| V3-027 — `/monitoring`, 1024 px | **FIXED by the pre-doc-closeout HEAD.** With the invalid reading present, `EN VIVO` leaves whose third ancestor contained `Lectura inválida` or `Lectura obsoleta`: 1 before, 0 after. The browser capture showed the invalid reading after the change. | `/tmp/og-goal/evidence/CLOSE-17/baseline-1024.json`, `after-1024.json`, `after-1024-chart.png`; `frontend/src/dash/Dashboard.chart-validity.test.tsx` |
| V3-007 / V3-008 — `/fleet`, 1024 px | **FIXED.** Clipped DEMO table cells: 30 before, 0 after. DEMO/severity badge overlaps: 3 before, 0 after; the six checked badge pairs had a 6 px gap. | `/tmp/og-goal/evidence/FINAL-14/before-fleet-audit.txt`, `dom-after.txt`, `after-fleet-1024-chromium-1024.png` |
| V3-012 — `/fleet` and `/alerts`, 390 px | **FIXED.** The visible `Desliza para ver más` cue appears beside both scrollable tables. Fleet table/wrapper widths: 1217/332 px; Alerts: 1227/332 px. | `/tmp/og-goal/evidence/LAYOUT-12/after-measurements.json`, `v3-012a-after.png`, `v3-012b-after.png` |
| V3-025 — favicon | **FIXED.** `/favicon.ico` returned HTTP 200. | `/tmp/og-goal/evidence/FINAL-14/favicon-curl.txt` |
| V3-031 — `/wheel`, 1024 px | **FIXED for the named ACEITE tile.** Its `66,5 L · 70%` value has same-tile `DEMO` and `SUSTITUTO` labels. The separate drawer `.og-value` showing the same value has no adjacent label; this remains a distinct observed gap and is not described as labeled. | `/tmp/og-goal/evidence/VISUAL-OPENCODE-05/targets.json` (`t5`), `/tmp/og-goal/evidence/PROV-REST-08/live/v3-031.json` |
| V3-013..V3-015 — secondary density | **Collapsed by owner decision; counts are observations, not a pass threshold.** At 1440×900, number/badge/button/card counts before → after: Fleet 45/95/8/3 → 45/95/8/3; Alerts 28/27/0/8 → 20/31/0/8; RUL 42/41/4/6 → 7/8/4/0. A separate leaf-text/provenance probe recorded Fleet 158/50, Alerts 110/14, RUL 49/4; its closed-detail exclusions were 84, 89, and 381 respectively. The two probes use different count definitions. | `odd/tasks/density-15.md`; `/tmp/og-goal/evidence/DENSITY-15/density-before.txt`, `measurement-after.json`; `/tmp/og-goal/evidence/VISUAL-OPENCODE-05/targets.json` (`t6`) |
| V3-041..V3-043 — outage states | **FIXED by FIX-DOWN-04c and OUTAGE-SHARED-05.** Fleet's blocked-state telemetry heading/live-badge counts changed 1/21 → 0/0 (offline messages 2 → 3 at 2 s; the same result held at 6 s and 15 s). Across Fleet, RUL, Link, Devices, and Monitoring, blocked notices appeared on 5/5 routes and open-state notices on 0/5. | `/tmp/og-goal/evidence/FIX-DOWN-04c/fleet-timing-before.txt`, `fleet-timing-after.txt`; `/tmp/og-goal/evidence/OUTAGE-SHARED-05/browser.txt` |

The three-minute comprehension test and owner visual approval were **NOT run by the system** and remain human-only items. The broad range before `2ed430f`, including `8dc5f4f` (122 files), remains **unreviewed**: native review stopped with `lens_context_budget_exceeded`; historical functional results are not a review receipt. `AGENTS.md` remains the owner's uncommitted change. Its clean-tree rule was declined for this candidate; the file was not edited or staged here.

The CLOSE-17 Part A candidate review was approved and acknowledged. Its non-blocking R3-001 advisory noted that the regression test does not exercise Dashboard prop wiring/backend-note rendering; no correction transition was offered. The human-only items above remain open.

**All automated checks pass** for this closeout: `cd frontend && bun test src` — 699 pass, 0 fail; `cd frontend && bun run build` — exit 0, 45 pages; `cd frontend && bun test src/honesty.test.ts` — 3 pass, 0 fail; `grep -rn "/Users/" frontend/src` — zero matches. Full outputs are in `/tmp/og-goal/evidence/CLOSE-17/`.
