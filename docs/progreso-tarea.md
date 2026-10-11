# Progreso — cierre de integridad y landing narrativa

Estado: EN CURSO
Última actualización: 2026-10-11 (America/Santiago)

## Bloque A — Integridad

- [x] A01 — Hacer que una caída total del backend se vea como una caída
      Archivos: `frontend/src/dash/Dashboard.tsx`, `frontend/src/dash/analyzerAvailability.ts`, `frontend/src/dash/analyzerAvailability.test.ts`, `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts`
      Cambio: Se agregó un aviso de caída bilingüe con `role="alert"` y se suprimió el aviso de calma mientras el backend está caído.
      Verificación: `cd frontend && bun test src/dash/analyzerAvailability.test.ts src/dash/Dashboard.outage.test.ts` — 9 pruebas y 41 expectativas pasaron; capturas EN/ES en 1024 px y 390 px, con movimiento normal y reducido, inspeccionadas por el padre. Evidencia detallada: `odd/tasks/integrity-narrative.md` §3.1; commit `5122505`.
      Estado: VERIFICADO

- [x] A02 — Derivar la obsolescencia de datos desde marcas de tiempo, no desde `false`
      Archivos: `frontend/src/dash/Dashboard.tsx`, `frontend/src/dash/readingFreshness.ts` (nuevo), `frontend/src/dash/readingFreshness.test.ts` (nuevo), `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts`
      Cambio: Terminado, funcionalmente verificado y comprometido en `9a4d7a8`. El umbral de 120 s se traza al inventario de dispositivos existente (no es ajuste físico); el Dashboard consume la marca real de última comunicación (`t_iso`) y una lectura antigua produce estado obsoleto con aviso bilingüe `role="status"`. La caída del backend conserva precedencia con su propio aviso `role="alert"`. Hubo una única corrección acotada: la primera ronda de capturas mostró una caja anidada rojo-crítico/ámbar, se corrigió y se recapturó. A03 aún no iniciado en el momento del cierre de A02.
      Criterio de aceptación: Cumplido — la ruta de producción muestra datos obsoletos cuando la marca excede el umbral trazable; el umbral no modifica constantes físicas ni alerta.
      Verificación:
      - [x] Foco A02 en verde — `cd frontend && bun test src/dash/readingFreshness.test.ts src/dash/Dashboard.outage.test.ts` — 25 pruebas, 120 expectativas, salida 0 (bloque verbatim abajo).
      - [x] Guardia i18n/honestidad en verde — `cd frontend && bun test src/i18n/index.test.ts src/honesty.test.ts` — 9 pruebas, 5605 expectativas, salida 0 (bloque verbatim abajo).
      - [x] Negativo en copia desechable `/tmp/og-a02-negative.oQLvhc` (solo la copia mutada para forzar `resolveReadingStale` a falso; el worktree vivo nunca se revirtió): 12 pass, 3 fail, 82 expect calls, salida 1; los fallos incluyen la costura de producción con marca antigua, la ruta de lectura antigua y la caja única — prueba que la ruta de estado obsoleto falla bajo mutación a falso-constante; es evidencia esperada, no un chequeo vivo roto.
      - [x] `git diff --check`: sin salida, salida 0.
      - [x] Capturas EN/ES inspeccionadas por el padre en `/tmp/og-a02-e2e/aged-en-1024.png` y `/tmp/og-a02-e2e/aged-es-1024.png` (1024×800): backend en vivo con marca antigua, un único aviso ámbar con `role="status"`, chip de validez por dato obsoleto, sin mensaje de calma. La caída sigue siendo el aviso de error de mayor prioridad.
      - [x] Escenario de runtime y límite de rollback para el commit de unidad de trabajo: stub/backend desechable en 8001 + Astro local en 5174; PIDs desechables 97850/97972 detenidos; el padre verificó `lsof -nP -iTCP:8001 -iTCP:5174 -sTCP:LISTEN` sin listeners; otros puertos/servicios intactos; rollback = solo el límite del commit de unidad de trabajo.
      - [x] Traza del padre: marca hasta `backend/main.py:1270` (`t_iso`), `frontend/src/sim/api.ts:59` y la ruta de parseo del Dashboard; 120 s desde `frontend/src/platform/devices/logic.ts:24` / `DeviceInventoryPage.tsx:134` y `dict/platform.ts:298`. Sin cambios físicos ni de alerta. Diff fuente A02 limitado a Dashboard, `readingFreshness.ts` nuevo + su test, test de outage extendido y `dict/ops.ts`; sin dependencias agregadas.
      - [x] Estado previo: A01 sigue DONE commit `5122505` según registro del worktree; `.codex/hooks.json` del usuario sigue modificado e intacto; evaluación RDD nativa post-commit aún pendiente (modo on por defecto; el primer assess del worktree falló como no-evaluable/alto por no declarar untracked — salida 1, risk=high, reason=unassessable, review_due=true/high_risk, changed_paths=0 —; se requiere un fresh assessment solo-commiteado tras el commit; ninguna transacción de revisión iniciada). Sin siguiente tarea.
      - Salida completa del foco (copiada verbatim, sin recortes):
      ```
      bun test v1.4.2 (50a8a8387)

      src/dash/readingFreshness.test.ts:
      (pass) reading freshness cutoff > matches the device-inventory staleness threshold (120 s, not physics tuning) [0.37ms]
      (pass) isReadingStale > treats the DEMO fresh-fixture age (8 s) as fresh [0.13ms]
      (pass) isReadingStale > treats the DEMO stale-fixture age (180 s) as stale [0.01ms]
      (pass) isReadingStale > keeps the exact cutoff fresh and stales anything past it
      (pass) isReadingStale > treats a missing or unparsable timestamp as stale without inventing an age [0.02ms]
      (pass) isReadingStale > treats a future timestamp as fresh
      (pass) resolveReadingStale production path > reaches stale for the live wheel with an aged backend timestamp [0.22ms]
      (pass) resolveReadingStale production path > stays fresh for the live wheel with a recent backend timestamp
      (pass) resolveReadingStale production path > never flags the demo walk or DEMO wheels against the wall clock [0.01ms]
      (pass) resolveReadingStale production path > negative: the pre-A02 constant-false path reports valid for aged data [0.03ms]

      src/dash/Dashboard.outage.test.ts:
      (pass) backend outage banner state > reports an outage only for the live wheel with a failed backend [0.03ms]
      (pass) backend outage banner output > renders an unmistakable alert banner in English, never the calm message [3.81ms]
      (pass) backend outage banner output > renders the same alert banner localized in Spanish, never the calm message [0.14ms]
      (pass) backend outage banner layout > keeps title and detail in a single coherent content node [0.31ms]
      (pass) dashboard outage status path > outage without active alert shows the prominent banner and no calm message [0.44ms]
      (pass) dashboard outage status path > healthy state without escalation keeps the calm notice and no outage banner [0.13ms]
      (pass) dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component: stale box, no calm [0.31ms]
      (pass) dashboard stale production seam (timestamp in, notice out) > fresh live timestamp resolves fresh inside the component: calm, no stale [0.16ms]
      (pass) dashboard stale production seam (timestamp in, notice out) > outage keeps precedence through the seam: alert banner, stale suppressed [0.24ms]
      (pass) dashboard stale reading status path > aged live timestamp renders the stale notice and no calm message [0.35ms]
      (pass) dashboard stale reading status path > fresh live timestamp keeps the calm notice and no stale banner [0.90ms]
      (pass) dashboard stale reading status path > negative: forcing the pre-A02 constant-false path hides the stale state [0.08ms]
      (pass) dashboard stale reading status path > outage keeps its own banner without duplicating the stale notice [0.09ms]
      (pass) stale notice layout > keeps title and detail in a single coherent content node [0.51ms]
      (pass) stale notice layout > renders one stale box with status semantics, never nested in the outage lane [0.16ms]

      25 pass
      0 fail
      120 expect() calls
      Ran 25 tests across 2 files. [89.00ms]
      ```
      Salida 0.
      - Salida completa de la guardia (copiada verbatim, sin recortes):
      ```
      bun test v1.4.2 (50a8a8387)

      src/honesty.test.ts:
      (pass) honesty matcher > normalizes case and accents while respecting short-token boundaries [5.29ms]
      (pass) frontend honesty guard > contains no unsupported claims or machine-control actions [361.38ms]

      src/i18n/index.test.ts:
      (pass) i18n dictionary > every key has non-empty EN and ES copy [1.22ms]
      (pass) i18n dictionary > no sprint or task codes leak into UI copy [0.81ms]
      (pass) i18n dictionary > Spanish dictionary copy keeps required accents [2.41ms]
      (pass) i18n dictionary > Spanish dictionary copy uses decimal commas outside factual specifications [0.96ms]
      (pass) i18n dictionary > the demo lab note formats every displayed number for the selected language [2.81ms]
      (pass) i18n dictionary > the dashboard footnote reflects the geometry-derived pressure [0.12ms]
      (pass) navigation exposes the three product sections [0.02ms]

      9 pass
      0 fail
      5605 expect() calls
      Ran 9 tests across 2 files. [448.00ms]
      ```
      Salida 0.
      - Prueba negativa en copia desechable: comando `cd /tmp/og-a02-negative.oQLvhc/frontend && bun test src/dash/Dashboard.outage.test.ts` — 12 pass, 3 fail, 82 expect calls, salida 1. Los tests fallidos incluyen `dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component` (expected role=status, received false), la ruta de lectura antigua y la caja única. Esto prueba que la ruta de estado obsoleto de producción falla bajo una mutación a falso-constante; es evidencia de fallo esperado, no un chequeo vivo roto.
      - Salida completa de la mutación desechable (copiada verbatim, sin recortes):
      ```
      bun test v1.4.2 (50a8a8387)

      src/dash/Dashboard.outage.test.ts:
      (pass) backend outage banner state > reports an outage only for the live wheel with a failed backend [0.41ms]
      (pass) backend outage banner output > renders an unmistakable alert banner in English, never the calm message [4.22ms]
      (pass) backend outage banner output > renders the same alert banner localized in Spanish, never the calm message [0.12ms]
      (pass) backend outage banner layout > keeps title and detail in a single coherent content node [0.24ms]
      (pass) dashboard outage status path > outage without active alert shows the prominent banner and no calm message [0.34ms]
      (pass) dashboard outage status path > healthy state without escalation keeps the calm notice and no outage banner [0.09ms]
      152 |         live: true,
      153 |         demoActive: false,
      154 |         lastUpdateMs: AGED_READING_MS,
      155 |         nowMs: STALE_NOW,
      156 |       });
      157 |       expect(html.includes('role="status"')).toBe(true);
                                                         ^
      error: expect(received).toBe(expected)

      Expected: true
      Received: false

            at <anonymous> (/private/tmp/og-a02-negative.oQLvhc/frontend/src/dash/Dashboard.outage.test.ts:157:46)
      (fail) dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component: stale box, no calm [2.82ms]
      (pass) dashboard stale production seam (timestamp in, notice out) > fresh live timestamp resolves fresh inside the component: calm, no stale [1.14ms]
      (pass) dashboard stale production seam (timestamp in, notice out) > outage keeps precedence through the seam: alert banner, stale suppressed [0.13ms]
      197 |       live: true,
      198 |       demoActive: false,
      199 |       lastUpdateMs: AGED_READING_MS,
      200 |       nowMs: STALE_NOW,
      201 |     });
      202 |     expect(derived).toBe(true);
                                ^
      error: expect(received).toBe(expected)

      Expected: true
      Received: false

            at <anonymous> (/private/tmp/og-a02-negative.oQLvhc/frontend/src/dash/Dashboard.outage.test.ts:202:21)
      (fail) dashboard stale reading status path > aged live timestamp renders the stale notice and no calm message [0.11ms]
      (pass) dashboard stale reading status path > fresh live timestamp keeps the calm notice and no stale banner [0.09ms]
      (pass) dashboard stale reading status path > negative: forcing the pre-A02 constant-false path hides the stale state [0.08ms]
      (pass) dashboard stale reading status path > outage keeps its own banner without duplicating the stale notice [0.19ms]
      (pass) stale notice layout > keeps title and detail in a single coherent content node [0.32ms]
      275 |         live: true,
      276 |         demoActive: false,
      277 |         lastUpdateMs: AGED_READING_MS,
      278 |         nowMs: STALE_NOW,
      279 |       });
      280 |       expect(html.includes('role="status"')).toBe(true);
                                                         ^
      error: expect(received).toBe(expected)

      Expected: true
      Received: false

            at <anonymous> (/private/tmp/og-a02-negative.oQLvhc/frontend/src/dash/Dashboard.outage.test.ts:280:46)
      (fail) stale notice layout > renders one stale box with status semantics, never nested in the outage lane [0.14ms]

      12 pass
      3 fail
      82 expect() calls
      Ran 15 tests across 1 file. [89.00ms]
      negative_regression_exit=1
      ```
      Salida 1.
      - Revisión RDD nativa: modo on por defecto. El primer assessment no pudo evaluar por el documento de progreso untracked; se excluyó explícitamente de la candidata. La revisión cubrió 7 archivos / 775 líneas del rango A01–A02, riesgo medio; el usuario dio consentimiento, el lente `review-reliability` no encontró hallazgos y la autoridad se quemó con el acuse exacto. El límite revisado ahora avanza al commit `9a4d7a8`.
      - Decisión de entrega: el usuario seleccionó `feature-branch-chain` para la estrategia `ask-on-risk`, dado el pronóstico superior al presupuesto. No se han autorizado límites de PR ni acciones remotas.
      Estado: COMPLETADO — commit `9a4d7a8`; revisión nativa acusada (A03 pendiente sin iniciar en ese momento)

