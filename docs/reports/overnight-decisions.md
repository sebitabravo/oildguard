# Overnight decisions — 2026-10-12

The owner delegated all decisions for this batch. Each decision below has a reason and a way to reverse it. Commits are on `feat/integrity-narrative`. Nothing was pushed.

## Decisions taken

| # | Topic | Decision | Reason | Reversal |
|---|---|---|---|---|
| D1 | `bun:test` typing | Extended the minimal stub in `frontend/src/bun-test.d.ts` with the matchers the tests already use (`toBeNull`, `toBeDefined`, `toMatch`, `toHaveLength`, `toThrow(expected?)`). No test file was edited. | `astro check` failed on test typings. The stub is types only; runtime is unchanged. | Revert `f40a937`. |
| D2 | Two `VERIFIED` tags in the landing stats | Changed to `ASSUMPTION` (`5e75c11`): simulator sample rate, and the N1–N4 ladder. | Both are design targets with no field or bench evidence. | Revert `5e75c11`. |
| D3 | Reservoir spec in the landing | 95 L kept as the model anchor. The grade is shown as not confirmed in the manuals; tag is `ASSUMPTION` (`8aef099`). | The 930E manual gives 95 L on one page and 76 L on another. SAE 85W-140 is not in the supplied manuals. | Revert `8aef099`. |
| D4 | Codex design hook | `.codex/hooks.json` left unchanged (owner file). Codex agents are told not to commit design-hook changes outside their brief. | The Stop hook led an agent to commit an unrequested CSS change (`76c4d06`). | Remove the Stop hook entry, or revert `76c4d06`. |
| D5 | gentle-ai review | Not started in this batch. | Consent is per change. The reviewed range spans 242 files and prior history. | Start on request. |
| D6 | Grafana | Not used. The custom Astro/Preact dashboard stays. | Replacing the dashboard is out of scope for this batch. The bases require open-source tools, and the current stack uses them. | Owner decision. |
| D7 | GLB `komatsu_hd-465-7eo.glb` | Superseded by D23. | — | — |
| D8 | Backlog items that need an owner decision | IMP-04 (RUL band) and IMP-07 (anomaly baselines) implemented, see D16 and D17. IMP-05, IMP-08, IMP-09 and IMP-11 are decided in D19–D22. | Each open item needs a policy, a dependency approval, or a data source that is not in the repo. | Each becomes a task once decided. |
| D9 | `AGENTS.md` (owner's file) | Two sentences corrected: UI is Spanish-only, and there is no `@` alias, so use a relative import. | Agents followed the stale bilingual rule and an alias that does not exist. | Revert `bc4f01a`. |
| D10 | Claims in the pre-proposal PDF | Not edited (external submitted document). Corrections needed: USD 150,000 and the Razor Labs source, SAE 85W-140, 120 °C for the gearcase, and 3,000 / 92 RPM. | The supplied manuals do not support them (see `/tmp/og-goal/explore/AUD-02-komatsu-facts.md`). | Owner decides before any re-submission. |
| D11 | Landing framing test (`assembly.test.ts`) | Framing expectations changed: 1440 px distance 4.7 → 5, 915 px 6.1 → 6.25 (`2d85147`). Assertions stay exact (`toBeCloseTo`, precision 10). | The hero assembly clipped at the bottom-left gear. The new framing fixes the clipping, confirmed in a screenshot. | Revert `2d85147`. |
| D12 | `AGENTS.md` committed | Committed as `bc4f01a`, including the owner's pending rules and the corrections from D9. | The owner delegated this decision. | Revert `bc4f01a`. |
| D13 | Design hook commit `76c4d06` | Kept. `DESIGN.md` asks for hairline borders on data surfaces; the change moves the veto callout that way. | Consistent with the design rule. The agent that made it was not on a brief for it. | Revert `76c4d06`. |
| D14 | Stop-hook design fixes in Codex | Codex agents report design-hook findings, not fix or commit them, unless their brief covers them. The L81 Geist finding stays open, unattributed. | Hook-driven commits caused scope creep. | Owner decides whether the hook stays on. |
| D15 | Level history chart with no data (`/monitoring`) | Superseded by D24. | — | — |
| D16 | RUL band and headline (`a426350`, `65ee139`) | Band = 95 % confidence interval on the slope, two-sided Student t from a lookup table, df = n − 2. Suppressed with `pendiente_no_significativa` when the slope interval contains zero. Headline hours restored to the original formulas; the first commit had silently changed them. Evidence: `/tmp/og-goal/evidence/RUL-03/headline-comparison.txt`. | Implements pre-proposal section 4.3 with a stated method. | Revert `a426350` and `65ee139`. |
| D17 | Anomaly baselines (`5957128`) | One baseline per `(device_id, mode)`. A key with too few samples gets an explicit insufficient status, never a silent fallback. | Implements pre-proposal section 5 with a stated rule. | Revert `5957128`. |
| D18 | Corrected pre-proposal | Working copy in `docs/pre-propuesta-corregida-2026.md` (Spanish, `856fb46`). The submitted PDF is not changed. Re-submission is not possible: the bases closed on 30 September and accept nothing late. The copy is for the defence only. | The PDF contains claims the manuals do not support. | Owner decides how to use it in the defence. |
| D19 | Edge outage buffer (`466118d`) | Implemented: optional file path, one JSON line per row, replay on start, bounded buffer with a dropped counter. Backend deduplication covers signed rows only (identity `device_id, seq, t_iso`); unsigned rows have no deduplication identity. | Pre-proposal 3.5 requires no data loss when the link drops. | Revert `466118d`. Gap: unsigned rows can duplicate after replay. |
| D20 | Backend RBAC (IMP-08) | Not implemented. The only write paths are signed ingest and the synthetic demo controls. Gating the demo controls would break the demo, and a role model needs an identity provider that is not in the repo. | Pre-proposal 8.2 describes it as design. | Owner decides the identity provider and the role matrix. |
| D21 | MQTT over TLS and per-node certificates (IMP-09) | Not implemented. Needs a CA and key lifecycle decision, and TLS in the Rust publisher, which is a dependency change that needs approval. Row signatures (HMAC) stay as the integrity control. | Key lifecycle and dependencies are owner decisions. | Owner decides the CA and provisioning; then one task. |
| D22 | CAN/VHMS speed and load (IMP-11) and in-motion level estimate | Not implemented. No bus source exists. An in-motion estimate needs an uncertainty figure the repo does not have: the only noise figure is the simulator's, not the sloshing bias. A number without evidence breaks the honesty rules. | Pre-proposal 3.1 and 3.5 describe both as design. | Owner decides whether a labelled synthetic signal is acceptable. |
| D23 | Reference truck (GLB) | Integrated on demand on `/wheel`, labelled "HD465-7EO, no es 930E", with CC-BY-4.0 attribution. The file moved with `git mv` (`3a91fda`, so the repo does not grow). Attribution placeholders fixed (`c6eb3f9`). Supersedes D7. | The owner asked for the real model several times. The label and on-demand loading keep it honest. The engine is not separable in this file. | Revert `3a91fda` and `c6eb3f9`. |
| D24 | Level history chart with no data (`/monitoring`) | The DEMO line is drawn only when DEMO mode is on. With no rows and DEMO mode off, the chart shows "Sin filas ingeridas: no hay historial que dibujar." Supersedes D15. Verified in a screenshot. | The owner asked for no misleading line. | Revert `fbda683`. |

## Final status (checks on the integrated tree, `c6eb3f9`)

- `bun test src` from `frontend/`: 737 tests, 0 failing. A run from the repository root reported 137 failures; that was a wrong working directory in the check, not a defect.
- `pytest -q`: 372 passed.
- `astro check`: 0 errors.
- `astro build`: exit 0.
- `edge-sim` Rust suite: all test binaries pass.
- Batch commits, oldest first: `649abeb`, `bfba506`, `71eb6a1`, `cacdff0`, `09179a8`, `f93c244`, `8aef099`, `da856dd`, `76c4d06`, `d150cb2`, `edfef0c`, `a6ad249`, `9616792`, `91c3970`, `5e75c11`, `f40a937`, `2d85147`, `9e40b07`, `fda0c56`, `5957128`, `a426350`, `65ee139`, `bc4f01a`, `03003df`, `856fb46`, `e3a7b8d`, `466118d`, `fbda683`, `3a91fda`, `c6eb3f9`.

## Known gaps left open

- Pre-proposal items not in code: physical sensor acquisition at 1 kHz, in-motion level estimate, CAN/VHMS, MQTT TLS and certificates, backend RBAC, Grafana (not used, D6).
- Unsigned rows can duplicate after an outage replay (D19).
- `ai/level.py` comment still cites SAE 85W-140 next to `CAPACITY_L = 95.0`. Not edited: it is a physics-anchor comment and the owner decides.
- Landing hero 3D is still stylised primitives. The reference truck is only on `/wheel`, on demand.
- The reference truck is cropped at the left edge of its viewer. Not fixed.
- Stitch references: only the regime bands and the ladder-intent text were taken.

## Human-only items

- Rehearse the 8-minute pitch. The bases set the hackathon close at 16 October, 16:00.
- Confirm the team's status for the 14–16 October hackathon. This is not recorded in the repo.
- Decide whether to keep or revert `76c4d06` (D13) and whether the design hook stays on (D14).
- Review the landing, the monitoring page, and the wheel 3D with the reference truck on a real screen. Screenshots were taken with headless Chrome only.
