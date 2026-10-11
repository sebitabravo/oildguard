# Integrity Inventory — First-Party Docs (A12)

Status: INVENTORY ONLY. No wider remediation performed in this unit.

Scope: A12 permits ONLY `frontend/src/honesty.test.ts` and NEW
`docs/integrity-inventory.md` (this file). All other paths are READ ONLY
for this unit. This file creates the inventory and returns exact
additional first-party paths to the parent for explicit bounded
remediation approval. Wider remediation does not start here.

## Author policy decision (verbatim, task evidence)

Policy approval for wider remediation is PENDING / NOT GRANTED.

Exact decision lines from `odd/tasks/integrity-narrative.md` (A12),
quoted verbatim:

- Permitted scope: "`frontend/src/honesty.test.ts`, NEW
  `docs/integrity-inventory.md` (proposed violations-vs-policy inventory).
  Wider doc remediation cannot start until the inventory returns exact
  additional first-party paths to the parent and the parent approves
  explicit bounded remediation. No list shrinking, exemptions, allowlist,
  encoding tricks, or history erasure."
- Acceptance: "Inventory lists every additional first-party doc path and
  returns them to the parent for explicit bounded remediation approval;
  wider remediation does not start before inventory, allowed paths, and
  policy are resolved; raw zero-match stays UNRESOLVED until then; no list
  shrinking, exemptions, allowlist, encoding tricks, or history erasure"

Consequence: raw zero-match stays UNRESOLVED until inventory, allowed
paths, and policy are resolved and the parent approves explicit bounded
remediation. No doc outside the two A12 paths was edited in this unit.

## Method (reproducible enumeration)

Additional means outside the current `honesty.test.ts` frontend scan,
which covers only `frontend/src/**/*.{ts,tsx,astro,css,mjs}` (skipping
`*.test.ts`, `honesty.test.ts` itself, and `allowlist` entries).

Enumeration command (tracked files, read-only):

```sh
git ls-files '*.md' | sort
```

then exclude third-party skill vendor trees (`.agents/`, `.claude/`,
`.opencode/`), which are not first-party docs. Result: 32 tracked
first-party markdown paths. Plus one untracked parent-owned first-party
doc present in the worktree (`docs/progreso-tarea.md`), listed
separately. Total additional first-party doc paths returned: 33.

This file (`docs/integrity-inventory.md`) is the inventory itself and is
not counted as an additional path. Binary, data, and license artifacts
are explicitly excluded with reasons in the Exclusions section so the
list cannot be read as shrunk.

## Guard boundary (no extension in this unit)

- `frontend/src/honesty.test.ts` coverage is frontend-only (a separate
  coverage gap per the approved plan). It was NOT extended to docs in
  this unit; extension requires explicit policy approval.
- Guard/test/policy LITERALS are present in-repo by design: the
  `bannedTerms` array in `frontend/src/honesty.test.ts` contains all 37
  banned literals, so any raw repository-wide zero-match probe
  necessarily matches the guard file itself. That condition is reported
  as UNRESOLVED and is never presented as satisfied by a semantic scan.
- `allowlist` in `frontend/src/honesty.test.ts` remains empty. No
  exemptions were added. No banned-term list shrinking, encoding tricks,
  or history erasure was performed.

## Inventory table (33 additional first-party doc paths)

Probe column: read-only normalized literal probe using the same
normalization and short-token boundaries as `honesty.test.ts`
(case/accent-insensitive; `\b` for ROI, USD, SIL-2, SIL 2). The probe is
inventory evidence only, not a guard satisfaction claim. Policy column
is identical for every row: PENDING parent approval; no remediation
started.

