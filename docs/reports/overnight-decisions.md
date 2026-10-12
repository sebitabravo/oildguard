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
| D8 | Backlog items that need an owner decision | Not implemented. Recorded as GAP: RUL confidence band (IMP-04), durable outage queue (IMP-05), per-wheel and per-mode anomaly baselines (IMP-07), backend RBAC (IMP-08), MQTT TLS and device certificates (IMP-09), CAN/VHMS adapter (IMP-11). | Each one needs a method, a policy, or a data source the owner must choose. CAN/VHMS has no source, so nothing was synthesized. | Each becomes a task once decided. |
| D9 | `AGENTS.md` (owner's uncommitted file) | Two sentences corrected: UI is Spanish-only, and there is no `@` alias, so use a relative import. Not committed. | Agents followed the stale bilingual rule and an alias that does not exist. | Owner commits or reverts. |
| D10 | Claims in the pre-proposal PDF | Not edited (external submitted document). Corrections needed: USD 150,000 and the Razor Labs source, SAE 85W-140, 120 °C for the gearcase, and 3,000 / 92 RPM. | The supplied manuals do not support them (see `/tmp/og-goal/explore/AUD-02-komatsu-facts.md`). | Owner decides before any re-submission. |
| D11 | Landing framing test (`assembly.test.ts`) | Framing expectations changed: 1440 px distance 4.7 → 5, 915 px 6.1 → 6.25 (commit `2d85147`). Assertions stay exact (`toBeCloseTo`, precision 10). | The hero assembly clipped at the bottom-left gear. The new framing fixes the clipping, confirmed in a screenshot. | Revert `2d85147`. |

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
