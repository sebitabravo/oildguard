# T4 — 930E truck + open-pit haul-cycle FSM (Sim B, S2)

Simplified 930E (chassis + cab + tiltable dump bed + 6 cylinder wheels, the
rear-axle pair glowing amber as the two GDY106 motorized units) looping
LOAD (6 s) → HAUL (12 s) → DUMP (6 s) → WAIT (5 s) around an open-pit
segment with four colored ground pads + labels.

## Drive it

1. Run `cd frontend && bun install && bun run dev`, then open
   http://localhost:5173/mine. The shared header links to the other pages.
2. Watch one 29 s loop: the truck holds at LOAD (RECALIBRATING badge),
   drives the loaded lane to DUMP, holds + tilts the bed, then returns on
   the WAIT queue lane. Pause / Restart buttons sit under the canvas.
3. Side panel: live state readout, rotor/wheel narrative, recalibration
   windows.

Screenshot: `docs/screenshots/t4-truck-cycle.png` (real headless-Chrome
render of the dev server, SwiftShader WebGL).

## Honesty notes

- Geometry is simplified but physically plausible, NOT CAD-exact.
- WAIT doubles as the empty return drive: a single moving state cannot
  close a 4-zone loop otherwise (holds at two distinct pads need two
  moves). The RECAL badge follows measured stillness, so it stays gated
  during the WAIT return and lights at LOAD / DUMP. S3/T7 move/rest rules
  consume the same stillness signal.
- Wheel spin is illustrative; true speeds (rotor 3000 RPM / wheel 92 RPM
  via 32.62:1) would alias on a 60 fps canvas and are shown as text.
- The chassis never tilts (only the dump bed does in DUMP) and the engine
  stays on for the demo loop, so the recal condition reduces to stopped.
- Materials keep the low-metalness PBR rule (ambient + directional only).
