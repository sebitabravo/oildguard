---
name: OilGuard Mining
description: A calibrated instrument for haulage lubrication — amber accent on graphite, quiet until something is wrong.
colors:
  "--og-bg": "#0B0F14"
  "--og-panel": "#111720"
  "--og-panel-2": "#18202C"
  "--og-panel-inset": "#0B0F14"
  "--og-panel-dashboard": "#111720"
  "--og-line": "#1E293B"
  "--og-line-strong": "#334155"
  "--og-line-soft": "#475569"
  "--og-line-dashboard": "#1E293B"
  "--og-text": "#F8FAFC"
  "--og-muted": "#64748B"
  "--og-body": "#94A3B8"
  "--og-yellow": "#F59E0B"
  "--og-yellow-deep": "#D97706"
  "--og-green": "#10B981"
  "--og-blue": "#38BDF8"
  "--og-red": "#EF4444"
  "--og-orange": "#F97316"
  "--og-amber": "#F59E0B"
  "--og-on-yellow": "#0B0F14"
  "--og-card-active": "#1E293B"
  "--og-ground": "#0B0F14"
  "--og-yellow-hover": "#FFC174"
  "--og-green-hover": "#34D399"
  "--og-header-gradient-start": "#111720"
  "--og-header-gradient-end": "#0B0F14"
  "--og-brand-mark-gradient-start": "#F59E0B"
  "--og-brand-mark-gradient-end": "#D97706"
  "--og-on-green": "#052E24"
  "--og-on-blue": "#082F49"
  "--og-on-red": "#450A0A"
  "--og-on-amber": "#451A03"
  "--og-amber-highlight": "#FCD34D"
  "--og-glass": "rgba(11, 15, 20, 0.92)"
  "--og-glass-line": "#334155"
  "--og-surface": "#111720"
  "--og-elevated": "#18202C"
  "--og-overlay": "#1E293B"
  "--og-border-subtle": "#1E293B"
  "--og-border-strong": "#334155"
  "--og-border-highlight": "#475569"
  "--og-elevation-2-highlight": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
  "--og-text-primary": "#F8FAFC"
  "--og-text-secondary": "#94A3B8"
  "--og-text-muted": "#64748B"
  "--og-accent": "#F59E0B"
  "--og-accent-active": "#D97706"
typography:
  prose:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    usage: "Body copy and headings"
  technical:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    usage: "Identifiers, timestamps, raw telemetry, table figures, and micro-labels"
    fontVariantNumeric: "tabular-nums"
fonts:
  selfHosted: true
  format: "woff2"
  files:
    - "/fonts/Geist[wght].woff2"
    - "/fonts/JetBrainsMono[wght].woff2"
colorSemantics:
  accent: "The --og-accent token in frontend/src/theme.css marks identity, actions, and selection; its shared amber hue must carry explicit status cues when used semantically."
  status: "Amber, green, blue, orange, and red indicate operating states and are paired with explicit status cues."
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
    backgroundColor: "{colors.--og-accent}"
    textColor: "#15110a"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "#ffc61f"
  button-ok:
    backgroundColor: "{colors.--og-green}"
    textColor: "#07140d"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.--og-text}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  card:
    backgroundColor: "{colors.--og-panel-2}"
    textColor: "{colors.--og-body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card-active:
    backgroundColor: "#1d2a40"
    rounded: "{rounded.control}"
  data-panel:
    backgroundColor: "{colors.--og-panel-dashboard}"
    textColor: "{colors.--og-body}"
    rounded: "{rounded.data-sm}"
    padding: "10px 12px"
  data-panel-inset:
    backgroundColor: "{colors.--og-panel-inset}"
    textColor: "{colors.--og-body}"
    rounded: "{rounded.data-sm}"
    padding: "10px 12px"
  analyzer-notice:
    textColor: "{colors.--og-text}"
    rounded: "{rounded.data-sm}"
    padding: "10px 12px"
  sensor-identity:
    textColor: "{colors.--og-muted}"
    rounded: "50%"
    height: "24px"
    width: "24px"
  touch-target-compact:
    height: "44px"
    width: "44px"
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
    textColor: "{colors.--og-text}"
    rounded: "{rounded.control}"
    height: "32px"
    width: "32px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.--og-muted}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  nav-item-active:
    backgroundColor: "rgba(242, 183, 5, 0.12)"
    textColor: "{colors.--og-accent}"
  seg-button-pressed:
    backgroundColor: "{colors.--og-accent}"
    textColor: "#15110a"
    rounded: "{rounded.data-sm}"
    height: "28px"
  drawer-tab-active:
    textColor: "{colors.--og-accent}"
    typography: "{typography.title}"
    height: "34px"
  tag-verified:
    backgroundColor: "transparent"
    textColor: "{colors.--og-green}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
  tag-derived:
    backgroundColor: "transparent"
    textColor: "{colors.--og-blue}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
  tag-assumption:
    backgroundColor: "transparent"
    textColor: "{colors.--og-accent}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