- [x] A03 — Agregar procedencia mixta por campo en la vista de flota
      Archivos: `frontend/src/ops/fleet/logic.ts`, `frontend/src/ops/fleet/FleetPage.tsx`, `frontend/src/ops/fleet/logic.test.ts`, `frontend/src/ops/fleet/FleetPage.provenance.test.ts` (nuevo), `frontend/src/i18n/dict/ops.ts`.
      Cambio: Commit `8ef515f` (`fix(fleet): label per-field provenance`). La fusión conserva procedencia por campo y el nivel LIVE no cubre el sigma ni otras métricas DEMO. A04 sigue pendiente: esta tarea no resuelve las etiquetas de confianza, unidades, bandas y validez del Dashboard y WheelPanels.
      Verificación: `cd frontend && bun test src/ops/fleet/logic.test.ts src/ops/fleet/FleetPage.provenance.test.ts` — 20 pruebas, 0 fallos, 247 expectativas en dos archivos, salida 0. La prueba negativa en copia desechable de `git archive HEAD` retiró solo el origen de sigma y su distintivo DEMO, sin cambiar las pruebas ni el worktree: `cd <temp>/frontend && bun test src/ops/fleet/logic.test.ts src/ops/fleet/FleetPage.provenance.test.ts` — 17 pruebas pasaron, 3 fallaron, 235 expectativas, salida 1 esperada. Las salidas completas capturadas están debajo.
      Evidencia visual: capturas EN a 1024 px en `/private/tmp/og-a03-e2e/fleet-live-en-1024.png` y `/private/tmp/og-a03-e2e/fleet-down-en-1024.png`, inspeccionadas. La fila LIVE muestra nivel LIVE y sigma/telemetría sintética DEMO; el estado alternativo muestra DEMO. La tabla a 1024 px es densa y hay solapamiento de distintivos con contenido adyacente: no se reclama aprobación visual de layout ni la matriz completa EN/ES, móvil y movimiento reducido, pendiente para A13.
      Estado: VERIFICADO — A03 terminada; A04 es la siguiente unidad. No se realizó revisión RDD nueva ni entrega remota en este cierre documental. El espejo Engram sigue pendiente/no disponible por falta de identidad de sesión autorizada en este panel; `.codex/hooks.json` permanece intacto.
      Salida completa del foco A03 (capturada después de la corrección de sigma):
      ```text
      bun test v1.4.2 (50a8a8387)

      src/ops/fleet/FleetPage.provenance.test.ts:
      (pass) fleet per-field provenance > a LIVE-merged row keeps demo telemetry labeled DEMO at the field [18.15ms]
      (pass) fleet per-field provenance > demo rows label every field DEMO [0.91ms]
      (pass) fleet per-field provenance > live device without a level keeps level DEMO while last-comm stays LIVE [1.09ms]
      (pass) fleet per-field provenance > negative: a demo temperature in a LIVE row renders unlabeled without the fix [1.01ms]
      (pass) fleet per-field provenance > level LIVE does not cover demo sigma: distinct badges EN+ES [0.74ms]

      src/ops/fleet/logic.test.ts:
      (pass) fleet overview logic > groups demo wheels by truck and preserves both positions [0.09ms]
      (pass) fleet overview logic > counts alerts and communication states [0.20ms]
      (pass) fleet overview logic > filters model, state, and wheel search [0.11ms]
      (pass) fleet overview logic > replaces matching demo rows with live levels and source [0.05ms]
      (pass) fleet overview logic > serializes visible rows as escaped CSV [0.53ms]
      (pass) fleet overview logic > builds the monitoring detail link [0.03ms]
      (pass) fleet overview logic > formats ages and keeps demo telemetry within the fixed reference day [0.14ms]
      (pass) fleet per-field provenance in mergeLiveDevices > demo rows mark every merged field DEMO [0.05ms]
      (pass) fleet per-field provenance in mergeLiveDevices > live merge marks only level and last-comm LIVE, demo telemetry stays DEMO [0.07ms]
      (pass) fleet per-field provenance in mergeLiveDevices > live device without a level keeps level DEMO while last-comm stays LIVE [0.05ms]
      (pass) fleet per-field provenance in mergeLiveDevices > live-only devices mark synthesized telemetry DEMO [0.08ms]
      (pass) fleet per-field provenance in mergeLiveDevices > negative: row-level LIVE alone would silently present demo telemetry as live [0.03ms]
      (pass) fleet per-field provenance in mergeLiveDevices > fleetFieldSource reads the per-field provenance map [0.02ms]
      (pass) fleet per-field provenance in mergeLiveDevices > live merge keeps sigma DEMO while level goes LIVE [0.26ms]
      (pass) fleet per-field provenance in mergeLiveDevices > demo rows mark sigma DEMO [0.01ms]

       20 pass
       0 fail
       247 expect() calls
      Ran 20 tests across 2 files. [133.00ms]
      ```
      Salida 0.
      Salida completa de la prueba negativa aislada (stdout/stderr combinados):
      ```text
      bun test v1.4.2 (50a8a8387)

      src/ops/fleet/FleetPage.provenance.test.ts:
      (pass) fleet per-field provenance > a LIVE-merged row keeps demo telemetry labeled DEMO at the field [12.07ms]
      (pass) fleet per-field provenance > demo rows label every field DEMO [0.86ms]
      (pass) fleet per-field provenance > live device without a level keeps level DEMO while last-comm stays LIVE [0.76ms]
      (pass) fleet per-field provenance > negative: a demo temperature in a LIVE row renders unlabeled without the fix [0.65ms]
      116 |       const cells = cellsOf(renderRow(lang, row));
      117 |       const levelCell = cells[1] ?? "";
      118 |       const liveLabel = t("fleet.source.live", lang);
      119 |       const demoLabel = t("fleet.source.demo", lang);
      120 |       expect(levelCell.includes(liveLabel)).toBe(true);
      121 |       expect(levelCell.includes(demoLabel)).toBe(true);
                                                        ^
      error: expect(received).toBe(expected)

      Expected: true
      Received: false

            at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a03-negative-h8z5zqn1/frontend/src/ops/fleet/FleetPage.provenance.test.ts:121:45)
      (fail) fleet per-field provenance > level LIVE does not cover demo sigma: distinct badges EN+ES [4.19ms]

      src/ops/fleet/logic.test.ts:
      (pass) fleet overview logic > groups demo wheels by truck and preserves both positions [0.10ms]
      (pass) fleet overview logic > counts alerts and communication states [0.17ms]
      (pass) fleet overview logic > filters model, state, and wheel search [0.11ms]
      (pass) fleet overview logic > replaces matching demo rows with live levels and source [0.05ms]
      (pass) fleet overview logic > serializes visible rows as escaped CSV [0.60ms]
      (pass) fleet overview logic > builds the monitoring detail link [0.02ms]
      (pass) fleet overview logic > formats ages and keeps demo telemetry within the fixed reference day [0.19ms]
      (pass) fleet per-field provenance in mergeLiveDevices > demo rows mark every merged field DEMO [0.05ms]
      (pass) fleet per-field provenance in mergeLiveDevices > live merge marks only level and last-comm LIVE, demo telemetry stays DEMO [0.07ms]
      (pass) fleet per-field provenance in mergeLiveDevices > live device without a level keeps level DEMO while last-comm stays LIVE [0.04ms]
      (pass) fleet per-field provenance in mergeLiveDevices > live-only devices mark synthesized telemetry DEMO [0.07ms]
      (pass) fleet per-field provenance in mergeLiveDevices > negative: row-level LIVE alone would silently present demo telemetry as live [0.03ms]
      (pass) fleet per-field provenance in mergeLiveDevices > fleetFieldSource reads the per-field provenance map [0.03ms]
      163 |       latest_level_liters: 91.2,
      164 |       last_t_iso: "2026-10-10T09:00:00.000Z",
      165 |     }]);
      166 |     const row = live.find((item) => item.id === "wheel-RH-01");
      167 |     expect(row?.fieldSources.level).toBe("LIVE");
      168 |     expect(row?.fieldSources).toMatchObject({ sigma: "DEMO" });
                                          ^
      error: expect(received).toMatchObject(expected)

        {
      -   "sigma": "DEMO",
      +   "alert": "DEMO",
      +   "lastComm": "LIVE",
      +   "level": "LIVE",
      +   "lossRate": "DEMO",
      +   "regime": "DEMO",
      +   "temperature": "DEMO",
      +   "trend": "DEMO",
      +   "vibration": "DEMO",
        }

      - Expected  - 1
      + Received  + 8

            at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a03-negative-h8z5zqn1/frontend/src/ops/fleet/logic.test.ts:168:31)
      (fail) fleet per-field provenance in mergeLiveDevices > live merge keeps sigma DEMO while level goes LIVE [3.92ms]
      168 |     expect(row?.fieldSources).toMatchObject({ sigma: "DEMO" });
      169 |   });
      170 |
      171 |   test("demo rows mark sigma DEMO", () => {
      172 |     // El sigma demo necesita procedencia propia para no leerse como vivo en una fila LIVE.
      173 |     expect(rows[0]?.fieldSources).toMatchObject({ sigma: "DEMO" });
                                              ^
      error: expect(received).toMatchObject(expected)

        {
      -   "sigma": "DEMO",
      +   "alert": "DEMO",
      +   "lastComm": "DEMO",
      +   "level": "DEMO",
      +   "lossRate": "DEMO",
      +   "regime": "DEMO",
      +   "temperature": "DEMO",
      +   "trend": "DEMO",
      +   "vibration": "DEMO",
        }

      - Expected  - 1
      + Received  + 8

            at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a03-negative-h8z5zqn1/frontend/src/ops/fleet/logic.test.ts:173:35)
      (fail) fleet per-field provenance in mergeLiveDevices > demo rows mark sigma DEMO [0.08ms]

       17 pass
       3 fail
       235 expect() calls
      Ran 20 tests across 2 files. [130.00ms]
      ```
      Salida 1 esperada.
