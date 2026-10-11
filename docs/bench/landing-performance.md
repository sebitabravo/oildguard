# Landing performance budget and without-3D baseline (B03)

B03 sets the budget and measures the without-3D baseline before any scene
work. B09 enforces this budget against a measured with-3D comparison. Every
number below was measured on this machine with the exact commands quoted;
nothing is estimated or projected.

## Budget (set here, enforced in B09)

Without-3D cover (posters + deferred host, no WebGL payload):

- `/` HTML ≤ 60 kB raw.
- Landing island JS (`Landing.*.js`) ≤ 40 kB raw and ≤ 12 kB gzip.
- Each scene poster ≤ 10 kB.
- Zero `<canvas>` elements in server-rendered `/` HTML.
- Zero `three` markers (`THREE`, `WebGLRenderer`, `OrbitControls`) inside the
  landing island chunk: the 3D chunk stays independent and deferred.

Deferred 3D (applies from B04 on; B09 enforces):

- The 3D chunk loads only after the host reports the scene in viewport.
- DPR capped at 2, one render loop, paused when hidden or out of view.

## Without-3D baseline (measured 2026-10-11, `bun run build`, astro 7.3.5)

Production `dist/` output, landing island `Landing.CsUOF0pf.js`:

| Asset | Raw bytes | Gzip bytes |
|---|---:|---:|
| `dist/index.html` (`/`) | 39,316 | 11,251 |
| `dist/_astro/Landing.CsUOF0pf.js` | 21,431 | 5,593 |
| `dist/_astro/index.Y3TqKXj8.css` (page CSS) | 25,453 | not measured |
| `assembly` poster (`assembly.ClGyA8JV.svg`) | 2,852 | not measured |
| `sensors` poster (`sensors.CnpF6tA6.svg`) | 2,145 | not measured |
| `cycle` poster (`cycle.jhgh3DJC.svg`) | 2,584 | not measured |
| `oil` poster (`oil.dzQAx6yK.svg`) | 2,018 | not measured |

Source sizes (`wc -c`): `LandingScene.tsx` 4,978, `sceneHost.ts` 3,970,
`landing.scene.test.ts` 6,163, `landing.css` 28,721, `Landing.tsx` 18,491.

Structural checks on the measured output:

- `grep -c "<canvas" dist/index.html` → `0`.
- `grep -c "THREE\|WebGLRenderer\|OrbitControls" dist/_astro/Landing.CsUOF0pf.js` → `0`.
- `astro check`: `0 errors`; build completed: `43 page(s) built`.
- Dev-server SSR (`curl http://localhost:5174/`): all four
  `data-scene` figures render with `data-scene-state="poster"`, hero title
  pre-hydration, zero `<canvas`.
- Cover inspection at 1024px and 390px: hero copy plus the assembly poster
  and its caption paint legibly before any 3D exists; zero console errors.
  Scroll is native anchor navigation (`#sensing` intact, all eight beat ids
  present); no scroll hijack.

Verdict: every budget line passes at baseline with headroom. The 3D chunk
does not exist yet, so there is no with-3D comparison to report here; B09
records it against this baseline.

## B09 lifecycle observation (2026-10-11, Chromium 1440 × 900)

Using the local dev server at `http://localhost:5174`, a cold page load had
zero canvases and zero pending animation-frame callbacks before scrolling to
the assembly figure. First paint and first contentful paint were both observed
at 136 ms. With assembly in view, one canvas was present and the instrumented
window had one pending animation-frame callback maximum. Scrolling to the page
to a gap beyond the assembly's viewport margin left its canvas mounted but
dropped pending callbacks from one to zero. This is an observed browser run,
not a GPU frame-time measurement. The 1440px screenshot and raw console capture are
`/tmp/og-goal/evidence/B09/landing-scenes-chromium-1440.png` and
`/tmp/og-goal/evidence/B09/console.txt`.

Follow-up lifecycle run (2026-10-11, Chromium 1440 × 900, device scale factor
3): before scene entry the cold page had 0 canvases and 0 pending RAF callbacks;
first paint and first contentful paint were both 168 ms. With assembly in view,
its renderer backing ratio was 2 and one RAF was pending. Oil in view also had
backing ratio 2; assembly was paused and one RAF remained for the visible scene.
At scroll position 650, both canvases remained mounted while the assembly
figure was outside the viewport but still inside its 200px preload margin; 0
RAF callbacks were pending. Dispatching the island's unmount event
removed both canvases and produced two `webglcontextlost` events. This is a
within-run mount comparison, not a before-code baseline or GPU timing result;
details are in `/tmp/og-goal/evidence/B09/integration.json`.
