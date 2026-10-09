> **Historical (oilguard-mining-sim, pre-Astro). Current behavior: see [docs/demo-script.md](demo-script.md) and [frontend/README.md](../frontend/README.md).**

# T5 — Moving/rest modes + camera/UX polish (Sim B, S2)

T5 polishes the T4 truck scene without rewriting it: mode coloring + HUD,
camera presets, and pause/step controls. The FSM (`cycle.ts`) is untouched.

## Drive it

1. Run `cd frontend && bun install && bun run dev`, then open
   http://localhost:5173/mine. The shared header links to the other pages.
2. Watch the truck glow blue (MOVING: HAUL + WAIT return) and green (REST:
   LOAD / DUMP); the HUD badge and the 930E tag track the same signal.
3. Pick camera presets in the HUD panel: Pit overview (static), Cab / Side /
   Wheel close-up (track the truck). Dragging the canvas releases the camera
   to free orbit; picking a preset re-engages the lerp.
4. Pause the cycle, then Step +1s (enabled only while paused) to walk the
   29 s loop frame by frame. Restart returns to LOAD.

Screenshot: `docs/screenshots/t5-modes-cameras.png` (real headless-Chrome
render of the dev server, SwiftShader WebGL).

## Honesty notes

- WAIT is honestly moving: it doubles as the empty return drive (see the T4
  note), so REST covers LOAD / DUMP only and the RECAL badge stays gated
  during WAIT. This differs from the T5 feature-doc line ("rest in
  load/dump/wait") on purpose — claiming REST on a rolling truck would be
  the dishonest option. The stillness signal is unchanged from T4
  (`isMovingState` / `isRecalState`); S3/T7 consumes the same signal.
- Wheel spin stays illustrative; true speeds (rotor 3000 RPM / wheel 92 RPM
  via 32.62:1) would alias on a 60 fps canvas and are shown as text.
- The chassis never tilts (only the dump bed does in DUMP) and the engine
  stays on for the demo loop, so the recal condition reduces to stopped.
- Bench label fix (trivial, bundled): the pressure + temperature overlay
  labels overlapped from the default camera, so they now carry opposite
  vertical nudges (−14 / +16 px). No geometry or sensor changes.
- Materials keep the low-metalness PBR rule (ambient + directional only).
