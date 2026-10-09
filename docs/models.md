# 3D model provenance — HD465 visual proxy (S2-GLB)

Bilingual record: EN below, ES después. Neutral/professional Spanish.

## EN — provenance + honesty statement

### What it is (and is NOT)

- The file `frontend/public/models/komatsu_hd-465-7eo.glb` (~20 MB,
  21,350,272 bytes) is a **Komatsu HD465-7EO rigid truck mesh (~55 t
  class)** used as a **VISUAL PROXY ONLY** in the S2 truck scene
  (`frontend/src/sim/truck/TruckScene.tsx`).
- It is **NOT a Komatsu 930E** (~290 t payload, 15.29 × 8.89 × 8.10 m).
  The thesis and the UI never claim otherwise: every spec label and number
  shown with the mesh (envelope dims, body-up 14.80 m, weights, fluids,
  QSK78/GTA-39 powertrain, GDY106, 32.62:1, rotor ≈3000 RPM / wheel ≈92
  RPM) is the **930E-4SE fidelity pack** from `frontend/src/sim/truck/cycle.ts`
  and is display-only. The bilingual footnote in `TruckView.tsx` and the
  in-scene badge state this on every render.

### Source chain (observed 2026-10-09)

- Received as `/Users/sebitabravo/Downloads/komatsu_hd-465-7eo.glb`
  (verified locally: magic `glTF`, version 2, length = file size; valid
  glTF 2.0 binary), copied to `frontend/public/models/komatsu_hd-465-7eo.glb`
  and served at `<base>/models/komatsu_hd-465-7eo.glb`.
- Embedded `asset` metadata (read from the JSON chunk, not a web page):
  - generator: `Sketchfab-14.15.0`
  - title: `KOMATSU HD-465-7EO`
  - author: `drcrazzie (https://sketchfab.com/drcrazzie)`
  - license string: `CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)`
  - source string: `https://sketchfab.com/3d-models/komatsu-hd-465-7eo-2bf4dcd62e484f01bcb446af263bd65c`
  - content: 8 meshes, 10 nodes, 8 materials, 21 textures.

### License — honest status

- The embedded JSON **claims** CC-BY-4.0 with the author/source above, and
  this file provides that attribution to honor the claim.
- BUT the file arrived via a local `~/Downloads` path with **no separate
  license receipt**, and the Sketchfab page/terms were **not independently
  verified** in this task. Therefore, for thesis purposes, reuse beyond this
  repository (publication, redistribution, commercial use) is treated as
  **NOT-CLEARED until verified**: check the source URL, confirm the uploader
  held the rights, and confirm the CC-BY-4.0 terms + attribution + share
  conditions before any external use. No license is misrepresented here.

### Scale + orientation (recorded computation)

- Source local extents (POSITION accessors, all parts): longest span
  ≈ **9.40 units** (Sketchfab Y-up export; global approx size
  [5.37, 9.40, 5.51]).
- Scene rule: longest horizontal extent → **6.0 scene units**, the same
  envelope as the procedural fallback chassis that stands in for the 930E
  15.29 m length (scene units are illustrative; pit loop preserved).
- Expected scale factor ≈ **6.0 / 9.40 ≈ 0.6386**. The runtime value is
  measured from the mounted bounds (`Box3`), logged to the console
  (`[truck] HD465 visual proxy mounted (scale=…)`), stored in
  `proxyGroup.userData.scaleFactor`, and **wins over this estimate**.
- Orientation: the long axis is yawed onto +X (truck forward; +90° if the
  source long axis is Z), recentered X/Z to origin with min.y grounded at 0
  via a wrapper group, so the FSM waypoint lerp is untouched.

### Integration choices (documented fallbacks)

- Loader: `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`,
  matching installed `three@0.169.0` (same path style as the existing
  `OrbitControls` import; no `three-stdlib` dependency).
- **No GLB material is mutated** (baked Sketchfab PBR). Mode tint falls back
  to directional-light shift + ground mode ring + HUD MOVING/REST badges.
- GDY106 rear-axle highlight = **amber overlay ring** at the rear-axle slot
  (local x = −2.1) with a per-frame pulse, plus the existing HUD badge text
  as fallback. Works identically on proxy and fallback bodies.
- The proxy is rigid: **no bed articulation** (DUMP tilt disabled while the
  proxy is active; chassis stays level, consistent with the recal
  narrative). The ore heap is reparented onto the proxy bed top and keeps
  its LOAD/HAUL visibility rule.
- Proxy wheels are used as-is (**static**); illustrative spin is retired
  with the proxy while rotor/wheel RPM stay on as text narrative.
- Camera presets (pit/cab/side/wheel) are unchanged — the proxy fills the
  same 6.0-unit envelope; the wheel preset targets the rear-axle marker.
  The floating truck label height follows the measured proxy height.
- Load failure keeps the **procedural fallback body** visible; the proxy
  footnote still applies (mesh absent).

---

## ES — procedencia + declaración de honestidad

### Qué es (y qué NO es)

- El archivo `frontend/public/models/komatsu_hd-465-7eo.glb` (~20 MB,
  21.350.272 bytes) es una **malla de camión rígido Komatsu HD465-7EO
  (clase ~55 t)** usada como **PROXY VISUAL SOLAMENTE** en la escena del
  camión S2 (`frontend/src/sim/truck/TruckScene.tsx`).
