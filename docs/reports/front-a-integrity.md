# Front-A Integrity Closure Audit — Evidence Report (A13)

Outcome first: Front A is **NOT closed**. The full frontend suite is RED
(`bun test src`: 491 pass, 2 fail, exit 1); the two failures are the A06
Spanish RMSE-tile tests, which pass in isolation but fail inside the full
run (order-dependent language-mock leak). Build (`bun run build`, exit 0,
41 pages) and Python (`pytest -q`: 363 passed, exit 0) are green, and
`git diff --check` is clean. This file is evidence only: no production,
test, or doc source was mutated for this audit. Finding F-01 reopens A06;
all other findings are returned to the parent without source edits.

Scope: A13 permits ONLY this NEW file (`docs/reports/front-a-integrity.md`).
Every other path was READ ONLY during this audit. No B01 work started
(`docs/research/` still contains only `twin-reference.md`).

## Quick path (reviewer verification)

1. `cd frontend && bun test src` — expect 491 pass, 2 fail, exit 1 (F-01).
2. `cd frontend && bun test src/lab/validation/logic.test.ts src/lab/validation/ValidationPage.rmse.test.ts` — expect 23 pass, 0 fail, exit 0 (isolation proof).
3. `cd frontend && bun run build` — expect exit 0, 41 pages, `astro check` 0 errors / 0 warnings / 10 hints.
4. `python3 -m pytest -q` (repo root) — expect 363 passed, exit 0.
5. `git diff --check` — expect no output, exit 0.
6. `ls` the capture dirs in §4 — every listed file was verified present; nothing is invented.

## Details

| Topic | Evidence |
|-------|----------|
| A01 outage banner (DONE, commit `5122505`) | Prior focused GREEN + EN/ES 1024px and 390px normal/reduced captures, parent-inspected. Current tree keeps the banner paths; full-suite run shows no A01 failure. |
| A02 stale-from-timestamps (DONE, commit `9a4d7a8`) | 120 s cutoff traced to device inventory; stale `role="status"` captures `aged-en/es-1024.png` exist. No A02 failure in current full run. |
| A03 per-field fleet provenance (DONE, commit `8ef515f`) | `fleet-live/down-en-1024.png` show LIVE level beside DEMO sigma. Only working-tree delta since commit is the authorized typing fix in `logic.test.ts:168,173`. No A03 failure in current full run. |
| A04 numeric field evidence (closed w/o commit) | Focused GREEN recorded at closeout (18 pass). Captures `live/down-{en,es}-1024.png` in `/tmp/og-a04-e2e/` verified present. Uncommitted; parent owns closeout. |
| A05 synthetic calibration verdict (closed w/o commit) | Full-suite 487 pass + build green recorded at closeout. Captures `live/down-{en,es}-1024.png` in `/tmp/og-a05-e2e/` verified present. Uncommitted; parent owns closeout. |
| A06 RMSE tile (IN WORK, uncommitted — see F-01) | Focused GREEN re-verified in this audit (23 pass, exit 0, `/tmp/og-a13-a06-focused.log`). Full suite RED on its ES tests. No §3.1 work log exists yet; owning task reopens. |
| A07/A08 doc gates + anchors (IN WORK, uncommitted) | Worktree diffs present in `docs/calibration.md`, `docs/thesis-annex.md`. No §3.1 work log; `/tmp/og-a07-full.txt`, `/tmp/og-a08-buntest.log` show the same 2 A06 failures, no independent A07/A08 failure. Parent must review diffs. |
| A09/A10 doc corrections (IN WORK, uncommitted) | Worktree diffs present in `docs/feasibility.md` (10 lines), `odd/tasks/oilguard-pro-twin.md` (2 lines). No §3.1 work log. Parent must review. |
| A11 stress deltas (IN WORK, uncommitted) | NEW `scripts/bench/recalculate_stress_deltas.py` + NEW `tests/test_stress_deltas.py` present and untracked; `docs/bench/stress.md` modified; source JSONs untouched. `pytest -q` green (363 passed) includes the new test file. No §3.1 work log. Parent must review. |
| A12 inventory (IN WORK, untracked) | `docs/integrity-inventory.md` present: 33 first-party doc paths returned, policy PENDING, raw zero-match UNRESOLVED, `allowlist` empty. `honesty.test.ts` +16 lines in worktree. Guard passes inside current suite. No §3.1 work log. Parent approval still required before any wider remediation. |
| Metrics (RMSE 2.5152846440114875, n=350) | Exact pooled value asserted in test (`toBeCloseTo(...,10)`) and displayed EN. ES display broken under full-suite ordering (F-01). Metric logic (`logic.ts`) untouched per scope. |
| Honesty guard | Passes in the current full run (failures are only the two RMSE display tests). Frontend-only coverage gap stands per A12; raw zero-match stays UNRESOLVED. |
| No new behavior | This audit added zero behavior: one NEW report file + `/tmp/og-a13-*` disposable logs only. |

