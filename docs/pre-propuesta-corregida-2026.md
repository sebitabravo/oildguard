Copia de trabajo corregida. El PDF enviado no se modifica. Cada corrección cita su fuente o su estado.

## 01 Nombre breve de la solución

**OilGuard Mining** — monitoreo del nivel de aceite en ruedas motorizadas Komatsu 930E y 980E (no validado; el producto marca el modelo 980E como no validado), con caracterización del estado de lubricación.

La propuesta busca seguir las señales asociadas al nivel y a la lubricación durante el ciclo de operación. El prototipo estima el nivel con el camión en reposo; en movimiento el estado queda como no evaluado.

## 02 Descripción general y objetivo

La propuesta aborda el intervalo entre inspecciones periódicas del aceite de las ruedas motorizadas. El sistema combina señales de presión, temperatura y vibración con variables operacionales previstas en el diseño. En el prototipo, la estimación de nivel se hace solo en reposo; no se presenta como una medición volumétrica directa.

El objetivo es apoyar la detección de condiciones de bajo nivel y anomalías de lubricación, complementando las inspecciones de mantenimiento. La integración con la operación y el efecto sobre las fallas o detenciones requieren evaluación posterior.

No hay cifra de impacto económico respaldada por fuentes del proyecto. La cifra citada en la versión enviada no se pudo verificar y no se usa.

## 03 Enfoque técnico de la solución

### 3.1 Estimación en reposo y estado en movimiento

El prototipo estima el nivel con el camión en reposo; en movimiento el estado queda como no evaluado.

En reposo, la propuesta usa la presión como referencia para estimar el nivel. La relación de reducción 32,62:1 se mantiene como dato del conjunto GDY-85/106 (manual 930E-3, p. 115). Los valores de 3.000 RPM para el motor y 92 RPM para la rueda son valores de diseño de la propuesta; no aparecen en los manuales suministrados.

### 3.2 Variables y sensores

| Variable | Sensor o fuente prevista | Uso propuesto |
|---|---|---|
| Nivel de aceite estimado | Transductor de presión MEMS en un punto de servicio | Estimación en reposo; no es una lectura volumétrica directa. |
| Temperatura | Termopar tipo K | Contexto para interpretar la señal de presión. |
| Vibración | Acelerómetro MEMS triaxial | Señal complementaria para caracterizar el funcionamiento. |
| Transitorio de asentamiento | Derivado de la señal de presión | Indicador indirecto que requiere evaluación con datos. |
| Corriente, velocidad y carga | El prototipo no se conecta al bus CAN ni al VHMS; el acceso al bus es trabajo futuro. | Variables de contexto propuestas. |

La capacidad de 95 litros y el grado SAE 85W-140 son supuestos de diseño, por confirmar con el manual del fabricante. El manual GEK-91680A especifica GE D50E27E, ISO VG 680, para GDY-85/106; la guía 930E-3, p. 85, indica 76 litros por lado.

### 3.3 Instalación prevista

La propuesta ubica la instrumentación en puntos de servicio del conjunto. La ubicación y el método de montaje requieren evaluación según acceso, temperatura, vibración y contacto con el lubricante.

Los puntos descritos son propuestas de montaje: adaptador en T en el drenaje para presión, termopar en un tapón magnético y acelerómetro en la tapa de inspección. El sensor Hall se propone como instalación no invasiva en el cable de potencia.

El límite de temperatura del reductor es un requisito de diseño, no una cifra de fuente. Los 120 °C corresponden a la temperatura del estanque hidráulico según el documento de origen; no es un dato del reductor.

La capacidad de 95 litros y el grado SAE 85W-140 son supuestos de diseño, por confirmar con el manual del fabricante. El manual GEK-91680A especifica GE D50E27E, ISO VG 680, para GDY-85/106; la guía 930E-3, p. 85, indica 76 litros por lado.

### 3.4 Arquitectura propuesta

La arquitectura contempla sensores conectados a un nodo de borde, transmisión MQTT, un gateway con almacenamiento de series temporales, una API de backend y un dashboard. Estos elementos describen el diseño de la solución y no implican que toda la interfaz física esté disponible en el prototipo.

Adquisición simulada. El prototipo no tiene interfaz de sensor física.

### 3.5 Adquisición y contexto operacional

Adquisición simulada. El prototipo no tiene interfaz de sensor física. Las frecuencias de 1 kHz para vibración y 10 Hz para presión y temperatura pertenecen a la simulación, no a una interfaz de sensores físicos.

Los valores de 3.000 RPM y 92 RPM son valores de diseño de la propuesta; no aparecen en los manuales suministrados. La relación de reducción 32,62:1 se conserva como dato confirmado en el manual 930E-3, p. 115.

Diseño. El simulador no entrega velocidad ni carga de bus.

El prototipo estima el nivel con el camión en reposo; en movimiento el estado queda como no evaluado.

### 3.6 Simulación y banco de pruebas

La propuesta contempla desarrollar datos sintéticos para ejercitar la adquisición, el almacenamiento y la visualización. El banco de pruebas está planificado, no construido; su criterio de salida son los criterios de aceptación de docs/calibration.md.

El prototipo estima el nivel con el camión en reposo; en movimiento el estado queda como no evaluado.

La capacidad de 95 litros y el grado SAE 85W-140 son supuestos de diseño, por confirmar con el manual del fabricante. El manual GEK-91680A especifica GE D50E27E, ISO VG 680, para GDY-85/106; la guía 930E-3, p. 85, indica 76 litros por lado.

