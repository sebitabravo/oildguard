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
  panel-inset: "#0e1420"
  panel-dashboard: "#111a2c"
  readout: "#e9eef7"
  body-copy: "#c9d5e8"
  annotation: "#9db0cc"
  rule-line: "#3a4a63"
  dashboard-line: "#2a3a55"
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
  table:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "11px"
    fontFeature: "'tnum' 1"
  table-head:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.035em"
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
    backgroundColor: "#ffc61f"
  button-ok:
    backgroundColor: "{colors.signal-green}"
    textColor: "#07140d"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.readout}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "34px"
  card:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.body-copy}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card-active:
    backgroundColor: "#1d2a40"
    rounded: "{rounded.control}"
  data-panel:
    backgroundColor: "{colors.panel-dashboard}"
    textColor: "{colors.body-copy}"
    rounded: "{rounded.data-sm}"
    padding: "10px 12px"
  data-panel-inset:
    backgroundColor: "{colors.panel-inset}"
    textColor: "{colors.body-copy}"
    rounded: "{rounded.data-sm}"
    padding: "10px 12px"
  analyzer-notice:
    textColor: "{colors.readout}"
    rounded: "{rounded.data-sm}"
    padding: "10px 12px"
  sensor-identity:
    textColor: "{colors.annotation}"
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
    textColor: "{colors.readout}"
    rounded: "{rounded.control}"
    height: "32px"
    width: "32px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.annotation}"
    rounded: "{rounded.control}"
    padding: "0 16px"
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
- Status never travels on colour alone: every tone ships with a word, a dot, or a numbered marker beside it.
- Numbers are localised: Spanish reads with a decimal comma, English with a point, one formatter for both.

## Colors

Komatsu yellow on graphite, with a fixed semantic status ramp that means the same thing on every screen.

### Primary

- **Machine Yellow** (`#f2b705`): identity and selection. The brand mark, the active nav item, the pressed segmented control, the selected sensor card and scene label, the focus ring, the favicon, and links into wheel detail. It is also the machine's paint in the 3D scene, from the same value.
- **Machine Yellow Deep** (`#d9a200`): the shadow end of the brand mark's gradient. Never a standalone colour. The primary button's hover is a literal lighter yellow (`#ffc61f`), not this token — see Known Debt.

### Secondary

- **Instrument Amber** (`#f5a623`): caution. N1 alert, the warning threshold line, the RUL panel when the horizon is a warning or the estimate is suppressed, the fleet table's flagged-channel list, the honesty badge border, the dashboard's active accent. It is visually adjacent to Machine Yellow and must never be confused with it — see the Two-Yellow Rule.
- **Caution Orange** (`#ff8c42`): N2 and N3 escalation. Shares one value across both levels; they are separated by lane position in the chart, not by hue.

### Tertiary

- **Signal Green** (`#2fbf71`): rest, OK, the normal oil band, rest-window shading, a normal fleet risk, the RUL panel when the critical horizon lies beyond the shift, VERIFIED tags.
- **Motion Blue** (`#4a8ef0`): the MOVING state, the confidence band, the "instrumented" fleet marker, and DERIVED tags.
- **Critical Red** (`#ff4d42`): critical threshold, STOP, N4, an alerting fleet row, the RUL panel inside the critical horizon, and the analyzer-outage notice.

### Neutral

- **Graphite Base** (`#0a0e16`): the page. Unlit pit.
- **Panel** (`#111823`): the drawer surface.
- **Panel Raised** (`#182233`): the second surface step, used by drawer cards.
- **Panel Inset** (`#0e1420`): the darkest data surface — the chart canvas, the RUL panel, and the checkbox box on touch viewports.
- **Panel Dashboard** (`#111a2c`): the monitoring page's sheet fill, paired with Dashboard Line.
- **Readout** (`#e9eef7`): primary text and the level trace itself.
- **Body Copy** (`#c9d5e8`): running prose in the drawer.
- **Annotation** (`#9db0cc`): secondary text, axis labels, timestamps — anything that qualifies another value.
- **Rule Line** (`#3a4a63`): soft borders, dashed empty states, and the outline of inactive stepper chips.
- **Dashboard Line** (`#2a3a55`): the one-pixel border of monitoring sheets; one step stronger than Hairline so a sheet reads against Panel Dashboard.
- **Hairline** (`rgba(255, 255, 255, 0.09)`): the default separator on dark surfaces.
- **Hairline Strong** (`rgba(255, 255, 255, 0.18)`): the separator that must survive on top of a 3D render.
- **Glass** (`rgba(9, 13, 21, 0.64)`) and **Glass Line** (`rgba(255, 255, 255, 0.13)`): HUD panels floating over the 3D scene.

