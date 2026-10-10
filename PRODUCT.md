# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

**Stack:** Astro + Preact dashboard, FastAPI with Python 3.12 and Polars,
InfluxDB, Mosquitto, and a Rust/Tokio edge simulator.

## Users

The primary user is a mine maintenance / reliability engineer. Their situation is a decision about equipment they are accountable for: a Komatsu 930E haul truck whose GDY106 motorized-wheel final drives are inspected on a 250 h manual cycle. Their job is to decide whether continuous oil-level monitoring can supplement the drain-plug and magnetic-plug check, and to know when a wheel warrants intervention before a traction-motor failure.

The pre-proposal defines four operational recipients, one per alert level, and the interface must keep them distinct rather than addressing a single generic operator:

| Level | Recipient |
|---|---|
| N1 — tendencia | Confiabilidad (reliability engineering) |
| N2 — fuga confirmada | Planificación de mantenimiento |
| N3 — ventana de turno | Despacho y supervisor |
| N4 — pérdida crítica | Operador |

Direct beneficiaries are maintenance technicians, reliability engineers, and maintenance supervisors. Secondary beneficiaries are maintenance management and planning, mine operations, and fleet customers.

Stated experience target: a maintenance supervisor understands fleet state in seconds and reaches one wheel's detail in two clicks, with the wheel as the unit of analysis. The current monitoring page provides a fleet table with direct links that carry the selected truck and wheel into wheel detail.

A demo audience — the judge who walks the guided path in under five minutes — is a vehicle for showing the product, not a product user. The two must not be confused in the interface.

## Product Purpose

There is no continuous oil-level device for Komatsu 930E motorized wheels. The level is verified only with the truck stopped, on level ground, after 20 minutes of stabilization, and inspections every 250 h leave a blind spot of hundreds of hours in which a leak or lubricant degradation can escalate into catastrophic failure of the GDY106 traction motor.

OilGuard estimates level continuously by fusing pressure, temperature, vibration and operational variables, and uses the haul cycle's natural pauses — stopped, level, engine running — to recalibrate that estimate and to characterize lubricant condition via the settling transient.

Success means a maintenance engineer can read a trend, trust where each number came from, and act on it — and can tell exactly how much to trust it. OilGuard **complements** maintenance inspection; it does not replace it.

## Positioning

Non-invasive, non-contact sensing of a final drive that is not designed to be instrumented: a chain installed on existing service points, with no drilling, no permanent modification, and no component touching the oil. Existing service points on the GDY106 output train (items 56/41/39) rotate with the output. The settling transient is repurposed as a viscosity proxy, and every displayed value carries its own provenance.

**The competitive frame is a live Komatsu patent, verified.** US 12,073,660 B2, "System and method for monitoring the state of the oil of truck wheels", Komatsu Reman Center Chile SA, granted 2024-08-27, active, expires 2040-09-23. It monitors oil state through an autonomous sensor that **rotates with the wheel in motion** and has **direct access to the oil**, combined with the motor's electric signature.

The defensible axis is therefore narrower than "quantity versus quality". The patent description states that its sensor "can also be used to detect an oil level, for example, in an engine oil housing." Level is inside the patent's own disclosure. What the patent does not claim is the axis OilGuard actually occupies:

- existing service points on the GDY106 output train (items 56/41/39) rotate with the output;
- no contact with the lubricant, so the instrument cannot be abraded by the very wear it monitors;
- no permanent modification to the machine.

A neighbouring product cannot truthfully copy that claim without re-deriving the calibration for one specific final drive — and the accumulated assumption register (VERIFIED / DERIVED / ASSUMPTION / GAP per parameter) is the part that cannot be copied at all.

## Operating Context

- Four-service local Docker Compose stack: InfluxDB 2.7.6, Eclipse Mosquitto 2.0.18 as an anonymous local mock broker, FastAPI ingest/query, Astro dev server (Bun).
- The Rust edge simulator is a synthetic fleet-load tool; it is not a field
  gateway or a production device implementation.
