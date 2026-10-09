---
name: OilGuard Mining
description: A calibrated instrument for haulage lubrication — machine yellow on graphite, quiet until something is wrong.
colors:
  machine-yellow: "#f2b705"
  machine-yellow-deep: "#d9a200"
  instrument-amber: "#f5a623"
  caution-orange: "#ff8c42"
  signal-green: "#2fbf71"
  motion-blue: "#4a8ef0"
  critical-red: "#ff4d42"
  graphite-base: "#0a0e16"
  panel: "#111823"
  panel-raised: "#182233"
  readout: "#e9eef7"
  body-copy: "#c9d5e8"
  annotation: "#9db0cc"
  rule-line: "#3a4a63"
  hairline: "rgba(255, 255, 255, 0.09)"
  hairline-strong: "rgba(255, 255, 255, 0.18)"
  glass: "rgba(9, 13, 21, 0.64)"
  glass-line: "rgba(255, 255, 255, 0.13)"
typography:
  brand:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.01em"
  readout:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  hairline-sm: "2px"
  data-sm: "6px"
  control: "8px"
  floating: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.machine-yellow}"
    textColor: "#15110a"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.machine-yellow-deep}"
  button-ok:
    backgroundColor: "{colors.signal-green}"
    textColor: "{colors.graphite-base}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.readout}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  button-disabled:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.annotation}"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.body-copy}"
    rounded: "{rounded.control}"
    padding: "12px"
  card-active:
    backgroundColor: "#1d2a40"
    rounded: "{rounded.control}"
  data-panel:
    backgroundColor: "#0e1420"
    rounded: "{rounded.data-sm}"
    padding: "16px"
  badge-caution:
    backgroundColor: "rgba(30, 22, 8, 0.8)"
    textColor: "#ffd27a"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  badge-caution-hover:
    backgroundColor: "rgba(60, 42, 8, 0.88)"
  icon-button:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.readout}"
    rounded: "{rounded.control}"
    height: "32px"
    width: "32px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.annotation}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "36px"
  nav-item-active:
    backgroundColor: "rgba(242, 183, 5, 0.12)"
    textColor: "{colors.machine-yellow}"
  seg-button-pressed:
    backgroundColor: "{colors.machine-yellow}"
    textColor: "#15110a"
    rounded: "{rounded.data-sm}"
    height: "28px"
  drawer-tab-active:
    textColor: "{colors.machine-yellow}"
    typography: "{typography.title}"
    height: "34px"
  tag-verified:
    backgroundColor: "transparent"
    textColor: "{colors.signal-green}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
  tag-derived:
    backgroundColor: "transparent"
    textColor: "{colors.motion-blue}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
  tag-assumption:
    backgroundColor: "transparent"
    textColor: "{colors.machine-yellow}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
---

# Design System: OilGuard Mining

## Overview

**Creative North Star: "The Calibrated Instrument"**

Every surface in this product behaves like a measuring instrument, not like an application. A gauge does not decorate its reading; it declares its uncertainty. That is the whole thesis. The oil level arrives wrapped in a confidence band because the reading has one. Every figure carries a provenance tag — VERIFIED, DERIVED, ASSUMPTION — because a number without a source is a liability on equipment a person is accountable for. The synthetic-proxy badge is not a disclaimer bolted onto the corner; it is the instrument's accuracy class, rendered.

Machine yellow on graphite carries that idea physically. The yellow is Komatsu's own paint — `komatsuYellow` in the 3D palette is the same value as the brand token — so the interface and the machine are literally the same colour. Graphite is the unlit pit the instrument sits in. The chassis is dark because a pit at night is dark, and because a dark ground lets a caution amber read as a caution amber instead of as decoration.

Density is deliberate and high. This is read by an engineer comparing a trend against a threshold, so information per square centimetre outranks whitespace. Type is small, tabular, and unmoving. What the system refuses is the entire vocabulary of reassurance: no progress theatre, no celebratory motion, no shadow that lifts a surface for the sake of looking lifted, no soft-card dashboard idiom. The instrument is quiet at rest. Its job is to be believed when it speaks.

**Key Characteristics:**

- Machine yellow as identity, Instrument amber as caution — two near-identical yellows that never trade roles.
- Depth by tone in the shell, by hairline border in the data surfaces: two documented materials, not one accident.
- Provenance as a first-class visual component, alongside colour and type size.
- Tabular figures everywhere, so nothing jitters while it updates.
- Flat at rest. Shadow is a response to state, never decoration.

