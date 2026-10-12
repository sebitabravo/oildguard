# Overnight decisions — 2026-10-12

The owner delegated all decisions for this batch. Each decision below has a reason and a way to reverse it. Commits are on `feat/integrity-narrative`. Nothing was pushed.

## Decisions taken

| # | Topic | Decision | Reason | Reversal |
|---|---|---|---|---|
| D1 | `bun:test` typing | Stub `frontend/src/bun-test.d.ts` extended with the matchers the tests use (`toBeNull`, `toBeDefined`, `toMatch`, `toHaveLength`, `toThrow(expected?)`) and `it` (`f40a937`, `be3b4d3`). No test file was edited. | `astro check` failed on test typings. The stub is types only; runtime is unchanged. | Revert `f40a937` and `be3b4d3`. |
| D2 | Two `VERIFIED` tags in the landing stats | Changed to `ASSUMPTION` (`5e75c11`): simulator sample rate, and the N1–N4 ladder. | Both are design targets with no field or bench evidence. | Revert `5e75c11`. |
| D3 | Reservoir spec in the landing | 95 L kept as the model anchor. The grade is shown as not confirmed in the manuals; tag is `ASSUMPTION` (`8aef099`). | The 930E manual gives 95 L on one page and 76 L on another. SAE 85W-140 is not in the supplied manuals. | Revert `8aef099`. |
| D4 | Codex design hook | Decided: the hook stays on. `.codex/hooks.json` is unchanged. Codex briefs forbid committing design-hook changes outside their scope. | The Stop hook led an agent to commit an unrequested CSS change (`76c4d06`). | Remove the Stop hook entry from `.codex/hooks.json`. |
| D5 | gentle-ai review | Not started in this batch. | Consent is per change. The reviewed range spans 242 files and prior history. | Start on request. |
| D6 | Grafana | Not used. The custom Astro/Preact dashboard stays. | Replacing the dashboard is out of scope. The bases require open-source tools, and the current stack uses them. Adding Grafana needs a new container image, which the owner has not approved. | Owner approves the image, then one task. |
| D7 | GLB `komatsu_hd-465-7eo.glb` | Superseded by D23. | — | — |
| D8 | Backlog items that need an owner decision | IMP-04 (RUL band) and IMP-07 (anomaly baselines) implemented (D16, D17). IMP-05, IMP-08, IMP-09 and IMP-11 are decided in D19–D22. | Each open item needs a policy, a dependency approval, or a data source that is not in the repo. | Each becomes a task once decided. |
| D9 | `AGENTS.md` | Two sentences corrected: UI is Spanish-only, and there is no `@` alias, so use a relative import. | Agents followed the stale bilingual rule and an alias that does not exist. | Revert `bc4f01a`. |
| D10 | Claims in the submitted pre-proposal PDF | Decided: the submitted PDF is not edited. The corrected copy (`856fb46` Markdown, `68211a7` PDF) is the document for the defence. Corrections: USD 150,000 and the Razor Labs source, SAE 85W-140, 120 °C for the gearcase, 3,000 / 92 RPM. | The supplied manuals do not support them (see `/tmp/og-goal/explore/AUD-02-komatsu-facts.md`). | Owner decides how to present it. |
| D11 | Landing framing test (`assembly.test.ts`) | Framing expectations changed: 1440 px distance 4.7 → 5, 915 px 6.1 → 6.25 (`2d85147`). Assertions stay exact (`toBeCloseTo`, precision 10). | The hero assembly clipped at the bottom-left gear. | Revert `2d85147`. |
| D12 | `AGENTS.md` committed | Committed as `bc4f01a`, including the owner's pending rules and the corrections from D9. | The owner delegated this decision. | Revert `bc4f01a`. |
| D13 | Design hook commit `76c4d06` | Decided: keep. `DESIGN.md` asks for hairline borders on data surfaces; the change moves the veto callout that way. | Consistent with the design rule. | Revert `76c4d06`. |
| D14 | Stop-hook design fixes in Codex | Decided: codex agents report design-hook findings and do not commit them unless their brief covers them. The L81 Geist finding stays open, unattributed. | Hook-driven commits caused scope creep. | Remove the Stop hook entry (see D4). |
| D15 | Level history chart with no data (`/monitoring`) | Superseded by D24. | — | — |
| D16 | RUL band and headline (`a426350`, `65ee139`) | Band = 95 % confidence interval on the slope, two-sided Student t from a lookup table, df = n − 2. Suppressed with `pendiente_no_significativa` when the slope interval contains zero. Headline hours restored to the original formulas; the first commit had silently changed them. Evidence: `/tmp/og-goal/evidence/RUL-03/headline-comparison.txt`. | Implements pre-proposal section 4.3 with a stated method. | Revert `a426350` and `65ee139`. |
| D17 | Anomaly baselines (`5957128`) | One baseline per `(device_id, mode)`. A key with too few samples gets an explicit insufficient status, never a silent fallback. | Implements pre-proposal section 5 with a stated rule. | Revert `5957128`. |
| D18 | Re-submission of the pre-proposal | Decided: not re-submitted. The bases closed on 30 September and accept nothing late. The corrected copy is for the defence only. | Bases section 3 and the deadline. | — |
| D19 | Edge outage buffer (`466118d`) and unsigned identity (`88a00e2`) | Edge: optional file path, one JSON line per row, replay on start, bounded buffer with a dropped counter. Backend: unsigned rows with no `device_id` or `seq` are rejected and counted; in permissive mode unsigned duplicates are accepted and counted, not dropped (the existing spec in `tests/test_fleet_ingest.py` requires acceptance). | Pre-proposal 3.5 requires no data loss on link loss. | Revert `466118d` and `88a00e2`. Gap: in permissive mode, unsigned duplicates still reach storage after a replay. |
| D20 | Human RBAC | Decided: not implemented. The backend has one write endpoint, `POST /ingest`, authenticated per row by HMAC. There is no human write path to protect. A role model needs an identity provider, which the repo does not have. | Evidence: `rg "@app\.(post|put|patch|delete)" backend/*.py` returns one route. | Owner decides the identity provider and the role matrix. |
| D21 | MQTT over TLS and device certificates | Implemented in part. Broker TLS listener on 8883 requires client certificates and maps the identity to the username (`2fc990c`, `8a82913`). Development CA and per-device certificates are generated by `scripts/gen-dev-certs.sh` into `mosquitto/certs/` (gitignored). Python ingest TLS, optional, standard library only (`2fc990c`). Rust publisher TLS through the existing default features of `rumqttc`, with no lockfile change (`01a6e2d`). Gaps below. | The owner delegated the decision. The Rust side needed no new package. | Revert `2fc990c`, `01a6e2d` and `8a82913`. |
| D22 | CAN/VHMS and in-motion estimate | CAN/VHMS: optional `speed_kmh` and `load_pct`, default `null`, no source connected (`88a00e2`). A simulated signal was attempted and stopped (D28). In-motion estimate: not implemented. `ai/level.py` gates moving rows by design, and the repo has no uncertainty figure for them. | A number without evidence breaks the honesty rules. | Owner decides whether a labelled synthetic signal is acceptable and whether to change the signed schema version. |
| D23 | Reference truck (GLB) | Integrated on demand on `/wheel`, labelled "HD465-7EO, no es 930E", with CC-BY-4.0 attribution. The file moved with `git mv` (`3a91fda`, so the repo does not grow). Attribution placeholders fixed (`c6eb3f9`). Framing fits the model bounds with margins (`c2c89ca`). Supersedes D7. | The owner asked for the real model several times. The label and on-demand loading keep it honest. | Revert `3a91fda`, `c6eb3f9` and `c2c89ca`. |
| D24 | Level history chart with no data (`/monitoring`) | The DEMO line is drawn only when DEMO mode is on. With no rows and DEMO mode off, the chart shows "Sin filas ingeridas: no hay historial que dibujar." Supersedes D15. Verified in a screenshot. | The owner asked for no misleading line. | Revert `fbda683`. |
| D25 | `ai/level.py` comment | The comment no longer cites SAE 85W-140 as a fact; it says the grade is not confirmed in the manuals (`8f8a0a6`). The value `CAPACITY_L = 95.0` is unchanged. | Honesty rule: no unsourced claim in code. | Revert `8f8a0a6`. |
| D26 | Pre-proposal PDF render | `docs/pre-propuesta-corregida-2026.pdf`, five pages, rendered from the Markdown copy with pandoc and headless Chrome (`68211a7`). The first page was checked visually. | The defence needs a readable copy. | Revert `68211a7`. |
| D27 | Hero 3D | Decided: stays procedural. No GDY106 model is supplied, and the reference HD465 does not contain the wheel motor. The procedural cutaway is labelled as such. | Honesty: a real-looking model of the wheel motor would be an invented asset. | Owner decides whether to commission a model. |
| D28 | Simulated CAN/VHMS signals (SIM-03) | Stopped and reverted. Adding `speed_kmh` and `load_pct` to the generator breaks the golden-row and signing-vector tests (`test_generator_golden.py`, `test_signing.py`, `test_signing_vectors.py`). The patch and the test are kept as evidence in `/tmp/og-goal/evidence/SIM-03/`. | Changing signed payloads and golden vectors is a schema-version decision, not an implementation detail. Not made silently. | Owner decides a schema version 2 with the signed-row change. |
| D29 | Device certificates: scope reached | Broker requires a client certificate on 8883 (`8a82913`). The plain 1883 listener stays active for the local demo, as a development-only gap. Edge publisher: one shared connection, so the device certificate authenticates that connection, not each synthetic device separately. Backend container: certificate paths are set but the broker does not mount them for the backend yet. | The 1883 listener is used by the running demo. Switching it off needs a live rerun of the whole stack. | Owner decides the switch-over window. |