---

# Design System: OilGuard Mining

## Overview

**Creative North Star: "The Calibrated Instrument"**

Every surface in this product behaves like a measuring instrument, not like an application. A gauge does not decorate its reading; it declares its uncertainty. That is the whole thesis. The oil level arrives wrapped in a confidence band because the reading has one. Every figure carries a provenance tag — VERIFIED, DERIVED, ASSUMPTION — because a number without a source is a liability on equipment a person is accountable for. The synthetic-proxy badge is not a disclaimer bolted onto the corner; it is the instrument's accuracy class, rendered.

The graphite instrument is grounded in the shared tokens in `frontend/src/theme.css`. Its product accent is `--og-accent` (`#F59E0B`), used for identity, actions, and selection; the same hue is also the amber status color, so semantic status always has an explicit cue alongside color.

Density is deliberate and high. This is read by an engineer comparing a trend against a threshold, so information per square centimetre outranks whitespace. Type is small, tabular, and unmoving. What the system refuses is the entire vocabulary of reassurance: no progress theatre, no celebratory motion, no shadow that lifts a surface for the sake of looking lifted, no soft-card dashboard idiom. The instrument is quiet at rest. Its job is to be believed when it speaks.

**Key Characteristics:**

- The theme-defined accent marks identity, actions, and selection; status colors retain their semantic roles and always carry an explicit cue.
- Depth by tone in the shell, by hairline border in the data surfaces: two documented materials, not one accident.
- Provenance as a first-class visual component, alongside colour and type size.
- Tabular figures everywhere, so nothing jitters while it updates.
- Flat at rest. Shadow is a response to state, never decoration.
- Status never travels on colour alone: every tone ships with a word, a dot, or a numbered marker beside it.
- Numbers are localised: Spanish reads with a decimal comma, English with a point, one formatter for both.

## Colors

The palette is defined by the first `:root` block in `frontend/src/theme.css`; the front matter above mirrors its color-valued custom properties. `--og-accent` (`#F59E0B`) is the product accent for identity, actions, and selection. `--og-amber` shares that hue, so use it for caution only with an explicit status cue. Accent usage follows the theme tokens rather than a manufacturer paint color.

### Accent and Status

- **Accent** (`--og-accent`, `#F59E0B`): identity, actions, and selection. `--og-accent-active` (`#D97706`) is the active shade; the theme also defines hover and brand-mark gradient stops.
- **Status**: `--og-green` (`#10B981`), `--og-blue` (`#38BDF8`), `--og-orange` (`#F97316`), `--og-red` (`#EF4444`), and `--og-amber` (`#F59E0B`) retain their operating-state meanings. Status always includes text, a dot, or another explicit cue.

### Neutrals

Backgrounds and surfaces use `--og-bg`, `--og-panel`, `--og-panel-2`, `--og-panel-inset`, and `--og-panel-dashboard`. Text uses `--og-text`, `--og-body`, and `--og-muted`; borders and overlays use the corresponding `--og-line-*`, `--og-border-*`, and `--og-glass*` tokens. Their exact values remain in the front matter and are sourced from `theme.css`.

### Named Rules

**The Accent-and-Status Rule.** The accent may share a hue with amber caution, but color alone never communicates status. Pair every status tone with a word, dot, or other explicit cue.

**The Status Palette Is Closed.** Green, blue, amber, orange, and red retain their semantic operating-state meanings. They are not reassigned for decoration.

**The Sensor Identity Rule.** Sensor identity uses neutral numbered rings, never the status palette. Selection is expressed separately through the theme-defined accent.

**The Word-Beside-Colour Rule.** A status tone is never the only carrier of its meaning. The analyzer-outage notice pairs a red border with a red dot and a `role="alert"` sentence; the RUL panel pairs its horizon tone with a `role="status"` text cue; the fleet table writes Alert or Normal and lists offending channels in words.