## Colors

Komatsu yellow on graphite, with a fixed semantic status ramp that means the same thing on every screen.

### Primary

- **Machine Yellow** (`#f2b705`): identity and selection. The brand mark, the active nav item, the pressed segmented control, the focus ring, the favicon. It is also the machine's paint in the 3D scene, from the same value.
- **Machine Yellow Deep** (`#d9a200`): the pressed and hovered state of Machine Yellow. Never a standalone colour.

### Secondary

- **Instrument Amber** (`#f5a623`): caution. N1 alert, the honesty badge border, the dashboard's active accent. It is visually adjacent to Machine Yellow and must never be confused with it — see the Two-Yellow Rule.
- **Caution Orange** (`#ff8c42`): N2 and N3 escalation. Shares one value across both levels; they are separated by lane position in the chart, not by hue.

### Tertiary

- **Signal Green** (`#2fbf71`): rest, OK, the normal oil band, VERIFIED tags.
- **Motion Blue** (`#4a8ef0`): the MOVING state and DERIVED tags.
- **Critical Red** (`#ff4d42`): critical threshold, STOP, N4.

### Neutral

- **Graphite Base** (`#0a0e16`): the page. Unlit pit.
- **Panel** (`#111823`): the drawer and card surface.
- **Panel Raised** (`#182233`): the second surface step, and the disabled-control fill.
- **Readout** (`#e9eef7`): primary text and the level trace itself.
- **Body Copy** (`#c9d5e8`): running prose in the drawer.
- **Annotation** (`#9db0cc`): secondary text, axis labels, timestamps — anything that qualifies another value.
- **Rule Line** (`#3a4a63`): soft borders and chart axes.
- **Hairline** (`rgba(255, 255, 255, 0.09)`): the default separator on dark surfaces.
- **Hairline Strong** (`rgba(255, 255, 255, 0.18)`): the separator that must survive on top of a 3D render.
- **Glass** (`rgba(9, 13, 21, 0.64)`) and **Glass Line** (`rgba(255, 255, 255, 0.13)`): HUD panels floating over the 3D scene.

### Named Rules

**The Two-Yellow Rule.** Machine Yellow is who we are; Instrument Amber is what we warn about. Neither ever takes the other's job. If a state can only be distinguished by swapping which yellow it uses, the state needs a second signal — a label, a ring, or a position.

**The Machine-Wears-Its-Own-Paint Rule.** Machine Yellow is simultaneously the brand colour and the machine's paint in the 3D scene, and that overlap is intentional, not a coincidence to be normalised away. The interface and the asset share one colour because they are one system.

**The Status Palette Is Closed.** Signal Green, Motion Blue, Instrument Amber, Caution Orange and Critical Red carry fixed meanings. They are never reassigned for decoration, never introduced as accents, and never used to signal anything other than the machine condition they were assigned to.

## Typography

**Display Font:** Inter (with `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial` fallback)
**Body Font:** Inter (same stack)
**Label/Mono Font:** none distinct — labels are Inter at small size and weight, not a separate family

**Character:** One family doing every job, which is what an instrument does. There is no display face competing with the readout and no mono for figures — the numeric discipline comes from `tabular-nums`, not from a typeface swap. Small, tight, and slightly letterspaced when uppercased, so labels read as engraved plate text rather than as UI chrome.

### Hierarchy

- **Brand** (700, 16px, 1.15, 0.01em): the product name in the header, once.
- **Readout** (700, 22px, 1.1, tabular): the primary instrument value — oil level, RUL headline. One per panel at most.
- **Headline** (700, 14px, 1.3, 0.02em): drawer and panel section headings.
- **Title** (600, 13px): control labels, tab labels, metric names.
- **Body** (400, 13px, 1.55): running prose in the drawer, at roughly 65–75 characters.
- **Label** (600, 12px, 0.05em): HUD metadata, field labels, secondary controls.
- **Micro** (700, 11px, 0.04em, uppercase): table headers, badges, provenance tags.

### Named Rules

**The Tabular Rule.** Every number that changes over time carries `tabular-nums`. A figure must hold its column while it updates; a level readout that jitters as it counts is a broken instrument. Apply the property to the element, not only to a wrapper.

**The Fixed-Pixel Rule.** The system is absolute pixels — no `rem`, no `html { font-size }`. A readout must occupy the same physical width regardless of user zoom or density, because it is compared against a fixed threshold.

## Layout

