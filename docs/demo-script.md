# Demostración de cinco minutos para el jurado

Para iniciar localmente con un solo comando, ejecuta [`scripts/demo.sh`](../scripts/demo.sh).

El alcance se limita a Komatsu 930E-4SE / GDY106. La telemetría generada, las alternativas de flota, las curvas del modelo y los valores de los informes son sintéticos o datos de demostración deterministas; no hay un conjunto de datos de campo ni calibración en terreno. `EN VIVO` significa que un valor proviene del backend local; no implica validación en terreno. `DEMO` y `SUSTITUTO SINTÉTICO` deben seguir visibles al presentar. El prototipo es de solo lectura respecto del camión; los cambios del ciclo de vida de las alertas de demostración son locales al navegador, no acciones del backend.

## 0:00–0:45 — Iniciar los servicios locales

Desde la raíz del repositorio:

```bash
./scripts/demo.sh
```

Inicia la demo como máximo 10 minutos antes de presentar; el script levanta el backend, el simulador sintético y la vista previa local. La fuga se detiene en un piso predeterminado del 40 % de la capacidad; puedes ajustar el ritmo con `OILGUARD_DEMO_LEAK_L_PER_H` y el piso con `OILGUARD_DEMO_FLOOR_PCT` antes de ejecutarlo. Una respuesta correcta solo demuestra que los servicios locales están disponibles; no demuestra calibración ni precisión en terreno.

## 0:45–1:20 — Página inicial y flota

1. Abre [`/`](http://127.0.0.1:4321/) y selecciona **Abrir demostración en vivo** para llegar a [`/fleet`](http://127.0.0.1:4321/fleet).
2. Señala las etiquetas de origen por fila `EN VIVO` y `DEMO`. El servicio del backend puede entregar solo dispositivos del simulador; la presentación completa de la flota también incluye el conjunto de datos local determinista.
3. Selecciona una fila de rueda. Se abre `/monitoring?wheel=…`, la página de monitoreo y análisis de ruedas (no el corte 3D).

## 1:20–2:35 — Monitoreo de ruedas y demostración local de fuga

1. En `/monitoring`, identifica la etiqueta de origen antes de comentar cualquier cifra. Los valores devueltos por el backend se muestran como `EN VIVO`; el recorrido de fuga siempre es una demostración sintética local.
2. Selecciona **Ejecutar demostración de fuga (limpio → N4)** y revisa las etiquetas de etapa, la secuencia de alertas y la evidencia en la misma página. Esto no publica un evento de campo ni demuestra el rendimiento de detección.
3. Para la vista geométrica independiente, selecciona **Rueda GDY106** en la navegación o abre [`/wheel`](http://127.0.0.1:4321/wheel). Su corte y la respuesta del depósito de aceite son comportamiento del modelo sintético, no una medición.

## 2:35–3:45 — Alertas e informe

1. Abre [`/alerts`](http://127.0.0.1:4321/alerts). La bandeja puede mostrar registros `EN VIVO` del backend; si no hay ninguno, muestra registros `DEMO` deterministas y los etiqueta como tales. Filtra por **NIVEL** y selecciona **N4 · PÉRDIDA CRÍTICA**.
2. Abre la fila activa de demostración N4 `alert-wheel-RH-03` o visita [`/alerts/detail?id=alert-wheel-RH-03`](http://127.0.0.1:4321/alerts/detail?id=alert-wheel-RH-03). La etiqueta de origen `DEMO`, la ventana de evidencia sintética y la nota de ciclo de vida local deben seguir visibles. Los controles para reconocer, escalar o cerrar no llaman al backend ni controlan un camión.
3. Selecciona **Generar informe** en la página de detalle. El enlace abre `/report?alert=alert-wheel-RH-03`. Explica el límite importante: la página muestra el ID de alerta proporcionado, pero las mediciones y la secuencia N1–N4 corresponden a un informe sintético determinista canónico, no a la evidencia de esa alerta ni a un incidente de campo.
4. Opcional: **Reglas · solo lectura** abre `/alerts/rules`, que explica los umbrales estáticos y la lógica de votación; no puede modificar las reglas operativas.

## 3:45–4:20 — Estado del enlace

Abre **Salud del enlace** en la navegación de Plataforma o visita [`/link`](http://127.0.0.1:4321/link). Señala la insignia de origen. Los valores de estado del backend, recepción y enlace se muestran como `EN VIVO` cuando se reciben; la alternativa son datos de demostración deterministas. Ningún modo implica un acuerdo de nivel de servicio de red.

## 4:20–5:00 — Validación y cierre

Abre **Validación** en la navegación de Laboratorio o visita [`/lab/validation`](http://127.0.0.1:4321/lab/validation). La comparación predeterminada usa los datos de referencia generados. Si hay filas del backend, la página las etiqueta y no las trata como referencia del generador, salvo que la respuesta incluya esos datos de referencia. Cierra indicando el límite: no se ha completado calibración física en banco ni validación en terreno, y el prototipo no tiene una vía de control del camión.
