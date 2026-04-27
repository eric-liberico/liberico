# Modelo de evaluación

Este documento define cómo el corrector debe evaluar un análisis. Está construido sobre los **documentos oficiales del IB** que están adjuntos al chat 1 del proyecto:

- **Guía de Lengua A: Literatura** (primera evaluación 2026).
- **Diez consejos oficiales del IB para la Prueba 1**.
- **Ejemplos calificados** (Ejemplo A — muy bueno, etc.) facilitados como calibración.

Lo que sigue es la síntesis estructurada de esos documentos más las heurísticas calibradas con los ejemplos de corrección reales (`ejemplos-correccion.md`).

**Estado de implementación (2026-04-27):** `evaluate-analysis` devuelve bandas A/B/C/D y, además, feedback estructurado de introducción, párrafos, conclusión, lenguaje analítico y sugerencias de reescritura. Ese feedback no queda solo como texto separado: se proyecta sobre la solución del alumno en `AnalisisAnotado.tsx` con highlights y comentarios. Para que esto funcione bien, cada observación estructural o sugerencia debe incluir un `fragmento` reconocible del texto del estudiante.

---

## Naturaleza de la tarea — Prueba 1, NM

- **Duración:** 1 hora 15 minutos.
- **Ponderación:** 35 % de la evaluación final del curso.
- **Formato:** se presentan dos pasajes literarios no vistos, de **dos formas literarias distintas** (de entre las cuatro posibles: prosa ficcional, prosa no ficcional, poesía, teatro). El estudiante elige **uno** y escribe un análisis literario guiado.
- **Pregunta de orientación:** cada pasaje va acompañado de una pregunta sobre un elemento técnico o formal. Responder a ella **no es obligatorio**, pero el análisis debe centrarse en un aspecto concreto. El estudiante puede proponer un enfoque alternativo siempre que lo declare desde la introducción y lo sostenga a lo largo del ensayo.
- **Puntuación máxima:** 20 puntos (4 criterios × 5).

> **Importante para el corrector:** la app no debe penalizar a un estudiante por no responder a la pregunta de orientación, **siempre que declare y sostenga un enfoque alternativo coherente**. Esta es una regla oficial del IB.

---

## Los cuatro criterios (5 puntos cada uno)

Resumidos a partir de la guía oficial:

| Criterio | Nombre                       | Qué evalúa                                                                                                                     |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **A**    | Comprensión e interpretación | Comprensión del significado literal, interpretación de las implicaciones, uso de referencias al texto que respalden las ideas. |
| **B**    | Análisis y evaluación        | Análisis de los rasgos textuales y las decisiones del autor, y evaluación de cómo influyen en el significado.                  |
| **C**    | Focalización y organización  | Organización, coherencia y focalización de la presentación de las ideas.                                                       |
| **D**    | Lenguaje                     | Claridad, variedad, corrección gramatical y léxica, adecuación del registro y estilo.                                          |

### Objetivos de evaluación que convergen en la Prueba 1

- **Conocer, comprender e interpretar:** mostrar comprensión de formas literarias y establecer una interpretación propia.
- **Analizar y evaluar:** explorar cómo las decisiones del escritor contribuyen al significado.
- **Comunicar:** escribir un análisis formal, bien organizado y centrado, con lenguaje adecuado.

### Marco conceptual del curso (contexto)

Aunque no se evalúa explícitamente en la Prueba 1, el curso se organiza en torno a:

- **Siete conceptos centrales:** identidad, cultura, creatividad, comunicación, perspectiva, transformación, representación.
- **Tres áreas de exploración:** lectores, escritores y textos; tiempo y espacio; intertextualidad.

El corrector puede invocarlos en su feedback cuando aporte profundidad ("este pasaje conecta con la idea de _perspectiva_…"), pero no debe forzarlos.

---

## Tabla oficial de conversión a nota IB

| Puntuación total | Nota IB |
| ---------------- | ------- |
| 0–3              | 1       |
| 4–6              | 2       |
| 7–9              | 3       |
| 10–12            | 4       |
| 13–15            | 5       |
| 16–18            | 6       |
| 19–20            | 7       |

Esta tabla es la que se ha implementado en la Edge Function. Si en el futuro el IB publica boundaries oficiales por convocatoria, ajustar aquí.

---

## Heurísticas de banda por criterio

Estas heurísticas operacionalizan los descriptores. El corrector debe aplicar su lógica al construir la justificación de cada banda.

### Criterio A — Comprensión e interpretación