## Typography

**Prose and headings:** Geist (`Geist, ui-sans-serif, system-ui, sans-serif`).
**Technical data:** JetBrains Mono (`"JetBrains Mono", ui-monospace, monospace`) for identifiers, timestamps, raw telemetry, table figures, and micro-labels; numeric figures use `tabular-nums`.
**Self-hosting:** Geist and JetBrains Mono variable fonts are served locally as WOFF2 from `/fonts/Geist[wght].woff2` and `/fonts/JetBrainsMono[wght].woff2`.

**Character:** Geist keeps prose and headings legible; JetBrains Mono makes dense measurements and identifiers align. The theme-defined `--og-accent` token marks identity, actions, and selection. Its shared amber status hue means caution only alongside an explicit status cue.

### Hierarchy

- **Brand** (700, 16px, 1.15, 0.01em): the product name in the header, once.
- **Readout** (700, 22px, 1.1, tabular): the primary instrument value — oil level, RUL headline. One per panel at most.
- **Headline** (700, 14px, 1.3, 0.02em): drawer and panel section headings.
- **Dashboard heading** (700, 16px): both monitoring sheets share the same heading class and size.
- **Title** (600, 13px): control labels, tab labels, metric names.
- **Body** (400, 13px, 1.55): running prose in the drawer, at roughly 65–75 characters.
- **Label** (600, 12px, 0.05em): HUD metadata, field labels, secondary controls.
- **Micro** (700, 11px, 0.04em, uppercase): badges and the provenance table header; provenance tags sit a half-step lower at 10.5px.
- **Table** (400, 11px, tabular) and **Table head** (700, 10px, 0.035em, uppercase): the dense fleet table only, one step under Micro because seven columns must fit a 1126px fixed-layout row.

### Named Rules

**The Weight Steps Rule.** Only 400, 600 and 700 are used for font weight; labels, prose and emphasis map to these documented steps.

**The Tabular Rule.** Numeric selectors `.og-num`, `.og-value`, and `.og-sensor-id` share one `font-variant-numeric: tabular-nums` rule. A figure must hold its column while it updates; a level readout that jitters as it counts is a broken instrument.

**The Fixed-Pixel Rule.** The system is absolute pixels — no `rem`, no `html { font-size }`. A readout must occupy the same physical width regardless of user zoom or density, because it is compared against a fixed threshold.

**The Locale-Decimal Rule.** Every displayed figure goes through `formatNumber(value, lang, digits)`: `en-US` for English, `es-CL` for Spanish (decimal comma), never grouping separators, and a fixed digit count per quantity so the column width does not move when the language switches. Do not interpolate a raw number into copy.

## Layout

A viewport-first shell. On desktop the app fills the window with no page scroll on the 3D views; only the drawer body scrolls. Mine and wheel simulation docks use the shared 12px `--og-dock-gap` token. The header is a fixed 60px rail, the content area is a flex row of viewport plus drawer, and the drawer is a fixed 400px column capped at 42vw so it can never crowd the render. Collapsed, the drawer becomes a 52px rail with the toggle alone. Each page carries one visually hidden `h1` (a 1px clipped `.og-visually-hidden` element) that repeats the active section name; the active nav item is the visible title, so no on-page heading duplicates it.

The dashboard is the exception and the reason for the second material: it is a scrolling page at up to 1440px wide inside `.og-page` (the document window is not its scroll container). It opens with the fleet table sheet, then a flex-wrap row of one primary chart sheet and a side column (mode indicator, RUL panel, alert timeline). Above 1024px it wraps on `flex-basis`; at or below 1024px it is forced into a single column. The fleet table is a fixed-layout table with a 1126px minimum width inside a horizontally scrolling wrapper, and its first column (truck) is sticky so a row never loses its identity while scrolling.

Spacing follows a 4px rhythm: 4, 8, 12, 16, 20, 24px, with 6, 10, 14 and 18px half-steps in the dense data sheets. There is no declared spacing scale; these are the steps that recur. Layout is flex-only; the CSS `display: grid` that exists centres a glyph inside the brand mark and the touch checkbox, and is never used to lay out a page.

Three width breakpoints exist and no more:

- **≤ 1100px** — the header tagline and the entire bottom-left HUD stack are removed. Not reflowed, not condensed: removed, because an instrument that cannot fit its annotations simply stops showing them.
- **≤ 1024px** — the view stacks vertically and the drawer becomes a full-width band capped at 45% of the view height; dashboard sheets drop to a single column.
- **≤ 900px** — the compact touch shell. The header grows to 108px and wraps into two rows (brand and language control, then the nav as a full-width, horizontally scrolling 44px strip with no visible scrollbar); the brand shows the short name "OilGuard". Every button, tab, label, nav link, wheel-detail link, icon button, segmented-control button and range input reaches a 44px minimum target; checkboxes keep an 18px drawn box inside a 44px hit area. The wheel view scrolls as a column (scene at `clamp(340px, 42vh, 360px)`, dock below it in flow rather than floating), the wheel sensor stack is hidden and sensor pills collapse to their numbered ring, and the dashboard page padding tightens to 12px 14px 20px.

## Elevation & Depth

Two materials, deliberately.

**The shell separates by tone.** Graphite Base to Panel to Panel Raised is a three-step tonal ladder; there is no shadow between them. This is the chrome — header, drawer, HUD, dock — and it sits against a WebGL render, where a drop shadow would read as dirt on the lens.

**The data surfaces separate by hairline.** Monitoring panels use a one-pixel Dashboard Line border and a darker fill than the shell rather than a tonal step, because they are read as sheets laid on the instrument, not as parts of its housing.

Shadow in this system is never structural. The nine `box-shadow` declarations in the stylesheet exist for exactly four jobs: the brand mark's inner hairline and outer glow, the drop under floating glass (HUD panels, the honesty popover, in-scene label pills), the one-pixel ring on an active or selected thing, and the soft halo on a status dot. Backdrop blur marks what floats. If a surface is not floating, not active or selected, not a status dot, and not the brand mark, it has no shadow.

### Shadow Vocabulary

- **Floating glass** (`0 10px 30px rgba(0, 0, 0, 0.35)`): HUD panels and popovers suspended over the 3D scene, always paired with a backdrop blur. The honesty popover deepens it to 0.4 alpha.
- **Tone ring** (`0 0 0 1px var(--tone, transparent) inset`): the active state of a tone-carrying card. An inset hairline in the tone colour, never a glow.
- **Selection ring** (`0 0 0 1px var(--og-yellow) inset`, with a theme-defined accent border): the selected sensor card. The matching in-scene label takes a theme-defined accent outer ring over its label drop.
- **Label drop** (`0 4px 12px rgba(0, 0, 0, 0.35)`, `0 4px 14px rgba(0, 0, 0, 0.4)` when active): in-scene label pills, so text stays legible against arbitrary geometry.
- **Status dot halo** (`0 0 8px var(--tone, transparent)`): the 9px status dot only, in the tone it reports.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow appears only as a response to state — focus, active tone, or a panel genuinely floating above a render. If you cannot name the state that produced it, delete it.

**The Glass Is Not Frosted, It Is Situated.** Backdrop blur marks a panel floating over live 3D content so the render stays perceptible behind it. Do not blur a panel that sits on flat graphite; there is nothing behind it to situate.

## Shapes

Gently rounded and never soft. Controls and cards share 8px (`--og-radius`) — one radius for things you touch. Monitoring/data panels and the analyzer notice share 6px (`--og-radius-panel`), slightly tighter, because a data sheet is a document laid on the instrument rather than a part of it. Floating glass uses 12px. Full pills are reserved for status content: badges, provenance tags, in-scene label pills. Circles are reserved for markers: the 9px status dot, the 8px dot inside the analyzer notice, and the numbered sensor-identity rings (24px beside a card, 18px inside a scene label). The touch checkbox box is the one 3px corner.

Borders are hairlines. On dark surfaces they are white at low alpha rather than a lighter grey, which keeps them from reading as a second text colour. A status border (the analyzer notice, an RUL panel) is the full one-pixel border in the status colour on all four sides; a status is never a thick strip on one edge.

One radius per role is a rule, not a coincidence: shared `--og-radius` and `--og-radius-panel` tokens keep the matching component roles consistent.

## Components

Quiet and read-only. The instrument does not perform. It states, and only Critical Red is permitted to raise its voice.

### Buttons