- [x] A04 — Etiquetar fuente, unidades, banda y validez por campo numérico
      Estado: COMPROMETIDO en `4ed5b1a` (2026-10-11) — 5 archivos, +597/−542; foco 18 pass según el commit; los compartidos (Dashboard, dict/ops) coevolucionaron con S01–S06 (final solo-ES en `8dc5f4f`).
      Archivos autorizados: `frontend/src/dash/Dashboard.tsx`, `frontend/src/ops/wheel/WheelPanels.tsx`, `frontend/src/ops/wheel/WheelPanels.provenance.test.ts` (nuevo), `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts`. `frontend/src/i18n/index.ts` solo lectura. Este registro y `odd/tasks/integrity-narrative.md` pueden actualizarse como registros de tarea.
      Criterio de aceptación: confianza, sigma y nivel numéricos muestran procedencia, unidades, banda de incertidumbre cuando aplica y validez por campo, con backend vivo y caído; ningún dato DEMO aparece como medición de tres decimales sin etiqueta. Interfaz EN/ES. Sin cambios físicos, de umbrales, dependencias ni fuentes ajenas.
      TDD: activado por el plan ODD aprobado; runner `cd frontend && bun test src`. Primero RED observable, después GREEN y prueba negativa en copia desechable. Foco: `cd frontend && bun test src/ops/wheel/WheelPanels.provenance.test.ts src/dash/Dashboard.outage.test.ts`. Verificación original: `cd frontend && bun test src/dash && bun run build`. Capturas locales EN/ES a 1024 px con backend vivo/caído. Sin A05, commit, staging, RDD ni servicios remotos. Espejo Engram pendiente/no disponible por ausencia de identidad de sesión autorizada en este panel.
