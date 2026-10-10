# OilGuard Pro Twin — five-minute judge demo (T9)

Validated scope: Komatsu 930E-4SE / GDY106 only. The 980E-5 / GDY108-C remains future work without validation. Scene reconstruction, fluid values, and demo fleet metrics retain their visible assumptions and synthetic-proxy labels; this is not a field-calibrated system.

## Five-minute path

### 0:00–0:30 — Start and health

From the repository root:

```bash
docker compose config --quiet
docker compose up -d --build -V
curl -s http://localhost:8000/health
```

Confirm the health response contains `"status":"ok"` and `"analysis":{"available":true,"reason":null}`. If it reports `"status":"degraded"` or analysis is unavailable, do not treat an empty alert list as a clean result; repair the backend image first. Open `http://localhost:5173` for the three pages: `/mine`, `/wheel`, and `/monitoring`.

### 0:30–1:30 — Mine and fleet

Open [`/mine`](http://localhost:5173/mine). The view shows five simulated trucks and the selected truck's estimated eight-state PLM III status in the HUD. Camera buttons in English are **Pit**, **Shovel**, **Crusher**, **Ramp**, and **Cab**; in Spanish they are **Foso**, **Pala**, **Chancadora**, **Rampa**, and **Cabina**. Pause with **Pause cycle** / **Pausar ciclo**, then use **Step +1 s** / **Paso +1 s** to advance the paused FSM clock. Select the ramp view and read its visible caption: **RAMP · 10% ASSUMPTION** (Spanish: **RAMPA · 10 % ASSUMPTION**). The model honesty badge describes the truck as a parametric reconstruction, not CAD-exact. Use **Open GDY106 wheel** / **Abrir rueda GDY106** to continue.

### 1:30–2:15 — GDY106 wheel detail

On [`/wheel`](http://localhost:5173/wheel), inspect the simplified cutaway and the **Exploded view** / **Vista explotada** control. The readout shows the derived stage ratios and a displayed overall ratio of **32.63:1**. Move the **Oil fill** / **Nivel de aceite** slider and observe the modeled oil-pool response; it is synthetic, not measured. Inspect the pressure, temperature, and vibration sensor markers at manual items 56, 41, and 39/36; the Hall marker is on the traction cable. The handoff opens in rest mode: the control reads **Resting — start Move** / **Detenido — iniciar marcha**, with a **RECALIBRATING** / **RECALIBRANDO** badge when stopped, level, and engine-on. The honesty note states that the cutaway is simplified and oil/pressure/settling remain SYNTHETIC-PROXY pending bench calibration.

### 2:15–3:30 — Monitoring and wheel handoff

Open [`/monitoring`](http://localhost:5173/monitoring). The fleet table has 12 demo wheel rows and labels its data **SYNTHETIC-PROXY** (Spanish: **SUSTITUTO SINTÉTICO**); it is not a live per-wheel feed. Read the assumption line: the combined demo rule requires at least two of oil ≤47.5 L, temperature ≥90 °C, and vibration ≥7 mm/s; current is displayed but does not trigger it. The demo rows currently include **DEMO ALERT** for OG-03/RR and OG-05/RL (Spanish: **ALERTA DEMO**). Select **Open wheel detail** / **Abrir detalle de rueda** on a row. It opens `/wheel` carrying that row's truck and wheel selection; from the mine page this is two clicks, within AC6's limit. The fleet thresholds and values are demo assumptions, separate from backend N1–N4 leak analysis.

### 3:30–4:30 — Leak walk and optional signed-ingest check

On `/monitoring`, click **Run leak demo (clean → N4)** / **Ejecutar demo de fuga (limpio → N4)**. Watch the local demonstration progress from clean baseline through the N1–N3 slow-leak stages to the abrupt-drop N4 alert. This dashboard demo is separate from backend ingest and does not prove field detection performance.

The following T8 signed-ingest check is optional and separate from the local dashboard demo:

### Optional signed-ingest check

The judge path above stays unsigned and works with Compose defaults
(`OILGUARD_REQUIRE_SIGNATURE=0`). For a separate integrity check, create a
local-only key and enable enforcement in the backend; never commit or share
the generated key:

```bash
DEVICE_KEY="$(python3 -c "import secrets; print(secrets.token_hex(32))")"
export OILGUARD_DEVICE_KEYS="wheel-RH-01:${DEVICE_KEY}"
export OILGUARD_REQUIRE_SIGNATURE=1
docker compose up -d --build backend
OILGUARD_DEVICE_KEY="${DEVICE_KEY}" python3 sim/generate.py --sign --scenario clean --seconds 5 --out /tmp/t8-signed.csv
python3 backend/ingest_mqtt.py --publish-csv /tmp/t8-signed.csv --host localhost
curl -s localhost:8000/health
unset OILGUARD_DEVICE_KEYS OILGUARD_REQUIRE_SIGNATURE DEVICE_KEY
docker compose up -d backend
```

The health response exposes aggregate signing counters and analyzer
availability, not device IDs or keys. HMAC verifies row integrity and shared-key origin; it does not provide
confidentiality, HTTP caller authentication, MQTT/TLS, or IEC 62443 compliance.
Key provisioning, secure storage, and rotation remain production gaps.

Verify:

```bash
curl -s localhost:8000/alerts | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['escalation'])"
# ['N1', 'N2', 'N3', 'N4']
curl -s localhost:8000/rul | head -c 400
```


### 4:30–5:00 — Language and honesty

Use the header's **EN** / **ES** control and revisit the honesty copy. `?lang=en` and `?lang=es` also select and persist the page language. Keep the scope statement visible: the 930E/GDY106 model is parametric, the wheel geometry and demo thresholds include assumptions, and the dashboard fleet values are synthetic proxies until bench calibration and field evidence exist.

## Current screenshots (1600 × 1000)

| Page | English | Español |
|---|---|---|
| Mine | [Mine EN](screenshots/pro-twin-mine-en.png) | [Mina ES](screenshots/pro-twin-mine-es.png) |
| Wheel detail | [Wheel EN](screenshots/pro-twin-wheel-en.png) | [Rueda ES](screenshots/pro-twin-wheel-es.png) |
| Monitoring | [Monitoring EN](screenshots/pro-twin-monitoring-en.png) | [Monitoreo ES](screenshots/pro-twin-monitoring-es.png) |

## Guía rápida en español

### 0:00–0:30 — Inicio y estado

Desde la raíz del repositorio, ejecuta `docker compose config --quiet` y `docker compose up -d --build -V`; confirma que `http://localhost:8000/health` responda con `"status":"ok"` y `"analysis":{"available":true,"reason":null}`. Si indica `"status":"degraded"` o el analizador no está disponible, no interpretes una lista vacía de alertas como un resultado limpio; corrige primero la imagen del backend.

### 0:30–1:30 — Mina y flota

Abre `/mine`: muestra cinco camiones simulados y el estado estimado del FSM de ocho estados del PLM III. Revisa las cámaras **Foso**, **Pala**, **Chancadora**, **Rampa** y **Cabina**. Usa **Pausar ciclo** y luego **Paso +1 s**. En la cámara de rampa, confirma **RAMPA · 10 % ASSUMPTION**. La insignia describe una reconstrucción paramétrica, no un modelo CAD exacto. Continúa con **Abrir rueda GDY106**.

### 1:30–2:15 — Detalle de rueda GDY106

En `/wheel`, revisa el **Corte** y activa **Vista explotada**. El readout muestra la relación total derivada **32.63:1**. Mueve el control **Nivel de aceite** y observa la respuesta del depósito modelado; no es una medición real. Revisa los sensores en los ítems 56, 41 y 39/36, y la pinza Hall en el cable de tracción. En modo detenido, el control indica **Detenido — iniciar marcha** y la insignia **RECALIBRANDO** cuando el equipo está parado, nivelado y con el motor encendido. La nota de honestidad identifica los valores como sustituto sintético hasta la calibración en banco.

### 2:15–3:30 — Monitoreo y selección de rueda

Abre `/monitoring`. La tabla contiene 12 filas de demostración marcadas **SUSTITUTO SINTÉTICO**, no datos reales por rueda. Lee la línea de supuestos: se requieren al menos dos de tres límites (aceite ≤47,5 L, temperatura ≥90 °C y vibración ≥7 mm/s); la corriente se muestra, pero no activa la regla. Revisa las filas **ALERTA DEMO** OG-03/RR y OG-05/RL. Pulsa **Abrir detalle de rueda** para llegar a `/wheel` con el camión y la rueda seleccionados; desde la página de mina son dos clics como máximo.

### 3:30–4:30 — Demostración de fuga y firma

Pulsa **Ejecutar demo de fuga (limpio → N4)** y observa la secuencia local desde la línea base, pasando por N1–N3, hasta la alerta N4 por caída abrupta. Es una demostración del dashboard, distinta del ingest del backend y no prueba rendimiento en terreno. El chequeo opcional de ingest firmado de T8 aparece arriba y usa la misma configuración y advertencias de seguridad.

### 4:30–5:00 — Idioma y honestidad

Alterna **EN** / **ES** y vuelve a leer las notas de honestidad. El modelo es una reconstrucción paramétrica; la geometría y los límites demo incluyen supuestos, y los valores de flota son sustitutos sintéticos hasta disponer de calibración en banco y evidencia de terreno.

## Notas de honestidad

- Los valores del wheel twin y del tablero de flota son SYNTHETIC-PROXY; no hay datos de rueda calibrados ni validación de campo.
- La rampa **10% ASSUMPTION** es un supuesto del modelo visual, no una pendiente verificada de una mina real.
- Las firmas HMAC verifican integridad de fila y origen mediante clave compartida; no aportan confidencialidad, autenticación del cliente HTTP, MQTT/TLS ni cumplimiento IEC 62443.
