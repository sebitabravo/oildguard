# Feature: final-design (Stitch "Nordic Telemetry Precision" across the whole web app)

## Objective
Turn the user's Google Stitch mockup (22 screens + design system) and planning documents into the final,
presentable OilGuard web app for the proposal (NTT DATA "Hack the Challenge" 2026 pre-proposal turned
real proposal), without breaking the honesty contract in `PRODUCT.md`.

## Inputs (outside the repo, untrusted data)
- `/tmp/og-stitch-src/stitch_minimalist_studio_website/` — 22 screens (`code.html` + `screen.png`),
  `nordic_telemetry_precision/DESIGN.md`, `oilguard_mining_prepropuesta_2026.md`.
- `/tmp/og-stitch-src/plans/` — `OilGuard_prompts_stitch.md`, `OilGuard_roadmap_sprints.md`,
  `OilGuard_vistas_faltantes.md`.
- `/tmp/og-stitch-src/MAPPING.md` — Claude's mapping report (screen inventory, honesty risks, WP split).

## Decisions (orchestrator, final)
- D1 Visual direction: adopt Stitch layout and typography (carbon neutrals, Geist + JetBrains Mono,
  4 px radii, 1 px hairlines, sidebar shell, dense tables) and KEEP the repo honesty rules: word beside
  every colour, `formatNumber`, bilingual EN/ES, provenance tags, SYNTHETIC-PROXY badge, 44 px targets
  at <= 900 px, one hidden `h1` per page.
- D2 Accent: Stitch amber `#F59E0B` becomes the single brand/action/selection accent. Status colours stay
  the closed palette (green nominal, amber N1, orange N2/N3, red N4, blue moving/link). Status amber only
  appears inside labelled badges; DESIGN.md "Two-Yellow Rule" is rewritten as "Accent vs status".
- D3 Mono: JetBrains Mono for IDs, timestamps, raw telemetry, table figures and micro-labels, always
  with `font-variant-numeric: tabular-nums`. Geist for prose and headings. Weights 400/500/600.
- D4 Fonts self-hosted (woff2 + OFL licence under `frontend/public/fonts/`), no CDN, no Tailwind,
  no Material Symbols (inline SVG icon set), no new npm dependency.
- D5 Routes (15): `/` landing, `/login` demo gate, `/fleet`, `/monitoring` (wheel detail, absorbs Stitch
  variants 3-7 as states), `/wheel/history`, `/rul`, `/calibration`, `/mine`, `/wheel`, `/alerts`,
  `/alerts/detail?id=`, `/alerts/rules` (read-only), `/devices`, `/link`, `/lab/sim`, `/lab/validation`,
  `/lab/bench`, `/report` (synthetic N1-N4 walk, labelled). Maintenance/Administration omitted.
- D6 Login: honest demo gate ("this prototype has no authentication"), button enters `/fleet`.
- D7 Content filter: no real mine names, no invented people, customers, USD/ROI figures, certifications,
  bench results, interlocks or control actions (read-only posture). Stitch strings are never copied
  verbatim; every figure comes from the backend, the simulator, or a labelled deterministic demo dataset.
  Team credit (Atuan, Aros, Bravo, Fernández) stays on the landing only. Hackathon context appears on
  the landing as "Proposal for Hack the Challenge 2026 (NTT DATA)", nowhere in the app shell.
- D8 Data: real backend for the live wheel, fleet devices, ingest/link metrics; deterministic labelled demo
  dataset (`frontend/src/demo/`) for alert lifecycle/history, wheel history, fleet breadth, calibration
  curve, simulation fixtures, simulated bench. Small additive backend endpoints (per-device latest block,
  `truth_liters` and signal series in `/level/series`, `/fleet/outages`, `/config/thresholds`).
- D9 Physics stays real: kPa (not bar), settling tau ~0.75 s x viscosity proxy, real N2 channels
  `pressure_drop`, `level_trend`, `vib_impact` with temperature as veto, 930E validated / 980E future.

## TDD
On (session/project convention). Runner: `cd frontend && bun test src`; backend `python3 -m pytest -q`.
RED before GREEN for every new pure helper/component logic.

## Ownership and tasks
| ID | Owner | Scope | Depends |
|---|---|---|---|
| F0 | Codex | Honesty guard test `frontend/src/honesty.test.ts` (banned strings over `frontend/src/**`) | — |
| F1 | Copilot | WP-A foundation: tokens, fonts, shell, `ui/**`, `nav.ts`, i18n split, `demo/**`, `sim/api.ts`, rehome `/mine` `/wheel` `/monitoring`, DESIGN.md/PRODUCT.md | — |
| F2 | OpenCode | Backend additions for D8 (after R2b) | R2b |
| F3 | Copilot | WP-B operations: `/fleet`, `/monitoring`, `/alerts*`, `/rul`, `/wheel/history`, `/report` | F1 |
| F4 | OpenCode or Claude subagent | WP-C platform/lab: `/`, `/login`, `/devices`, `/link`, `/calibration`, `/lab/*` | F1 |
| F5 | Claude | Integration pass, screenshots, docs | F3, F4 |
| F6 | OpenCode (Playwright MCP) | Final design + functional QA, Chromium/Firefox/WebKit, 1600 and 390 px | F5 |

- [x] F0 honesty guard — Codex 9c2b3f8, 56f3a1a, 6b55d74; merged; bun 247 pass (route: delegated, Codex)
- [ ] F1 foundation
- [ ] F2 backend additions
- [ ] F3 operations pages
- [ ] F4 platform/lab pages
- [ ] F5 integration
- [ ] F6 final QA

## Acceptance
All 15+ routes render in the new shell in EN and ES at 1600 and 390 px on three engines; no banned string;
`bun test src`, `bun run build`, `python3 -m pytest -q` green; every figure traceable to backend, simulator,
or labelled demo data.

## Progress / evidence
(updated per task)