## Full-check proofs (exact commands, pasted proof)

**1. `cd frontend && bun test src` — exit 1 (RED, F-01).**

```text
bun test v1.4.2 (50a8a8387)

src/lab/validation/ValidationPage.rmse.test.ts:
81 |
82 |   test("fixture RMSE tile with n, bias, MAE, fixture path and non-bench note in Spanish", () => {
83 |     const { metrics } = pooledMetrics();
84 |       const lang: Lang = "es";
85 |       const html = renderValidation(lang);
86 |       expect(html.includes("RMSE agrupado")).toBe(true);
                                                 ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (/Users/sebitabravo/Developer/oilguard/frontend/src/lab/validation/ValidationPage.rmse.test.ts:86:44)
(fail) validation RMSE display > fixture RMSE tile with n, bias, MAE, fixture path and non-bench note in Spanish [19.07ms]
101 |     const { metrics } = pooledMetrics();
102 |     expect(metrics.rmse).toBeCloseTo(2.5152846440114875, 10);
103 |     for (const lang of ["en", "es"] as const) {
104 |       const html = renderValidation(lang);
105 |       expect(html.includes("frontend/src/lab/fixtures/validation.json")).toBe(true);
106 |       expect(html.includes(formatNumber(metrics.rmse ?? 0, lang, 2))).toBe(true);
                                                                             ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (/Users/sebitabravo/Developer/oilguard/frontend/src/lab/validation/ValidationPage.rmse.test.ts:106:71)
(fail) validation RMSE display > negative: without the RMSE display the pooled value never reaches the page [17.82ms]

 491 pass
 2 fail
 152514 expect() calls
Ran 493 tests across 86 files. [2.60s]
```

Full log: `/tmp/og-a13-buntest.log`. Both failures are A06 ES-render
assertions; every other file (including honesty guard, i18n, A01–A05
tests) passes.

**Isolation proof (same tests, focused command) — exit 0:**

```text
bun test v1.4.2 (50a8a8387)

 23 pass
 0 fail
 102 expect() calls
Ran 23 tests across 2 files. [51.00ms]
```

Command: `cd frontend && bun test src/lab/validation/logic.test.ts
src/lab/validation/ValidationPage.rmse.test.ts`. Full log:
`/tmp/og-a13-a06-focused.log`. Green alone + red in full suite =
order-dependent failure (see F-01). Prior `/tmp` evidence agrees:
`/tmp/og-a06-focused-green.txt` (23 pass), `/tmp/og-a06-neg-out.txt`
(disposable-copy negative: 19 pass, 4 fail, exit 1 — expected),
`/tmp/og-a07-full.txt` and `/tmp/og-a08-buntest.log` (both 490 pass,
2 fail — same ES failures on the older tree).

**2. `cd frontend && bun run build` — exit 0 (GREEN).**

- `astro check`: 0 errors, 0 warnings, 10 hints (264 files).
- 41 pages built (40 before + `/docs/progreso-tarea.md`, served from the
  untracked parent-owned doc).
- One Vite chunk-size warning (> 500 kB, code-split suggestion) — same
  pre-existing warning recorded at A04/A05 closeouts, not an
  `astro check` warning.
- Full log: `/tmp/og-a13-build.log`.

**3. `python3 -m pytest -q` (repo root) — exit 0 (GREEN).**

```text
363 passed, 5 warnings in 31.30s
```

The 5 warnings are pre-existing FastAPI `on_event` lifespan
deprecations, not failures. Full log: `/tmp/og-a13-pytest.log`.

**4. `git diff --check` — no output, exit 0 (GREEN).**

## Capture matrix (§4): files actually present

Live, down, and stale states are captured at 1024px EN/ES; 390px and
reduced-motion coverage is partial (A01, some A03); 768px/1440px are
absent everywhere. No capture was created or invented in this audit.

- Stale: `/tmp/og-a02-e2e/aged-en-1024.png`,
  `/tmp/og-a02-e2e/aged-es-1024.png` (amber `role="status"` + validity
  chip, no calm message).
- Down: `/tmp/og-a01-e2e/a01-outage-1024-en.png`,
  `a01-outage-1024-es.png`, `a01-outage-390-en.png`,
  `a01-outage-390-en-reduced.png`, `a01-outage-390-es.png`,
  `a01-outage-390-es-reduced.png`; `/tmp/og-a03-e2e/fleet-down-en-1024.png`
  (+ `down-1024-en/es`, `down-390-*` variants);
  `/tmp/og-a04-e2e/down-en-1024.png`, `down-es-1024.png`;
  `/tmp/og-a05-e2e/down-en-1024.png`, `down-es-1024.png`.
- Live: `/tmp/og-a01-e2e/a01-live-1024-en.png`;
  `/tmp/og-a03-e2e/fleet-live-en-1024.png` (+ `live-1024-en/es`,
  `live-390-*` variants); `/tmp/og-a04-e2e/live-en-1024.png`,
  `live-es-1024.png`; `/tmp/og-a05-e2e/live-en-1024.png`,
  `live-es-1024.png`.