### Named Rules

**The Two-Yellow Rule.** Machine Yellow is who we are; Instrument Amber is what we warn about. Neither ever takes the other's job. If a state can only be distinguished by swapping which yellow it uses, the state needs a second signal — a label, a ring, or a position.

**The Machine-Wears-Its-Own-Paint Rule.** Machine Yellow is simultaneously the brand colour and the machine's paint in the 3D scene, and that overlap is intentional, not a coincidence to be normalised away. The interface and the asset share one colour because they are one system.

**The Status Palette Is Closed.** Signal Green, Motion Blue, Instrument Amber, Caution Orange and Critical Red carry fixed meanings. They are never reassigned for decoration, never introduced as accents, and never used to signal anything other than the machine condition they were assigned to.

**The Sensor Identity Rule.** Sensor identity uses neutral Annotation-colored numbered rings (24px beside a sensor card, 18px inside the in-scene label pill), never the closed status palette. Machine Yellow may indicate selection; status colors communicate machine condition only.

**The Word-Beside-Colour Rule.** A status tone is never the only carrier of its meaning. The analyzer-outage notice pairs a full red border with a red dot and a `role="alert"` sentence; the RUL panel pairs its horizon tone with a `role="status"` text cue; the fleet table writes Alert or Normal and lists the offending channels in words. If a new surface can only be read by its hue, it needs a label.

## Typography

**Display Font:** Inter (with `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial` fallback)
**Body Font:** Inter (same stack)
**Label/Mono Font:** none distinct — labels are Inter at small size and weight, not a separate family

**Character:** One family doing every job, which is what an instrument does. There is no display face competing with the readout and no mono for figures — the numeric discipline comes from `tabular-nums`, not from a typeface swap. Small, tight, and slightly letterspaced when uppercased, so labels read as engraved plate text rather than as UI chrome.

### Hierarchy

- **Brand** (700, 16px, 1.15, 0.01em): the product name in the header, once.
- **Readout** (700, 22px, 1.1, tabular): the primary instrument value — oil level, RUL headline. One per panel at most.
- **Headline** (700, 14px, 1.3, 0.02em): drawer and panel section headings.
- **Dashboard heading** (700, 16px for the level chart, 18px for the fleet panel): the two monitoring sheets' titles. Two sizes for one role is recorded as debt, not as a step to extend.
- **Title** (600, 13px): control labels, tab labels, metric names.
- **Body** (400, 13px, 1.55): running prose in the drawer, at roughly 65–75 characters.
- **Label** (600, 12px, 0.05em): HUD metadata, field labels, secondary controls.
- **Micro** (700, 11px, 0.04em, uppercase): badges and the provenance table header; provenance tags sit a half-step lower at 10.5px.
- **Table** (400, 11px, tabular) and **Table head** (700, 10px, 0.035em, uppercase): the dense fleet table only, one step under Micro because seven columns must fit a 1126px fixed-layout row.

### Named Rules

**The Tabular Rule.** Every number that changes over time carries `tabular-nums`. A figure must hold its column while it updates; a level readout that jitters as it counts is a broken instrument. Apply the property to the element, not only to a wrapper.

**The Fixed-Pixel Rule.** The system is absolute pixels — no `rem`, no `html { font-size }`. A readout must occupy the same physical width regardless of user zoom or density, because it is compared against a fixed threshold.

**The Locale-Decimal Rule.** Every displayed figure goes through `formatNumber(value, lang, digits)`: `en-US` for English, `es-CL` for Spanish (decimal comma), never grouping separators, and a fixed digit count per quantity so the column width does not move when the language switches. Do not interpolate a raw number into copy.

## Layout

A viewport-first shell. On desktop the app fills the window with no page scroll on the 3D views; only the drawer body scrolls. The header is a fixed 60px rail, the content area is a flex row of viewport plus drawer, and the drawer is a fixed 400px column capped at 42vw so it can never crowd the render. Collapsed, the drawer becomes a 52px rail with the toggle alone. Each page carries one visually hidden `h1` (a 1px clipped `.og-visually-hidden` element) that repeats the active section name; the active nav item is the visible title, so no on-page heading duplicates it.

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
- **Selection ring** (`0 0 0 1px var(--og-yellow) inset`, with a Machine Yellow border): the selected sensor card. The matching in-scene label takes a Machine Yellow outer ring over its label drop.
- **Label drop** (`0 4px 12px rgba(0, 0, 0, 0.35)`, `0 4px 14px rgba(0, 0, 0, 0.4)` when active): in-scene label pills, so text stays legible against arbitrary geometry.
- **Status dot halo** (`0 0 8px var(--tone, transparent)`): the 9px status dot only, in the tone it reports.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadow appears only as a response to state — focus, active tone, or a panel genuinely floating above a render. If you cannot name the state that produced it, delete it.

