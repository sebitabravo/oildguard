Copia de trabajo corregida. El PDF enviado no se modifica. Cada corrección cita su fuente o su estado.

## 01 Nombre breve de la solución

**OilGuard Mining** — monitoreo del nivel de aceite en ruedas motorizadas Komatsu 930E y 980E, con caracterización del estado de lubricación.

La propuesta busca seguir las señales asociadas al nivel y a la lubricación durante el ciclo de operación, y usar las pausas para realizar la estimación disponible en el prototipo.

## 02 Descripción general y objetivo

La propuesta aborda el intervalo entre inspecciones periódicas del aceite de las ruedas motorizadas. El sistema combina señales de presión, temperatura y vibración con variables operacionales previstas en el diseño. En el prototipo, la estimación de nivel se hace solo en reposo; no se presenta como una medición volumétrica directa.

El objetivo es apoyar la detección de condiciones de bajo nivel y anomalías de lubricación, complementando las inspecciones de mantenimiento. La integración con la operación y el efecto sobre las fallas o detenciones requieren evaluación posterior.

No hay cifra de impacto económico respaldada por fuentes del proyecto. La cifra citada en la versión enviada no se pudo verificar y no se usa.

## 03 Enfoque técnico de la solución

### 3.1 Dos modos de medición

La estimación de nivel en el prototipo se hace solo en reposo. En movimiento la presión está afectada por el sloshing del aceite; no hay datos de banco que respalden una estimación en movimiento.

En reposo, la propuesta usa la presión como referencia para estimar el nivel. La relación de reducción 32,62:1 se mantiene como dato del conjunto GDY-85/106 (manual 930E-3, p. 115). Los valores de 3.000 RPM para el motor y 92 RPM para la rueda son valores de diseño de la propuesta; no aparecen en los manuales suministrados.

### 3.2 Variables y sensores

| Variable | Sensor o fuente prevista | Uso propuesto |
|---|---|---|
| Nivel de aceite estimado | Transductor de presión MEMS en un punto de servicio | Estimación en reposo; no es una lectura volumétrica directa. |
| Temperatura | Termopar tipo K | Contexto para interpretar la señal de presión. |
| Vibración | Acelerómetro MEMS triaxial | Señal complementaria para caracterizar el funcionamiento. |
| Transitorio de asentamiento | Derivado de la señal de presión | Indicador indirecto que requiere evaluación con datos. |
| Corriente, velocidad y carga | Sensor Hall no invasivo y bus CAN/VHMS, previstos en el diseño | Variables de contexto propuestas. |

El grado no está confirmado en los manuales suministrados; el manual GEK-91680A especifica GE D50E27E, ISO VG 680, para GDY-85/106. La capacidad de 95 litros se conserva como referencia de la propuesta: manual 930E-3, p. 115; la misma guía da 76 litros por lado en p. 85.

### 3.3 Instalación prevista

La propuesta ubica la instrumentación en puntos de servicio del conjunto. La ubicación y el método de montaje requieren evaluación según acceso, temperatura, vibración y contacto con el lubricante.

Los puntos descritos son propuestas de montaje: adaptador en T en el drenaje para presión, termopar en un tapón magnético y acelerómetro en la tapa de inspección. El sensor Hall se propone como instalación no invasiva en el cable de potencia.

El límite de temperatura del reductor es un requisito de diseño, no una cifra de fuente. En los manuales, 120 °C corresponde al aceite del estanque hidráulico.

El grado no está confirmado en los manuales suministrados; el manual GEK-91680A especifica GE D50E27E, ISO VG 680, para GDY-85/106. La capacidad de 95 litros se conserva como referencia de la propuesta: manual 930E-3, p. 115; la misma guía da 76 litros por lado en p. 85.

### 3.4 Arquitectura propuesta

La arquitectura contempla sensores conectados a un nodo de borde, transmisión MQTT, un gateway con almacenamiento de series temporales, una API de backend y un dashboard. Estos elementos describen el diseño de la solución y no implican que toda la interfaz física esté disponible en el prototipo.

Adquisición simulada. El prototipo no tiene interfaz de sensor física.

### 3.5 Adquisición y contexto operacional

Adquisición simulada. El prototipo no tiene interfaz de sensor física. Las frecuencias de 1 kHz para vibración y 10 Hz para presión y temperatura pertenecen a la simulación, no a una interfaz de sensores físicos.

Los valores de 3.000 RPM y 92 RPM son valores de diseño de la propuesta; no aparecen en los manuales suministrados. La relación de reducción 32,62:1 se conserva como dato confirmado en el manual 930E-3, p. 115.

Diseño. El simulador no entrega velocidad ni carga de bus.

La estimación de nivel en el prototipo se hace solo en reposo. En movimiento la presión está afectada por el sloshing del aceite; no hay datos de banco que respalden una estimación en movimiento.

### 3.6 Simulación y banco de pruebas

