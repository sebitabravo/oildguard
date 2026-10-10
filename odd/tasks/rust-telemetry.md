# Rust edge simulator + high-throughput telemetry pipeline

## Objective
Replace the Python edge simulator for load and fleet scenarios with a Rust (Tokio + rumqttc) simulator
that emits the existing OilGuard signal schema for N devices (1 to 10,000) at a configurable rate,
scale the Python backend ingestion and analytics with Polars on Python 3.12, and add a thesis-grade
benchmark framework (throughput vs latency, float vs decimal precision drift).

## Source and analysis
Input: an external architecture prompt (`~/Downloads/gemini-code-1791620993726.txt`, not versioned)
proposing Rust simulator + FastAPI/Polars/DuckDB + MQTT + Astro/Preact/ECharts + benchmarks.

Decisions (Claude, orchestrator; user delegated all decisions):
- ADOPT: Rust/Tokio/rumqttc simulator with N devices, configurable rate, jitter, deterministic seeds,
  edge store-and-forward buffer, ogs1 HMAC signing byte-identical to `shared/signing.py`.
- ADOPT: Python 3.12 for backend and CI; Polars for windowed fleet aggregations (mean, percentiles,
  min/max, count) and a WebSocket stream of per-second aggregates; batched ingestion.
- ADOPT: benchmark framework (stress matrix throughput vs end-to-end latency; f64 vs decimal drift on
  1,000,000 readings in Rust and Python).
- KEEP: the existing OilGuard row schema (wheel oil level). The prompt's schema (ore grade, fuel,
  GPS) belongs to a different product; mixing it would break the honesty contract and every existing
  analytic. Documented as out of scope.
- KEEP: Python `sim/generate.py` as the physics reference used by `ai/` and tests; Rust must match it
  through shared fixtures (`tests/fixtures/physics_parity.json`, `tests/fixtures/signing_vectors.json`).
- REJECT: DuckDB (Polars covers the in-memory aggregations; one engine less). REJECT: Apache ECharts
  (adds a large dependency against the Astro bundle goal; the dashboard keeps its SVG chart).
- Binary payloads: JSON stays the wire format (backend contract, debuggability); the simulator may add
  a length-prefixed batch mode later only if the benchmark proves JSON is the bottleneck.

## Scope and ownership (no overlap; each agent in its own git worktree and branch)
- Copilot (pane w1K:p4) — `edge-sim/` Rust crate only. Worktree `../oilguard-wt-rust`, branch
  `feat/rust-edge-sim`.
- OpenCode (pane w1K:p3) — `backend/` + `tests/test_backend_*` + `requirements*.txt` +
  `backend/Dockerfile`. Worktree `../oilguard-wt-backend`, branch `feat/backend-polars`.
- Codex (pane w1K:p2, low weekly quota) — `bench/precision/` only. Worktree `../oilguard-wt-bench`,
  branch `feat/precision-bench`.
- Claude — fixtures, `docker-compose.yml`, `.github/workflows/ci.yml`, `bench/stress/`, docs,
  merges into `feat/rust-telemetry`, verification.

## TDD
On (project rule). Runners: `cargo test` (edge-sim), `python3 -m pytest -q`, `bun test src`.

## Tasks
- [x] R0 Cross-language signing vectors fixture (`e0ba0f1`). Route: inline (Claude).
- [x] R1 Rust edge simulator crate (Copilot; 7ea2510, f72144d, d7658c7, bc78332, 19bea20 incl. R1b realtime engine; merged 89d65e7). Route: delegated (Copilot).
- [x] R2 Backend Python 3.12 + Polars aggregations + WebSocket + batched ingest (OpenCode; merged adb6fb3, d67a725; fixes ae6ace5 rolling counter, 41401bf health cache). R2b ingest perf (54714b7..7e4cb15), R2c async Influx writer (036a831..7574f83), R2d incremental tick/outages (9e22a50, 511ec3e, 3d28a7c). Route: delegated (OpenCode).
- [x] R3 Precision benchmark f64 vs decimal, Rust and Python (Codex 5103c31, 509a3f3, 1cb9d33; level-formula fix cba3d5a by Claude subagent; merged 901ea83). Codex RDD consent declined to save its quota; Claude reviewed the diff.
- [x] R4 Integration: compose service `edge-sim` (profile), CI jobs (cargo, py3.12), merge (Claude; eca7486, c5d5fc2, af7ea93, 01c2d64; actionlint clean).
- [x] R5 Stress benchmark matrix + report `docs/bench/` (Claude; runner 3db2008..afd1830 — its tests were written after the code, recorded honestly; baseline 38f001e; after-optimization deb38c0: 1,000 devices 9,699 rows/s, 957 drops, p99 3.1 s).
- [x] R6 Docs: README, thesis annex rows, PRODUCT/SCHEMA updates (Copilot 42efb9d, 45f24e0, 211643a; merged 66bef32; annex P34 699461c).
- [ ] R7 Final verification and QA pass — folded into `odd/tasks/final-design.md` F6 (OpenCode Playwright, three engines).
- [x] R8 Live fleet telemetry panel (Copilot ab62422, ea27edf, error boundary f1fb631; merged f08e273) — later moved to `/fleet` by the final design.

## Acceptance criteria
- `cargo test` green; Rust canonical bytes and signatures equal `signing_vectors.json`; deterministic
  physics within 1e-9 of `physics_parity.json`; statistical parity of noisy outputs vs Python.
- Simulator sustains >= 1,000 devices x 10 Hz on this laptop with bounded RSS (measured, reported).
- Backend: all existing tests green on Python 3.12; new aggregation endpoints and WebSocket tested.
- Benchmarks produce committed reports with method, environment and raw numbers.
- No push (no remote). Protected local files untouched.

## Progress / evidence
- R0: `python3 -m pytest -q tests/test_signing_vectors.py` RED (3 failed, fixture missing) then GREEN
  (3 passed) after `python3 tests/make_signing_vectors.py`; 12 vectors.

## Next step
Continues in `odd/tasks/final-design.md` (integration branch `feat/final-design` contains all R work).
