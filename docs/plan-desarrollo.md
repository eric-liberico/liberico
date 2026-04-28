# Plan de desarrollo

Filosofía: cada fase termina con la app **desplegada y usable**. No se construyen archivos vacíos en todas las carpetas — se trae a la vida una pieza completa, se valida con usuarios reales, y se pasa a la siguiente.

---

## Estado actual (2026-04-29)

**Fase 0 ✅ Completa.** Repo conectado a GitHub, Lovable como entorno de generación inicial, Supabase configurado, frontend desplegado.

**Fase 1 ✅ Completa.** **MVP del corrector funcionando end-to-end:**

- Login/registro con Supabase Auth. Tras signup → `/onboarding` (selección de rol).
- Corrector (`/`) con editor de texto enriquecido Tiptap (negrita, cursiva, subrayado) tanto para texto literario como para análisis.
- Edge Function `evaluate-analysis` llama a `claude-opus-4-7` con prompt caching y registra uso en `llm_uso`. Usa `tool_choice` forzado con JSON Schema para devolver análisis estructural (introducción, párrafos, conclusión) y de lenguaje analítico (verbos débiles, verbos fuertes, adverbios, interferencias del inglés).
- Panel de evaluación: bandas A/B/C/D con justificación, total, nota IB, solución anotada inline (`AnalisisAnotado.tsx` + `generate-rewrite-suggestions`), ensayo elevado a banda 5 bajo demanda (`EnsayoBanda5.tsx` + `generate-band5-essay`), panel de lenguaje analítico (`FeedbackEstructural.tsx`), fortalezas y áreas de mejora. Las sugerencias estructurales, de lenguaje y de reescritura se reflejan directamente sobre el texto con highlights y comentarios.
- Historial en Supabase con RLS activo. El guardado se realiza en `evaluate-analysis`; la ruta `/historial` reconstruye el feedback detallado desde `evaluaciones` (`introduccion`, `parrafos`, `conclusion`, `lenguaje_analitico`, `sugerencias_reescritura`, `ensayo_banda_5`) y normaliza texto/HTML en párrafos legibles. El ensayo elevado se genera y persiste bajo demanda.
- Herramienta de desarrollo `DevLogPanel` para capturar errores de consola, promesas rechazadas y respuestas `fetch` fallidas.
- Validación local de Edge Functions con Deno (`deno task check:edge`, `deno task lint:edge`).

**Fase 2 ✅ Completa.** **Diagnóstico + plan de estudio:**

- Ruta `/onboarding`: paso 0 = selección de rol (alumno/profesor); pasos 1-n = autoevaluación + configuración.
- Edge Function `generate-study-plan` con tool use forzado. Registra `llm_uso`.
- Ruta `/mi-plan`: acordeón por semanas, barra de progreso, cuenta atrás.
- Tablas: `perfiles` (con `rol` y `activo`), `planes_estudio`, `tareas_plan` (RLS en todas).

**Fase 3 ✅ Completa.** **Biblioteca de textos y microejercicios:**

- `textos_biblioteca`: 12 textos canónicos. `textos_vistos`: desbloqueo del marco.
- Ruta `/biblioteca`: exploración por forma literaria, sistema de cerrojo/desbloqueo.
- Corrector acepta `?texto_id=uuid` para pre-rellenar desde la biblioteca.
- Ruta `/ejercicios`: 3 tipos de microejercicios estáticos, ampliados en 2026-04-29.
- **Nota:** `/biblioteca` y `/mi-plan` eliminadas del árbol activo el 2026-04-29. Código documentado en `docs/features-removidas.md`. Las tablas siguen en Supabase.

**Extras completados (fuera del plan de fases original):**

