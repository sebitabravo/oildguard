# OilGuard digital twin - 930E-4SE / GDY106 reference sheet

Research collector output (read-only task; no repository file was edited). English technical artifact.
Date of research: 2026-10-09. Working files (text extracted with `pdftotext -layout`, page renders with `pdftoppm`) were kept outside the repository.

## 0. How to read this report

Tags: **[V]** verified (source given), **[D]** derived (arithmetic shown), **[A]** assumption (why + range).

Source short names (local sources are authoritative; web sources are cross-checks):

| Key | Source |
|---|---|
| CRS | INCAEX 930E-4SE course PDF (text extract) (INCAEX 930E-4SE course) + `ref/hi-course-*.png` |
| OM | 930E-4 O&M manual PDF, Spanish (text extract) (930E-4 O&M, Spanish) - line numbers are lines of the extracted text file |
| GDY | GDY106 maintenance deck PDF (text extract) + `ref/hi-gdy-*.png` (KMS Chile maintenance deck) |
| F95 | photo of GEK-91680A service manual page = GEK-91680A p.124, Fig. 95, E-45008 |
| BRO | Komatsu 930E-4SE brochure AESS778-02 (09/12), fetched and rendered: https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/brochures/trucks/930e/930e-4se-aess778-02.pdf (dimension drawing is on PDF page 3) |
| IC | USBM IC 8758, Kaufman & Ault 1977, full text fetched from http://www.directminingservices.com/wp-content/uploads/2010/06/Design_of_Surface_Mine_Hauage-Roads.pdf (page numbers = "Page N of 49" of that PDF) |

### 0.1 Conflicts found in the local evidence (decide once, keep consistent)

