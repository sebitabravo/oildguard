# OilGuard — Spanish-only Conversion (ODD feature record)

**Status: APPROVED / IN PROGRESS.**

The user explicitly chose full English removal ("Eliminar inglés total") via a direct scope question on 2026-10-11. That approval authorizes the scoped work below; it is not a native RDD receipt or delivery approval. One serialized writer at a time, strictly in numeric task order. Do not push, open a PR, or merge.

## Objective

Convert the product UI to Spanish-only: delete every `en` branch (dict keys, `Lang` union, `useLang`/locale switching, `?lang=`, EN-asserting tests), leaving all visible copy and numbers in ES / es-CL.

## Problem / why

The user reviewed the bilingual UI and found no sense in shipping Spanish and English together; the page must be fully Spanish.

## Scope

Five tasks S01–S05 below, strictly in order. Bilingual evidence in `odd/tasks/integrity-narrative.md` and git history is preserved untouched; only this record and the listed source/test files change.

## Constraints

- Preserve `.codex/hooks.json` exactly as found and never stage it.
- No physics/threshold changes, new dependencies, pushes, PRs, or merges.
- Rescue point: bilingual tree is preserved in git history at `8ef515f4a3865a629af5ce98c4cbdd3bb3c3c4a7` (A03 commit) and earlier work-unit commits; EN strings remain recoverable from history. No history rewrite is authorized.
- Unknown-backend-code fallback (today legacy English prose) gets an explicit decision in S01: keep verbatim vs Spanish generic note.
- `docs/` content language stays as-is unless a task proves a change is required (accepted mixed-language surface: UI ES-only, docs as today).
- Comments in Spanish; identifiers, tests, docs in English; UI copy Spanish-only after conversion.
- Do NOT edit `odd/tasks/integrity-narrative.md` or `docs/progreso-tarea.md`; parent owns progress tracking.

## Decisions (user-approved)

- Full removal of English (not hiding the switcher).
- Open (S01 must decide and record): `?lang=` removed vs forced-ES; `lang:Lang` props deleted vs narrowed to `'es'`; `/es/` route dropped (no redirect) vs explicit redirect.
- TRL posture stays UNRESOLVED per B01; no maturity copy is added by this conversion.

## Route

Delegated direct. Mapping trigger fired (70–80 files inventoried read-only by an explore worker, no writes). One serialized writer. Parent reviews each full diff and proof before advancing.

## TDD

On for this feature; runner `cd frontend && bun test src`. Behavior changes require a negative test observed failing against pre-fix code in a disposable copy, then RED → GREEN → REFACTOR. For deletion-heavy tasks, RED = ES-only test failing against bilingual code path (or EN-surface assertion failing after removal, as appropriate); each task records its exact RED proof.

## Checks

Per-row focused commands below. Full gate before closeout: `cd frontend && bun test src`, `cd frontend && bun run build`. Delivery strategy `ask-on-risk` (inherited); no remote delivery authorized.

## Tasks

- [x] **S01 — Lock ES-only contract (types + formatter + query).** Done, parent-verified (contract test 5/5). Files: `frontend/src/i18n/index.ts`, `frontend/src/i18n/numberFormat.ts`, `frontend/src/i18n/queryLanguage.ts`, `frontend/src/platform/landing/beats.ts`. Acceptance: no `en` in `Lang`/`BeatLocale` unions; `t()` has no `.en` fallback; `formatNumber` always es-CL; `?lang=` + lang-prop + `/es/` decisions recorded. Check: `cd frontend && bun test src/i18n/` plus `rg` for remaining `"en"` in i18n core.
- [x] **S02 — Collapse dictionaries to ES-only.** Done, parent-verified (1450 entries, zero `en:`, contract green). Files: `frontend/src/i18n/dict/ops.ts`, `dict/platform.ts`, `dict/lab.ts`, `dict/docs.ts`, `dict/opsAlerts.ts`, inline dict in `frontend/src/i18n/index.ts`. Acceptance: zero `{ en:` entries; every key resolves ES copy with params intact. Check: `rg -c '\ben:'` returns zero; focused i18n tests green.
- [x] **S03 — De-switcher app shell (Astro + layouts + pages + login/docs bars).** Done, parent-verified (in-scope zero switcher remnants; `login.css` dead selectors folded into S04). Files: `BaseLayout.astro`, `PublicLayout.astro`, `AuthLayout.astro`, `pages/index.astro`, all `pages/*.astro` with `t(...,'en')`/`data-i18n` pairs, `Landing.tsx` switcher block, `Login.tsx`, `DocsTopBar.tsx`. Acceptance: `<html lang='es'>` everywhere; no `data-i18n-*`, no `[data-lang]` JS, no `?lang=` pre-paint; `/` renders ES with no JS. Check: `rg` for switcher remnants; `bun run build`.
- [x] **S04 — Simplify components (drop useLang/lang props).** Done, parent-verified (zero hooks/t-lang in production, build 44 pages). Files: all `useLang()` call sites (~27), `lang:Lang` presentational props, explicit test `lang` props, `sim/*` copy helpers. Acceptance: no `useLang`/`persistLang`/storage-key imports; no `lang:'en'|'es'` annotations; every visible string/number ES/es-CL. Check: `rg` for hooks/annotations; `astro check`.
- [x] **S05 — Rewrite/delete locale tests ES-only.** Done: 37 test files ES-only (deliberate 5-line `asBeatLocale→es` exception in contract test). Gate cleared by S06 (suite + build green).
- [x] **S06 — Closeout fixes (mock semantics + toFixed + matcher types).** Done, parent-verified (suite 594/0, build 0 errors/44 pages; parent SVG path-decimal micro-fix included). Files: `frontend/src/sim/useThrottledSceneAccessibility.test.ts` (mock invokes lazy initializers), `SensorDetails.tsx` stays untouched if mock fix suffices; `LandingScene.tsx` + `PressurePlot.tsx` (`.toFixed` → `formatNumber`); matcher-typing asserts in B-era scene tests. Acceptance: full `bun test src` green + `bun run build` 0 errors. Check: both commands. Files: all `['en','es']`-looping or EN-asserting tests (~25 files). Acceptance: no EN loops/asserts; ES asserts + physics/logic coverage preserved; honesty + numberDisplayGuard kept. Check: `rg` for `"en"` in tests; full `bun test src` green.

## Current state

S01–S06 done and parent-verified: full `bun test src` 594 pass / 0 fail, `bun run build` 0 errors + 44 pages. Post-S06 micro-fix (parent, same scope): SVG path `d` in `PressurePlot.tsx` serializes with period decimals via `pathNum` (SVG spec: comma separates coordinates) while visible text keeps `formatNumber`; guard stays green. Pending: parent review/commit decision. Goal not complete until committed.