A viewport-first shell. The app fills the window with no page scroll on the 3D views; only the drawer body scrolls. The header is a fixed 60px rail, the content area is a flex row of viewport plus drawer, and the drawer is a fixed 400px column capped at 42vw so it can never crowd the render. Collapsed, the drawer becomes a 52px rail with the toggle alone.

The dashboard is the exception and the reason for the second material: it is a scrolling page at up to 1440px wide, laid out as a flex-wrap row of one primary chart panel and a side column, with no media query of its own — it wraps on `flex-basis` rather than on viewport width.

Spacing follows an undeclared 4px rhythm: 4, 8, 12, 16, 20, 24px. There is no spacing scale; these are the steps that recur.

Two width breakpoints exist and no more:

- **≤ 1100px** — the header tagline and the entire bottom-left HUD stack are removed. Not reflowed, not condensed: removed, because an instrument that cannot fit its annotations simply stops showing them.
- **≤ 900px** — the view stacks vertically and the drawer becomes a full-width band capped at 45% of viewport height.

No CSS grid anywhere. Layout is flex-only, including the dashboard's responsiveness.

## Elevation & Depth

Two materials, deliberately.

**The shell separates by tone.** Graphite Base to Panel to Panel Raised is a three-step tonal ladder; there is no shadow between them. This is the chrome — header, drawer, HUD, dock — and it sits against a WebGL render, where a drop shadow would read as dirt on the lens.

**The data surfaces separate by hairline.** Monitoring panels use a one-pixel border and a darker fill than the shell rather than a tonal step, because they are read as sheets laid on the instrument, not as parts of its housing.

Shadow in this system is never structural. The seven `box-shadow` declarations exist for exactly three jobs: the brand mark's inner hairline and outer glow, the drop under floating glass, and the tone ring on an active card or in-scene label. Backdrop blur marks what floats. If a surface is not floating, not active, and not the brand mark, it has no shadow.

### Shadow Vocabulary

- **Floating glass** (`0 10px 30px rgba(0, 0, 0, 0.35)`): HUD panels and popovers suspended over the 3D scene, always paired with a backdrop blur.
- **Tone ring** (`0 0 0 1px var(--tone, transparent) inset`): the active state of a tone-carrying card. An inset hairline in the tone colour, never a glow.
- **Label bloom** (`0 4px 14px rgba(0, 0, 0, 0.4)`): in-scene labels, so text stays legible against arbitrary geometry.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow appears only as a response to state — focus, active tone, or a panel genuinely floating above a render. If you cannot name the state that produced it, delete it.

**The Glass Is Not Frosted, It Is Situated.** Backdrop blur marks a panel floating over live 3D content so the render stays perceptible behind it. Do not blur a panel that sits on flat graphite; there is nothing behind it to situate.

## Shapes

Gently rounded and never soft. Controls and cards share 8px (`--og-radius`) — one radius for things you touch. Data panels use 6px, slightly tighter, because a data sheet is a document laid on the instrument rather than a part of it. Floating glass uses 12px. Full pills are reserved for status content: badges, provenance tags, in-scene label pills. Nothing is fully circular except the 9px status dot.

Borders are hairlines. On dark surfaces they are white at low alpha rather than a lighter grey, which keeps them from reading as a second text colour.

One radius per role is a rule, not a coincidence — but note that the token is currently under-used: 8px is hardcoded in five places instead of read from `--og-radius`. See Known Debt.

## Components

Quiet and read-only. The instrument does not perform. It states, and only Critical Red is permitted to raise its voice.

### Buttons

- **Shape:** gently rounded (8px), 34px tall, 28px in the small variant.
- **Primary:** Machine Yellow fill with near-black text — the one action on a surface, if there is one.
- **OK variant:** Signal Green fill, for actions that advance a running simulation.
- **Ghost:** a translucent white wash at 5% with a hairline border, for secondary and reversible actions.
- **Hover / Focus:** background and border fade over 0.15s. Focus is a 2px Machine Yellow outline at 2px offset on every interactive element — the single strongest accessibility commitment in the system.
- **Disabled:** Panel Raised fill at 45% opacity with a not-allowed cursor.

### Chips

- **Style:** pill, 999px, 24px tall, translucent amber-tinted fill, warm text, uppercase at 11px with wide tracking.
- **State:** the honesty badge. Clicking expands the full claim into a glass popover. It is the only chip-like element, and it is never decorative — it always carries a truth qualifier.

### Cards / Containers