| # | Path | Raw probe (normalized) | Policy |
|---|---|---|---|
| 1 | `AGENTS.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 2 | `DESIGN.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 3 | `PRODUCT.md` | Razor Labs x2; USD x9 | PENDING — no remediation; awaiting explicit bounded approval |
| 4 | `README.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 5 | `backend/API.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 6 | `bench/precision/README.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 7 | `docs/architecture-telemetry.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 8 | `docs/bench/README.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 9 | `docs/bench/precision.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 10 | `docs/bench/stress.md` | no hit (worktree probe) | PENDING — no remediation; awaiting explicit bounded approval |
| 11 | `docs/calibration.md` | no hit (worktree probe) | PENDING — no remediation; awaiting explicit bounded approval |
| 12 | `docs/demo-script.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 13 | `docs/edge-sim.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 14 | `docs/feasibility.md` | no hit (worktree probe) | PENDING — no remediation; awaiting explicit bounded approval |
| 15 | `docs/inspection.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 16 | `docs/models.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 17 | `docs/research/twin-reference.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 18 | `docs/t10-rul-ladder.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 19 | `docs/t3-oil-settling.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 20 | `docs/t4-truck-cycle.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 21 | `docs/t5-modes-cameras.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 22 | `docs/t7-windows.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 23 | `docs/t9-anomaly.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 24 | `docs/thesis-annex.md` | no hit (worktree probe) | PENDING — no remediation; awaiting explicit bounded approval |
| 25 | `frontend/README.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 26 | `odd/tasks/astro-preact-migration.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 27 | `odd/tasks/final-design.md` | ROI x1; USD x1; interlock x1 | PENDING — no remediation; awaiting explicit bounded approval |
| 28 | `odd/tasks/integrity-narrative.md` | ISO 13849 x1; ROI x1; USD x1 | PENDING — no remediation; awaiting explicit bounded approval |
| 29 | `odd/tasks/oilguard-mining-sim.md` | USD x1 | PENDING — no remediation; awaiting explicit bounded approval |
| 30 | `odd/tasks/oilguard-pro-twin.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 31 | `odd/tasks/rust-telemetry.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 32 | `sim/SCHEMA.md` | no hit | PENDING — no remediation; awaiting explicit bounded approval |
| 33 | `docs/progreso-tarea.md` (untracked, parent-owned) | no hit | PENDING — parent owns; no remediation; awaiting explicit bounded approval |

Notes on hit context (inventory only, no fix applied):

- `PRODUCT.md`: USD module-economics lines and the Razor Labs case-study
  citation note (figure explicitly marked unverified in the text).
- `odd/tasks/final-design.md`: D7 content-filter line naming ROI/USD and
  `interlock` as filter terms.
- `odd/tasks/integrity-narrative.md`: A09 row naming the USD figure and
  the out-of-scope list naming `SIL`, `ISO 13849`, `IEC 62443` levels
  plus ROI.
- `odd/tasks/oilguard-mining-sim.md`: historical T13 closeout line
  referencing a USD figure.
- Worktree-probe caveat for rows 10, 11, 14, 24: those paths have
  uncommitted worktree modifications outside A12 scope (read-only for
  this unit); the probe above read the worktree files. Committed vs
  worktree content differences, if any, belong to their owning tasks,
  not to this inventory.

## Exclusions (explicit, not shrinking)

- Skill vendor markdown (`.agents/**`, `.claude/**`, `.opencode/**`):
  third-party skill content, not first-party docs.
- Binary/derived artifacts: `docs/screenshots/*.png`,
  `docs/reference-models/*.glb`: not prose docs.
- Data artifacts (not prose): `docs/bench/*.json`,
  `bench/precision/results/*.json`, `shared/message_codes.json`,
  `tests/fixtures/*.json`: source/read-only data, not doc remediation
  targets.
- Font license texts (`frontend/public/fonts/*-OFL.txt`): third-party
  license copies, not first-party prose.
- `frontend/src/**` prose-adjacent sources (`.astro`, `.tsx`, `.css`):
  already inside the frontend guard scan; not "additional".

## Return to parent (bounded remediation approval requested)

The 33 paths above are returned to the parent. Requested: explicit
allowed-path list, per-path remediation policy (correct, retain
as historical record with annotation, or quote as filter-term context),
and confirmation of the guard-extension rule (extend
`honesty.test.ts` to approved doc paths only after written approval, or
keep frontend-only with inventory-gated manual review). Until the parent
approves, wider remediation does not start and raw zero-match stays
UNRESOLVED.

## Verification

- `cd frontend && bun test src/honesty.test.ts` (focused guard check;
  full output recorded in task evidence).
- `git diff --check` (whitespace check; output recorded in evidence).
- Diff inspection limited to the two A12 paths:
  `frontend/src/honesty.test.ts` and `docs/integrity-inventory.md`.
