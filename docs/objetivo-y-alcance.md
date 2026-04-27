# Objetivo y alcance

## Para quién es

Estudiantes del **Bachillerato Internacional (IB)** matriculados en **Español A: Literatura, Nivel Medio (NM)**, que se preparan para la **Prueba 1** del examen final.

La Prueba 1 de Español A: Literatura es un **análisis literario guiado de un texto no visto**. El estudiante elige entre dos opciones (de cuatro formas literarias posibles: prosa ficcional, prosa no ficcional, poesía y teatro), responde a una pregunta de orientación o propone un enfoque alternativo, y escribe un comentario analítico bajo condiciones de examen (1 hora 15 minutos, 35 % de la evaluación final, máximo 20 puntos).

La guía de Lengua A: Literatura del IB tiene **primera evaluación en 2026**, así que la app debe alinearse con ese documento (resumen en `modelo-evaluacion.md`).

El destinatario inicial es **NM**. NS queda fuera del alcance: comparte criterios pero su Prueba 1 incluye análisis de los dos textos, dura 2 h 15 min y los descriptores son más exigentes en profundidad analítica.

## Mobile first

Los usuarios son adolescentes que **viven en el móvil**. Cualquier feature debe diseñarse y testearse primero en pantalla pequeña. Una página que solo funciona bien en desktop está rota.

## Qué hace la app

### Componente 1 — Corrector de análisis y plan personalizado

El estudiante sube un análisis propio sobre un texto literario. La entrada incluye:

- **Texto literario** sobre el que se ha trabajado.
- **Pregunta de orientación**.
- **Análisis** escrito por el estudiante.
- **Nivel** (NM por defecto).

La Edge Function `evaluate-analysis` llama a Claude con un prompt calibrado y devuelve:

- **Banda 0-5 por criterio** (A, B, C, D), con justificación tipo examinador.
- **Puntuación total** (0-20) y **nota IB estimada** (1-7) según la tabla oficial.
- **Fortalezas** y **áreas de mejora** concretas.
- **Comentario global** del examinador.
- **Solución anotada**: el análisis del alumno se muestra con highlights de estructura y lenguaje. Cada color tiene leyenda y cada marca muestra el comentario correspondiente al pasar el cursor o enfocar el fragmento.
- **Sugerencias de reescritura de banda alta**: algunas marcas muestran una versión mejorada del fragmento, conservando la voz, las ideas y la estructura del alumno en lugar de reemplazarlo por un ensayo artificial.
- **Feedback estructural detallado** sobre introducción, párrafos y conclusión, usado para generar las marcas sobre el texto.
- **Feedback de lenguaje analítico**: verbos débiles, verbos fuertes, adverbios analíticos e interferencias del inglés.
- **Debilidades detectadas** en formato accionable, para alimentar el plan de estudio (ej. "identifica recursos pero no analiza efectos", "no responde a la pregunta guía", "estructura sin tesis clara", "errores ortográficos recurrentes").

El corrector está calibrado contra ejemplos reales (`ejemplos-correccion.md`). Esto es lo que diferencia la app de un GPT genérico: se comporta como un examinador IB, no como un asistente de redacción.

La corrección queda guardada en Supabase. El historial no conserva solo la nota: también reconstruye el feedback detallado para que el alumno pueda volver a ver la solución anotada de correcciones previas.

### Componente 2 — Diagnóstico inicial y plan de estudio

Un estudiante nuevo realiza:

1. **Autoevaluación de conocimientos** (criterios IB, terminología literaria, estructura del comentario, técnicas de análisis, lectura previa).
2. **Prueba diagnóstica corta** (30-40 min): análisis de un fragmento breve (400-500 palabras). Lo corrige el mismo motor del corrector.
3. **Cuenta atrás hasta el examen** y carga semanal disponible declarada.

A partir de las respuestas y de la prueba diagnóstica, la app calcula:

- Una **nota inicial estimada** por criterio (A, B, C, D).
- Un **mapa de debilidades específicas detectadas**.
- Un **plan de estudio** distribuido en tres etapas que se reparten proporcionalmente al tiempo disponible:
  - Etapa 1 (40 % del tiempo): construcción de la base — bloques 1 a 4 (recursos, historia, vocabulario analítico, describir/analizar/interpretar/evaluar).
  - Etapa 2 (40 %): aplicación y lectura guiada — bloques 5 y 6 (biblioteca de textos curados, microejercicios).
  - Etapa 3 (20 %): simulacros y pulido final.

El plan inicial ya se genera a partir del diagnóstico. La reordenación automática después de nuevos análisis sigue en el roadmap: requiere una Edge Function específica que use las debilidades nuevas para ajustar tareas pendientes.

Los seis bloques pedagógicos están descritos en detalle en `metodologia-pedagogica.md`.

### Capa transversal — Gamificación y progreso

Para sostener motivación a lo largo de los meses de preparación:

- **Niveles** del estudiante en función de los análisis evaluados.
- **Rachas** de práctica (días consecutivos haciendo ejercicios o subiendo análisis).
- **Medallas por criterio** (p. ej. "Maestro del Criterio B" al alcanzar banda 5 dos veces seguidas).
- **Colección de recursos literarios**: cada recurso identificado y aplicado en un análisis se "desbloquea".
- **Panel de progreso por criterio** con tendencia (mejorando, estable, descendiendo).

Esta capa sigue pendiente de implementación. El progreso actual se consulta sobre todo desde historial, plan de estudio y métricas del panel de profesor/admin.

## Qué NO hace la app — alcance fuera

- **No** cubre las otras evaluaciones del IB (Prueba 2, Trabajo Oral Individual, Ensayo HL).
- **No** funciona como traductor o asistente de redacción genérico.
- **No** sustituye al profesor: da feedback automático, no titula al estudiante.
- **No** entrena modelos: solo consume la API de Claude. No hay fine-tuning previsto.
- **No** vende contenido protegido: los textos curados son de dominio público o tienen licencia clara.
- **No** almacena más datos personales que los estrictamente necesarios.

## Roadmap más allá del MVP de NM

Cuando el producto principal esté maduro y validado con usuarios reales, el stack permite crecer hacia:

- **Panel para profesores**: ver evaluaciones de su grupo, identificar patrones, intervenir.
- **App móvil nativa** con React Native (compartiendo lógica con el frontend web).
- **Integración con Google Classroom** o Managebac para que profesores asignen prácticas.
- **Soporte de NS**: reusar el corrector con descriptores más exigentes y dos textos.
- **Otras lenguas A** del IB (Inglés, Francés, etc.), siempre que se calibre el corrector con ejemplos en cada lengua.

Esto no es trabajo del MVP; es contexto para no tomar decisiones que cierren puertas.

## Métricas de éxito iniciales

- Un estudiante puede subir un análisis y obtener una corrección **calibrada** (concordancia de ±1 banda con un examinador IB en los ejemplos calibrados).
- El plan personalizado **identifica al menos un punto débil real** del estudiante en cada uno de los cuatro criterios.
- El estudiante completa al menos **una sesión de microejercicios** entre dos correcciones consecutivas.
- La latencia del corrector está **por debajo de 30 segundos** en un análisis típico de 1000 palabras.
- En el bundle del cliente **no aparece la `ANTHROPIC_API_KEY`** (verificable en Developer Tools).
