# OilGuard Mining

## What it is

OilGuard Mining is a local research prototype for monitoring oil-condition signals associated with the Komatsu 930E/GDY106 motorized wheel. It combines a local backend, MQTT-based synthetic telemetry, and a dashboard. The supported model scope and evidence status are documented in [the feasibility assessment](docs/feasibility.md).

## What it is not

This is not a field-deployed product: it has no connected truck hardware and is not calibrated in the field. Synthetic and deterministic demo data are not field measurements, and the prototype does not control a truck. See [the demo guide](docs/demo-script.md) and [the calibration status](docs/calibration.md).

## Run it

From the repository root, run the one-command local demo:

```bash
./scripts/demo.sh
```

Open `http://localhost:5173/monitoring`. The demo starts the local services and simulator; the dashboard labels demo data as synthetic.

The plain MQTT listener on `localhost:1883` is development-only and has no password; mTLS on `8883` is the secure path.

## What is validated—and what is not

Repository evidence covers simulator parity fixtures and local demonstration flows. It does not establish physical bench correlation, field accuracy, or operational readiness. Read [telemetry architecture and integrity](docs/architecture-telemetry.md), [edge simulator evidence and limits](docs/edge-sim.md), and [calibration limits](docs/calibration.md).

## Documentation

- [Five-minute demo guide](docs/demo-script.md)
- [Feasibility assessment](docs/feasibility.md)
- [Calibration procedure and status](docs/calibration.md)
- [Telemetry architecture](docs/architecture-telemetry.md)
- [Edge simulator](docs/edge-sim.md)