- **Renombrado de marca** — La app y la empresa se llaman **LIBeris** (2026-04-29). Actualizado en UI, títulos y metadatos.
- **Página `/teoria` ampliada** — 6 fichas pedagógicas: movimientos literarios, poesía (con hablante lírico + sinónimos, métrica, encabalgamiento, ejemplos), narratología (historia/discurso, narrador/narratario/pacto ficcional, acción, descripción, tiempo, espacio, personajes, focalización Genette, estilos de discurso, lingüística), teatro (orígenes, Aristóteles, tragedia, seis elementos, tres unidades, Arte nuevo, ironía dramática, tipos de espacio, iluminación), recursos literarios, y nueva ficha de vocabulario de análisis (conectores, verbos analíticos/evaluativos, adverbios, sinónimos, frases de arranque).
- **Panel de profesor** — `/profesor`, `/profesor-alumnos`, `/profesor-alumno.$alumnoId`, `/profesor-chat`. Anotaciones inline (`TextoAnotado`) con dictado (Web Speech API) y reescritura con Claude (`rewrite-feedback`). Chat con Claude como asistente IB (`teacher-chat`).
- **Eliminación de cuenta** — `/cuenta` + edge function `delete-account`.
- **Panel de administración** (Fase 5 parcial) — `/admin` + `/admin-usuarios`. Métricas LLM con gráficos (Recharts), gestión completa de usuarios. 5 edge functions de admin. Audit log. Tablas: `llm_uso`, `llm_precios`, `admin_logs`.
- **Logging de desarrollo** — `DevLogPanel` + `src/lib/devLogger.ts` permiten copiar informes de errores de Safari/Chrome con URL, user agent, timestamps, consola y fallos de red.

A partir de aquí se construye lo demás.

---

## Fase 2 — Diagnóstico inicial y plan de estudio básico

**Objetivo:** un estudiante nuevo realiza una autoevaluación más una prueba diagnóstica corta, y la app le devuelve un plan estructurado por etapas.

### Tareas

1. **Modelo de datos** en Supabase:
   - `perfiles` (nombre, fecha de examen, tiempo semanal disponible).
   - `diagnosticos` (resultado de la autoevaluación + de la prueba diagnóstica corta, debilidades detectadas).
   - `planes_estudio` (etapas, fechas, distribución).
   - `tareas_plan` (tareas individuales con estado).
   - **Cada tabla con RLS activo desde la migración inicial.**
2. **Páginas de Streamlit-equivalent en React**:
   - `Diagnostico.tsx`: cuestionario por pasos de autoevaluación, seguido de prueba diagnóstica corta (análisis de un fragmento de 400-500 palabras) que reusa el motor del corrector.
   - `Plan.tsx`: visualización del plan generado, cuenta atrás al examen, lista de tareas por etapa.
3. **Edge Function `generar-plan`**:
   - Recibe `{ diagnostico, fecha_examen, tiempo_semanal }`.
   - Calcula nota inicial estimada por criterio.
   - Mapea debilidades detectadas → bloques pedagógicos a enfatizar.
   - Distribuye etapas (40 % base / 40 % aplicación / 20 % simulacro).
   - Devuelve plan estructurado y lo guarda en `planes_estudio` + `tareas_plan`.
4. **Reordenamiento dinámico (pendiente):** cada vez que el estudiante suba un nuevo análisis al corrector, una Edge Function `actualizar-plan` deberá actualizar las debilidades detectadas y reordenar las tareas pendientes.

### Criterio de done

- Un estudiante crea cuenta, completa el diagnóstico, ve un plan en pantalla con cuenta atrás y tareas por etapa.
- El plan inicial se genera correctamente. El reordenamiento automático tras nuevos análisis queda pendiente de `actualizar-plan`.
- Las tablas nuevas están protegidas por RLS (verificable abriendo la app con dos cuentas distintas).

---

## Fase 3 — Biblioteca de textos y microejercicios

**Objetivo:** el estudiante puede practicar con textos curados y hacer microejercicios entre análisis completos.

### Tareas

1. **Curación inicial de textos** en `/data/textos/` (o tabla Supabase si se quiere editar desde un panel de admin):
   - Prosa ficcional, prosa no ficcional, poesía, teatro.
   - Por cada texto: fragmento, autor, época, movimiento, **pregunta de orientación**, **marco de análisis** (lo que la app le da al corrector como contexto), **dos ejemplos calibrados** de bandas distintas.
2. **Catálogos** en `/data/`:
   - `recursos_literarios.json`: cada recurso con definición, efecto típico, ejemplos por tipo de texto.
   - `movimientos_literarios.json`: rasgos por movimiento, autores representativos.
3. **Páginas**:
   - `Biblioteca.tsx`: explora textos, abre uno, ve la ficha y la pregunta. Tras analizarlo, desbloquea el marco y los análisis modelo.
   - `Ejercicios.tsx`: tres tipos de microejercicios:
     - **Identificación** del recurso en un fragmento.
     - **Efectos**: emparejar recurso ↔ efecto, o explicar el efecto en una frase.
     - **Reescritura**: pasar de descripción → análisis → interpretación (ver Bloque 4 en `metodologia-pedagogica.md`).

