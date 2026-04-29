# Features removidas — Mi Plan y Biblioteca

Eliminadas el 2026-04-29. La sección de **Ejercicios** (`/ejercicios`) se mantuvo activa.
El código fue borrado del árbol activo pero la lógica está documentada aquí para facilitar su reintegración.

---

## Mi Plan (`/mi-plan`)

**Ruta:** `src/routes/mi-plan.tsx` (~603 líneas)

**Qué hacía:**

- Mostraba el plan de estudio semanal generado por la Edge Function `generate-study-plan`.
- El alumno podía marcar tareas como completadas (tabla `tareas_plan`).
- Incluía un gráfico de barras de progreso semanal (`GraficoPlan.tsx`) y un gráfico de línea con la evolución de notas por criterio (`GraficoProgresion.tsx`).
- Permitía unirse/salir de la clase de un profesor con código de clase (RPCs `unirse_a_clase`, `salir_de_clase`).
- Podía regenerar el plan llamando de nuevo a `generate-study-plan`.
- Si el perfil no tenía diagnóstico completado redirigía a `/onboarding`.

**Tablas Supabase implicadas:**

- `perfiles` — campo `diagnostico_completado`, `fecha_examen`, `nivel_autoevaluado`, etc.
- `planes_estudio` — un plan por usuario; campo `activo`, `semanas_totales`, `resumen_diagnostico`.
- `tareas_plan` — tareas por semana con `tipo`, `criterio_objetivo`, `duracion_estimada_min`, `completada`.

**Edge Function:** `generate-study-plan` — recibe el perfil del alumno y genera un plan JSON con semanas y tareas. Se llamaba desde onboarding y desde el botón "Regenerar plan" en Mi Plan.

**Componentes usados (que se mantienen porque los usa el panel de profesor):**

- `GraficoPlan.tsx` — barras de progreso semanal.
- `GraficoProgresion.tsx` — líneas de evolución de nota IB y criterios A-D.

---

## Biblioteca (`/biblioteca`) y Ejercicios (`/ejercicios`)

**Rutas:**

- `src/routes/biblioteca.tsx` (~377 líneas)
- `src/routes/ejercicios.tsx` (~1006 líneas)

### Biblioteca

**Qué hacía:**

- Listaba 12 textos canónicos del IB con autor, época, movimiento, forma literaria.
- Cada texto tenía un estado de desbloqueo: el marco de análisis se desbloqueaba cuando el alumno había analizado ese texto en el corrector (tabla `textos_vistos`).
- Vista de detalle (`TextoDetalle`) con fragmento + pregunta de orientación + marco de análisis (lazy, solo al desbloquear).
- Botón "Analizar en el corrector" que navegaba a `/?texto_id=<uuid>`.

**Integración con el corrector (`index.tsx`):**

- El corrector aceptaba `?texto_id=uuid` en la URL para pre-rellenar texto y pregunta desde `textos_biblioteca`.
- Al guardar la evaluación, la Edge Function `evaluate-analysis` registraba una entrada en `textos_vistos`.
- Un banner en el corrector confirmaba que el texto venía de la biblioteca.

**Tablas Supabase implicadas:**

- `textos_biblioteca` — pública (RLS sin restricción de lectura). Campos: `id`, `titulo`, `autor`, `epoca`, `movimiento`, `forma_literaria`, `fragmento`, `pregunta_orientacion`, `marco_analisis`, `orden`.
- `textos_vistos` — por usuario. Campos: `id`, `user_id`, `texto_id`, `created_at`.

**Nota sobre seguridad del marco de análisis:**
El `marco_analisis` era honor system: la query de lista no lo incluía, pero el cliente podía pedirlo directamente. Para una protección real habría que mover `marco_analisis` a una tabla separada con RLS que verifique `textos_vistos`. Ver sección correspondiente en `CLAUDE.md`.

### Ejercicios

**Qué hacía:**

- Cuatro secciones de práctica autónoma (sin IA, datos hardcodeados):
  1. **Identificación** — 5 ejercicios de 3 opciones; el alumno identifica el recurso literario del fragmento.
  2. **Análisis de efectos** — 3 ejercicios; el alumno escribe el efecto y compara con una respuesta de referencia.
  3. **Reescritura** — 3 ejercicios; el alumno transforma una descripción plana en análisis + interpretación.
  4. **Teoría de recursos** — fichas estáticas de ~30 recursos literarios (tropos, repetición, construcción) con definición, ejemplo y efecto típico.
- No usaba Supabase ni IA.

---

## Cambios en archivos existentes al eliminar estas features

### `SiteHeader.tsx`

- Se quitaron los links "Mi plan", "Biblioteca" y "Ejercicios" del nav del alumno.
- Se quitaron los imports de `Library`, `PenLine`.

### `index.tsx` (corrector)

- Se quitó el parámetro `?texto_id` del `validateSearch` y toda la lógica de pre-relleno desde `textos_biblioteca`.
- Se quitó el estado `planEstado` y su `useEffect` (queries a `planes_estudio` y `tareas_plan`).
- Se quitaron los banners de "Texto de la biblioteca pre-cargado" y "Tu plan de estudio / Completa tu diagnóstico".
- Se quitaron los imports de `Link`, `ArrowRight`, `BookOpen`.

### `onboarding.tsx`

- Al finalizar el diagnóstico, en vez de llamar a `generate-study-plan` y navegar a `/mi-plan`, ahora navega directamente a `/`.

---

## Para reintegrar

1. Restaurar los tres archivos de ruta desde el historial de git (`git checkout <hash> -- src/routes/mi-plan.tsx` etc.).
2. Añadir de nuevo los links en `SiteHeader.tsx`.
3. Restaurar el `validateSearch` de `texto_id` en `index.tsx` y los banners.
4. Restaurar la llamada a `generate-study-plan` en `onboarding.tsx`.
5. Verificar que las tablas `textos_biblioteca`, `textos_vistos`, `planes_estudio`, `tareas_plan` siguen activas en Supabase (no se tocaron, son solo datos).