## 04 Monitoreo, alertas y RUL

### 4.1 Panel de monitoreo

El dashboard organiza la información por rueda y contempla el nivel estimado, las señales históricas disponibles, el estado y las alertas. La propuesta busca facilitar la revisión del equipo y el acceso al detalle de una rueda.

### 4.2 Alertas

La propuesta define umbrales de advertencia y crítico para el nivel estimado, además de reglas que combinan señales. La acción asociada a cada alerta debe entenderse como una recomendación de apoyo al mantenimiento, no como una intervención automática del equipo.

### 4.3 RUL: vida útil remanente

La estimación de RUL de la condición de lubricación está implementada. Banda de confianza del 95 % sobre la pendiente (t de Student, df = n − 2). Si el intervalo de la pendiente incluye cero, el RUL se suprime y se muestra el motivo. Este indicador se refiere a la tendencia estimada de la condición de lubricación, no a la vida útil del reductor.

## 05 Inteligencia artificial

La detección de anomalías está implementada con línea base por rueda y por modo, sin etiquetas de falla.

La regresión para estimar nivel depende de datos obtenidos en el banco de pruebas planificado, no construido, que permitan comparar las señales con una referencia. La detección del modo de operación se describe como una función basada en señales y reglas de la propuesta.

## 06 Beneficios e impacto

Los beneficios esperados son facilitar el seguimiento de señales relacionadas con la lubricación y apoyar la priorización de inspecciones. El efecto sobre fallas, tiempos de detención y costos no se cuantifica con evidencia del proyecto.

La estimación de costos es: USD 150 por rueda, USD 300 por camión y USD 15.000 para 50 camiones; estimación de la propuesta, sin fuente de proveedor. El sensor de presión por sí solo tiene un precio minorista de referencia entre USD 87 y USD 120 (búsqueda de costos del proyecto, sin cotización de proveedor). Las cifras no incluyen temperatura, vibración, electrónica, comunicación ni montaje. La estimación tampoco incluye instalación, red, calibración ni software. Por camión, 300 equivale a 2 ruedas instrumentadas; esa cantidad no está justificada en el documento.

## 07 Factibilidad y viabilidad económica

### 7.1 Factibilidad técnica

La propuesta combina sensores comerciales y una arquitectura de IoT. La selección final de componentes y los puntos de montaje dependen de pruebas de integración y de los límites de operación del conjunto.

### 7.2 Recursos para una implementación

El diseño contempla un módulo de sensado por rueda, un gateway, conectividad, un servidor para el backend y trabajo de instalación e integración. Un despliegue gradual podría comenzar con el banco de pruebas planificado, no construido; su criterio de salida son los criterios de aceptación de docs/calibration.md. Luego podría continuar con un piloto controlado y avanzar a una flota limitada.

### 7.3 Viabilidad económica

La estimación de costos es: USD 150 por rueda, USD 300 por camión y USD 15.000 para 50 camiones; estimación de la propuesta, sin fuente de proveedor. El sensor de presión por sí solo tiene un precio minorista de referencia entre USD 87 y USD 120 (búsqueda de costos del proyecto, sin cotización de proveedor). Las cifras no incluyen temperatura, vibración, electrónica, comunicación ni montaje. La estimación tampoco incluye instalación, red, calibración ni software. Por camión, 300 equivale a 2 ruedas instrumentadas; esa cantidad no está justificada en el documento.

No hay cifra de impacto económico respaldada por fuentes del proyecto. La cifra citada en la versión enviada no se pudo verificar y no se usa.

## 08 Confiabilidad y ciberseguridad

### 8.1 Confiabilidad de la información

El diseño propone contrastar señales de distintos sensores y conservar un histórico por rueda para analizar lecturas y alertas. La calidad de la estimación de nivel depende de su contraste con una referencia obtenida en el banco de pruebas planificado, no construido.

### 8.2 Ciberseguridad en contexto industrial

La solución se plantea en modo de solo lectura respecto del equipo. Firmware firmado, RBAC, IEC 62443 y cualquier nivel de seguridad son requisitos de producción, no implementados en el prototipo.

Diseño. El prototipo firma cada fila con HMAC cuando hay clave configurada; la verificación no es obligatoria por defecto. Decisión de seguridad del prototipo: el broker local acepta conexiones anónimas solo en localhost, sin contraseñas, y el puerto 8883 exige certificado de cliente (mTLS). Los puertos del broker y del backend se publican solo en 127.0.0.1.

## 09 Software y tecnologías a utilizar

La propuesta contempla ESP32-S3 para el nodo, Raspberry Pi o Linux industrial para el gateway, MQTT para comunicación, Python y FastAPI para backend, e InfluxDB para series temporales. El panel propio del prototipo (Astro y Preact) está desarrollado.

## 10 Habilidades del equipo

El prototipo lo desarrolla una sola persona como autor único. Las áreas cubiertas son diseño del sistema, frontend en Astro y Preact, backend en FastAPI y simulador en Python. No hay otros integrantes ni colaboradores declarados.

| Integrante | Rol | Áreas cubiertas |
|---|---|---|
| Autor único | Diseño, frontend, backend y simulador | Arquitectura, interfaz Astro y Preact, API FastAPI, simulador en Python y pruebas. |