- **Shape:** gently rounded (8px), 34px tall, 28px in the small variant. At 900px and below every button, tab, label and link-as-button reaches 44px minimum height and width.
- **Primary:** theme-defined accent fill with dark text — the one action on a surface, if there is one.
- **OK variant:** Signal Green fill, for actions that advance a running simulation.
- **Ghost:** the default `.og-btn`: a translucent white wash at 6% with a Hairline Strong border, for secondary and reversible actions.
- **Hover / Focus:** background and border fade over 0.15s (primary uses `--og-yellow-hover`, OK uses `--og-green-hover`, ghost brightens its wash to 12%). Focus is a 2px theme-defined accent outline at 2px offset on every interactive element — the single strongest accessibility commitment in the system.
- **Disabled:** the variant's own fill at 45% opacity with a not-allowed cursor.
- **Reduced motion:** under `prefers-reduced-motion: reduce` every CSS transition is removed, and 3D easing (gearbox spread, cutaway, marker scale) snaps to its target instead of interpolating.

### Chips

- **Style:** pill, 999px, 24px tall, translucent amber-tinted fill, warm text, uppercase at 11px with wide tracking. Shared `.og-badge` modifiers style the honesty/source badges, demo stepper, and N1–N4 severity chips while retaining each semantic color and compact modifier geometry.
- **State:** the honesty badge. Clicking expands the full claim into a glass popover. Severity and stepper chips convey state; they are never decorative.

### Cards / Containers

- **Corner Style:** 8px for shell cards, 6px for dashboard data panels.
- **Background:** Panel Raised for drawer cards; Panel Dashboard with a Dashboard Line border for monitoring sheets; Panel Inset for the RUL panel and the chart canvas.
- **Shadow Strategy:** none at rest. Active tone-bearing cards gain only the inset tone ring; the selected sensor card gains a theme-defined accent border and ring.
- **Border:** Hairline in the shell. Cards inside 3D views may need Hairline Strong to survive over the render.
- **Internal Padding:** 10px 12px on shell cards and side sheets, 16px on the chart sheet, 14px 16px on the fleet sheet.

### Inputs / Fields

- **Style:** hairline border, transparent fill, 8px radius, native `accent-color` set to theme-defined accent so the slider thumb is on-brand. At 900px and below the checkbox is redrawn: a 44px hit area around an 18px box that fills theme-defined accent with a checkmark when set.
- **Focus:** the global 2px theme-defined accent outline (on the drawn box for touch checkboxes).
- **Labels:** 12px at weight 600, with the current value right-aligned in tabular figures.

### Navigation

A single fixed header rail of real links to `/mine`, `/wheel` and `/monitoring`. Items are 36px pills of Annotation text at 14px/600; the active item (`aria-current="page"`) takes theme-defined accent text over a 12%-alpha accent wash with a 38%-alpha accent border. Section changes are the primary navigation gesture and the state is never ambiguous — there is one active item and it uses the theme accent. At 900px and below the rail becomes a second row of 44px, horizontally scrolling items under the brand and the EN/ES segmented control.

The segmented control inside a 3D view (camera presets) is the same idea compressed: 28px buttons on a 6px track, pressed state fills theme-defined accent with dark text.

### Provenance Tags

The signature component, and the one that most distinguishes this product.

Pills at 1px/6px padding, 10.5px, outlined in `currentColor` with no fill. Three variants and exactly three meanings: Signal Green for VERIFIED, Motion Blue for DERIVED, theme-defined accent for ASSUMPTION. They appear in tables of technical values and in the honesty badge. There is deliberately no GAP tag yet, because nothing in the system currently renders one — when it does, it must be added as a fourth variant rather than reusing a colour.

### Fleet Table

The monitoring page's primary sheet: one row per wheel, seven data columns (truck, wheel, oil, temperature, vibration, current, risk) plus a detail link. Table and Table head type, a Hairline rule under every row, a faint white wash on row hover, and a sticky first column on Panel Dashboard. Figures are tabular and localised; multi-sensor cells join values with a middle dot. Risk is a word, never a swatch alone: Normal in Signal Green, Alert in Critical Red, with the offending channels listed beneath in Instrument Amber. Instrumented wheels carry a small Motion Blue tag. The link into wheel detail is theme-defined accent, bold, underlined, and turns Readout on hover. The sheet header repeats the SYNTHETIC-PROXY qualifier in theme-defined accent beside the title; the figures are demo values and the sheet says so.

### RUL Panel

