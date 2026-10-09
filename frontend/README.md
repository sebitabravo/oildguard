# OilGuard frontend

The frontend is an Astro site with Preact islands: Astro serves the shared page shell, while each route hydrates only its interactive section.

## Routes

| Path | Section |
|------|---------|
| `/` | Default wheel view |
| `/wheel` | Wheel and bench view |
| `/mine` | Mining truck view |
| `/monitoring` | Monitoring dashboard |

Legacy hash links redirect to the matching page: `#truck` and `#mine` go to `/mine`; `#bench` and `#wheel` go to `/wheel`; hashes beginning with `#dash` or `#monitoring` go to `/monitoring`. Hashes beginning with `#dash-demo` or `#monitoring-demo` also set `?demo=1`. Existing query parameters are preserved, and unknown hashes are not redirected.

## Development

Run these commands from `frontend/`:

```sh
bun install
bun run dev
```

Astro serves the development site at `http://localhost:5173` and binds to `0.0.0.0:5173` for container access.

## Build, preview, and tests

```sh
bun run build
bun run preview
bun test src
```

`bun run build` runs `astro check` followed by `astro build`. `bun run preview` serves the production build on port 5173, and `bun test src` runs the frontend tests.
