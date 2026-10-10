# Five-minute jury demo

The validated scope is the Komatsu 930E-4SE / GDY106 only. Generated telemetry, fleet fallbacks, model curves, and report values are synthetic or deterministic demo data; there is no field dataset or field calibration. `LIVE` means a value came from the local backend, not that it was validated in the field. `DEMO` and `SYNTHETIC-PROXY` must remain visible in the talk track. The prototype is read-only with respect to the truck; demo alert lifecycle changes are browser-local, not backend actions.

## 0:00–0:45 — Start the local stack

From the repository root:

```bash
docker compose up -d --build -V
curl -s http://localhost:8000/health
```

A healthy response proves local service availability only; it does not prove calibration or field accuracy. For synthetic edge rows, start the optional simulator in a second terminal:

```bash
docker compose --profile sim up --build edge-sim
```

The simulator publishes generated rows to the local MQTT mock. Stop it with `Ctrl-C` when finished. Without it, pages use visibly labeled deterministic demo data.

## 0:45–1:20 — Landing and fleet

1. Open [`/`](http://localhost:5173/) and select **Open live demo** to reach [`/fleet`](http://localhost:5173/fleet).
2. Point out the row-level `LIVE` and `DEMO` source labels. The live API may contain only simulator devices; the full fleet presentation also includes the deterministic local dataset.
3. Click a wheel row. It opens `/monitoring?wheel=…`, the wheel-monitoring and analysis page (not the 3D cutaway).

## 1:20–2:35 — Wheel monitoring and local leak demo

1. On `/monitoring`, identify the source label before discussing any number. Backend-returned values are `LIVE`; the leak walkthrough is always a local synthetic demo.
2. Click **Run leak demo (clean → N4)** and inspect the stage labels, alert ladder, and evidence on the same page. This does not publish a field event or establish detection performance.
3. For the separate geometry view, select **GDY106 Wheel** in the navigation or open [`/wheel`](http://localhost:5173/wheel). Its cutaway and oil-pool response are synthetic model behavior, not a measurement.

## 2:35–3:45 — Alerts and report

1. Open [`/alerts?lang=es`](http://localhost:5173/alerts?lang=es). The inbox can show backend `LIVE` records; when none are available, it shows deterministic `DEMO` records and labels them accordingly. Filter **NIVEL** to **N4 · PÉRDIDA CRÍTICA**.
2. Open the active demo N4 row `alert-wheel-RH-03`, or visit [`/alerts/detail?id=alert-wheel-RH-03&lang=es`](http://localhost:5173/alerts/detail?id=alert-wheel-RH-03&lang=es). Its `DEMO` source tag, synthetic evidence window, and local-only lifecycle note must remain visible. Acknowledge/escalate/close controls do not call a backend or control a truck.
3. Click **Generar informe** on the detail page. The link opens `/report?alert=alert-wheel-RH-03`. Explain the important boundary: the page displays the supplied alert ID, but the measurements and N1–N4 timeline are a canonical deterministic synthetic report, not that alert's evidence or a field incident.
4. Optional: **Reglas · solo lectura** opens `/alerts/rules`, which explains static thresholds and voting logic; it cannot alter operational rules.

## 3:45–4:20 — Link health

Open **Salud del enlace** in the Platform navigation or visit [`/link?lang=es`](http://localhost:5173/link?lang=es). Point out the source badge. Backend health, ingest, and link values are `LIVE` when returned; the fallback is deterministic demo data. Neither mode implies a network SLA.

## 4:20–5:00 — Validation and close

Open **Validación** in the Lab navigation or visit [`/lab/validation`](http://localhost:5173/lab/validation). The default comparison uses generated fixture truth. If backend rows are present, the page labels them and does not treat them as generator truth unless the response supplies that ground truth. Close with the limit: no physical bench calibration or field validation has been completed, and the prototype has no truck-control path.