The remaining-useful-life sheet on Panel Inset, with its border and text cue chosen by shift horizon: Critical Red when the critical horizon is inside the shift, Instrument Amber for a warning horizon, Signal Green when the critical horizon lies beyond the shift. The hours-to-critical figure and a `role="status"` sentence share the tone. A suppressed estimate gets an Amber border and an honest note rather than a zero; an unavailable analyzer gets a Critical Red border.

### Analyzer Notice

An analyzer outage is a full-width, `role="alert"` bar on the dashboard: one-pixel Critical Red border on all four sides, a 9% red wash mixed into Panel Dashboard, an 8px red status dot, bold Readout text, 6px radius. It names the outage in words and replaces the alert list and RUL estimate beneath it; it does not borrow a coloured side strip.

### Sensor Identity Marker

A neutral Annotation-coloured ring carrying the sensor's number: 24px beside the sensor card in the drawer, 18px inside the in-scene label pill, 9px tabular numerals, no fill. It identifies which sensor, never what condition it reports; selection is expressed separately by the theme-defined accent ring on the card and the label.

## Known Debt

The eight items in the DESIGN-DEBT follow-up are resolved. Theme literals are tokenized; monitoring controls and chips use shared classes; panel radii and heading sizes are unified by role; font weights use only the documented 400/600/700 steps; alert severity colors share one map; tabular numerals share one rule; and the mine/wheel simulation docks use one spacing token.

- D1 — Theme tokens: `eac0053`
- D2 — Monitoring controls and chips: `0f1f0f9`
- D3 — Shared panel radius: `5f58f3e`
- D4 — Documented font weights: `6954477`
- D5 — Shared alert severity colors: `f612eb5`
- D6 — Shared tabular numerals rule: `7367bf0`
- D7 — Shared simulation dock gap: `50f4396`
- D8 — Shared monitoring-sheet heading: `da768e6`

No unresolved known debt remains. The later test-only Astro/Bun typing compatibility commit `78e4f52` supports the debt guards and is not part of D1–D8.

## Do's and Don'ts

## Nordic Telemetry Precision foundation

The final UI foundation uses a carbon ground (`#0B0F14`) with layered telemetry
surfaces (`#111720`, `#18202C`, `#1E293B`). The `--og-accent` token (`#F59E0B`)
marks identity, actions, and selection; its shared amber hue means caution only
with an explicit status cue, while green, blue, orange, and red remain semantic status lanes.
Status cues are explicit rather than decorative. Borders are visible and square-edged: 2/4/6/8 px radii only.

Geist is the prose and heading face. JetBrains Mono is used for identifiers,
timestamps, telemetry figures and micro-labels, with tabular numerals. Every
synthetic or derived value carries an explicit provenance label, and the shell
must never imply production TLS, SLA, authentication or validation that the
prototype does not provide.

### Do:

- **Do** carry the provenance of every figure into the layout — a tag, a badge, a footnote naming the source file and the assumption it rests on.
- **Do** use the theme-defined accent for identity and selection; pair amber caution with an explicit status cue.
- **Do** mark live data and demo data differently, and label which is which, even when the backend is healthy.
- **Do** let density serve the comparison being made. An engineer reading a trend against a threshold wants the pixels.
- **Do** keep the 2px theme-accent focus ring on every interactive element.
- **Do** put a word, dot or numbered marker beside every status tone, and format every figure with `formatNumber` for the active language.
- **Do** keep a 44px minimum target for every control at 900px and below.

### Don't:

- **Don't gamify.** No celebratory progress fills, no status emojis, no green glow because a number went up. The instrument does not congratulate.
- **Don't polish into a SaaS dashboard.** No soft white cards, no gentle floating shadows, no generous corner radii, no generic iconography. The anti-reference is Linear and Vercel; this product is none of those things.
- **Don't build a game.** No neon, no cinematic bloom, no particles, no dramatic sky. This is field equipment, and it should look like it.
- **Don't invent a type scale.** Fixed absolute pixels, tabular figures, and the existing steps. A new size needs a reason a maintenance engineer would recognise.
- **Don't let a shadow appear without a state to name.**
- **Don't reuse a status colour for anything but its assigned condition, and never use one to tell sensors apart.**
- **Don't mark a status with a one-sided coloured strip.** Use the full border plus a dot or word.
- **Don't quietly approximate the 980E.** Validation covers the 930E and GDY106 only.
