> **Historical (oilguard-mining-sim, pre-Astro). Current behavior: see [docs/demo-script.md](demo-script.md) and [frontend/README.md](../frontend/README.md).**

# T3 — Wheel internals + oil + settling (Sim A, part 2 of 2)

Cutaway GDY106 housing on the S1 bench rig: simplified sun gear, three
planetary pinions, ring-gear hint, rotor barrel, and a 95 L oil fill with
a damped-sine settling transient.

## Drive it

1. Run `cd frontend && bun install && bun run dev`, then open
   http://localhost:5173/wheel. The shared header links to the other pages.
2. Oil slider (0–100%): fill height + color follow the bands —
   green ≥50%, amber 30–50% (warning), red <30% (critical). Liters + %
   shown on the in-scene chip and the readout panel.
3. Viscosity-proxy slider (0.50 dilute/fast … 2.00 degraded/slow):
   reshapes the settling wobble; readout shows predicted settling ms.
4. Move/Rest toggle: moving churns the oil and spins the gear set;
   stopping triggers the wobble → flat settle over ~2–4 s, then the
   `RECALIBRATING (stopped+leveled+engine-on)` badge lights up.
5. Cutaway checkbox: fades the housing shell (opaque = T2 rig look).

Screenshot: `docs/screenshots/t3-oil-settling.png` (real headless-Chrome
render of the dev server, SwiftShader WebGL).

## Honesty notes

- Geometry is simplified but physically plausible, NOT CAD-exact.
- `viscosityProxy` is a visualization shape parameter, not a measurement;
  the real settling-feature extractor lands in S3/T7.
- Spin speeds are illustrative (a true 3000 RPM rotor would alias on a
  60 fps canvas). Materials keep the T2 low-metalness PBR rule (ambient +
  directional lights only); T2 sensor markers stay visible in cutaway.