-      Evidencia actual: RED previo a fuentes — 15 pass, 3 fail, 107 expectativas, salida 1; GREEN del foco repetido sobre el árbol actual — 18 pass, 0 fail y 138 expectativas en dos archivos, salida 0. Tras la autorización expresa del usuario, el padre corrigió solo dos aserciones de tipado A03 en `frontend/src/ops/fleet/logic.test.ts:168,173`, sustituyendo `toMatchObject` por `.fieldSources.sigma.toBe("DEMO")`; no hubo otros cambios A03. `cd frontend && bun test src/dash && bun run build` pasó 78 pruebas de Dashboard, 0 fallos y 462 expectativas; `astro check`: 0 errores, 0 advertencias, 10 sugerencias; build: 40 páginas; salida 0, con aviso Vite sobre un chunk mayor de 500 kB. Guardia `cd frontend && bun test src/i18n/index.test.ts src/honesty.test.ts`: 9 pruebas, 0 fallos, 5629 expectativas, salida 0. Negativo aislado en copia desechable: solo el sigma se fuerza falsamente a LIVE, con pruebas intactas; 17 pass, 1 fail, 122 expectativas, salida 1 esperada. Capturas inspeccionadas a 1024×800: `/tmp/og-a04-e2e/live-en-1024.png`, `live-es-1024.png`, `down-en-1024.png`, `down-es-1024.png`. Vivo: nivel/sigma/confianza LIVE con unidades, banda y validez; caído: los tres DEMO con validez sintética y aviso de backend inaccesible en EN/ES. No hay confianza desnuda de tres decimales. Stub local 8001, Astro 5174 y Chrome CDP 9223 fueron detenidos; puertos libres. No se hizo stage ni commit; `.codex/hooks.json` quedó intacto. La matriz completa de otros anchos/movimiento permanece para A13; el espejo Engram sigue pendiente.
- [x] A05 — Informar el veredicto de calibración como sintético y no evaluado físicamente
      Estado: COMPROMETIDO en `b7df2af` (2026-10-11) — 4 archivos, +543/−420; lógica 5 pass y suite 487 pass según el commit; `dict/platform.ts` coevolucionó con A06/S01–S06 (final solo-ES en `8dc5f4f`).
      Ruta: implementación directa delegada. El disparador de mapeo aplica porque A05 abarca cuatro archivos; el disparador de escritor también aplica a esos cuatro archivos no triviales. Un único escritor implementará con el plan y el alcance autorizados.
      TDD: activado por el plan aprobado; runner `cd frontend && bun test src`. Prueba focal: `cd frontend && bun test src/lab/calibration/logic.test.ts`. La prueba negativa se repetirá en una copia desechable; captura manual del veredicto con backend vivo y caído. Sin cambios físicos/de umbrales, commit, staging, RDD/revisión ni acciones remotas. Espejo Engram pendiente por falta de identidad autorizada.
      Cambio: `calibrationVerdictEvidence` añade procedencia de modelo sintético y estado físico «no evaluado» al resultado del clasificador sin alterar umbrales; `CalibrationVerdictPanel` los muestra junto al veredicto y las traducciones EN/ES indican nominal sintético, nunca aprobación física. La curva y su ajuste siguen generados incluso si entra un nivel vivo. Solo se editaron los cuatro archivos A05 autorizados.
      Evidencia: RED antes de fuentes — `cd frontend && bun test src/lab/calibration/logic.test.ts`: 0 pass, 1 fail, 1 error de importación por export aún ausente, salida 1. GREEN focal: 5 pass, 0 fail, 39 expectativas, salida 0. Suite `cd frontend && bun test src`: 487 pass, 0 fail, 152468 expectativas en 85 archivos, salida 0. `cd frontend && bun run build`: `astro check` 0 errores, 0 advertencias, 10 sugerencias; 40 páginas, salida 0; aviso Vite por chunk mayor de 500 kB. Guardia `cd frontend && bun test src/i18n/index.test.ts src/honesty.test.ts`: 9 pass, 0 fail, 5637 expectativas, salida 0. Negativo en copia desechable: al retirar solo el distintivo de resultado sintético, las pruebas intactas dan 4 pass, 1 fail, 16 expectativas, salida 1 esperada. Capturas EN/ES 1024×800 inspeccionadas: `/tmp/og-a05-e2e/live-en-1024.png`, `live-es-1024.png`, `down-en-1024.png`, `down-es-1024.png`; ambos estados conservan «modelo sintético» y «banco físico: no evaluado», mientras la fuente pasa de LIVE a DEMO. Stub 8001, Astro 5174 y Chrome 9223 propios detenidos; puertos libres. Matriz adicional de anchos/movimiento pendiente para A13. Sin A06 ni intervención en `.codex/hooks.json`.