- **Banda 5:** Comprensión profunda. La interpretación va más allá de lo literal y capta sutilezas (voz narrativa, contraste tonal, ironía estructural). Referencias al texto precisas y bien atribuidas.
- **Banda 4:** Comprensión sólida con interpretación pertinente. Algún matiz se escapa, sin errores de fondo. Referencias correctas.
- **Banda 3:** Comprensión razonable. Interpretación pertinente del eje de la pregunta, pero con uno o más errores conceptuales (ej. confundir autora con narradora) o lectura insuficiente del cierre.
- **Banda 2:** Comprensión parcial con errores que afectan elementos centrales (atribuir a un personaje lo que dice otro, lectura desviada del clímax).
- **Banda 1:** Comprensión muy limitada o predominantemente errónea.
- **Banda 0:** No alcanza el descriptor de banda 1.

**Errores recurrentes a vigilar (ver `ejemplos-correccion.md`):**

- Identificar a la **narradora con la autora** (error muy frecuente en NM).
- No distinguir entre **voz narrativa adulta y voz infantil** cuando el texto las superpone.
- Inventar relaciones causales que no están en el texto y luego tratarlas como hechos.
- Atribuir mal una cita.
- Lectura desviada del cierre.

### Criterio B — Análisis y evaluación

- **Banda 5:** Análisis penetrante. El estudiante identifica el **mecanismo formal central** del texto y lo articula con el efecto pedido por la pregunta. Cita y comentario están entrelazados.
- **Banda 4:** Análisis sólido de varios recursos con efectos bien explicados, aunque el mecanismo central puede no estar plenamente identificado.
- **Banda 3:** Identifica recursos y a veces conecta con efectos, pero con etiquetas técnicas imprecisas o sin abordar el mecanismo central que pide la pregunta.
- **Banda 2:** Identificación de recursos sin conexión con efectos, o con etiquetas erróneas.
- **Banda 1:** Análisis muy débil o anecdótico.

**Señales de banda baja:**

- Lista de recursos sin explicar **qué hacen al lector**.
- Terminología imprecisa (ej. "narrador autodiegético de focalización interna" como tautología).
- Recursos anunciados en la introducción que **no aparecen** en el desarrollo.
- Citas inexactas que cambian el sentido (ej. "rodeado" por "roído").

**Señales de banda alta:**

- Detectar el **mecanismo central** del texto.
- Conectar varios recursos en una **lectura unificada**, no en una lista paralela.
- Análisis de cambios gramaticales sutiles (artículo indefinido → definido, cambio de tiempo verbal) ligados a efecto.

### Criterio C — Focalización y organización

- **Banda 5:** Estructura clara y orgánica. Tesis explícita en la introducción, desarrollada en el cuerpo y retomada en la conclusión. Cada párrafo con idea controladora.
- **Banda 4:** Buena organización con tesis identificable. Algún párrafo menos cohesionado.
- **Banda 3:** Organización aceptable. Tesis presente pero borrosa o muy general; algunos párrafos divagan; transiciones débiles.
- **Banda 2:** Organización poco clara, con saltos o repeticiones.
- **Banda 1:** Sin estructura discernible.

**Señales:**

- **Sube banda:** introducción con tesis, párrafos que abren con idea controladora, conclusión que retoma los movimientos del análisis.
- **Baja banda:** comentario línea por línea, conclusión proyectiva no sostenida en el texto, repetición de la misma observación con palabras distintas, anuncios estructurales no cumplidos.

En la UI actual, estas señales alimentan las marcas de "Tu solución anotada": verde cuando una decisión estructural está lograda, azul cuando conviene mejorar, rosa cuando afecta seriamente a la organización.

Las sugerencias de reescritura son microintervenciones: no deben crear un ensayo modelo desde cero, sino mostrar cómo una frase o tramo del alumno puede acercarse a banda alta manteniendo su voz, sus ideas y el orden de su argumento.

### Criterio D — Lenguaje

- **Banda 5:** Lenguaje preciso, registro académico sostenido, sintaxis clara, léxico variado y exacto.
- **Banda 4:** Claro y mayormente correcto, con algún error léxico o sintáctico aislado.
- **Banda 3:** Comunicación clara pero con errores recurrentes (conectores imprecisos, calcos del inglés, vocabulario impropio).
- **Banda 2:** Errores frecuentes que afectan la comunicación.
- **Banda 1:** Errores graves y recurrentes.

**Errores típicos a marcar:**

- Calcos del inglés: "_en adición_" (→ "además").
- Régimen preposicional impropio: "condensa la existencia **a** sufrimiento" (→ "**en**").
- "Remachar" como sinónimo de "reforzar".
- Arcaísmos disonantes: "empero", "asaz".
- Construcciones rígidas: "una empatía que es superficial" (→ "una empatía superficial").
- Inconsistencias en formato de citas.