- Transports and identities: MQTT topic `oilguard/signals`, InfluxDB org and bucket `oilguard`, device id `wheel-RH-01`, measurement `oilguard_signals`.
- Local only for the prototype. No remote steps, no hardware, no push required.
- No HTTP caller authentication, authorization, or multi-tenancy in the current build — explicit non-scope, though the proposal commits to role-based access in the backend as part of the industrial design. Per-device row signatures protect signed measurements under a shared key; they do not authenticate HTTP clients.
- The proposal's deployment sequence is staged to reduce technical and financial risk: test bench → single-truck controlled pilot → limited-fleet pilot → progressive scale-up.
- Connectivity is Wi-Fi + MQTT for the prototype; LoRaWAN is named as the industrial deployment alternative still to be validated.
- Bilingual EN/ES interface and documentation; code identifiers and comments stay English. Spanish uses a neutral professional register.
- This is a competition entry: **Hack the Challenge 2026 — NTT DATA & Komatsu**. The team is four final-year Ingeniería en Informática students, which is the stated eligibility requirement: Matías Atuan (hardware, IoT, data), Pablo Aros (hardware, data, AI), Sebastián Bravo (backend, dashboard), Francisco Fernández (software, integration, UX).
- A guided under-five-minute walkthrough exists as the demo vehicle.

## Capabilities and Constraints

**Confirmed functionality**

- Three Astro page routes: `/mine` (930E mine and fleet), `/wheel` (GDY106 cutaway), and `/monitoring` (dashboard). Legacy hashes redirect to these routes; normal navigation uses paths, not hash routing.
- The synthetic signal generator retains a four-state `LOAD | HAUL | DUMP | WAIT` telemetry loop of 29 s; AI RUL-to-warning is compared with an 8 h maintenance shift. The mine's five-truck visual fleet instead uses an eight-state PLM III FSM. These are separate simulations: the former supplies synthetic telemetry while the latter renders the mine fleet.
- In the signal generator, the mode gate is `MOVING` over HAUL and WAIT, and `REST` over LOAD and DUMP. Recalibration is permitted only when stopped, level, and engine on.
- Oil level derived from pressure fusion, presented with a ±σ confidence band, rest-window shading, and N1–N4 escalation plus remaining useful life.
- Alerts ladder N1 watch → N2 warning → N3 warning → N4 critical, each carrying reason, window, and zone.
- Combined-risk recognition: the tested dashboard `SYNTHETIC-PROXY` rule alerts when at least two `ASSUMPTION` thresholds are crossed: oil ≤ 47.5 L, temperature ≥ 90 °C, or vibration ≥ 7 mm/s. Current is displayed but is not an input. This is not the calibrated backend N1–N4 leak analysis or a field-validated risk estimate.
- Fleet overview: `/mine` runs five simulated trucks, while `/monitoring` displays synthetic-proxy wheel rows and direct truck/wheel links to `/wheel`; these are not live calibrated fleet telemetry.
- Manual inspection reference chain for the GDY106, with fixed manual item numbers that must never be renumbered.

**Instrumentation defined in the proposal**

| Variable | Sensor | Mount point |
|---|---|---|
| Oil level (estimated) | MEMS pressure transducer | Drain plug, via a T-adapter that preserves the original plug |
| Temperature | Type K thermocouple | Magnetic plug |
| Vibration | Triaxial MEMS accelerometer | Sun pinion inspection cover, epoxied |
| Current / speed / load | Non-invasive Hall sensor | Motor power cable, plus CAN / VHMS |

Edge node is an ESP32-S3 acquiring vibration at 1 kHz and pressure and temperature at 10 Hz, detecting moving/rest state from the accelerometer on the node itself, and extracting features on the edge rather than shipping raw signal. The gateway is a Raspberry Pi or industrial Linux host providing store-and-forward so no data is lost when the truck leaves network range. The 120 °C lubricant temperature and traction-motor EMI are addressed with high-temperature sealing, shielded cable, and spectral analysis of vibration. Final mount locations are to be validated experimentally for accessibility, temperature, vibration, and lubricant contact.

**Hard constraints**