1. **Envelope: course vs brochure.** CRS: 15.29 L x 8.89 W x 8.10 H, body-up 14.80 (CRS lines 151-161). BRO (218 m3 optional body): 15.60 L x 8.69 W x 7.37 H empty, body-up 14.02. Differences: H +0.73, body-up +0.78 (same ~0.75 m, so the photographed course unit has a taller body/canopy: DT Hi-Load decals in `hi-course-14-014.png`) [D]; L -0.31, W +0.20. Recommendation: use BRO numbers for the chassis (axle, track, wheelbase: these are body-independent) and the CRS numbers only as the display "envelope" label; never mix the two sets in one geometric calculation.
2. **Turning circle.** OM line 5739 says "97 ft 7 in (30.4 m)" but 97 ft 7 in = 97.583 ft x 0.3048 = **29.74 m** [D]. BRO says 29.7 m (97'7"). The 30.4 m figure in the OM metric text is inconsistent with its own imperial value. Use 29.7 m.
3. **Gear-case oil.** CRS line 139: 94 L; OM line 5698 and BRO: 95 L (25 US gal). Not a real conflict (rounding); use 95 L.
4. **OM spec page is for the 930E-3**, not -4 (OM line 5691: "Estas especificaciones son para el Camion Komatsu 930E-3 estandar"; engine SSDA16V160, GTA-41, 1200 gal fuel). Body 8.15/3.2/7.06/45 deg and 25 gal gear case still match the 930E-4SE brochure, so they are safe; engine/alternator/fuel values from OM are NOT 4SE values. 4SE values: SSDA18V170, GTA-39, 5300 L fuel (BRO; CRS lines 100-139).
5. **GDY training text** says drive shaft -> "carrier de alta velocidad" -> sun pinion (GDY, `hi-gdy-8-08.png`). Fig. 95 shows the drive shaft end carries the high-speed SUN (carrier is the stage output, ring fixed). The training sentence is a simplified chain; the physically consistent topology is in section 2.2.

---

## 1. 930E-4SE modeling sheet (metres)

### 1.1 Global dimensions

Origin for everything below: **rear-axle ground point on the centreline**; x forward, y up, z to the truck's LEFT.

| Quantity | Value (m) | Tag | Source / derivation |
|---|---|---|---|
| Overall length | 15.60 (optional 218 m3 body); 15.29 (course unit) | V | BRO dim. drawing; CRS line 152 |
| Overall width | 8.69 (BRO front view top); 8.89 (course) | V | BRO; CRS line 151 |
| Overall height, empty | 7.37 (BRO, to canopy tip); 8.10 (course unit) | V | BRO; CRS line 153 |
| Body-up height | 14.02 (BRO); 14.80 (course) | V | BRO; CRS line 161 |
| Wheelbase | **6.35** | V | BRO ("6.35 m 20'10""). Wikipedia's 6.65 m is for the generic 930E, not used |
| Front axle to front end | 4.47 | V | BRO |
| Rear axle to rear of body | 4.80 | V | BRO. Check: 4.80 + 6.35 + 4.47 = 15.62 vs 15.60 [D] |
| Front-end x / rear-of-body x | x = +10.82 / x = -4.80 | D | 6.35 + 4.47; -4.80 |
| Width over front tires | 7.52 | V | BRO |
| **Front track** (tire centre to centre) | **6.15** | V | BRO ("6.15 m 20'2"", arrows terminate at tire centrelines) |
| Clear gap between front tires | 4.78 | V | BRO. Check: 6.15 - 4.78 = 1.37 = tire width at ground [D] |
| Width over rear tires (dual) | 8.33 | V | BRO |
| **Rear track** (dual-pair centre to centre) | **5.36** | V | BRO ("5.36 m 17'7""; arrow ticks sit between the two tires of each pair) |
| Gap between inner rear tires (axle-box space) | 2.39 | V | BRO |
| Dual spacing (tire centre to centre) | **1.66** (+-0.03) | D | Outside: (8.33 - 5.36)/2 = 1.485 = s/2 + w/2, so s + w = 2.97. With w = 1.31 (Bridgestone E3 overall width) s = 1.66. Inside check: 2.39/2 = 1.195 = 5.36/2 - 1.485 (consistent). Haian HA688 datasheet "minimum dual spacing" = 1678 mm (fetched PDF) -> s ~ 1.66-1.68 |
| Rear tire centres z | +-1.85 and +-3.51 | D | 2.68 -/+ 0.83 |
| Front tire centres z | +-3.075 | D | 6.15/2 |
| Ground clearance | **0.94 at the front bumper/step** (loaded/empty not stated) | V (label), interpretation A | BRO side drawing arrow "0.94 m 3'1"" at the bumper. No clearance figure is published for the rear axle box; use 0.9-1.2 m [A] (same order as the front figure; no source) |
| Front grille bottom, loaded | 1.40 | V | BRO ("1.40 m 4'7" LOADED") - arrow terminus at the grille/bumper lower edge (interpretation from drawing proportions) |
| Deck / radiator top, loaded | **4.27** | V (value), D (what it measures) | BRO ("4.27 m 14'0" LOADED"); arrow top aligns with the upper deck/radiator top in the drawing |
| Loading height (body rim, empty) | 7.06 | V | BRO; OM line 5758 |
| Turning circle (SAE) | 29.7 | V | BRO (OM metric value conflicts, see 0.1) |
| Radiator assembly | 3.277 W x 2.164 H | V | BRO ("3277 mm x 2164") |
| Frame rails | 305 mm wide x 864 mm min deep; 45 mm flange plate, 25 mm web | V | BRO "FRAME" |
| Suspension strokes | front 328 mm, rear 239 mm, rear axle oscillation +-6.5 deg; rear suspensions inverted | V | BRO "SUSPENSION"; CRS lines on Hydrair II give 12.92 / 9.40 in and +-6.5 |
| Axle load, empty / loaded | 104,459 / 110,847 kg (48.5/51.5 %); 165,956 / 339,649 kg (32.8/67.2 %) | V | BRO; CRS table (differs by a few kg) |
| Max GVW | 505,755 kg | V | BRO |

Vertical reference: use static loaded radius **1.64 m** for axle height at full load (Haian: 1639 mm) and free radius 1.89 m for the empty/unloaded drawing [D].

### 1.2 Tire 53/80R63 and rim

| Item | Value | Tag | Source / derivation |
|---|---|---|---|
| Nominal section width | 53 in = 1346 mm | D | 53 x 25.4 |
| Nominal sidewall | 0.80 x 1346 = 1077 mm | D | aspect 80 |
| Rim diameter | 63 in = **1600 mm** | V | designation; BRO "914 x 1600 x 127 mm (36 x 63 x 5.0 in) rim assembly" (Taper Lock); rim width 36 in = 914 mm, flange 5 in |
| Nominal overall diameter | 1600 + 2 x 1077 = **3754 mm** (147.8 in) | D | arithmetic |
| Overall diameter, new, by maker | Bridgestone VRF E3/E3A 3741 mm; Bridgestone VRPS E4 3840 mm (2017 guide: 3828 mm = 150.7 in); Michelin XDR 3776, XDR2 3803, XDR3 3804, XDR3 Extra Load 3806 mm; Haian HA688 3780 mm | V (Haian, fetched datasheet) / secondary (others) | Haian: https://www.haiangroup.com/uploadfile/attachment/202070ee97a1ba90e13d519683d35ba1.pdf (fetched). Bridgestone and Michelin figures come from reseller pages and web-search snippets (otrtires.com, Michelin Canada page); the Bridgestone OTR guide URL returned HTTP 403, so the official data book was NOT read. Treat as +-1% |
| Overall width, new | 1311 mm (Bridgestone E3 reseller), 1330 mm (Haian), 1342-1380 mm (Michelin resellers) | V/secondary | same |
| In-service max | Haian: width 1480 mm, OD 3845 mm, static loaded radius 1639 mm, min dual spacing 1678 mm | V | Haian datasheet |
| Recommended model values | OD **3.78 m**, width **1.31 m (rear)** / **1.37 m (front at ground, derived from BRO track)**, static loaded radius 1.64 m | D | table above |
| Inflation | rim rated 758 kPa (110 psi) cold; tires 600 kPa (87 psi) | V | BRO |
| Tire weight (std) | OM lists "Peso Estandar Neumatico 57,600 lb (26,127 kg)" - presumably the set of 6; 26,127/6 = 4,355 kg each, same order as Bridgestone's 4,536 kg listing | V (figure) / D (per tire) | OM line 5757 (weights block) |

### 1.3 Body and structure (all with optional 218 m3 body unless noted)

| Item | Value | Tag | Source |
|---|---|---|---|
| Interior width | 8.15 | V | BRO rear view; OM line 5756 (26 ft 9 in) |
| Interior depth | 3.2 | V | BRO side drawing; OM line 5757 |
| Loading height | 7.06 | V | BRO; OM line 5758 |
| Dump angle | 45 deg | V | OM line 5759; BRO drawing |
| Capacity | 171 m3 struck, 211 m3 heaped 2:1 (standard body) | V | BRO |
| Body weight (standard) | 30,362 kg | V | BRO; OM |
| Body length rear-to-canopy-knee | 9.38 | V | BRO ("9.38 m 30'9"") |
| Canopy projection ahead of that | 3.97 | V | BRO ("3.97 m 13'4"") |
| Canopy tip x | -4.80 + 9.38 + 3.97 = **+8.55** | D | arithmetic; i.e. 2.27 m behind the front end (10.82) |
| Canopy tip height (empty) | 7.37 | V | BRO (arrow top at canopy front edge) |
| Body floor height at the deep point | 7.06 - 3.2 = 3.86 | D | loading height minus depth (floor is "flat floor, horizontal bolsters"; slope not given) |
| Hoist | two 3-stage, dual-acting, **outboard** cylinders; 21 s up loaded, 23 s power-down, 24 s float-down | V | BRO; OM line 5713 |
| Body-up geometry from drawing | 45 deg raised; 3.25 m and 1.55 m (empty) annotations around the dump hinge; body tail lip lands 1.55 m above ground | V (labels) | BRO drawing; exact meaning of 3.25 m not stated (likely horizontal body-tail/axle offset) |

### 1.4 Component placement table

Frame: x forward from rear-axle ground point, y up, z left. Sizes L(x) x H(y) x W(z). Positions of items without published numbers were read from the course top view `hi-course-17-017.png` (scale calibrated on wheelbase: 345 px = 6.35 m -> 54.3 px/m; centreline at x_px 505; front tire centre y_px 260, rear 605) and from BRO/CRS side/front photos. **Those are photo estimates, not manual values.**

| Component | Centre (x, y, z) m | Size L x H x W m | Conf. | Basis |
|---|---|---|---|---|
| Rear wheels (4) | (0, 1.64, +-1.85 / +-3.51) | O3.78 x 1.31 | High | BRO tracks; tire section 1.2 |
| Front wheels (2) | (6.35, 1.64, +-3.075) | O3.78 x 1.37 | High | BRO |
| Rear axle box + GDY106 inboard ends | (0.2, 1.64, 0) | 2.0 x 1.6 x 2.39 | Med | BRO inner gap 2.39; CRS slide 17 item 9-12 |
| GDY106 wheel motors (2) | axis y = 1.64, z from ~0 to +-4.16 | see section 2 | Med/Low | F95 scale estimate |
| Frame rails | z = +-1.2 (rail centres) | 305 mm x >= 864 mm | Med (z), High (section) | BRO section; top view px 440/570 -> +-1.16 |
| Frame rear end | x = -2.6 | | Low | top view y_px 745 -> (605-745)/54.3 |
| Hydrair II rear (inverted), 2 | (-1.75, 2.3, +-0.9) | stroke 0.239 | Low-Med | top view items "10" at y_px ~700; BRO "rear suspensions are inverted"; x is **behind** the rear axle |
| Hydrair II front, 2 | (6.3, 2.7, +-2.3) | stroke 0.328, ~1.8 long, inclined | Low-Med | top view item 21 near front axle |
| Hoist cylinders (3-stage), 2, outboard | base (2.4, 2.2, +-1.4), top (2.0, 3.85, +-1.4), retracted length ~1.7, O~0.30 | | Med (x,z), Low (O) | top view item 13 (y_px ~495 -> x = +2.0); BRO side drawing: lower pivot ~2.4 m ahead of rear axle, tilted rearward ~13 deg at top |
| Fuel tank (5300 L) | (3.2, 2.7, -1.9) | 1.2 x 2.8 x 1.5 | Med (position), Low (height) | top view item 14 (px 585-670, 400-460 -> RIGHT side). 1.2 x 2.8 x 1.5 = 5.0 m3 [D]; height is back-solved from 5300 L |
| Hydraulic tank (947 L) | (2.95, 2.5, +1.7) | vertical cylinder O1.1 x ~1.2 | Med (position) | top view item 6 (LEFT side); OM/BRO: vertical cylindrical, unpressurized, 947 L (250 US gal) [V]; O from top view, height 947 L / 0.95 m2 = 1.0 m + ullage [D] |
| Hoist/cooling pump + steering/brake pump | (3.8, 3.0, 0) | 0.9 x 0.8 x 0.8 | Low | top view items 4, 5 |
| Traction alternator GTA-39 + blower | (5.3, 3.0, 0) | 1.6 x 1.6 x 1.9 | Low | top view; BRO blower 453 m3/min |
| Engine SSDA18V170 (10,100 kg wet) | (7.4, 3.0, 0) | 3.5 x 2.3 x 1.7 | Low | top view item 22 (y_px 100-290 -> x 5.8-9.3) |
| Front steering accumulators / brake accumulators | (4.7, 2.5, +2.1) / (5.0, 2.5, -2.1) | 0.5 x 1.0 x 0.5 | Low | top view items 3, 19; OM line 1884: brake accumulators sit in the brake cabinet behind the cab |
| Radiator (3.277 W x 2.164 H) | (10.0, 2.85, 0) | 0.8 x 2.16 x 3.28 | Med | BRO size; sits behind the grille |
| Radiator grille face | x = 10.6; y 1.40-4.27 | W ~3.6 | Med | BRO heights; width from front view proportion (175 px of 8.69 m = 420 px) |
| Diagonal stairway | on grille front, x ~ 10.7-11.0; ground end z ~ +1.7 (left), deck end z ~ -1.8 (right) | | Med | BRO std. equipment "Diagonal staircase across grille, L to R"; direction from front-view photo `hi-course-14-014.png` and BRO front drawing |
| Front bumper / bumper-mounted batteries | x = 10.82; y 0.94-1.4; z +-2.9 | 0.5 x 0.5 x 5.8 | Med | BRO "batteries bumper-mounted" [V]; width from front view |
| Upper deck platform | top at y ~ 4.3; x 4.5-10.6; z +-3.6 | | Med | BRO 4.27 loaded; photos |
| **Cab (left of deck)** | (7.6, 5.2, +2.6) | 2.4 x 2.0 x 1.8 | Med (x,z), Low (size) | top view item 1: dashed box y_px 118-262 -> x 6.3-8.9, x_px 315-410 -> z +1.7...+3.4. Left side confirmed by the BRO front view (cab window at image-right = truck left) and the CRS top view (cab box at image-left with front at top) |
| Canopy over cab | x 4.58 -> 8.55; y rises to 7.37 at tip; W 8.15-8.69 | | Med | BRO |
| Main control cabinet | (5.2, 5.3, 0) | 1.5 x 2.0 x 2.6 | Low | OM 1530 "gabinete electrico detras de la cabina", BRO "brake component cabinet above deck", front view doors at z -1.25...+1.35 |
| Retarding-grid box + blower | right-rear deck: x 4.5-7.5, y 4.3-6.0, z -2.1...-4.0 | | Low | front-view louvered box at image-left (truck right); not stated in any manual text; OM 1204/1539 only says grids exist, are stainless, "do not hose" |
| Body (box) | x -4.8 -> +4.58; rim y 7.06; floor ~3.86; interior W 8.15 | | High | BRO/OM |
| Hoist-body pivot (rear) | (-4.2?, ~3.3, +-2.5?) | | Low | not given; the hinge is behind/below the tail; leave to model-tuning |
| Rear tire rock ejectors | behind rear tires | | Low | BRO std. equipment (rock ejectors) |

Gaps: no manual in the local set gives engine, alternator, tank, cabinet or grid dimensions. Heights (y) of all deck equipment are visual estimates +-0.4 m.

---

## 2. GDY106 geometry for a parametric cutaway

### 2.1 What is verified

- GDY106 AC induction wheel motor, 32.62:1 two-stage planetary reduction, 64.5 km/h top speed [V] (CRS lines 106-109, 465; BRO). Two units, one per rear wheel; parking brake = dry multi-disc, spring-applied, hydraulically released, "on the inboard end of each wheel motor rotor shaft" [V] (BRO "BRAKING SYSTEM"; Fig. 95 item 2 "parking brake adapter").
- Service brake = oil-cooled wet multi-disc stack (item 8), total friction area 97,025 cm2 per brake [V] (BRO).
- Gear-case oil 95 L each [V] (BRO, OM 5698); CRS says 94 L.
- **Four low-speed planets** [V-local-image]: `hi-gdy-21-21.png` ("Posicion de tapones magneticos") marks "Planetarios" 1-4 at 12, 3, 6 and 9 o'clock on the sun-cover face, with magnetic plugs numbered 1-8 around them; `hi-gdy-1-01.png` shows the same four-lobe outboard end. Magnetic-plug cleaning every 250 h (GDY line 220); level check every 250 h by removing the 6 o'clock lower drain plug (GDY lines 372-374); first oil change at 50 h (GDY line 282).
- High-speed planet count: **not found** in local sources or web (searched GE/Komatsu/Wabtec; the GEK-91680A PDF on en.komatsu-club.com was not opened, only its landing page). Treat as unknown (3 or 4 typical) [A].
- Parts naming (xtmemining.com web-search snippet, not fetched): separate HS and LS carriers, planet pinions and shafts; no counts.

### 2.2 Axial order from Fig. 95 (inboard on the left -> outboard on the right)

Topology (from the item list and the section) [D, F95]:

```
rotor/stator (AC motor, "GE drawing 41D736036") -- parking-brake adapter (2) inboard end
frame structure (5) flange  --> bolts to rear axle housing (item 4 motor-to-frame hardware)
brake assembly (8) around the hub (hardware 6, 16; O-rings 7, 15)
seal assembly (9) / roll pin (10) / O-ring (11) / seal carrier (12)   <- inboard oil seal of the hub
inboard tapered roller bearing (17)  -- wheel hub (14) -- outboard tapered roller bearing (18)
wheel-bearing shim pack (19); frame coupling (20) -> ring gear clamp (23, hardware 22) -> RING GEAR (24, fixed to frame)
HIGH-SPEED stage (inboard in the gear case): sun on drive-shaft (55) end, HS planet gears (50) on shafts (46) with bearings (49), HS carrier (48), HS carrier hardware (45)
LOW-SPEED stage (outboard): LS sun pinion (33) driven by HS carrier, LS planet gears (27) on shafts (28) with bearings (31), LS carrier (25), carrier hardware (32)
torque tube (29, outer rotating shell) bolted to hub (21) and to the LS carrier (44) -> output to the wheel hub
sun cover (39) on the outboard face (hardware 35, shim pack 34, O-ring 36); magnetic pipe plugs (41) in the cover; oil drain pipe plug (56) at the outermost radius, 6 o'clock ("SECTION THRU OIL DRAIN" inset: plug is axial, lies between ring-gear back and torque-tube wall)
```

Notes: items 25/24/29 + 56 inset shows the drain plug sits at the largest radius of the outboard end (torque-tube wall), i.e. at the bottom of the oil pool at 6 o'clock [V from drawing]. The ring gear (24) is one BOM item spanning both stage planes in the drawing (upper half shows the LS plane, lower half the HS plane) [D]; so the stages probably share one ring gear (assumption used in option A below). Single stage-to-stage drive: HS carrier -> LS sun, LS carrier -> torque tube -> hub -> rims, matching the GDY slide (`hi-gdy-8-08.png`).

### 2.3 Dimension estimate (all [A]/[D], +-15 %)

No manual in the local set or on the web (searched) states GDY106 length, diameter or weight. Estimate method: scale the Fig. 95 drawing so that the frame-structure flange (item 5) sits on the axle-housing side (|z| = 1.195 m = half of 2.39 m inner-tire gap, BRO) and the outboard face lies at the outer tire face (|z| = 4.165 m = 8.33/2, BRO) - GDY line 385-390 says the 120 mm drain plug "sobresale ligeramente por el neumatico", i.e. the outboard end is flush with the tire. In drawing pixels: flange x = 365, outboard end x = 1030 -> 665 px for 2.97 m [D] -> **224 px/m**. Cross-check: the left and right motors then meet near the truck centreline (inboard end at |z| ~ 0.02 m), consistent with the 2.39 m box [D, only a plausibility check].

| Feature | Estimate | Note |
|---|---|---|
| Overall length (parking-brake adapter to sun cover) | **~4.1 m** (3.9-4.3) | 930 px / 224 |
| Length flange -> outboard face | 2.97 m | by construction |
| Frame flange diameter (largest) | ~1.8 m (1.6-2.0) | R = 202 px |
| Brake pack outer diameter | ~1.38 m | R ~155 px |
| Wheel hub shell outer diameter | ~1.36 m | R ~152 px |
| Torque tube / gear-case outer diameter | ~1.18 m | R ~132 px |
| Ring-gear root diameter | ~1.0 m | R ~115-120 px |
| Stator frame diameter | ~1.05 m | R ~117 px |
| Drive shaft diameter | ~0.18 m | R ~20 px |
| Sanity check | hub O1.36 m < rim bore O1.6 m [V]; torque tube O1.18 m passes through the rim | consistent |

Axial stations, metres **outboard of the frame flange (item 5)** (from pixel offsets / 224):

| Component | z-offset from flange (m) |
|---|---|
| Rotor / stator (laminations) | -0.7 ... -0.05 (inboard of flange) |
| Parking-brake adapter | -1.2 ... -0.95 |
| Wheel brake assembly (8) | 0.54 - 0.80 |
| Inboard seal assembly (9-12) | 1.0 - 1.1 |
| Inboard hub bearing (17) | 1.14 - 1.23 |
| Wheel hub shell (14) | 0.94 - 2.08 |
| Outboard hub bearing (18) | 1.90 - 1.99 |
| Frame coupling / ring clamp (20-23) | 1.99 - 2.12 |
| HS stage (planets 50, carrier 48) | 2.14 - 2.37 |
| LS stage (planets 27, carrier 25, sun 33) | 2.39 - 2.81 |
| Ring gear (24) / torque tube (29) | 2.08 - 2.81 / 2.08 - 2.97 |
| Sun cover (39), plugs 41, drain 56 | 2.83 - 2.97 |

Seating in the dual wheel: the tire pair spans z = 1.195 ... 4.165 m (inner face of inner tire to outer face of outer tire). The hub's outboard rim-adapter flange (item 51) is at ~1.85 m from the flange -> z ~3.05 m [D, +-0.3] i.e. in the outer half of the pair; the gear case (ring/torque tube) sits at z = 3.3-4.2 m, inside the **outer** tire's bore, and the hub/brake/bearings under the inner tire. The inner rim bolts to the same hub with a spacer.

### 2.4 Gear ratio and planet tooth counts (ILLUSTRATIVE ONLY)

No source gives tooth counts. Method: stage ratio with sun input, carrier output, ring fixed: i = 1 + Zr/Zs. Conditions: Zr = Zs + 2 Zp, (Zs + Zr)/N integer, neighbour clearance (Zs+Zp) sin(pi/N) > Zp + 2. Target 32.62 +-0.5 % = 32.457 ... 32.783. Script: research working file (not versioned; the frozen choice lives in `sim/geartrain.py` with tests).

**Option A (single shared ring gear, as Fig. 95 suggests), N = 4 planets in both stages [A]:**

| Stage | Zs | Zp | Zr | N | check (Zs+Zr)/N | i = 1+Zr/Zs |
|---|---|---|---|---|---|---|
| HS (inboard) | 32 | 64 | 160 | 4 | 48 | 6.0000 |
| LS (outboard) | 36 | 62 | 160 | 4 | 49 | 5.4444 |
| Total | | | | | | **32.667** (+0.14 % vs 32.62) |

Zr = 32 + 2x64 = 160 and 36 + 2x62 = 160. At diametral pitch 4 (module 6.35 mm) the ring pitch circle is 40 in = 1.016 m, matching the ~1.0 m ring root read off Fig. 95; the HS sun pitch circle is 0.203 m, matching the ~0.18 m drive-shaft/sun region [D].

**Option B (separate rings; closest to target):** HS Zs 19 / Zp 35 / Zr 89 (N 3 or 4) -> 5.684; LS Zs 23 / Zp 43 / Zr 109 (N 4) -> 5.739; total 32.622 (+0.007 %). Another: HS 21/37/95 (5.524) x LS 21/41/103 (5.905) = 32.617.

Mesh frequencies for the vibration model (option A, wheel speed at 64.5 km/h, static radius 1.639 m): wheel 10.93 rad/s = 104.4 rpm; rotor = 104.4 x 32.62 = **3405 rpm** (the repo's docs use 3000 rpm / 92 rpm; 3405 corresponds to the full 64.5 km/h) [D]. HS carrier = 3405/6.0 = 567 rpm = 9.46 Hz; HS gear-mesh = Zr x f_carrier = 160 x 9.46 = **1513 Hz**, planet-pass 4 x 9.46 = 37.8 Hz. LS: mesh = 160 x 1.74 = **278 Hz**, planet-pass 4 x 1.74 = 7.0 Hz [D, counts illustrative].

### 2.5 The 95 L oil pool and drain-plug head

Where the oil is [D from F95 + GDY]: gear case = annular cavity between the (stationary) ring gear/torque-tube wall and the carriers/sun, closed outboard by the sun cover and inboard by the seal/bearing region. The pool rests on the outermost radius at 6 o'clock where the drain plug (56) is. GDY line 372-380: level is checked by removing the plug at 6 o'clock; samples are taken through that plug with a 12 in hose. Whether the hub-bearing cavity shares the sump is NOT stated [A: shared, which makes the pool a bit shallower than computed below].

Cavity model [A]: R_outer 0.50 m (ring-gear root), R_inner 0.15 m (carrier hub / drive-shaft stack), axial length 0.70 m (HS + LS planes + clearances, from the 2.08-2.81 m stations), free fraction f = 0.8 (gears, carriers and shafts displace ~20 %). Gross annulus = pi(0.50^2 - 0.15^2) x 0.70 = 0.500 m3 = 500 L [D]. Segment solver (research working file; the versioned solver is `sim/geometry.py`):

| R_o | R_i | L | f | pool depth h at 6 o'clock | % of ring diameter | p = rho g h (rho 890 / 905) |
|---|---|---|---|---|---|---|
| 0.50 | 0.15 | 0.70 | 1.0 | 0.229 m | 23 % | 2.00 / 2.03 kPa |
| **0.50** | **0.15** | **0.70** | **0.8 (reference)** | **0.268 m** | **27 %** | **2.34 / 2.38 kPa** |
| 0.50 | 0.15 | 0.70 | 0.6 | 0.330 m | 33 % | 2.88 / 2.93 kPa |
| 0.50 | 0.20 | 0.60 | 0.7 | 0.336 m | 34 % | 2.93 / 2.98 kPa |
| 0.50 | 0.20 | 0.45 | 0.8 | 0.392 m | 39 % | 3.42 / 3.48 kPa |

**Reference answer:** pool depth **~0.27 m (plausible range 0.23-0.39 m)**, gauge hydrostatic pressure at the 6 o'clock plug **~2.3-2.4 kPa (range 2.0-3.5 kPa)** for rho 890-905 kg/m3. Oil temperature matters: at 80 C rho ~ 905 x (1 - 0.00065 x 65) ~ 866 kg/m3 [A: expansion coefficient typical of mineral gear oil], p ~2.28 kPa.

Sensitivity for the sensor/sim [D]: at h = 0.268 m the free surface is 2*sqrt(2*0.5*0.268 - 0.268^2) = 0.89 m wide, so dh/dV = 1/(0.89 x 0.70 x 0.8) = 2.0 /m2 = 2.0 mm per litre -> **~17.7 Pa per litre** (rho 900). A 10 L loss = 20 mm = 177 Pa.

**Caveat that changes the sensor design:** the torque tube, LS carrier and sun cover rotate with the wheel (carrier -> torque tube -> hub) while the ring gear is fixed. At wheel speed w the cavity wall sees w^2 R / g = 0.04 (5 km/h), 0.59 (20 km/h), 0.99 (26 km/h), 2.3 (40 km/h), **6.1 g (64.5 km/h)** at R = 0.5 m [D]. Above ~26 km/h oil rotating with the cover is centrifuged toward the wall and the "pool depth" model stops being gravity-dominated; a solid-body-rotation upper bound for the pressure at R = 0.5 m is 0.5 rho w^2 R^2 = 13.4 kPa at 64.5 km/h [D, upper bound, assumes full co-rotation of a flooded annulus, not realistic for 95 L partial fill]. A transducer in the drain plug also sweeps through every clock angle once per wheel revolution (1.74 Hz max) so its reading carries a +-g R modulation. Use the static 2.3 kPa only as the parked/slow-roll level indicator.

---

## 3. Open-pit design parameters for a 290 t truck

Design vehicle (BRO): widest W = **8.69 m** (8.89 m course unit), tire radius rolling 1.64 m (loaded) / 1.89 m (free), tire height 3.78 m, SAE turning circle 29.7 m.

| Parameter | Value | Tag | Source / derivation |
|---|---|---|---|
| Lane width multiples | tangent sections: 1 lane 2.0 W; 2 lanes 3.5 W; 3 lanes 5.0 W; 4 lanes 6.5 W | V | IC Table 9, page 26 of 49 (rendered and read: e.g. W 12 ft -> 24 / 42 / 60 / 78 ft). Basis: AASHO 1965, clearance = 1/2 vehicle width each side (IC p.26) |
| Single lane where stopping distance exceeds sight distance | 2.5 W (and +4 ft more everywhere so a stalled truck can be passed) | V | IC p.27 of 49 ("2 1/2 times the vehicle width", lost-fraction OCR "2 112") |
| Two-lane width, 930E | 3.5 x 8.69 = **30.4 m** (31.1 m with W = 8.89); single 2 x 8.69 = 17.4 m, 2.5 x = 21.7 m | D | arithmetic |
| Safety berm height (conventional) | >= rolling radius of the largest tire, i.e. **>= 1.64-1.89 m** ("equal to or greater than the rolling radius", IC p.29); boulder-faced berm ~ equal to the tire height (3.78 m per IC wording) | V | IC page 29 of 49, paragraphs "Height is the main factor..." and "For boulder faced berms..."; your rule "half tire height" = 1.89 m is consistent |
| Regulatory berm minimum | mid-axle height of the largest equipment using the road (= ~tire radius 1.64-1.89 m) | V | 30 CFR 56.9300(b) (govinfo PDF fetched: "Berms or guardrails shall be at least mid-axle height of the largest self-propelled mobile equipment which usually travels the roadway") https://www.govinfo.gov/content/pkg/CFR-2022-title30-vol1/pdf/CFR-2022-title30-vol1-sec56-9300.pdf |
| Berm base | side slope 1.5:1 (IC) -> 1.9 m high berm base ~ 5.7 m + crest | V/D | IC p.28 (line 815 of extract: "normal berm sideslope of 1.5:1") |
| Total two-lane ramp with berm and ditch | 30.4 + berm base ~5.7 + ditch/inner shoulder 4-6 = **~40-42 m** | D/A | your 40 m figure is consistent; ditch width is [A] |
| Ramp grade | regulatory max 15 % in most US states, 20 % in a few (IC pp. 10-11 of 49, "maximum grade criteria"); typical design **8-10 %** (T&R survey: maximum 10 %, >8 % generally avoided); IC itself declines to recommend one optimum | V (IC), secondary (survey, via search snippet of Tannant & Regensburg 2001; the UBC full text was blocked) | IC lines 271-279 of extract |
| Cross slope | 1/4 to 1/2 in per ft = 2.1 %-4.2 %; 1/4 for smooth/icy, 1/2 for rough/gravel; crown on 2+ lane roads | V | IC p.27 of 49 "Cross Slope" |
| Superelevation | <= ~4 % in practice (survey); IC Table 1 for rates | secondary | search snippet, SlideShare copy of T&R (fetched: "4% to 6% ... limited to a maximum of 4%") |
| Switchback / curve radius | no verified source number. Truck SAE turning circle 29.7 m -> outer-front-wheel radius ~14.9 m [D]. Use centreline radius >= 25 m with 4-6 m widening [A] (>= ~1.7 x turning radius; derived from IC's "widening needed by a turning truck", Fig. 17, not extracted) | A | state as design assumption |
| Bench height | shovel limit: P&H 4100XPC height of cut 16.8 m (55 ft 2 in), dumping height 9.5 m, radius of cut 23.9 m [V]. Typical bench for this fleet 12-15 m [A, no primary fetched]. Loading height 7.06 m < shovel dump height 9.5 m, 2.4 m clearance [D] | V/A | Komatsu 4100XPC page (fetched) https://www.komatsu.com/en-us/products/equipment/electric-rope-shovels/4100xpc |
| Catch-bench width | Modified Ritchie W = 0.2 H + 4.5 m -> H = 15 m gives 7.5 m (Call 1986 after Ritchie 1963; cited from Lorig, Stacey & Read in Read & Stacey 2009 ch.10) | secondary | web-search result (CNI/SME chapter, ACG papers); the original chapter was not read |
| Typical speeds, loaded uphill / empty uphill | 10 % grade, RR 2 %: loaded **12-13 km/h**; empty **28-30 km/h**; 8 % grade: loaded 14.5-15.4, empty 34-36 km/h; flat: capped at 64.5 km/h | D | P_wheel = eta x 2495 kW (BRO net flywheel), eta 0.80-0.85 [A], F = m g (grade + RR); loaded 505,755 kg: F(10 %) = 595 kN -> v = 2.0-2.12 MW / 595 kN = 3.4-3.6 m/s; empty 215,307 kg: F = 253 kN. Loaded downhill is limited by retarding (BRO 4026 kW max, 2909 kW continuous). Fleet practice commonly quotes 10-15 km/h loaded on ramps, consistent |
| Shovel match | P&H 4100XPC nominal payload 99.8-108.9 t, dipper 52.8-61.2 m3 SAE struck, optimum truck 218-363 t [V]; 290.3 t / 108.9 t = 2.67 -> **3 passes**; with the AC-90 variant (73-82 t) 290.3/82 = 3.54 -> **4 passes** [D] | V/D | Komatsu 4100XPC page; AC-90 spec PDF https://www.komatsu.com/content/dam/komatsu/websites/oceania/documents/brochures/electric-rope-shovels/4100xpc-ac/fae50b98-1898-4c6f-8833-7464467c0fed.pdf (fetched; 42-49 m3, 73-82 t) |
| Crusher dump pocket | no primary source found for 290 t. From truck data [D]: body interior width 8.15 m; pocket opening width 1.3-1.5 x body = 10.6-12.2 m [A]; clear height above apron >= body-up height 14.02 m + 1 m margin ~ 15 m [D/A]; wheel-stop berm >= tire radius 1.9 m [V rule, MSHA]; pocket volume 1.5-2 truckloads (211 m3 heaped -> 320-420 m3) [A]; level or <= 2 % apron [A]; reverse approach ("T" turnaround) [A, eng-tips thread via search] | A | disclosed gap |

---

## 4. Payload Meter III haul-cycle states (OM section 60)

Source: OM `OPERACION Y CALCULO DE CARGA UTIL` = `930e4-om.txt` lines **6249-6323** (two-column layout, left and right columns interleave in the extract). Table of contents puts it at p. 60-10 (OM line 5811-5812); the printed footer after the text reads "Pagina 60-11" (line 6325). Flags: lines 6499-6560. Warning-flag section: p. 60-14/15.

**The 8 states, in manual order (OM lines 6264-6274):** 1 `tare_zone` (Zona de tara), 2 `vacio` (empty), 3 `cargando` (loading), 4 `maniobrando` (maneuvering, 160 m zone), 5 `final_zone` (Zona final), 6 `acarreando` (hauling), 7 `vaciando` (dumping), 8 `after_dump` (Post-vaciado).

Transitions exactly as stated (the numbers are the manual's). Because the extract interleaves two columns, the line references below are the line ranges where the sentences appear, accurate to about +-3 lines; read `sed -n 6249,6323p` for context:

| From | To | Condition (manual wording condensed) | OM lines |
|---|---|---|---|
| (cycle start) | after_dump -> | "Un nuevo ciclo comienza despues que se ha vaciado la carga"; PLM stays in `after_dump` **10 s** to confirm the load really left | 6279-6281 |
| after_dump | tare_zone | payload now < 20 % of rated | 6282-6285, 6309-6310 (item 3) |
| after_dump | maniobrando | average payload > 20 % rated and final payload not yet computed; after 160 m -> final_zone; flag `false_body_up` | 6289-6297 (item 1), also 6286-6288 |
| after_dump | acarreando | average payload > 20 % and final payload already computed; flag `false_body_up` | 6301-6305 (item 2) |
| tare_zone | (computing) | moving > **5 km/h**: computes empty strut ("amortiguacion") weight = tare, later subtracted from loaded strut weight | 6292-6296 |
| tare_zone or vacio | cargando | swing loads detected | 6297-6298 |
| vacio / (body up) | tare_zone | body raised while empty: **manual** switch to tare_zone to recompute tare | 6299-6301 |
| vacio | cargando (method 1) | brake-lock applied -> PLM analyses suspension pressures for swing load; min detectable swing = **10 %** of rated; detection takes **4-6 s** | 6303-6310 |
| vacio | cargando (method 2) | no brake lock: load > **50 %** rated for **10 s** -> flag `continuous_loading` | 6253-6258 (right col.) |
| cargando | maniobrando | "en cuanto el camion comienza a moverse"; maneuver zone = **160 m** (0.1 mi) to reposition under the shovel; more payload may be added anytime in this zone | 6261-6266 |
| maniobrando | final_zone | truck travelled **160 m** | 6266-6267 |
| maniobrando | vaciando | body raised while in maniobrando: flag `no_final_load`, payload not computed | 6268-6272 |
| final_zone | (computing) | moving > 5 km/h: computes loaded strut weight; same algorithm as empty | 6273-6277 |
| final_zone | vaciando | "Subir Tolva" signal received; if the truck moved < 1 min in final_zone, payload by averaging, flag `average_load` | 6277-6283 |
| vaciando | after_dump | body begins to lower ("cuando la tolva comience a bajar") | 6285-6288 |
| cycle record start | | data table: cycle begins "cuando el medidor pasa del estado descargando a vacio" | 6441-6442 |
| (any) | | cycle longer than **18.2 h** -> `haul_cycle_too_long` (flag M) | p. 60-15 |

Warning flags (lines 6499-6560): A continuous load (>50 % without swing loads / brake-lock input missing), B transition cargando -> vaciando (body-up during loading), C no final load, D maniobrando -> vaciando, E average load or tare used, F final_zone -> vaciando, H false body up (body raised but payload did not fall below 20 %), I body-up signal failed (payload fell < 20 % without signal), J speed sensor failed, K new tare not computed, L incomplete cycle after power-up.

**Gaps/ambiguities to resolve in the simulator FSM (manual does not state them):**
1. No explicit entry condition for `acarreando`. The only explicit paths into it are after_dump (item 2, after a false body-up) and the data table calling the loaded travel "cargado". Natural reading [A]: `final_zone` -> `acarreando` once final payload is computed; `acarreando` -> `vaciando` on body-up (flag B/C/D/F cover the other states).
2. No explicit `tare_zone` -> `vacio` transition (the tare-zone state computes the tare; `vacio` is then the empty-travel state) [A].
3. The data table says the cycle starts at "descargando -> vacio" while the narrative says `after_dump` -> `tare_zone`. Suggest: cycle record opens at the first `vacio` after `after_dump`/`tare_zone`.
4. State-name mixing in the manual: `vaciando`/"descargando", `acarreando`/"cargado", `cargando`/"cargado" appear synonymously in the tables.

Constants to hard-code in the simulator: 10 s, 5 km/h, 20 %, 50 %, 10 s (continuous), 10 % swing, 4-6 s detection, 160 m, 1 min.

---

## 5. Sensors for measuring oil head in the pool

Needed range (section 2.5): static head 2.0-3.5 kPa gauge, modulated at wheel rotation; sensitivity 17.7 Pa/L; possible case pressure from heating (not specified whether the GDY106 case is vented - ASSUMPTION: a vented-gauge/differential sensor referenced to the case breather is needed, or an absolute sensor with temperature-compensated baseline).

| Item | Verified facts | Tag |
|---|---|---|
| Low-range pressure transducer example (fetched) | Titan TPTLR (https://www.diversifiedtech.net/sensors/pressure/pressure-transducers-mv-output/titan-tptlr-low-range-pressure-transducer): ranges 70, 200, 350, 700, 1000 mbar and 2-20 bar; output raw mV/V or 2/3/10/20 mV/V; accuracy <= +-0.25 % or <= +-0.10 % FS (range dependent); media temperature **-40 to +125 C**; wetted 303/316 stainless, Viton/EPDM/NBR seals; 1/4 NPT male, G1/4, 7/16-20 UNF; overpressure 1.5x, burst 3x | V (as listed by the distributor page) |
| Implication for range | 70 mbar = 7 kPa FS covers the 2.4 kPa static head with ~3x headroom but not the centrifugal upper bound; 200/350 mbar (20/35 kPa) covers it. A true 0-10 kPa, 125 C, 4-20 mA part was NOT found in two searches; the distributor offers 70/200/350 mbar mV/V. Gap: no datasheet for exactly 0-10 kPa | V/gap |
| Resolution in litres | +-0.25 % FS: 0-10 kPa -> 25 Pa = **1.4 L**; 0-35 kPa -> 87.5 Pa = 4.9 L; +-0.10 % FS: 0.57 L / 2.0 L [D from 17.7 Pa/L] | D |
| Temperature sensor | Type K thermocouple per IEC 60584-1: **class 1 +-1.5 C or 0.004 abs(t)** (-40..+1000 C); **class 2 +-2.5 C or 0.0075 abs(t)** (-40..+1200 C); ASTM E230 Special +-1.1 C or +-0.4 %; Standard +-2.2 C or +-0.75 % (0..+1260 C). At 50-100 C oil: class 1 = +-1.5 C, class 2 = +-2.5 C (fixed term dominates) [V]; +-2.5 C -> density error ~0.16 % [D] | V: WIKA data sheet IN 00.23, fetched PDF, text read from table: https://newsletter.wika.com/upload/DS_IN0023_en_co_51542.pdf |
| Context | oil must be "above 50 C effective operating temperature" for micro-filtering (GDY line 358); expect 50-100 C in service | V (local) |
| Triaxial MEMS accelerometer | Analog Devices ADXL355 (digital, 3-axis, +-2/4/8 g, 20-bit, noise density 22.5 ug/sqrt(Hz), filter bandwidth selectable to ~1 kHz) - facts only from web-search results of https://www.analog.com/en/products/adxl355.html and https://www.analog.com/media/en/technical-documentation/data-sheets/adxl354_adxl355.pdf; **my two fetches of those URLs timed out, so the datasheet was NOT read** | search-only |
| Bandwidth need | planet-pass 7 Hz (LS) / 38 Hz (HS), LS mesh ~280 Hz, HS mesh ~1.5 kHz (section 2.4, illustrative). An accelerometer limited to ~1 kHz sees LS mesh and the HS mesh only at its edge: for the HS mesh and harmonics use >= 5 kHz bandwidth (gap: no wide-bandwidth part datasheet was fetched) | D/gap |

---

## 6. 3D asset licensing

What I could and could not verify (WebSearch + WebFetch, 2026-10-09):

- Sketchfab "Komatsu 930E" by The Learning Network (https://sketchfab.com/3d-models/komatsu-930e-23b32eccdbfa4bd88d0093e357fa3346): exists, 414.9k triangles (search result). My fetch did not expose a license, price or download flag -> **license unverified**.
- CGTrader "Rigid Dump Truck Komatsu 930E PBR" (https://www.cgtrader.com/3d-models/vehicle/industrial-vehicle/rigid-dump-truck-komatsu-930e-pbr): search result lists "Royalty Free" license, OBJ/FBX/LWO formats, not CC0/CC-BY, not glTF; fetch returned no content. CGTrader's 930E-5 page says "not available".
- SketchUp 3D Warehouse "Komatsu 930E" (embed-3dwarehouse-classic.sketchup.com/model/u9cac742d-7076-48d5-9e89-dfe3d8c15cf5/Komatsu-930E, search result): derived from a GrabCAD model by Randy Corona, 41,552 polygons; upstream terms unknown.
- No CC0 or CC-BY glTF of a 930E or another 290-360 t ultra-class truck was found or verified.
- Repo precedent: `docs/models.md` already records that the HD465-7EO GLB (~55 t class, Sketchfab author drcrazzie) carries an embedded "CC-BY-4.0" string, but reuse beyond the repo is marked NOT-CLEARED until verified.

**Recommendation:** a procedural parametric model built from the manual dimensions in sections 1-2 is the safer route: it removes third-party licence/attribution and trademark-ambiguity risk (CC-BY needs attribution and a verified rights chain; "Komatsu" marks on models are separate), it matches the thesis' "numbers traceable to the manual" claim, and every dimension in this report is cited. A GLB proxy is acceptable only as a clearly labelled visual aid (as the repo already does) and not as a source of geometry for the twin.

---

## 7. Open gaps (explicit)

1. GDY106 overall dimensions, mass, high-speed planet count, tooth counts, oil level mark: not in any accessible source (GEK-91680A full PDF exists on en.komatsu-club.com but was not opened; the extracted Fig. 95 is the only local drawing).
2. Rear axle box ground clearance, frame height, deck equipment sizes, cab size, retarding-grid box position: photo estimates only.
3. Official tire data book (Bridgestone, Michelin) not read; tire diameters rest on a manufacturer datasheet (Haian) and reseller pages.
4. Tannant & Regensburg (2001) full text blocked; grade/superelevation numbers are secondary. Bench height and switchback radius have no primary citation; crusher pocket has none.
5. 0-10 kPa / 125 C pressure transducer datasheet and wide-bandwidth MEMS accelerometer datasheet not obtained; ADXL355 figures are search-snippet only.
6. Whether the GDY106 case is vented, and whether the hub-bearing cavity shares the 95 L sump, is not stated.
7. PLM III: no explicit rule for entering `acarreando` and `vacio` (section 4).
8. Hoist hinge location, body mounting points: not given.

## 8. Extra files produced (scratch, not repo files)

Research working files (not versioned): `komatsu-brochure.txt` (BRO text), `kdim_side-3.png`, `kdim_fr-3.png` (BRO dimension drawing crops), `fig95_right.png`, `inset.png` (Fig. 95 crops), `ic8758.txt`, `ic_p-26.png` (Table 9), `4100xpc.txt`, `haian.txt`, `wika.txt`, `calc.py` (tooth counts), `pool.py` (pool depth and g-ratio).
