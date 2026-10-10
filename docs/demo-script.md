# Five-minute jury demo

The validated scope is the Komatsu 930E-4SE / GDY106 only. All generated telemetry, fleet fallbacks, model curves, and report values are synthetic or deterministic demo data; there is no field dataset, field calibration, authentication service, or truck-control path. `LIVE` means a value came from the local backend, not that it was validated in the field. `DEMO` and `SYNTHETIC-PROXY` must remain visible in the talk track.

## 0:00–0:45 — Start the local stack

From the repository root:

```bash
docker compose up -d --build -V
curl -s http://localhost:8000/health
```

Confirm the backend responds. A healthy response proves local service availability only; it does not prove calibration or field accuracy. For live rows, start the optional synthetic edge simulator in a second terminal:

```bash
docker compose --profile sim up --build edge-sim
```

The simulator publishes generated rows to the local mock broker. Stop it with `Ctrl-C` when the demo is over. Without it, the UI falls back to labeled deterministic demo data.

## 0:45–1:30 — Landing and fleet

1. Open [`/`](http://localhost:5173/) and select **Open live demo** to reach [`/fleet`](http://localhost:5173/fleet).
2. Point out the row-level `LIVE` versus `DEMO` source labels. The live API may contain only the simulator devices; the full fleet presentation also uses the deterministic local dataset.
3. Click a wheel row to open `/monitoring?wheel=…`. This is the wheel-monitoring/analysis page, not the 3D cutaway.

## 1:30–3:10 — Wheel monitoring and alert walkthrough

1. On `/monitoring`, point to the source label and the current data class before discussing any number. When backend rows exist, those returned values are `LIVE`; the local scenario remains a demo.
2. Click **Run leak demo (clean → N4)**. Watch the local demonstration advance through its displayed stages and inspect the alert ladder and entries on the same page. This button runs a local synthetic scenario; it does not publish a field leak or establish detection performance.
3. The registered `/alerts` inbox, `/alerts/detail`, and `/alerts/rules` paths currently return HTTP 404 because no frontend pages are implemented. Do not present those as working screens. Use the alert ladder on `/monitoring` for this walkthrough.
4. For the separate geometry view, select **GDY106 Wheel** in the navigation or open [`/wheel`](http://localhost:5173/wheel). Show the simplified cutaway and oil-pool control as a synthetic model, not measured oil behavior.

## 3:10–4:05 — Report and link health

1. Open [`/report`](http://localhost:5173/report). It is a read-only deterministic reconstruction of the canonical simulated incident. The displayed timeline and figures are not a backend incident record or a field event.
2. Open **Link health** in the Platform navigation, or visit [`/link`](http://localhost:5173/link). Identify the source badge: backend health/ingest values are `LIVE` when returned; otherwise the screen shows its deterministic demo fallback. Neither mode implies a guaranteed network SLA.

## 4:05–5:00 — Validation and close

Open **Validation** in the Lab navigation, or visit [`/lab/validation`](http://localhost:5173/lab/validation). The default comparison uses generated fixture truth. If live backend rows are available, the page labels them and does not treat them as ground truth unless the response provides that truth. State the limit plainly: no physical bench calibration or field validation has been completed, and the prototype is read-only.
