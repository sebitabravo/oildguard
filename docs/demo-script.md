# T11 demo script — judge path < 5 min (S6)

Goal: from `compose up` to a visible N1 → N2 → N3 → N4 walk with RUL,
linked 3D oil fill, and dashboard alerts.

Model label everywhere: **`synthetic-proxy` — NOT proven until the S7
bench drain-and-weigh.** LAB-accelerated rates are labeled in every line
they appear.

## 0. Prerequisites (30 s)

```bash
git branch --show-current   # feature/oilguard-sim
docker compose config --quiet && echo COMPOSE_OK
```

## 1. Stack up (90 s)

```bash
docker compose up --build
```

Wait for `oilguard-backend` healthy (`GET localhost:8000/health` →
`status: ok`). Frontend: http://localhost:5173 (default tab Bench).

## 2. Ingest the leak timeline (30 s)

In a second terminal (backend stays up):

```bash
# 120 s LAB-accelerated slow-leak + abrupt-drop tail (same stitch the
# T10 smoke uses; audit labels show the seam — production is continuous)
python3 sim/generate.py --scenario slow-leak --seconds 120 --out /tmp/t11-leak.csv
python3 sim/generate.py --scenario abrupt-drop --seconds 60 --out /tmp/t11-drop.csv
python3 - <<'EOF'
import csv, json, urllib.request
def load(path):
    rows = []
    with open(path, newline='') as f:
        for r in csv.DictReader(f):
            for k in ('seq', 'moving', 'recal_window', 'engine_on', 'link_down'):
                r[k] = int(float(r[k]))
            for k in ('t_s', 'slope_deg', 'rotor_rpm', 'wheel_rpm', 'pressure_kpa',
                      'temperature_c', 'vib_rms_g', 'vib_kurtosis',
                      'level_liters', 'level_pct'):
                r[k] = float(r[k])
            rows.append(r)
    return rows
leak = load('/tmp/t11-leak.csv')
drop = load('/tmp/t11-drop.csv')[-600:]
base_t, base_seq = leak[-1]['t_s'], leak[-1]['seq']
for r in drop:
    r['t_s'] = base_t + (r['t_s'] - drop[0]['t_s']) + 0.1
    r['seq'] = base_seq + (r['seq'] - drop[0]['seq']) + 1
rows = leak + drop
req = urllib.request.Request('http://localhost:8000/ingest',
    data=json.dumps({'rows': rows}).encode(),
    headers={'Content-Type': 'application/json'})
print(urllib.request.urlopen(req).read().decode()[:300])
EOF
```

Expect `ingested: 1800`, `store_rows: 1800`.

Verify:

```bash
curl -s localhost:8000/alerts | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['escalation'])"
# ['N1', 'N2', 'N3', 'N4']
curl -s localhost:8000/rul | head -c 400
```

## 3. Dashboard (60 s)

Open http://localhost:5173 → **Dash (S6/T11)** tab (`#dash`).

- Badge reads **LIVE · backend** (else DEMO fallback — still demoable,
  badge says so honestly).
- Level chart: trace + ±σ band + green rest-window shading + N1–N4 dots.
- RUL panel: `0.18 h to critical · 22.1 cycles · 0.02 shifts` (live) or
  the staged countdown (demo override).
- Mode indicator: MOVING/REST + RECAL badge on the shared FSM clock;
  backend window count beside it.
- Click **Refresh from backend** after ingesting.

## 4. One-click demo, no backend needed (30 s)

In the Dash tab click **Run leak demo (clean → N4)**:

1. `clean` (5 s): 95 L flat, no alerts, RUL suppressed anomaly-only.
2. `slow-leak` (15 s, LAB-ACCELERATED ~128.5 %/h x257 vs spec 0.5 %/h):
   N1 → N2 → N3 walk, RUL countdown to ~0.35 h warning.
3. `abrupt-drop` (6 s): 15 L step to ~80 L, **N4 critical** fires.
4. `done`: full walk N1 → N2 → N3 → N4 held; **Reset demo** to rerun.

The Bench tab oil fill follows the same stages (demo bus event
`oilguard:demo-oil`): switch to Bench mid-demo to see the slab drain
green → amber and the RECAL badge. T3 sliders still work standalone.

Total judge path: ~4 min (up 90 s + ingest 30 s + dash 60 s + demo 30 s).

## 5. What to screenshot

`docs/screenshots/t11-dashboard.png` — Dash tab mid-demo (slow-leak,
N1/N2/N3 visible, LAB label in frame). This repo's copy was rendered
from the local dev server (see Evidence Log T11).

## Honesty notes

- Slow-leak rate is LAB-ACCELERATED by construction (spec-true 0.5 %/h
  drops ~0.008 L in 120 s — invisible; see docs/t9-anomaly.md).
- Backend-less runs show the DEMO badge with local synthetic-proxy data;
  LIVE badge requires `store_rows > 0` from §2.
- Fusion stays synthetic-proxy until S7 bench proof; a failed bench
  keeps N1/N2/N4 anomaly-only (see docs/t10-rul-ladder.md S7 pointer).