### Criterio de done

- El estudiante puede explorar la biblioteca, abrir un texto, leer su marco de análisis (una vez resuelto el suyo) y hacer microejercicios.
- Hay al menos 12 textos curados (3 por forma literaria) en el lanzamiento.

---

## Fase 4 — Gamificación

**Objetivo:** sostener motivación a lo largo de los meses de preparación.

### Tareas

1. **Modelo de datos en Supabase:**
   - `progreso_bloques` (avance por bloque pedagógico).
   - `medallas` (logros desbloqueados).
   - `coleccion_recursos` (recursos literarios desbloqueados al usarlos correctamente en análisis).
   - `rachas` (días consecutivos de actividad).
2. **Lógica:** Edge Function o lógica en la Edge Function `evaluate-analysis` que, tras cada evaluación, actualice `coleccion_recursos`, `medallas` y `rachas` cuando corresponda.
3. **Componentes visuales:**
   - `GraficoProgreso.tsx`: evolución por criterio en el tiempo (Recharts o equivalente).
   - `PanelMedallas.tsx`.
   - `MapaColeccion.tsx` para los recursos literarios desbloqueados.
4. **Página `Progreso.tsx`** que integra todo lo anterior.

### Criterio de done

- El estudiante ve su nivel, su racha actual, sus medallas, su colección de recursos y un gráfico de evolución por criterio.

---

## Fase 5 — Pulido y lanzamiento

**Objetivo:** la app es presentable a usuarios reales (estudiantes y profesores piloto).

### Tareas

1. **Pulido de UX:** estados de carga, errores claros, mensajes empáticos, vacíos bien gestionados.
2. **Mobile-first revisitado:** prueba intensiva en iOS y Android, viewport pequeño, teclado virtual no rompe layouts.
3. **Documentación de usuario** (no técnica): cómo usar la app paso a paso, idealmente integrada como onboarding la primera vez que se abre.
4. **Política de privacidad:** qué se guarda, qué se manda a la API de Anthropic, qué se borra al cerrar cuenta. Importante porque los usuarios son menores.
5. **Tiers** si se decide cobrar: gratis con N evaluaciones / mes vs ilimitado.
6. **Logging y monitoreo en producción**: errores capturados (Sentry o equivalente), dashboard básico de evaluaciones / día y latencia.
7. **Backup periódico** de la base de datos.
8. **Migración de Lovable a Cursor / Claude Code** si la app ha crecido a 30-40 componentes y Lovable empieza a romper cosas con cada cambio. El repo ya está en GitHub: no hay encierro.

---

## Disciplina entre fases

Tras cada fase, antes de empezar la siguiente:

1. **Pruébalo con al menos un estudiante real.** Mira cómo lo usa, qué le frustra, qué pide.
2. **Revisa el checklist de seguridad** (`docs/workflow-claude-code.md`): API key no expuesta, RLS activo en tablas nuevas, parseo seguro del JSON de Claude.
3. **Mide tiempo de respuesta del corrector.** Si supera 30 segundos en un análisis típico, optimiza antes de añadir más features (prompt caching, modelo, longitud del prompt).
4. **Mira si el plan de estudio es accionable.** Si es genérico, mejora antes de añadir gamificación: si el plan no funciona, las medallas no salvan nada.
5. **Coste mensual real:** comprueba el dashboard de Anthropic y de Supabase. Ajusta rate limit por usuario si las cifras se disparan.

Solo si los cinco están bien, pasa a la siguiente fase.

---

## Decisiones técnicas tomadas y descartadas

Para que Claude Code (y cualquier desarrollador futuro) entienda por qué el stack es el que es:

- **Descartado: Streamlit + Python.** No escala, mal en móvil, gestión de auth torpe.
- **Descartado: arquitectura en capas Python.** Innecesaria con este stack; se sustituye por separación cliente / Edge Functions / RLS.
- **Decidido: Lovable como punto de partida**, con plan de migrar a Cursor / Claude Code cuando la app madure.
- **Decidido: `claude-opus-4-7`** para corrección, reescritura y chat por calidad pedagógica. La decisión se debe revisar con métricas reales de coste si el uso crece.
- **Decidido: prompt caching** sobre la parte fija (descriptores oficiales) desde el día uno cuando haya volumen.
- **Decidido: RLS estricto** en todas las tablas con datos de usuario, sin excepciones.