- **NO es un Komatsu 930E** (~290 t de carga útil, 15,29 × 8,89 × 8,10 m).
  Ni la tesis ni la interfaz afirman lo contrario: todas las etiquetas y
  cifras mostradas junto a la malla (dimensiones, tolva arriba 14,80 m,
  pesos, fluidos, tren de potencia QSK78/GTA-39, GDY106, 32,62:1, rotor
  ≈3000 RPM / rueda ≈92 RPM) son el **paquete de fidelidad 930E-4SE** de
  `frontend/src/sim/truck/cycle.ts` y son solo de visualización. La nota
  bilingüe de `TruckView.tsx` y la insignia en escena lo indican en cada
  renderizado.

### Cadena de origen (observado el 2026-10-09)

- Recibido como `/Users/sebitabravo/Downloads/komatsu_hd-465-7eo.glb`
  (verificado localmente: firma `glTF`, versión 2, longitud = tamaño del
  archivo; binario glTF 2.0 válido), copiado a
  `frontend/public/models/komatsu_hd-465-7eo.glb` y servido en
  `<base>/models/komatsu_hd-465-7eo.glb`.
- Metadatos `asset` incluidos (leídos del bloque JSON, no de una página web):
  - generador: `Sketchfab-14.15.0`
  - título: `KOMATSU HD-465-7EO`
  - autor: `drcrazzie (https://sketchfab.com/drcrazzie)`
  - licencia declarada: `CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)`
  - fuente declarada: `https://sketchfab.com/3d-models/komatsu-hd-465-7eo-2bf4dcd62e484f01bcb446af263bd65c`
  - contenido: 8 mallas, 10 nodos, 8 materiales, 21 texturas.

### Licencia — estado honesto

- El JSON incluido **declara** CC-BY-4.0 con el autor y la fuente indicados,
  y este archivo ofrece esa atribución para respetar dicha declaración.
- PERO el archivo llegó por una ruta local `~/Downloads` **sin comprobante
  de licencia independiente**, y la página o los términos de Sketchfab **no
  se verificaron de forma independiente** en esta tarea. Por lo tanto, para
  efectos de la tesis, cualquier reutilización fuera de este repositorio
  (publicación, redistribución, uso comercial) se considera **NO AUTORIZADA
  hasta su verificación**: revisar la URL de origen, confirmar que el autor
  posee los derechos y confirmar los términos CC-BY-4.0 con sus condiciones
  de atribución antes de cualquier uso externo. Aquí no se tergiversa
  ninguna licencia.

### Escala + orientación (cálculo registrado)

- Extensiones locales de origen (accesores POSITION, todas las partes):
  tramo mayor ≈ **9,40 unidades** (exportación Sketchfab con Y hacia
  arriba; tamaño global aproximado [5,37; 9,40; 5,51]).
- Regla de escena: la extensión horizontal mayor → **6,0 unidades de
  escena**, la misma envolvente del chasis procedural de respaldo que
  representa los 15,29 m del 930E (unidades ilustrativas; trazado del foso
  preservado).
- Factor de escala esperado ≈ **6,0 / 9,40 ≈ 0,6386**. El valor de ejecución
  se mide desde los límites montados (`Box3`), se registra en la consola
  (`[truck] HD465 visual proxy mounted (scale=…)`), se guarda en
  `proxyGroup.userData.scaleFactor` y **prevalece sobre esta estimación**.
- Orientación: el eje mayor se gira hacia +X (adelante del camión; +90° si
  el eje mayor de origen es Z), se recentra X/Z al origen con min.y en 0
  mediante un grupo contenedor, de modo que la interpolación del ciclo FSM
  no se altera.

### Decisiones de integración (alternativas documentadas)

- Cargador: `GLTFLoader` de `three/examples/jsm/loaders/GLTFLoader.js`,
  coherente con `three@0.169.0` instalado (mismo estilo de ruta que el
  `OrbitControls` existente; sin dependencia `three-stdlib`).
- **No se modifica ningún material del GLB** (PBR horneado de Sketchfab).
  El tinte de modo usa cambio de luz direccional + anillo de modo en suelo
  + insignias MOVIMIENTO/DETENIDO del HUD.
- Resaltado del eje trasero GDY106 = **anillo ámbar superpuesto** en la
  posición del eje trasero (x local = −2,1) con pulso por cuadro, más la
  insignia de texto existente como respaldo. Funciona igual en el proxy y
  en el cuerpo de respaldo.
- El proxy es rígido: **sin articulación de tolva** (basculamiento
  desactivado con proxy activo; chasis nivelado, coherente con la narrativa
  de recalibración). El montón de mineral se traslada a la parte superior
  de la tolva del proxy y conserva su regla de visibilidad CARGA/ACARREO.
- Las ruedas del proxy se usan tal cual (**estáticas**); el giro ilustrativo
  se retira con el proxy y las RPM de rotor/rueda permanecen como texto.
- Preajustes de cámara (foso/cabina/lateral/rueda) sin cambios: el proxy
  ocupa la misma envolvente de 6,0 unidades; el preajuste de rueda apunta
  al marcador del eje trasero. La etiqueta flotante sigue la altura medida
  del proxy.
- Si la carga falla, el **cuerpo procedural de respaldo** permanece
  visible; la nota del proxy sigue vigente (malla ausente).