**The Glass Is Not Frosted, It Is Situated.** Backdrop blur marks a panel floating over live 3D content so the render stays perceptible behind it. Do not blur a panel that sits on flat graphite; there is nothing behind it to situate.

## Shapes

Gently rounded and never soft. Controls and cards share 8px (`--og-radius`) — one radius for things you touch. Data panels and the analyzer notice use 6px, slightly tighter, because a data sheet is a document laid on the instrument rather than a part of it. Floating glass uses 12px. Full pills are reserved for status content: badges, provenance tags, in-scene label pills. Circles are reserved for markers: the 9px status dot, the 8px dot inside the analyzer notice, and the numbered sensor-identity rings (24px beside a card, 18px inside a scene label). The touch checkbox box is the one 3px corner.

Borders are hairlines. On dark surfaces they are white at low alpha rather than a lighter grey, which keeps them from reading as a second text colour. A status border (the analyzer notice, an RUL panel) is the full one-pixel border in the status colour on all four sides; a status is never a thick strip on one edge.

One radius per role is a rule, not a coincidence — but note that the token is currently under-used: 8px is hardcoded in five places instead of read from `--og-radius`. See Known Debt.

## Components

Quiet and read-only. The instrument does not perform. It states, and only Critical Red is permitted to raise its voice.

### Buttons

- **Shape:** gently rounded (8px), 34px tall, 28px in the small variant. At 900px and below every button, tab, label and link-as-button reaches 44px minimum height and width.
- **Primary:** Machine Yellow fill with near-black text — the one action on a surface, if there is one.
- **OK variant:** Signal Green fill, for actions that advance a running simulation.
- **Ghost:** the default `.og-btn`: a translucent white wash at 6% with a Hairline Strong border, for secondary and reversible actions.
- **Hover / Focus:** background and border fade over 0.15s (primary lightens to `#ffc61f`, OK to `#43d386`, ghost brightens its wash to 12%). Focus is a 2px Machine Yellow outline at 2px offset on every interactive element — the single strongest accessibility commitment in the system.
- **Disabled:** the variant's own fill at 45% opacity with a not-allowed cursor.
- **Reduced motion:** under `prefers-reduced-motion: reduce` every CSS transition is removed, and 3D easing (gearbox spread, cutaway, marker scale) snaps to its target instead of interpolating.

### Chips

- **Style:** pill, 999px, 24px tall, translucent amber-tinted fill, warm text, uppercase at 11px with wide tracking.
- **State:** the honesty badge. Clicking expands the full claim into a glass popover. It is the only chip-like element, and it is never decorative — it always carries a truth qualifier.

### Cards / Containers

- **Corner Style:** 8px for shell cards, 6px for dashboard data panels.
- **Background:** Panel Raised for drawer cards; Panel Dashboard with a Dashboard Line border for monitoring sheets; Panel Inset for the RUL panel and the chart canvas.
- **Shadow Strategy:** none at rest. Active tone-bearing cards gain only the inset tone ring; the selected sensor card gains a Machine Yellow border and ring.
- **Border:** Hairline in the shell. Cards inside 3D views may need Hairline Strong to survive over the render.
- **Internal Padding:** 10px 12px on shell cards and side sheets, 16px on the chart sheet, 14px 16px on the fleet sheet.

### Inputs / Fields

- **Style:** hairline border, transparent fill, 8px radius, native `accent-color` set to Machine Yellow so the slider thumb is on-brand. At 900px and below the checkbox is redrawn: a 44px hit area around an 18px box that fills Machine Yellow with a checkmark when set.
- **Focus:** the global 2px Machine Yellow outline (on the drawn box for touch checkboxes).
- **Labels:** 12px at weight 600, with the current value right-aligned in tabular figures.

### Navigation

A single fixed header rail of real links to `/mine`, `/wheel` and `/monitoring`. Items are 36px pills of Annotation text at 14px/600; the active item (`aria-current="page"`) takes Machine Yellow text over a 12%-alpha yellow wash with a 38%-alpha yellow border. Section changes are the primary navigation gesture and the state is never ambiguous — there is one active item and it is yellow. At 900px and below the rail becomes a second row of 44px, horizontally scrolling items under the brand and the EN/ES segmented control.

The segmented control inside a 3D view (camera presets) is the same idea compressed: 28px buttons on a 6px track, pressed state fills Machine Yellow with near-black text.

### Provenance Tags

The signature component, and the one that most distinguishes this product.