- Validated scope is 930E / GDY106 at 32.62:1 only. The 980E-5 with GDY108-C at 35.02:1 is named in the product's public name as target equipment but is future work **without validation** and must never be presented as validated.
- No drilling the gear case. Any sensing concept that requires it fails the product test.
- Oil capacity 95 L, SAE 85W-140, approximately 2.6 kPa at full.
- Level gates: warning below 50 % (47.5 L), critical below 30 % (28.5 L).
- RUL gates: n ≥ 10, σ_L ≤ 2.0 L, negative slope, R² ≥ 0.30.
- The bench drain-and-weigh calibration is the pivot for promoting level-from-pressure fusion, and it has not run.
- **RUL scope is deliberately narrow.** RUL is reported over the lubrication condition — estimated mass and loss rate — *not* over the final drive's remaining life, which depends on load history, mounting and accumulated wear. If level precision proves insufficient, early anomaly detection takes priority over life prediction.
- **AI scope is deliberately simple.** Statistical baseline or Isolation Forest for anomalies; regression only once the bench demonstrates sufficient correlation against real reference; trend extrapolation for RUL. Mode detection uses the accelerometer with simple rules and is explicitly *not* machine learning. Survival models and Bayesian fusion are explicitly future and out of the prototype scope.
- Manual inspection today requires the truck stopped on level ground after 20 minutes of stabilization. Continuous monitoring complements that check rather than replacing it.

**Explicitly undecided**

- Security slice — per-row HMAC-SHA256 integrity verified before ingest — is implemented in the prototype. This is not IEC 62443 compliance. MQTT/TLS, device certificates, secure key provisioning/storage/rotation, HTTP caller authentication, and role-based access remain gaps; no role model exists in code.
- Dashboard technology. The proposal names Grafana; the repository deliberately chose a custom Astro + Preact dashboard (React until the 2026-10-09 migration) with Grafana recorded as an alternative.
- CI. `.github/workflows/ci.yml` runs the Python tests, frozen-lockfile frontend tests and build, and Compose configuration validation on pushes and pull requests.
- Performance. The ≥ 30 fps target has no recorded benchmark.
- The simulator load and telemetry are synthetic. Throughput and latency
  figures are lab measurements from one Apple M3/macOS workstation, not fleet
  capacity guarantees; see [`docs/bench/stress.md`](docs/bench/stress.md).

## Brand Commitments

- Name `OilGuard Mining`, described publicly as real-time monitoring for **Komatsu 930E and 980E** wheels. Validation scope is narrower than that name; keep the two apart in every claim.
- Tagline `Digital twin · Komatsu 930E-4SE · GDY106` and its Spanish equivalent.
- Mark: `OG`, a rounded square in a Komatsu-yellow gradient.
- Color identity is Komatsu yellow on graphite, declared as such in the product theme. Yellow is simultaneously the brand color and the machine color in the 3D scene — one token by value, and that overlap is intentional.
- Status palette is fixed and semantic: green rest/OK, amber caution, red critical, blue moving. These meanings must not be reassigned for decoration.
- Inter by name with a system fallback stack, and tabular numerals on every readout so figures do not jitter as they update.
- **The honesty contract is permanent product DNA, not scaffolding.** Every value traces to its provenance, and unproven status stays visible in the interface after calibration exists. Interface copy may never imply field accuracy, and a missing backend degrades to an explicitly labeled local dataset rather than to silence or stale live-looking data.
- **Read-only posture is part of the promise.** OilGuard never connects to the truck's control bus and has no physical or logical path to machine control. The prototype edge mock can sign measurement rows with per-device HMAC-SHA256 and the backend verifies them before storage; this is a row-integrity slice, not IEC 62443 compliance or a complete industrial security case. Production still requires encrypted and device-authenticated MQTT/TLS, secure key provisioning/storage/rotation, signed firmware updates, role-based backend access, and a segmented instrumentation network.
- Dashboard styling uses semantic tokens from `frontend/src/theme.css`; a scan of `frontend/src/dash/*.tsx` found no inline hex color literals.

## Evidence on Hand

**Verified**