- [x] A06 — Mostrar el RMSE del fixture con procedencia y contexto del falsificador — commit `71e0719` (4 archivos, +166/−71; baldosa RMSE n=350 con procedencia y nota de falsificador; lógica de métricas intacta).
- [x] A07 — Unificar las afirmaciones sobre el falsificador estadístico — commit `e116e53` (compartido A07+A08; 2 archivos, +36/−29).
- [x] A08 — Reemplazar anclas de código por número de línea con símbolos reales — commit `e116e53` (compartido A07+A08; anclas solo a símbolos, cero archivo:línea).
- [x] A09 — Retirar la justificación económica no rastreable de la propuesta — commit `dec47dc` (compartido A09+A10; 2 archivos, +7/−5; USD 150k fuera del argumento).
- [x] A10 — Corregir el historial del radio de giro conservando la razón de la corrección — commit `dec47dc` (compartido A09+A10; 30,4 m VERIFICADO corregido a 29,7 m).
- [x] A11 — Recalcular deltas del banco de estrés por caso desde los JSON — commit `4f735ef` (compartido A11+A12; 5 archivos, +479/−9; pytest 4 pass).
- [x] A12 — Inventariar documentación para el guard de honestidad y resolver el alcance antes de remediar — commit `4f735ef` (compartido A11+A12; inventario de 33 rutas, cero bruto sin resolver sigue UNRESOLVED).
- [x] A13 — Auditar el cierre del bloque A mediante un informe de evidencia — commit `a752832` (compartido A13+B01; 2 archivos nuevos, +313; informe previo a la corrección F-01; suite 594/0 y build 44 páginas en verde tras la corrección).
- [x] S01–S06 — Interfaz solo en español (cambio rompiente) — commit `8dc5f4f` (122 archivos, +5647/−3018; puertas del commit: 594/0, astro check 0 errores, build 44 páginas; arrastra hunks B02–B08 en curso —unidades pendientes, no reclamadas—; detalle en `odd/tasks/spanish-only.md`).

