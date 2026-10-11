# Product readiness: hypothesis and simulator evidence

**Readiness posture: research prototype.** OilGuard demonstrates synthetic signal-processing and interface flows for the 930E / GDY106 use case. Physical pressure-to-volume performance and the field installation remain unresolved; this report makes no deployment or safety claim.

## Problem and hypothesis

Manual level checks require the truck to be stopped on level ground and stabilized; the stated inspection interval is 250 h (`PRODUCT.md`). The product hypothesis is that non-contact observations of pressure, temperature, vibration, and operating state can help identify oil-level or lubricant-condition changes between those checks. The intended role is to supplement, never replace, manual inspection (`PRODUCT.md`).

The simulator generates synthetic cycles and signals to exercise rest detection, residual scoring, and alert flow. Its outputs support a software-logic demonstration only. They do not establish sensor performance or field accuracy (`docs/feasibility.md`, `docs/t9-anomaly.md`, `docs/calibration.md`).

## What is measured, and what is not

The T9 report describes a z-score detector over rest-gated, temperature-compensated pressure residuals. In its documented generated scenarios, the lab-accelerated slow-leak case flags 262/620 scored samples; the abrupt-drop case flags 135/228. A clean run also contains a noise-tail flag, and the 0.5%/h short-run signal is documented as too small to distinguish usefully (`docs/t9-anomaly.md`). These values describe simulator runs, not real equipment.

No weighed-oil calibration run is recorded. The pressure-to-volume relation uses assumed gear-case geometry and remains SYNTHETIC-PROXY; physical correlation, field leak-rate performance, and mounting limits are GAPs (`docs/calibration.md`, `docs/feasibility.md`). The benchmark in `docs/bench/stress.md` is a lab workload measurement on one Apple M3/macOS host; it is not a fleet capacity guarantee. The landing performance report measures browser asset sizes and render-loop behavior, not GPU frame rate (`docs/bench/landing-performance.md`).

## Evidence register

| Provenance | Claim or measurement | Source and limit |
|---|---|---|
| ASSUMPTION | Manual-check context: 250 h interval and 20 min stabilization. | `PRODUCT.md`; describes the stated inspection process, not a field installation. |
| SYNTHETIC-PROXY | T9 synthetic scenario counts: 262/620 for accelerated leak; 135/228 for abrupt drop. | `docs/t9-anomaly.md`; generated simulator scenarios and labels, not field observations. |
| DERIVED | Alert, residual, and rest-window logic can be exercised end-to-end on generated data. | `docs/feasibility.md`, `docs/t7-windows.md`, `docs/t9-anomaly.md`; logical demonstration only. |
| ASSUMPTION | Pressure-to-level conversion uses assumed case geometry; 95 L and approximately 2.6 kPa are model anchors. | `docs/calibration.md`, `sim/geometry.py`; synthetic-proxy, pending physical calibration. |
| SYNTHETIC-PROXY | Leak thresholds and demo risk outputs are prototype rules, not field-calibrated estimates. | `PRODUCT.md`, `docs/calibration.md`; do not interpret as site risk. |
| GAP | Physical pressure-to-volume accuracy, weighted-volume correlation, and field leak-rate performance. | No physical bench run; `docs/calibration.md` marks correlation pending. |
| GAP | Numeric TRL posture. | `docs/research/landing-claims.md` records TRL as unresolved; no numeric value is supplied here. |
| GAP | 30 fps performance target. | `PRODUCT.md` records that no benchmark exists; browser lifecycle timings in `docs/bench/landing-performance.md` are not frame-rate measurements. |
| GAP | Production security, including MQTT/TLS, key management, caller authentication, and role access. | `PRODUCT.md`; row integrity is not a complete security case. |

## Explicit non-claims

- No field validation, field accuracy, customer, customer outcome, testimonial, or real mine deployment is claimed.
- No compliance, safety integrity level, or certification claim is made; IEC 62443 is a design direction, not a compliance result (`PRODUCT.md`).
- No precise litres estimate is asserted without a confidence band and validity state. The model anchors above are assumptions, not measured oil levels.
- No numeric TRL is assigned. The posture remains **UNRESOLVED**, as recorded in `docs/research/landing-claims.md`.
- The 980E-5 / GDY108-C is future work without validation; the narrower stated use case is 930E / GDY106 (`PRODUCT.md`, `docs/feasibility.md`).

## Next evidence needed

Run the documented drain-and-weigh procedure and compare fused level with weighed volume before making a physical accuracy claim (`docs/calibration.md`). Keep the simulator, browser measurements, and any future bench results separated by provenance. Human review is required for product comprehension; this document is not that test.