- **US 12,073,660 B2** — patent exists, is active, and is held by Komatsu Reman Center Chile SA. Confirmed directly against Google Patents: title, assignee, inventors Arroyo and Orellana, priority 2019-04-05, granted 2024-08-27, adjusted expiration 2040-09-23. Its disclosure explicitly includes oil level as a use of its sensor, which bounds the differentiation claim.
- Six current 1600 × 1000 headless-browser screenshots of `/mine`, `/wheel`, and `/monitoring` in EN and ES are in `docs/screenshots/pro-twin-*.png`. Other older PNG files are not part of this current capture set.
- `ai/flags.jsonl` — 135 lines of genuine anomaly-flag output, a true-positive abrupt-drop case.
- `docs/thesis-annex.md` — the parameter table records evidence labels and source references; see the annex for current scope and assumptions.
- `docs/research/twin-reference.md` — a 354-line sourced research sheet.
- Recorded pass results for windowing, anomaly detection, the N1→N4 walk, and a backend ingest smoke test.
- A cross-language physics parity fixture.
- Latest local suite results (2026-10-09): `python3 -m pytest -q` → 97 passed, 3 existing deprecation warnings; `cd frontend && bun test src` → 168 passed, 0 failed.

**Stated in the pre-proposal, not independently substantiated**

- Module economics: approximately USD 150 per wheel, USD 300 per truck (two motorized wheels), USD 15,000 for a 50-truck fleet. Explicitly module-only — excluding installation, network infrastructure, calibration, maintenance, software, and integration engineering.
- A documented case of approximately USD 150,000 saved and five days of unplanned downtime avoided on a Komatsu 930E, attributed to a Razor Labs DataMind AI final-drive-bearing case study (2026). **This citation could not be verified.** No Razor Labs case study matching that title was found, and the published Komatsu 930E case studies report different figures on different subsystems — aftercooler and turbocharger USD 120,000 / 4 days; radiator core USD 85,000 / 3 days; combustion imbalance USD 190,000 with 20 hours saved; air intake USD 65,000 / 2 days; thermostat USD 12,000 / 8 hours. None concerns a wheel motor or final-drive bearing. The figure is used twice in the pre-proposal, in §06 and §07.3, and must not be carried into interface copy or a submission until the source is traced or the claim is restated.

**Future work must not fabricate**

- No physical bench data, no weighed oil volume, no field leak measurement.
- No field-accuracy claim of any kind.
- No testimonials, customers, or case studies.
- No performance benchmark — the fps target is unmeasured.
- No real telemetry: every signal is synthesized.
- No third-party 930E model with verified licensing, which is why the truck is a procedural reconstruction.
- Two incompatible numeric pressure scales coexist across older documents. Any figure must be traced to the geometry rescale before reuse.

## Product Principles

1. Provenance before precision. A number without a source is a liability on safety-critical equipment, so source beats accuracy everywhere they conflict.
2. No-drill, no-contact, no permanent modification. Anything that opens the gear case, touches the lubricant, or permanently modifies the machine fails the product test. Existing service points on the GDY106 output train (items 56/41/39) rotate with the output.
3. Read-only, always. The instrument watches the machine and never reaches its control. This is the safety posture and the security posture at once.
4. Honest scope beats broad scope. One validated final drive, named limits, and explicit future work outrank a wider claim nobody can defend.
5. Fail visible, never silent. Degrade to a labeled local dataset rather than erroring out or, worse, presenting stale data as live.
6. Narrow the claim until it survives scrutiny. Scope an output to what can actually be defended — RUL on lubrication rather than on the reducer's life — and say the limit out loud.

## Accessibility & Inclusion

Bilingual EN/ES is a product requirement rather than a convenience, because the workforce in scope is Spanish-speaking, and four of the four alert recipients are roles that a Spanish-language interface serves directly.

Committed in the existing implementation: a visible two-pixel brand-yellow focus outline on every interactive element, `prefers-reduced-motion` suppression of transitions, ARIA roles with current/pressed/expanded/selected state throughout, arrow-key navigation across the drawer tablist, charts exposed as labelled images, and tabular numerals on numeric readouts.

No formal target standard is set. WCAG conformance has not been claimed and must not be asserted until it is. IEC 62443 applies to the industrial cybersecurity posture, not to accessibility, and must not be borrowed as an accessibility claim.

## Honesty guard

The frontend test suite scans `frontend/src` for unsupported customer, performance, certification, financial, and machine-control claims. It normalizes case and accents, respects short-token word boundaries, and reports each match with its source line and reason; the path-specific exception allowlist is intentionally empty.