## Bloque B — Landing

- [x] B01 — Trazar afirmaciones físicas y numéricas antes de escribir la landing — commit `a752832` (compartido A13+B01; traza de solo lectura, TRL UNRESOLVED, 7 brechas).
- [ ] B02 — Escribir los ocho beats bilingües como contenido estático
- [ ] B03 — Crear el host diferido de escenas y los cuatro pósteres estáticos (doc de evidencia en `9e911c9`: presupuesto SET, base sin-3D MEASURED 39KB/21KB/0 canvas; unidad formalmente pendiente, código ya en árbol según S01–S06).
- [ ] B04 — Construir el conjunto en corte con reducción 32,62:1 demostrable
- [ ] B05 — Agregar selectores y fichas de los cuatro sensores con sus fuentes
- [ ] B06 — Construir el ciclo de acarreo con pausas respaldadas y aceite agitado/asentado
- [ ] B07 — Construir la escena del aceite con gráfica de presión/volumen y procedencia
- [ ] B08 — Coordinar scroll nativo reversible, escenas y cámaras
- [ ] B09 — Verificar ciclo de vida, accesibilidad y presupuesto medido
- [ ] B10 — Proveer equivalentes de teclado, movimiento reducido, sin WebGL y sin JavaScript
- [ ] B11 — Verificar visualmente anchos, idiomas, movimiento, scroll y consola
- [ ] B12 — Ejecutar auditoría integrada y prueba humana de comprensión de tres minutos