Pills at 1px/6px padding, 10.5px, outlined in `currentColor` with no fill. Three variants and exactly three meanings: Signal Green for VERIFIED, Motion Blue for DERIVED, Machine Yellow for ASSUMPTION. They appear in tables of technical values and in the honesty badge. There is deliberately no GAP tag yet, because nothing in the system currently renders one — when it does, it must be added as a fourth variant rather than reusing a colour.

### Fleet Table

The monitoring page's primary sheet: one row per wheel, seven data columns (truck, wheel, oil, temperature, vibration, current, risk) plus a detail link. Table and Table head type, a Hairline rule under every row, a faint white wash on row hover, and a sticky first column on Panel Dashboard. Figures are tabular and localised; multi-sensor cells join values with a middle dot. Risk is a word, never a swatch alone: Normal in Signal Green, Alert in Critical Red, with the offending channels listed beneath in Instrument Amber. Instrumented wheels carry a small Motion Blue tag. The link into wheel detail is Machine Yellow, bold, underlined, and turns Readout on hover. The sheet header repeats the SYNTHETIC-PROXY qualifier in Machine Yellow beside the title; the figures are demo values and the sheet says so.

### RUL Panel

The remaining-useful-life sheet on Panel Inset, with its border and text cue chosen by shift horizon: Critical Red when the critical horizon is inside the shift, Instrument Amber for a warning horizon, Signal Green when the critical horizon lies beyond the shift. The hours-to-critical figure and a `role="status"` sentence share the tone. A suppressed estimate gets an Amber border and an honest note rather than a zero; an unavailable analyzer gets a Critical Red border.

### Analyzer Notice

An analyzer outage is a full-width, `role="alert"` bar on the dashboard: one-pixel Critical Red border on all four sides, a 9% red wash mixed into Panel Dashboard, an 8px red status dot, bold Readout text, 6px radius. It names the outage in words and replaces the alert list and RUL estimate beneath it; it does not borrow a coloured side strip.

### Sensor Identity Marker

A neutral Annotation-coloured ring carrying the sensor's number: 24px beside the sensor card in the drawer, 18px inside the in-scene label pill, 9px tabular numerals, no fill. It identifies which sensor, never what condition it reports; selection is expressed separately by the Machine Yellow ring on the card and the label.

## Known Debt

The monitoring page now reads its colours from the shared theme variables: a scan of `frontend/src/dash/*.tsx` and the pages finds no hex literals, and the `.og-fleet-*` rules in `frontend/src/theme.css` resolve to the same variables as the rest of the shell. What remains outside the token system:

- `frontend/src/theme.css` still holds literal hex outside `:root`: `#15110a` (text on Machine Yellow, repeated), `#1d2a40` (active card), `#0b0f17` (viewport ground), the header gradient stops, the brand-mark gradient, and the hover fills `#ffc61f` and `#43d386` (button hover states, with no token). The 8px radius is hardcoded in five places instead of `--og-radius`.
- Monitoring controls and badges are styled inline in `Dashboard.tsx` rather than through `.og-btn` and `.og-badge`: refresh and demo buttons use a 6px radius and 12px text; the source badge, demo stepper chips and N1–N4 level chips use a 4px radius and weight 800. They match the palette but not the 8px control and pill shapes.
- The fleet sheet and the level chart sheet have square corners while the mode indicator, RUL panel and alert items use 6px.
- `font-weight: 500` is used twice in the dashboard (chart and alert-timeline sub-labels) and is defined nowhere in the stylesheet; `800` is used for badges and the brand mark without being a documented step.
- The alert colour map (N1 amber, N2 and N3 orange, N4 red) is duplicated byte-for-byte in `Dashboard.tsx` and `LevelChart.tsx`.
- `tabular-nums` is declared as three independent rules (`.og-num`, `.og-value`, `.og-sensor-id`) rather than composed.
- The dock gap has three different values for one role: 8px in the truck view, 12px in `.og-dock`, 16px in the bench view.
- The monitoring sheets use two heading sizes (16px chart, 18px fleet) for one role.

Layout-only inline styles in the Preact components (flex gaps, margins, `flex-basis`) are not a separate palette and are not debt by themselves.

## Do's and Don'ts

### Do:

- **Do** carry the provenance of every figure into the layout — a tag, a badge, a footnote naming the source file and the assumption it rests on.
- **Do** use Machine Yellow for identity and selection, and Instrument Amber for caution, and keep them in their lanes.
- **Do** mark live data and demo data differently, and label which is which, even when the backend is healthy.
- **Do** let density serve the comparison being made. An engineer reading a trend against a threshold wants the pixels.
- **Do** keep the 2px Machine Yellow focus ring on every interactive element.
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