- **Corner Style:** 8px for shell cards, 6px for dashboard data panels.
- **Background:** Panel for shell cards; a darker fill with a hairline border for data panels.
- **Shadow Strategy:** none at rest. Active tone-bearing cards gain only the inset tone ring.
- **Border:** Hairline. Cards inside 3D views may need Hairline Strong to survive over the render.
- **Internal Padding:** 12px in the shell, 16px on data panels.

### Inputs / Fields

- **Style:** hairline border, transparent fill, 8px radius, native `accent-color` set to Machine Yellow so the slider thumb is on-brand.
- **Focus:** the global 2px Machine Yellow outline.
- **Labels:** 12px at weight 600, with the current value right-aligned in tabular figures.

### Navigation

A single fixed header rail. Items are 36px pills of Annotation text; the active item takes Machine Yellow text over a 12%-alpha yellow wash with a 38%-alpha yellow border. Section changes are the primary navigation gesture and the state is never ambiguous — there is one active item and it is yellow.

The segmented control inside a 3D view (camera presets) is the same idea compressed: 28px buttons on a 6px track, pressed state fills Machine Yellow with near-black text.

### Provenance Tags

The signature component, and the one that most distinguishes this product.

Pills at 1px/6px padding, 11px uppercase, outlined in `currentColor` with no fill. Three variants and exactly three meanings: Signal Green for VERIFIED, Motion Blue for DERIVED, Machine Yellow for ASSUMPTION. They appear in tables of technical values and in the honesty badge. There is deliberately no GAP tag yet, because nothing in the system currently renders one — when it does, it must be added as a fourth variant rather than reusing a colour.

## Known Debt

The fleet dashboard's `.og-fleet-*` styles are defined in `frontend/src/theme.css` and use the shared semantic theme variables. A scan of `frontend/src/dash/*.tsx` found no inline hex color literals; some non-color layout styles remain inline in the Preact component.

The current fleet table class-to-token mapping is:

| Class | Semantic theme variables |
|---|---|
| `.og-fleet-panel` | `--og-line-dashboard`, `--og-panel-dashboard` |
| `.og-fleet-panel__heading p`, `.og-fleet-link` | `--og-yellow` |
| `.og-fleet-panel__risk-title`, `.og-fleet-table th` | `--og-muted` |
| `.og-fleet-panel__assumption`, `.og-fleet-table` | `--og-body` |
| `.og-fleet-wrap`, `.og-fleet-table` borders | `--og-line` |
| `.og-fleet-risk`, `.og-fleet-risk--alert` | `--og-green`, `--og-red` |
| `.og-fleet-instrumented`, `.og-fleet-channels` | `--og-blue`, `--og-amber` |
| `.og-fleet-link:hover` | `--og-text` |

`frontend/src/theme.css` remains the source of these tokens. Other dashboard-specific inline layout styles are not a separate color palette.

Also outside the token system: `font-weight: 500` is used in the dashboard but defined nowhere in the stylesheet; the alert colour map is duplicated byte-for-byte in two files; `tabular-nums` is declared as two independent rules rather than composed; and the dock gap has three different values (8px, 12px, 16px) for one role.

## Do's and Don'ts

### Do:

- **Do** carry the provenance of every figure into the layout — a tag, a badge, a footnote naming the source file and the assumption it rests on.
- **Do** use Machine Yellow for identity and selection, and Instrument Amber for caution, and keep them in their lanes.
- **Do** mark live data and demo data differently, and label which is which, even when the backend is healthy.
- **Do** let density serve the comparison being made. An engineer reading a trend against a threshold wants the pixels.
- **Do** keep the 2px Machine Yellow focus ring on every interactive element.

### Don't:

- **Don't gamify.** No celebratory progress fills, no status emojis, no green glow because a number went up. The instrument does not congratulate.
- **Don't polish into a SaaS dashboard.** No soft white cards, no gentle floating shadows, no generous corner radii, no generic iconography. The anti-reference is Linear and Vercel; this product is none of those things.
- **Don't build a game.** No neon, no cinematic bloom, no particles, no dramatic sky. This is field equipment, and it should look like it.
- **Don't invent a type scale.** Fixed absolute pixels, tabular figures, and the existing steps. A new size needs a reason a maintenance engineer would recognise.
- **Don't let a shadow appear without a state to name.**
- **Don't reuse a status colour for anything but its assigned condition.**
- **Don't quietly approximate the 980E.** Validation covers the 930E and GDY106 only.