En la UI actual, interferencias del inglés y verbos débiles se marcan directamente sobre el texto. El panel de "Lenguaje analítico" conserva el resumen de verbos fuertes, adverbios útiles y patrones de mejora.

---

## Diez consejos oficiales del IB para Prueba 1

Síntesis de los consejos publicados por el IB, organizados por criterio al que afectan más directamente. Sirven como **señales prácticas** que la app puede detectar al evaluar un análisis.

### Sobre el enfoque (Criterio C)

- **Consejo 1.** El análisis no debe ser un comentario línea por línea. Es un ensayo argumentativo.
- **Consejo 2.** Usar la pregunta de orientación como eje, o declarar un enfoque alternativo formal o técnico desde la introducción y mantenerlo a lo largo del ensayo.
- **Consejo 8.** Adoptar una actitud analítica y crítica, no descriptiva ni narrativa. Resumir o parafrasear el texto en lugar de analizarlo es uno de los errores más comunes.

### Sobre el análisis (Criterio B)

- **Consejo 5.** El énfasis debe estar en **los efectos** de las decisiones del autor sobre el significado, no en la mera identificación de recursos. Es el punto más discriminador entre banda media y banda alta.

### Sobre la interpretación y el uso del texto (Criterio A)

- **Consejo 6.** Se valoran las interpretaciones originales y bien fundamentadas. Las referencias al texto deben ser **específicas y pertinentes**: cada cita sostiene una afirmación.

### Sobre la redacción (Criterios C y D)

- **Consejo 7.** Estilo acorde con las convenciones académicas: estructura clara, puntuación adecuada, párrafos, oraciones enunciativas que guíen al lector.
- **Consejo 9.** Lenguaje claro, preciso y eficaz.

### Sobre la gestión del examen (metacognitivo)

- **Consejo 4.** Dedicar tiempo a leer y planificar antes de escribir. No se evalúa en el producto final, pero es relevante para el módulo de plan de estudio.

### Indicadores resumidos para el corrector

Cuando evalúe un análisis, la app debe detectar (y reportar al estudiante):

1. ¿Hay un enfoque declarado desde la introducción y se sostiene?
2. ¿El estudiante analiza los **efectos** de los recursos o se limita a identificarlos?
3. ¿La interpretación va más allá de lo literal y es original?
4. ¿Las citas del texto son específicas y realmente sostienen las afirmaciones?
5. ¿El registro es académico y el lenguaje preciso?
6. ¿La estructura es ensayística o se ha deslizado hacia el comentario línea por línea o el resumen?

---

## Marco de análisis del texto: paso previo a evaluar

Decisión arquitectónica del corrector: **primero analiza el texto, después evalúa el análisis del estudiante**. No se le pide al modelo que evalúe a ciegas.

Plantilla del marco de análisis:

1. ¿Cuál es el **eje** de la pregunta de orientación (o el enfoque alternativo declarado)?
2. ¿Qué **mecanismo formal central** del texto responde a ese eje?
3. ¿Qué **recursos satélite** lo refuerzan?
4. ¿Qué **errores de comprensión típicos** suele provocar este texto?
5. ¿Qué **citas clave** debería usar una respuesta sólida?

Una vez fijado el marco, se evalúan los cuatro criterios contrastando la respuesta del estudiante con él. Para los textos ya curados (en `data/textos/` cuando se construya la biblioteca), el marco vendrá precalculado por un humano y persistido como parte del texto, no recalculado en cada llamada.

Los ejemplos en `ejemplos-correccion.md` muestran este marco aplicado a _El desentierro de la angelita_ (Mariana Enríquez), _Tarzán_, _Magdalena_ (Fernández Guardia) y _Nadie está solo_.

---

## Calibración

Los tests del evaluador deben verificar que, dado un análisis con bandas conocidas, el corrector devuelve bandas dentro de **±1 banda** de la referencia. No se exige coincidencia exacta porque incluso examinadores humanos varían en ±1; pero variaciones mayores indican deriva del prompt y exigen recalibración.

| Estudiante | Texto           | A   | B   | C   | D   | Total | Nota IB |
| ---------- | --------------- | --- | --- | --- | --- | ----- | ------- |
| Cristina   | Angelita        | 3   | 3   | 3   | 3   | 12    | 4       |
| Cristina   | Nadie está solo | 4   | 3   | 4   | 4   | 15    | 5       |
| Maija      | Angelita        | 2   | 2   | 2   | 3   | 9     | 3       |
| Dylan      | Tarzán          | 3   | 2   | 3   | 3   | 11    | 4       |
| Máximo     | Angelita        | 3   | —   | —   | —   | —     | —       |
| Elena      | Magdalena       | 3   | 3   | 3   | 3   | 12    | 4       |

Detalle banda a banda en `ejemplos-correccion.md`.
