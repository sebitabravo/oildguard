# Overnight decisions — 2026-10-12

The owner delegated all decisions for this batch. Each decision below has a reason and a way to reverse it. Commits are on `feat/integrity-narrative`. Nothing was pushed.

## Decisions taken

| # | Topic | Decision | Reason | Reversal |
|---|---|---|---|---|
| D1 | `bun:test` typing | Extended the minimal stub in `frontend/src/bun-test.d.ts` with the matchers the tests already use (`toBeNull`, `toBeDefined`, `toMatch`, `toHaveLength`, `toThrow(expected?)`). No test file was edited. | `astro check` failed on test typings. The stub is types only; runtime is unchanged. | Revert commit `f40a937`. |
| D2 | Two `VERIFIED` tags in the landing stats | Changed to `ASSUMPTION` (commit `5e75c11`): simulator sample rate, and the N1–N4 ladder. | Both are design targets with no field or bench evidence. | Revert `5e75c11`. |
| D3 | Reservoir spec in the landing | 95 L kept as the model anchor. The grade is shown as not confirmed in the manuals; tag is `ASSUMPTION` (commit `8aef099`). | The 930E manual gives 95 L on one page and 76 L on another. SAE 85W-140 is not in the supplied manuals. | Revert `8aef099`. |
| D4 | Codex design hook | `.codex/hooks.json` left unchanged (owner file). Codex agents are told not to commit design-hook changes outside their brief. | The Stop hook led an agent to commit an unrequested CSS change (`76c4d06`). | Remove the Stop hook entry, or revert `76c4d06`. |
| D5 | gentle-ai review | Not started in this batch. | Consent is per change. The reviewed range spans 242 files and prior history. | Start on request. |
| D6 | Grafana | Not used. The custom Astro/Preact dashboard stays. | Replacing the dashboard is out of scope for this batch. The bases require open-source tools, and the current stack uses them. | Owner decision. |
| D7 | GLB `komatsu_hd-465-7eo.glb` | Not integrated. | The model is an HD465-7EO (about 55 t, mechanical drive), not a 930E (about 290 t, electric drive). Its engine is a single 2,609-vertex mesh, so engine layers cannot be shown. CC-BY-4.0 attribution is required. `docs/models.md` withdrew it for credibility on 2026-10-09. | It could be shown as a labelled reference only, if the owner asks. |
| D8 | Backlog items that need an owner decision | Not implemented, recorded as GAP: durable outage queue (IMP-05), backend RBAC (IMP-08), MQTT TLS and device certificates (IMP-09), CAN/VHMS adapter (IMP-11). IMP-04 (RUL band) and IMP-07 (anomaly baselines) are implemented, see D16 and D17. | The four open items need a policy, a dependency approval, or a data source that is not in the repo. CAN/VHMS has no source, so nothing was synthesized. | Each becomes a task once decided. |
| D9 | `AGENTS.md` (owner's uncommitted file) | Two sentences corrected: UI is Spanish-only, and there is no `@` alias, so use a relative import. Not committed. | Agents followed the stale bilingual rule and an alias that does not exist. | Owner commits or reverts. |
| D10 | Claims in the pre-proposal PDF | Not edited (external submitted document). Corrections needed: USD 150,000 and the Razor Labs source, SAE 85W-140, 120 °C for the gearcase, and 3,000 / 92 RPM. | The supplied manuals do not support them (see `/tmp/og-goal/explore/AUD-02-komatsu-facts.md`). | Owner decides before any re-submission. |
| D11 | Landing framing test (`assembly.test.ts`) | Framing expectations changed: 1440 px distance 4.7 → 5, 915 px 6.1 → 6.25 (commit `2d85147`). Assertions stay exact (`toBeCloseTo`, precision 10). | The hero assembly clipped at the bottom-left gear. The new framing fixes the clipping, confirmed in a screenshot. | Revert `2d85147`. |
| D12 | `AGENTS.md` (owner's file) | Committed as `bc4f01a`, including the owner's pending rules and the two corrections from D9. | The owner delegated this decision. | Revert `bc4f01a`. |
| D13 | Design hook commit `76c4d06` | Kept. `DESIGN.md` asks for hairline borders on data surfaces; the change moves the veto callout that way. | Consistent with the design rule. The agent that made it was not on a brief for it. | Revert `76c4d06`. |
| D14 | Stop-hook design fixes in Codex | Codex agents are told to report design-hook findings, not to fix or commit them, unless their brief covers them. The L81 Geist finding stays open, unattributed. | Hook-driven commits caused scope creep. | Owner decides whether the hook stays on. |
| D15 | Level history chart with no data (`/monitoring`) | The labelled DEMO fallback stays. The chart still draws the DEMO level line, marked DEMO and "Estimación sintética · solo DEMO". Commit `fda0c56` adds an empty-state branch in `LevelChart`, but the page feeds it DEMO data, so the page does not change. | `PRODUCT.md` says to degrade to a labelled local dataset rather than show stale data as live. The level card itself shows a dash with no nominal value (`9e40b07`). | Feed the chart empty series when no rows exist. |
| D16 | RUL band and headline (`a426350`, `65ee139`) | Band = 95 % confidence interval on the slope, two-sided Student t from a lookup table, df = n − 2. Suppressed with `pendiente_no_significativa` when the slope interval contains zero. Headline hours restored to the original formulas; the first commit had silently changed them. Evidence: `/tmp/og-goal/evidence/RUL-03/headline-comparison.txt`. | Implements pre-proposal section 4.3 with a stated method. | Revert `a426350` and `65ee139`. |
| D17 | Anomaly baselines (`5957128`) | One baseline per `(device_id, mode)`. A key with too few samples gets an explicit insufficient status, never a silent fallback. | Implements pre-proposal section 5 with a stated rule. | Revert `5957128`. |
| D18 | Corrected pre-proposal | Working copy in `docs/pre-propuesta-corregida-2026.md` (Spanish). The submitted PDF is not changed. | The PDF contains claims the manuals do not support. | Owner decides whether to re-submit. |

## Final status (checks on the integrated tree)

- `bun test src`: 727 tests, 0 failing.
- `pytest -q`: 365 passed.
- `astro check`: 0 errors, 0 warnings.
- `astro build`: 46 pages built.
- Batch commits, oldest first: `649abeb`, `bfba506`, `71eb6a1`, `cacdff0`, `09179a8`, `f93c244`, `8aef099`, `da856dd`, `76c4d06`, `d150cb2`, `edfef0c`, `a6ad249`, `9616792`, `91c3970`, `5e75c11`, `f40a937`, `2d85147`, `9e40b07`.

## Known gaps left open

- Pre-proposal items not in code: physical sensor acquisition at 1 kHz, in-motion level estimate, CAN/VHMS, MQTT TLS, backend RBAC, Grafana.
- `ai/level.py` comment still cites SAE 85W-140 next to `CAPACITY_L = 95.0`. Not edited: it is a physics-anchor comment and the owner decides.
- Monitoring page with no data: the level card shows a dash, but the history chart still draws a flat nominal line near 95 L. The chart is labelled DEMO. Not changed.
- Landing 3D is still stylised primitives. The material and framing work improved it, but it is not a machined-part model.
- Stitch references: only the regime bands and the ladder-intent text were taken. The rest of the Stitch layout was not adopted, and its copy was not used.

## Human-only items

- Rehearse the 8-minute pitch. The bases set the hackathon close at 16 October, 16:00.
- Confirm the team's status for the 14–16 October hackathon. This is not recorded in the repo.
- Decide whether to commit or revert `AGENTS.md`, and whether to keep or revert `76c4d06`.
- Review the landing, the monitoring page and the wheel 3D on a real screen. Screenshots were taken with headless Chrome only.