- Per-field demo labeling: A03 live row shows LIVE level beside DEMO
  sigma/telemetry (`fleet-live-en-1024.png`); A04 numeric fields carry
  source/units/band/validity per field in live + down captures.
- Gap: full §4 closure matrix (desktop + mobile + reduced-motion in BOTH
  locales for every UI task, four widths 390/768/1024/1440) is NOT
  complete — see F-02. A06 has no page captures at all.

## Diff inspection (this audit changed nothing; all below pre-existed)

Tracked modified (20): `.codex/hooks.json` (user-owned, out of scope);
`docs/bench/stress.md` (A11); `docs/calibration.md` (A07);
`docs/feasibility.md` (A09); `docs/thesis-annex.md` (A07/A08);
`frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/dash/Dashboard.tsx`,
`frontend/src/i18n/dict/ops.ts` (A04);
`frontend/src/honesty.test.ts` (A12, +16);
`frontend/src/i18n/dict/platform.ts` (A05/A06);
`frontend/src/lab/calibration/CalibrationPage.tsx`,
`frontend/src/lab/calibration/logic.test.ts`,
`frontend/src/lab/calibration/logic.ts` (A05);
`frontend/src/lab/validation/ValidationPage.tsx`,
`frontend/src/lab/validation/logic.test.ts`,
`frontend/src/lab/validation/validation.css` (A06);
`frontend/src/ops/fleet/logic.test.ts` (A03 typing fix);
`frontend/src/ops/wheel/WheelPanels.tsx` (A04);
`odd/tasks/integrity-narrative.md` (parent record, A04/A05 logs);
`odd/tasks/oilguard-pro-twin.md` (A10, 2 lines).

Untracked NEW (6, pre-existing): `docs/integrity-inventory.md` (A12);
`docs/progreso-tarea.md` (parent-owned); `frontend/src/lab/validation/ValidationPage.rmse.test.ts`
(A06); `frontend/src/ops/wheel/WheelPanels.provenance.test.ts` (A04);
`scripts/bench/recalculate_stress_deltas.py`,
`tests/test_stress_deltas.py` (A11).

Unavailable proof: `odd/tasks/integrity-narrative.md` §3.1 ends at A05 —
no owning-task work logs exist for A06–A12, and `docs/progreso-tarea.md`
marks A06–A13 `[ ]` pending. Their verification rests on worktree state,
`/tmp/og-a06|a07|a08` logs, and this audit's fresh runs — not on recorded
parent closeouts.

## Findings (reopen owning tasks; nothing mutated)

- **F-01 (BLOCKING, reopens A06): full suite RED on A06 ES tile.**
  `ValidationPage.rmse.test.ts:86` (`"RMSE agrupado"`) and the ES leg of
  `:106` fail under `bun test src` but pass under the focused A06
  command. The ES dict key exists (`dict/platform.ts:295`), and the tile
  renders via `t("lab.validation.metric.rmse", lang)`, so the ES label is
  lost through suite ordering — the `renderValidation` localStorage mock
  does not take effect in the full run (suspected leaked global
  localStorage/language state from an earlier file). A06 must make the ES
  tile order-independent and full-suite green. A13 acceptance
  ("full applicable suites evidenced") is therefore NOT met; Front A
  stays open.
- **F-02 (parent decision): §4 closure capture matrix incomplete.**
  768px/1440px absent; reduced-motion/mobile missing for A04/A05/A06;
  A06 has no page captures. Either schedule the missing captures or
  record an explicit bounded waiver — do not treat A13 as matrix proof.
- **F-03 (parent review): A06–A12 uncommitted and unlogged.**
  Work exists in the tree but §3.1 has no work logs and no parent
  closeout is recorded past A05. Each owning task needs its own observed
  outcome + readback before any commit; A13 evidence must not be read as
  approval.
- **F-04 (note): 41st build page is the untracked parent doc.**
  `/docs/progreso-tarea.md/index.html` builds from an untracked file.
  Harmless for the audit, but the parent should confirm it stays
  untracked vs. checked in.

## Checklist

- [x] Live, down, and stale states captured (existing files listed, §4)
- [x] Every demo field labeled per FIELD (A03/A04 tests + captures)
- [x] Docs, metrics, guard, and full suites evidenced with pasted proof
- [ ] Full suites GREEN — FAILED (F-01); findings reopen A06
- [x] Findings reopen owning tasks instead of mutating source
- [x] No new behavior added (only this report + `/tmp` logs)
- [x] B01 not started (`docs/research/landing-claims.md` absent)

## Next step

B01 (`docs/research/landing-claims.md`) is pending and NOT started —
blocked behind full Front-A closure (F-01 plus parent review of A06–A12
per F-03). No commit, push, PR, merge, or review action taken in this
audit. `.codex/hooks.json` untouched. Engram mirror pending (no
authoritative session identity in this pane).
