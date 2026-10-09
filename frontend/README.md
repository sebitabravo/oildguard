# OilGuard frontend

The Astro site uses Preact islands: Astro serves the shared shell, and each
route hydrates its interactive section.

## Pages and URL state

| Path | Purpose | Query state |
|------|---------|-------------|
| `/mine` | Open-pit scene and five-truck fleet | `seed` selects the deterministic scene/fleet seed; `t` advances to a simulation time in seconds; `pause=1` pauses; `scale` sets a positive time scale; `sel` selects a truck; `cam` accepts a known camera preset (`pit`, `hero`, `cab`, `side`, `wheel`, `chase`, `shovel`, `crusher`, `ramp`, `free`, or `custom`); `debug` enables scene diagnostics. |
| `/wheel` | GDY106 wheel detail and cutaway | `truck` and `wheel` identify the selected fleet unit; `sensor` selects a sensor; `oil` sets the oil volume in litres (clamped to 0–95; missing or invalid values use 66.5); `mode=move` selects moving mode, otherwise the page uses rest mode; `cutaway=0` disables the cutaway (enabled otherwise); `exploded=1` enables the exploded view. |
| `/monitoring` | Leak-monitoring panels and fleet table | `demo=1` starts the local dashboard demo; the `lang` parameter sets page language. |

Use `lang=en` or `lang=es` on any page to select and persist the language.
The language switch also synchronizes the interactive islands. Example URLs:

```text
/mine?seed=1&t=16&pause=1&cam=pit&lang=en
/wheel?truck=OG-03&wheel=RH&sensor=pressure&oil=66.5&mode=rest&cutaway=1&exploded=1&lang=es
/monitoring?demo=1&lang=en
```

Legacy hash links redirect to their matching page: `#truck` and `#mine` go to
`/mine`; `#bench` and `#wheel` go to `/wheel`; hashes beginning with `#dash`
or `#monitoring` go to `/monitoring`. `#dash-demo` and `#monitoring-demo` also
set `demo=1`. Existing query parameters are preserved; unknown hashes are not
redirected.

## Fleet table and wheel handoff

The `/monitoring` fleet table contains synthetic-proxy wheel rows with truck
and wheel IDs, oil volume, temperature, vibration, current, and a demo-risk
status. It is not a live per-wheel feed or calibrated risk estimate. Select
**Open wheel detail** to navigate to `/wheel` with the selected `truck` and
`wheel` query state, plus the pressure sensor and rest/cutaway defaults. This
preserves the selection when moving from fleet overview to the GDY106 detail.

## Development

Run these commands from `frontend/`:

```sh
bun install
bun run dev
```

Astro serves the development site at `http://localhost:5173` and binds to
`0.0.0.0:5173` for container access.

## Build, preview, and tests

```sh
bun run build
bun run preview
bun test src
```

`bun run build` runs `astro check` followed by `astro build`. `bun run preview`
serves the production build on port 5173, and `bun test src` runs the frontend
tests.

## Docker Compose

The frontend service reads `PUBLIC_BACKEND_URL` and defaults to
`http://localhost:8000`. After changing frontend dependencies, recreate the
service and renew its anonymous `node_modules` volume so it cannot mask the
dependencies baked into the new image:

```sh
docker compose up -d --build -V frontend
```
