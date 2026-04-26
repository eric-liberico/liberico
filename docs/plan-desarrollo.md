# Plan de desarrollo

Filosofía: cada fase termina con la app **desplegada y usable**. No se construyen archivos vacíos en todas las carpetas — se trae a la vida una pieza completa, se valida con usuarios reales, y se pasa a la siguiente.

---

## Estado actual

**Fase 0 ✅ Completa.** Repo conectado a GitHub, Lovable como entorno de generación inicial, Supabase configurado, frontend desplegado.

**Fase 1 ✅ Completa.** **MVP del corrector funcionando end-to-end:**

- Login/registro con Supabase Auth.
- Página principal del corrector con tres campos (texto, pregunta, análisis).
- Edge Function `evaluate-analysis` que llama a Anthropic (`claude-sonnet-4-5`).
- Panel de evaluación renderiza bandas A/B/C/D con justificación, total, nota IB, fortalezas, áreas de mejora, comentario global.
- Historial guardado en Supabase con RLS activo.

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
4. **Reordenamiento dinámico:** cada vez que el estudiante sube un nuevo análisis al corrector, una Edge Function `actualizar-plan` actualiza las debilidades detectadas y reordena las tareas pendientes.

### Criterio de done

- Un estudiante crea cuenta, completa el diagnóstico, ve un plan en pantalla con cuenta atrás y tareas por etapa.
- El plan se reordena automáticamente al subir nuevos análisis.
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
- **Decidido: `claude-sonnet-4-5`** sobre Opus por relación calidad/coste.
- **Decidido: prompt caching** sobre la parte fija (descriptores oficiales) desde el día uno cuando haya volumen.
- **Decidido: RLS estricto** en todas las tablas con datos de usuario, sin excepciones.
