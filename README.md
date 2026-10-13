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

The script needs no Docker. It starts the local backend, a deterministic synthetic feeder, and a preview of the UI. Open the URL the script prints (`/monitoring`, `/wheel`, `/rul`). The dashboard labels all data as synthetic and the RUL estimate as synthetic.

The backend uses port 8001 when available (otherwise a free port); set `OILGUARD_DEMO_BACKEND_PORT` to override it. The UI preview uses port 4321.

The plain MQTT listener on `localhost:1883` is development-only and has no password; mTLS on `8883` is the secure path. On `8883` the broker sets `require_certificate true`, so a client without a valid certificate is refused during the TLS handshake.

The Compose file uses local demo values for the InfluxDB and broker credentials. Replace them before exposing any service outside your machine.

For the Python test environment, run from the repository root:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
```

Backend pins are in `backend/requirements.txt`, and the test client dependency is in `requirements-dev.txt`.

### Test

```bash
PATH="$PWD/.venv/bin:$PATH" ./test.sh
```

## Screenshots

- [Wheel monitoring with the N2 alert area](docs/screenshots/monitoring-1440.png)
- [RUL estimate as backend confidence intervals](docs/screenshots/rul-1440.png)
- [GDY106 assembly view](docs/screenshots/wheel-1440.png)

## What is validated—and what is not

Repository evidence covers simulator parity fixtures and local demonstration flows. It does not establish physical bench correlation, field accuracy, or operational readiness. Read [telemetry architecture and integrity](docs/architecture-telemetry.md), [edge simulator evidence and limits](docs/edge-sim.md), and [calibration limits](docs/calibration.md).

## Documentation

- [Case study](docs/case-study.md)
- [Five-minute demo guide](docs/demo-script.md)
- [Feasibility assessment](docs/feasibility.md)
- [Calibration procedure and status](docs/calibration.md)
- [Telemetry architecture](docs/architecture-telemetry.md)
- [Edge simulator](docs/edge-sim.md)