## Bloqueos y decisiones

- 2026-10-10 — `.codex/hooks.json` ya estaba modificado por el usuario antes del trabajo A01; se conserva sin cambios y el requisito de árbol limpio queda pendiente de resolución del propietario.
- 2026-10-10 — El runtime no proporcionó una identidad de sesión Engram autorizada; no se hizo ni se inventará una escritura de memoria. El espejo Engram permanece pendiente.
- 2026-10-10 — El plan ODD aprobado desglosa el trabajo en 25 unidades (A01–A13 y B01–B12), frente a las 23 tareas de la guía original; se sigue el registro aprobado `odd/tasks/integrity-narrative.md` y se preservan sus dependencias y límites.
- 2026-10-10 — A02 quedó completado en `9a4d7a8`; revisión nativa del rango A01–A02 aprobada y acusada (un lente, sin hallazgos). A03 quedó completado en `8ef515f`; sus dos aserciones de tipado se corrigieron después con autorización explícita, sin cambiar comportamiento. A04 superó foco, build, guardia, negativo aislado y capturas dirigidas EN/ES con backend vivo/caído a 1024 px; el cierre formal sigue pendiente porque la orden prohíbe commits y A13 conserva la matriz visual completa. Se conserva `feature-branch-chain`, sin límites de PR ni acciones remotas autorizadas. A01 sigue DONE en `5122505`; `.codex/hooks.json` del usuario sigue intacto. La meta global no está completa.
- 2026-10-11 — Lote de 9 commits sobre `8ef515f`: A04 `4ed5b1a` (5 arch., +597/−542), A05 `b7df2af` (4 arch., +543/−420), A06 `71e0719` (4 arch., +166/−71), S01–S06 `8dc5f4f` (rompiente, 122 arch., +5647/−3018), A07+A08 `e116e53` (2 arch., +36/−29), A09+A10 `dec47dc` (2 arch., +7/−5), A11+A12 `4f735ef` (5 arch., +479/−9), A13+B01 `a752832` (2 nuevos, +313), evidencia B03 `9e911c9` (1 nuevo, +56; unidad pendiente). Puertas frescas: `bun test src` 594 pass/0 fail (150319 expectativas, 97 archivos), salida 0; `bun run build` 44 páginas, salida 0. B02–B12 pendientes (código en árbol según S01–S06, unidades pendientes de pase formal). `.codex/hooks.json` intacto; espejo Engram pendiente.

## Desviaciones del plan

- A01 — La implementación quedó registrada en `odd/tasks/integrity-narrative.md`; la evidencia visual adicional para 390 px EN/ES y movimiento reducido se capturó después de una corrección acotada de layout y quedó inspeccionada antes del commit `5122505`.
- A02 — Una única corrección acotada: la primera ronda de capturas mostró una caja anidada rojo-crítico/ámbar; se corrigió y se recapturó en EN/ES a 1024 px antes de la verificación. Ninguna otra desviación.