La propuesta contempla desarrollar datos sintéticos para ejercitar la adquisición, el almacenamiento y la visualización. Un banco de pruebas se considera como etapa posterior para contrastar las señales con una referencia de nivel.

La estimación de nivel en el prototipo se hace solo en reposo. En movimiento la presión está afectada por el sloshing del aceite; no hay datos de banco que respalden una estimación en movimiento.

La capacidad de 95 litros se conserva como referencia de la propuesta: manual 930E-3, p. 115; la misma guía da 76 litros por lado en p. 85. El grado no está confirmado en los manuales suministrados; el manual GEK-91680A especifica GE D50E27E, ISO VG 680, para GDY-85/106.

## 04 Monitoreo, alertas y RUL

### 4.1 Panel de monitoreo

El dashboard organiza la información por rueda y contempla el nivel estimado, las señales históricas disponibles, el estado y las alertas. La propuesta busca facilitar la revisión del equipo y el acceso al detalle de una rueda.

### 4.2 Alertas

La propuesta define umbrales de advertencia y crítico para el nivel estimado, además de reglas que combinan señales. La acción asociada a cada alerta debe entenderse como una recomendación de apoyo al mantenimiento, no como una intervención automática del equipo.

### 4.3 RUL: vida útil remanente

La estimación de RUL de la condición de lubricación está implementada. Banda de confianza del 95 % sobre la pendiente (t de Student, df = n − 2). Si el intervalo de la pendiente incluye cero, el RUL se suprime y se muestra el motivo. Este indicador se refiere a la tendencia estimada de la condición de lubricación, no a la vida útil del reductor.

## 05 Inteligencia artificial

La detección de anomalías está implementada con línea base por rueda y por modo, sin etiquetas de falla.

La regresión para estimar nivel depende de datos de banco que permitan comparar las señales con una referencia. La detección del modo de operación se describe como una función basada en señales y reglas de la propuesta.

## 06 Beneficios e impacto

Los beneficios esperados son facilitar el seguimiento de señales relacionadas con la lubricación y apoyar la priorización de inspecciones. El efecto sobre fallas, tiempos de detención y costos no se cuantifica con evidencia del proyecto.

La estimación de costos es: USD 150 por rueda, USD 300 por camión y USD 15.000 para 50 camiones; estimación de la propuesta, sin fuente de proveedor; no incluye instalación, red, calibración ni software.

## 07 Factibilidad y viabilidad económica

### 7.1 Factibilidad técnica

La propuesta combina sensores comerciales y una arquitectura de IoT. La selección final de componentes y los puntos de montaje dependen de pruebas de integración y de los límites de operación del conjunto.

### 7.2 Recursos para una implementación

El diseño contempla un módulo de sensado por rueda, un gateway, conectividad, un servidor para el backend y trabajo de instalación e integración. Un despliegue gradual podría comenzar con un banco de pruebas, continuar con un piloto controlado y avanzar luego a una flota limitada.

### 7.3 Viabilidad económica

La estimación de costos es: USD 150 por rueda, USD 300 por camión y USD 15.000 para 50 camiones; estimación de la propuesta, sin fuente de proveedor; no incluye instalación, red, calibración ni software.

No hay cifra de impacto económico respaldada por fuentes del proyecto. La cifra citada en la versión enviada no se pudo verificar y no se usa.

## 08 Confiabilidad y ciberseguridad

### 8.1 Confiabilidad de la información

El diseño propone contrastar señales de distintos sensores y conservar un histórico por rueda para analizar lecturas y alertas. La calidad de la estimación de nivel depende de su contraste con una referencia de banco.

### 8.2 Ciberseguridad en contexto industrial

La solución se plantea en modo de solo lectura respecto del equipo y sin conexión al bus de control del camión. Diseñado con orientación a IEC 62443; no hay cumplimiento declarado.

Diseño. El prototipo firma cada fila con HMAC y usa MQTT local sin TLS. No hay control de acceso por roles en el backend.

## 09 Software y tecnologías a utilizar

La propuesta contempla ESP32-S3 para el nodo, Raspberry Pi o Linux industrial para el gateway, MQTT para comunicación, Python y FastAPI para backend, e InfluxDB para series temporales. El dashboard propio está desarrollado en Astro y Preact. Grafana no se usa en el prototipo.

## 10 Habilidades del equipo

El equipo reúne capacidades de instrumentación, análisis de señales, IA, backend e interfaz de usuario.

| Integrante | Rol propuesto | Capacidades descritas |
|---|---|---|
| Matías Atuan | Hardware, IoT y datos | Diseño del módulo de sensado, integración de sensores y programación de microcontroladores. |
| Pablo Aros | Hardware, datos e IA | Procesamiento de señales, detección de anomalías y estimación de RUL. |
| Sebastián Bravo | Backend y dashboard | APIs, integración de MQTT e InfluxDB y construcción del dashboard. |
| Francisco Fernández | Software e integración | Integración de la plataforma y diseño de la experiencia de usuario. |
