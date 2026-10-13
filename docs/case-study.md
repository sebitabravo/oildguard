# OilGuard Mining: research prototype case study

## Problem

Oil-condition monitoring for a motorized wheel needs interpretable signals, clear alert evidence, and honest limits on what a prototype demonstrates. The documented scope is the 930E/GDY106; broader model coverage remains unvalidated ([feasibility assessment](feasibility.md)).

## Solution

OilGuard combines generated telemetry, an MQTT path, a local backend, and a dashboard. The interface distinguishes backend data from deterministic demo data, while laboratory views use synthetic fixtures ([demo guide](demo-script.md), [telemetry architecture](architecture-telemetry.md)).

## Evidence

Repository evidence includes simulator parity fixtures and synthetic scenario demonstrations ([edge simulator](edge-sim.md), [calibration status](calibration.md)). These support software-path and model-logic checks, not field performance.

## Limits

No physical bench correlation or field calibration has been completed. The prototype has no truck-control path; generated or deterministic values must not be presented as field measurements ([calibration status](calibration.md), [demo guide](demo-script.md)).

## Demo

Run `./scripts/demo.sh` from the repository root and open `http://localhost:5173/monitoring`. Follow the [demo guide](demo-script.md) to distinguish local backend values from synthetic demo evidence.