## Operational notes

- A fresh checkout must run `scripts/gen-dev-certs.sh` (with the device ids) before `docker compose up`. The broker config loads `mosquitto/certs/ca.crt`, `server.crt` and `server.key` on 8883. Without those files, the broker will not start. This is a known risk for any new environment.
- The certificates in `mosquitto/certs/` were generated on 2026-10-12 for `backend`, `wheel-LH-01` and `wheel-RH-01`. The broker was restarted with them, and its log shows the 8883 listener opening without errors.
- I could not repeat the live TLS check (no-certificate refusal, certificate acceptance) from my side. The shell hook blocks reading certificate and key files. The last live check, done by a Codex before the certificates were regenerated, passed.

## Final status (checks on the integrated tree)

- `bun test src` from `frontend/`: 738 tests, 0 failing. Run from the repository root, bun reports false failures; always run it from `frontend/`.
- `pytest -q`: 385 passed.
- `astro check`: 0 errors.
- `astro build`: exit 0.
- `edge-sim` Rust suite: all test binaries pass (13 tests in the last run).
- Batch commits, oldest first: `649abeb`, `bfba506`, `71eb6a1`, `cacdff0`, `09179a8`, `f93c244`, `8aef099`, `da856dd`, `76c4d06`, `d150cb2`, `edfef0c`, `a6ad249`, `9616792`, `91c3970`, `5e75c11`, `f40a937`, `2d85147`, `9e40b07`, `fda0c56`, `5957128`, `a426350`, `65ee139`, `bc4f01a`, `03003df`, `856fb46`, `e3a7b8d`, `466118d`, `fbda683`, `3a91fda`, `c6eb3f9`, `035821b`, `68211a7`, `2fc990c`, `01a6e2d`, `88a00e2`, `c2c89ca`, `8f8a0a6`, `be3b4d3`, `8821d76`, `8a82913`.

## Known gaps left open

- Not implemented: in-motion level estimate (D22), human RBAC (D20), per-device identity for the edge publisher (D29), removal of the plain 1883 listener (D29), a real CAN/VHMS source (D22), a labelled simulated CAN/VHMS signal (D28), Grafana (D6).
- In permissive mode, unsigned duplicates still reach storage after a replay (D19).
- The landing hero 3D is procedural (D27).
- The reference truck is only on `/wheel`, on demand.
- Fresh checkouts need the certificates generated before the broker starts (operational notes).
- Stitch references: only the regime bands and the ladder-intent text were taken.

## Human-only items

- Rehearse the 8-minute pitch. The bases set the hackathon close at 16 October, 16:00.
- Confirm the team's status for the 14–16 October hackathon. This is not recorded in the repo.
- Review the landing, the monitoring page, and the wheel 3D with the reference truck on a real screen. Screenshots were taken with headless Chrome only.
- Check the commit `2fc990c`, whose subject is 55 characters against the 50-character rule. It was not amended, because history is not rewritten without permission.
- Decide the schema version for signed rows (D28) and the switch-over window for the 1883 listener (D29).
