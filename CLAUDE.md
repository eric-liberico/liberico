# CLAUDE.md

Este fichero da contexto a Claude Code para trabajar en este repositorio. **Léelo siempre antes de generar o modificar código.** Cuando trabajes en un área concreta (corrector, diagnóstico, plan, biblioteca, gamificación, UI…), consulta también el documento correspondiente en `docs/`.

---

## Qué es este proyecto

Aplicación web para estudiantes de **IB Language A: Literature (Español A y English A)**, Nivel Medio, centrada en **Prueba 1** (análisis literario guiado de un texto no visto) + **Prueba 2** (ensayo comparativo) + **Oral Individual**. Primera evaluación oficial en 2026. Soporta cambio dinámico entre asignaturas.

### Soporte multiasignatura (2026-05-04) ✅

- Estructura: `course_key` (`spanish-a-literature` | `english-a-literature`) + `nivel` (NM | HL)
- UI completamente bilingüe usando patrón `isEN = courseKey === "english-a-literature"`
- Todas las rutas de alumno filtran por `course_key` en queries Supabase
- Selector de asignatura: `/asignaturas` con cambio dinámico (recarga `useAuth` y limpia estado)

Dos componentes principales:

1. **Corrector + plan personalizado.** El estudiante sube un análisis propio. La app lo evalúa según los cuatro criterios oficiales del IB (A, B, C, D), asigna bandas y nota estimada, identifica puntos débiles concretos y ajusta su plan de estudio.

2. **Diagnóstico inicial + plan de estudio.** El estudiante hace una autoevaluación más una prueba diagnóstica corta. La app genera un plan adaptado a su nivel y a la fecha de examen, con seis bloques pedagógicos secuenciales (recursos literarios → historia literaria → vocabulario analítico → describir/analizar/interpretar/evaluar → biblioteca → práctica).

Los usuarios son adolescentes: **la app debe funcionar de manera impecable en móvil**.

Detalle completo en `docs/objetivo-y-alcance.md`.

---

## Stack

**Frontend**

- **React + TypeScript** (estricto, `"strict": true`)
- **Tailwind CSS** + **shadcn/ui** como sistema de componentes
- **TanStack Router** con file-based routing en `src/routes/`
- Bundler: `@lovable.dev/vite-tanstack-config` (Vite bajo el capó)

**Backend**

- **Supabase** (proyecto: `tlspxuwiakcrhshwvjeo`): Auth + Postgres + Edge Functions
- **Row Level Security (RLS)** activo en **toda** tabla con datos de usuario, sin excepciones

**IA**

- API de **Anthropic** — modelo `claude-opus-4-7`
- Llamada **siempre desde Edge Functions de Supabase**, nunca desde el cliente
- **Prompt caching activado** en las Edge Functions que llaman a Anthropic (parte estática del system prompt con `cache_control: { type: "ephemeral" }`)
- `ANTHROPIC_API_KEY` exclusivamente en secrets de Supabase Edge Functions

**Despliegue**

- Frontend: Lovable / Cloudflare (repo en GitHub: `EricPR1/ib-lit-coach`)
- Backend: Supabase Cloud, proyecto `tlspxuwiakcrhshwvjeo`
- CLI: `supabase` vinculado al proyecto de producción

Detalle de arquitectura, carpetas y flujo de datos: `docs/arquitectura.md`.

---

## Estado actual

**Fase 1 ✅** — Corrector end-to-end. Evaluación con bandas A/B/C/D, nota IB, fortalezas, áreas de mejora, solución anotada con feedback estructural y de lenguaje, e historial completo en Supabase.

**Fase 2 ✅** — Onboarding + diagnóstico inicial + plan de estudio personalizado.

- Rutas: `/onboarding`, `/mi-plan`.
- Edge Function `generate-study-plan` genera un plan por semanas según el perfil del estudiante.
- Tablas: `perfiles`, `planes_estudio`, `tareas_plan`.
- **Nota:** `/mi-plan` y `/biblioteca` fueron eliminadas del árbol activo el 2026-04-29. La lógica está documentada en `docs/features-removidas.md` para facilitar su reintegración. Las tablas (`planes_estudio`, `tareas_plan`, `textos_biblioteca`, `textos_vistos`) siguen activas en Supabase.

**Fase 3 ✅** — Biblioteca de textos y microejercicios.

- Rutas originales: `/biblioteca`, `/ejercicios` (biblioteca eliminada, ejercicios activo).
- 12 textos canónicos con marco de análisis desbloqueado al analizar el texto en el corrector.
- El corrector aceptaba `?texto_id=uuid` para pre-rellenar desde la biblioteca (lógica eliminada, documentada en `features-removidas.md`).
- Tablas: `textos_biblioteca` (pública), `textos_vistos` (por usuario).
- Microejercicios activos en `/ejercicios`: identificación de recursos, análisis de efectos, reescritura — ampliados con más ejercicios en 2026-04-29.

**Extras completados (fuera de fases):**

- **Feedback detallado del corrector e historial completo** — `EvaluacionPanel` (P1) y `EvaluacionPrueba2Panel` (P2) implementan un flujo de **dos llamadas Opus explícitas** (un único botón "Dame feedback completo"):
  - **Llamada 1** → `generate-analysis-extras` (P1) / `generate-paper2-extras` (P2): genera análisis estructural (intro/párrafos/conclusión/lenguaje analítico) + micro-reescrituras localizables en una sola llamada Opus (~100s). Las anotaciones aparecen en pantalla en cuanto termina.
  - **Llamada 2** → `generate-band5-essay` (P1) / `generate-band5-essay-p2` (P2): genera el ensayo completo de banda alta (~40s). Reutiliza si `ensayo_banda_5.texto` ya existe.
  - **No hay auto-triggers**: `AnalisisAnotado`, `EnsayoAnotadoPrueba2`, `EnsayoBanda5` y `EnsayoBanda5Prueba2` son componentes de display puro; no hacen llamadas a la API por sí solos.
  1. `AnalisisAnotado.tsx` — muestra el texto del alumno con highlights estructurales (de lenguaje) y tooltips de reescritura superpuestos. Solo se activa `mostrarAnotaciones=true` cuando el feedback completo es visible. Usa tooltips CSS, no Radix Tooltip.
  2. `EnsayoBanda5.tsx` — display puro: renderiza `ensayo_banda_5` cuando existe, devuelve `null` si no.
  3. `FeedbackEstructural.tsx` — panel de lenguaje analítico (verbos débiles, interferencias del inglés, etc.).
  4. `TextoLectura.tsx` + `src/lib/textFormatting.ts` — normalizan HTML y texto plano en párrafos legibles.
  - La edge function `evaluate-analysis` usa `tool_choice` forzado con JSON Schema completo. Los objetos `ELEMENTO_SCHEMA` y `EVAL_TOOL` están tipados como `Record<string, unknown>`.
  - El guardado del historial se hace en la Edge Function. `evaluaciones` persiste bandas, comentario global, `introduccion`, `parrafos`, `conclusion`, `lenguaje_analitico`, `sugerencias_reescritura` y `ensayo_banda_5` como JSONB.
  - Las funciones antiguas `generate-rewrite-suggestions`, `generate-analysis-feedback`, `generate-paper2-feedback` y sus equivalentes P2 siguen en producción pero ya no se llaman desde el flujo principal (backward compat).
  - El diagnóstico inicial llama a `evaluate-analysis` con `guardar_historial: false`.
  - En desarrollo, `DevLogPanel` captura errores de consola, `unhandledrejection` y respuestas `fetch` fallidas para copiar un informe de depuración.

- **Panel de profesor** — Rutas `/profesor`, `/profesor-alumnos`, `/profesor-alumno.$alumnoId`, `/profesor-chat`, `/profesor-sesiones`. El profesor ve el historial de sus alumnos, puede anotar fragmentos del análisis del alumno con `TextoAnotado.tsx` (anotaciones inline con offsets de texto plano), dictar comentarios con `useDictado` (Web Speech API) y reescribirlos con Claude (`rewrite-feedback` edge function). Chat de consultas con Claude como asistente IB. En `/profesor-sesiones` gestiona disponibilidad, ve reservas 1:1, abre el enlace de Google Meet cuando la sincronización de Calendar funciona y guarda notas post-sesión visibles para el alumno.

- **Eliminación de cuenta** — Ruta `/cuenta`. Cualquier usuario autenticado puede eliminar permanentemente su propia cuenta (confirmación con texto "eliminar") vía edge function `delete-account`.

- **Editor de texto enriquecido** — `RichTextEditor.tsx` con Tiptap (MIT). El corrector acepta negrita, cursiva y subrayado tanto en el análisis del estudiante como en el texto literario. La edge function recibe texto plano; historial y paneles usan `TextoLectura` / `textFormatting` para mostrarlo en párrafos legibles.

- **Selección de rol en registro** — Tras signup se redirige a `/onboarding` (paso 0 = selección alumno/profesor) en lugar de al corrector directamente.

- **Panel de administración** ✅ (Fase 5 parcial) — Rutas `/admin`, `/admin-usuarios`, `/admin-bookings`. Solo accesible con `rol = 'admin'`. Incluye:
  - KPIs: peticiones totales, tokens, coste estimado (USD), usuarios activos en período.
  - Gráfico de evolución diaria (Recharts).
  - Desglose por función y por modelo.
  - Top 20 usuarios por consumo.
  - Filtro por rango de fechas.
  - Tabla de usuarios con búsqueda + filtro por rol, paginación, y acciones: cambiar rol, activar/desactivar, resetear contraseña (genera enlace), eliminar cuenta.
  - Lista de reservas 1:1 con alumno, profesor, horario, ingresos, enlace de Meet y estado/error de sincronización con Google Calendar.
  - Audit log en `admin_logs`.
  - Todas las edge functions instrumentadas para registrar uso LLM en `llm_uso`.
  - Tablas: `llm_uso`, `llm_precios`, `admin_logs`. Campo `activo` añadido a `perfiles`.

- **Sesiones 1:1 con Google Meet/Calendar** — Ruta de alumno `/reservar-sesion`, ruta de profesor `/profesor-sesiones`, ruta admin `/admin-bookings`. `create-booking` crea la reserva confirmada, bloquea el slot, da acceso temporal al historial si hay consentimiento e intenta crear un evento de Google Calendar con Meet. Guarda `meet_link`, `calendar_event_id`, `calendar_id`, `calendar_sync_status`, `calendar_sync_error` y `calendar_synced_at`. Configuración: secreto `GOOGLE_SERVICE_ACCOUNT_JSON`; si se usa delegación de dominio, poner `GOOGLE_CALENDAR_IMPERSONATE_TEACHER=true` para crear el evento en el calendario primario del profesor. Sin delegación, `teacher_profiles.calendar_email` debe apuntar a un calendario compartido con el service account. Al cancelar desde admin, `confirm-booking` intenta borrar el evento y liberar el slot.

- **Renombrado de marca (2026-04-29)** — El nombre de la empresa y de la app es **LIBerico**. Actualizado en `SiteHeader.tsx`, títulos de página de todas las rutas, metadatos OG, y `devLogger.ts`. No hay cambios en IDs de Supabase ni en el repo de GitHub.

- **Página `/teoria` ampliada (2026-04-29)** — Seis fichas pedagógicas:
  1. **Movimientos literarios** — Del Romanticismo al Boom latinoamericano.
  2. **Poesía** — Hablante lírico + sinónimos (yo poético, yo lírico, voz poética, voz lírica, tú poético, tú lírico), cómputo silábico, isosilábico/anisosilábico, verso esticomítico, tipos de encabalgamiento, soneto de Quevedo, romance Abenámar.
  3. **Narratología** — Historia vs discurso, narrador/narratario/pacto ficcional, la acción (in medias res, in extrema res, final abierto, digresión, contrapunto), descripción (prosopografía/etopeya + tabla de funciones), tiempo (anacronías, tabla de anisocronías), espacio (objetivo/subjetivo-reflejo/ambiente), personajes (Forster plano/redondo, monólogo interior, corriente de conciencia), narrador y punto de vista (tabla hetero/homodiegético, perspectiva temporal, tabla de focalización Genette), estilos de discurso (directo/indirecto/indirecto libre), aspectos lingüísticos (hipotaxis/parataxis, tiempos verbales).
  4. **Teatro** — Orígenes dionisíacos, Aristóteles/Poética, definición de tragedia, seis elementos (tabla mito/ethos/dianoia/lexis/melos/opsis), hamartia/catarsis/hybris, regla de las tres unidades, Arte nuevo de hacer comedia, ironía dramática (situacional/verbal/trágica), estructura dramática, tipos de espacio (tabla teatro a la italiana/arena/isabelino/corral), iluminación.
  5. **Recursos literarios en el examen IB** — Cómo analizar (no solo identificar), errores frecuentes, estructura de respuesta.
  6. **Vocabulario de análisis literario** — Conectores del discurso (9 categorías), verbos analíticos (7 categorías), verbos evaluativos (5 categorías), adverbios evaluativos (6 categorías), sinónimos imprescindibles (10 palabras clave), frases de arranque por sección del ensayo.
     La grid de tarjetas usa `lg:grid-cols-3` para acomodar las seis fichas.

**Prueba 2 ✅ completo (2026-04-30)** — Módulo separado de Prueba 1:

- Rutas: `/prueba-2` (formulario), `/historial-prueba-2` (historial).
- Edge Function `evaluate-paper2`: prompt caching, `tool_choice` forzado (`registrar_evaluacion_prueba2`), 5 criterios (A, B1, B2, C, D) sobre 25, diagnóstico comparativo (5 elementos con estado/fragmento/evaluacion/sugerencia), 4-8 anotaciones localizables priorizadas.
- Tabla `evaluaciones_prueba2` con RLS. Índice por `(user_id, created_at DESC)`. Columnas JSONB: `diagnostico_comparativo`, `anotaciones`, `sugerencias_reescritura`, `ensayo_banda_5`.
- RPC `reservar_cuota_prueba2` con `pg_advisory_xact_lock` (cuota diaria independiente de P1, máximo 8/día).
- Componente `EvaluacionPrueba2Panel.tsx` — mobile-first. Muestra nota /25 y nota IB estimada /7 (`notaIBPrueba2`). No reutiliza `EvaluacionPanel` de P1.
- Tipos en `src/lib/ib-paper2.ts` (`CRITERIOS_PRUEBA2`, `EvaluacionPrueba2`, `DiagnosticoComparativoPrueba2`, `AnotacionPrueba2`, `SugerenciaReescrituraPrueba2`, `EnsayoBanda5Prueba2`, `notaIBPrueba2`).
- No almacena obras completas protegidas. Notas opcionales del alumno: máximo 8000 chars/obra.
- Navegación del alumno: "Prueba 1" + "Prueba 2" en la barra; "Historial P2" en el dropdown de usuario.
- **Ensayo anotado P2** (`EnsayoAnotadoPrueba2.tsx`) — mismo algoritmo de fuzzy matching que `AnalisisAnotado.tsx`. Criterios A/B1/B2/C/D en colores + reescrituras en teal. CSS tooltips, sin Radix Tooltip. Display puro: renderiza anotaciones y reescrituras desde props; no llama a la API por sí solo.
- **Ensayo elevado a banda alta P2** (`EnsayoBanda5Prueba2.tsx`) — display puro con fallback individual. Texto completo colapsable, grid 3 columnas (se conserva / se transforma / criterios que suben). Generado como segunda llamada desde `EvaluacionPrueba2Panel` vía `generate-band5-essay-p2`. Botón propio visible como fallback para evaluaciones antiguas sin ensayo. Reutiliza si `ensayo_banda_5.texto` ya existe.
- **Historial unificado** (`/historial`) — portal actualizado con tres bloques clicables (P1, Oral, P2). P1 despliega lista inline; Oral navega a `/historial-oral`; P2 navega a `/historial-prueba-2`.

**Oral Individual ✅ MVP completo (2026-05-01)** — Módulo para el Trabajo Oral Individual:

- Rutas: `/oral` (formulario + guía pedagógica con tabs), `/historial-oral` (historial).
- Edge Function `evaluate-oral`: prompt caching, `tool_choice` forzado (`registrar_evaluacion_oral`), 4 criterios (A/B/C/D) sobre 10 cada uno = 40 total. Estima duración (guion ÷ 135 ppm). Genera diagnóstico del asunto global (definición/especificidad/uso como lente), equilibrio entre obras (extracto_1/obra_1/extracto_2/obra_2) y estructura (apertura/progresión/transiciones/cierre). Para modalidad `taught`: 5-8 preguntas del profesor con respuestas modelo. Para `self_taught`: 4-6 zonas de desarrollo autónomo.
- Tabla `evaluaciones_oral` con RLS. Columna generada `puntuacion_total`. Índice `(user_id, created_at DESC)`. RPC `reservar_cuota_oral` con `pg_advisory_xact_lock` (5/día, independiente de P1/P2).
- `notaIBOral` en `src/lib/ib-oral.ts`: 0-6→1, 7-12→2, 13-18→3, 19-23→4, 24-28→5, 29-33→6, 34-40→7.
- Componentes: `EvaluacionOralPanel.tsx` (mobile-first, diagnósticos expandibles, alertas de duración), `GuiaOral.tsx` (guía pedagógica estática).
- Contenido pedagógico estático en `src/lib/oral-guide-content.ts`: 5 campos de indagación IB con ejemplos buenos/débiles, 3 ejemplos de introducción con comentario, minutajes taught/self_taught.
- Navegación: "Oral" en el header con ícono `Mic`; "Historial Oral" en el dropdown de usuario.

**Mejoras adicionales ✅ (2026-05-01):**

- **Transcripción de imagen/PDF a texto** — `ImageUploadButton.tsx` (botón cámara reutilizable en P1, P2 y Oral). Acepta JPG/PNG/WebP/HEIC/PDF hasta 8 MB. Convierte a base64 en cliente, llama a edge function `transcribe-image` (Haiku 4.5, límite 20/día). Muestra dialog editable con el texto transcrito antes de insertarlo. PDF usa bloque `document` con header `anthropic-beta: pdfs-2024-09-25`. Tabla `llm_precios` actualizada con ID completo `claude-haiku-4-5-20251001`.

- **Juego del Quijote en llamadas secundarias** — `EnsayoBanda5.tsx` y `EnsayoBanda5Prueba2.tsx` muestran `<JuegoEsperaEvaluacion>` mientras generan el ensayo de banda 5 (antes solo spinner en botón).

- **Sugeridor de asunto global para el Oral** — `SugeridorOral.tsx` + edge function `suggest-oral-topics`. Al entrar en `/oral`, el alumno puede describir sus intereses y recibir 3 sugerencias (asunto global + par de obras + justificación pedagógica). Puede omitir este paso y rellenar el formulario directamente. Usa `tool_choice` forzado; muestra `<JuegoEsperaEvaluacion modo="oral">` durante la carga.

- **Biblioteca de textos P1** — Ruta `/biblioteca` con tabs Poema/Prosa/Teatro. Tabla `textos_practica_p1` (RLS: lectura autenticados, escritura admin). Edge function `generate-practice-text` (solo desde admin) genera textos de práctica estilo IB (~200-300 palabras) + pregunta de orientación NM. Panel de admin (`/admin`) sección "Biblioteca P1": generar texto, toggle activo/inactivo, eliminar. Enlace en bloque "Practicar" del dashboard del alumno. Al seleccionar un texto, navega a `/prueba-1?texto_id=uuid` con texto y pregunta pre-rellenados.

- **Selector de preguntas de Prueba 2** — `SelectorPreguntaP2.tsx` (popover con búsqueda). Tabla `preguntas_prueba2` con 170 preguntas extraídas de past papers oficiales, ordenadas alfabéticamente. Botón junto al campo "Pregunta" en `/prueba-2`; al seleccionar, pre-rellena el campo.

**Recalibración del corrector Paper 1 English A ✅ (2026-05-04)** — Tras detectar que un ensayo oficial 20/20 SL recibía 11/20, se reescribió `PAPER1_BASIC_EN` en `supabase/functions/_shared/prompts/english-a-literature.ts`. El bloque de criterios pasó de cuatro descriptores de una sola oración a tablas banda-por-banda (5/4/3/2/1) para A, B, C y D, con anclajes de calibración inline derivados del estándar oficial del IB. Se añadió un "Fairness principle" explícito que instruye no penalizar por imperfecciones tolerables en banda 5 (interpretación "fairly convincing", análisis selectivo, "occasional shifts" del enunciado, prosa "for the most part fluent"). Cambio aislado a P1 EN; Spanish A, Paper 2 EN y Oral EN sin cambios.

**English A: Literature UI Translation ✅ (2026-05-04)** — Soporte completo para English A:

- Todas las rutas de alumno completamente bilingües usando patrón `isEN = courseKey === "english-a-literature"`
- Traducidos: prueba-1.tsx, prueba-2.tsx, oral.tsx, historial.tsx, historial-prueba-2.tsx, historial-oral.tsx, SiteHeader.tsx, GraficoProgresoIB.tsx, RichTextEditor (word counter), SugeridorOral.tsx, GuiaOral.tsx, oral-guide-content.ts
- Header: "Tutorial" → "Tutoring"; dropdown: "My courses" → /asignaturas, "My account", "Logout" (all bilingual)
- Back buttons: "Back to my assessments" en P2 y Oral history
- **Nota:** Ejercicios y Teoría contienen contenido pedagógico en español (recursos literarios españoles, narratología española). Capability gates eliminados (2026-05-04) para permitir acceso a ambas asignaturas; contenido no está traducido pero es navegable.

**Spanish B foundations ✅ (2026-05-07)** — Phase 1 del roadmap de Spanish B (Language B). Cambios estructurales sin features de usuario:

- **Abstracción de criterios** en `src/lib/criteria/` (`types.ts`, `spanish-a-literature.ts`, `index.ts`). Tipo `CriteriaSet` con criterios bilingües (`nameEs`/`nameEn`), `IBScaleBand` para conversión a nota IB, dispatcher `getCriteriaSet(course, paper)`. Lit P1/P2/Oral migrados; los exports legacy (`CRITERIOS`, `CRITERIOS_PRUEBA2`, `CRITERIOS_ORAL`, `notaIB*`) re-exportan desde el nuevo módulo sin cambios en consumidores.
- **Hook `useUiLang()`** (`src/hooks/useUiLang.ts`): resuelve el idioma de UI activo. Default por curso (`COURSES[k].defaultUiLang`), override del alumno persistido en localStorage (`liberico.uiLang.{courseKey}`). `useUiLangControl()` expuesto para futuro toggle. `COURSES` ahora declara `defaultUiLang` y `supportedUiLangs`.
- **Migración de `isEN`**: 33 ficheros refactorizados de `courseKey === "english-a-literature"` a `useUiLang() === "en"`. Comportamiento idéntico hoy entre Spanish A y English A; cuando llegue Spanish B, su UI por defecto será inglés sin tocar componentes.
- **Migración SQL** (`20260507100000_phase1_spanish_b_foundations.sql`, aplicada a producción `tlspxuwiakcrhshwvjeo`): inserta curso `spanish-b-language` con `is_active=false` (oculto en UI hasta Phase 2 vía RLS); columna `criteria_scores JSONB` en `evaluaciones`/`evaluaciones_prueba2`/`evaluaciones_oral` para sets de criterios fuera de `banda_a/b/c/d`; columna `course_key` en `llm_uso` con índice compuesto para futuras cuotas por curso.
- **No incluido (intencionalmente)**: `CourseKey` no se ha extendido en TS — al hacerlo `/asignaturas` mostraría Spanish B sin features. Se hará en Phase 2 cuando exista el corrector de Paper 1. Las RPCs de cuota (`reservar_cuota_evaluacion`, `_prueba2`, `_oral`) tampoco se generalizaron — siguen filtrando por `edge_function`. La generalización a `(user_id, course_key, paper, limite)` ocurre cuando Spanish B entre en producción.
- Roadmap completo en `/Users/erickvist/.claude/plans/you-are-reviewing-a-vast-boole.md`. Tareas pendientes en `TASKS_TO_DO.md` sección "Spanish B (Language B)".

**Spanish B Paper 1 MVP ✅ (2026-05-08)** — Phase 2 del roadmap. Curso jugable end-to-end:

- **Datos**:
  - `CourseKey` extendido con `"spanish-b-language"` en `src/lib/ib-courses.ts` y `supabase/functions/_shared/courses.ts`. `COURSES["spanish-b-language"]` con `defaultUiLang="en"`, `supportedUiLangs=["en","es"]`, capabilities con `paper1Enabled=true` y resto `false`.
  - `src/lib/criteria/spanish-b-language.ts` define el set de Spanish B P1 (A Lenguaje /12, B Mensaje /12, C Comprensión conceptual /6, total /30) + escala IB aproximada + labels bilingües de los 11 tipos de texto y los 5 temas oficiales.
  - Migración `20260507200000_phase2_spanish_b_paper1.sql`: tabla dedicada `evaluaciones_paper1_b` con RLS per-usuario, tabla `prompts_paper1_b` con RLS (read activos por authenticated, write admin), RPC genérica `reservar_cuota_paper(user, course, paper, limite, edge_fn, modelo)` con advisory lock, columna `paper` en `llm_uso` para cuotas por papel.
  - Migración `20260508100000_activate_spanish_b.sql`: `courses.spanish-b-language.is_active=true`, 3 prompts seed activados.
- **Edge Function `evaluate-paper1-b`** (deployada): system prompt cacheado (variantes ES/EN según `uiLang` del payload), `tool_choice` forzado (`registrar_evaluacion_b1`), validación de bandas con clamp, errores de lengua (3-6) + apropiación tipo de texto (2-4), límite 15/día por (user, course, paper). Inserta en `evaluaciones_paper1_b` con `feedback_lang`. Gamificación reusa `procesarGamificacion` mapeando `nota_ib → banda_a..d` sintética.
- **Prompts Spanish B** (`supabase/functions/_shared/prompts/spanish-b-language.ts`): `PAPER1_B_BASIC_ES` y `PAPER1_B_BASIC_EN`, banda-por-banda parafraseado del IB Language B Guide (no verbatim), principio de equidad explícito, guía de extensión (250–400 palabras SL). **Estado: DRAFT sin calibrar.** Antes de mostrar puntuaciones a alumnos reales, validar con 5–8 anchors hand-marked y ±1 banda de acuerdo.
- **Hook `buildSystemPrompt`** ahora acepta `uiLang` (opcional para Lit, derivado de courseKey; obligatorio en práctica para Spanish B). `nivelContext` corta-circuita Spanish B (SL-only).
- **UI**:
  - `SpanishBPaper1View` (`src/components/`): formulario con dropdown de prompts del catálogo + opción "write my own" con selectores de tipo y tema, textarea con recuento de palabras en vivo y avisos fuera de 250-400, botón submit. Resultado inline: total /30, IB /7, tarjetas A/B/C, comentario global / fortalezas / áreas, errores de lengua con badge de categoría, apropiación del tipo de texto. Toggle EN/ES dentro del header del componente.
  - `SpanishBHistoryView` (`src/components/`): lista de evaluaciones desde `evaluaciones_paper1_b`, cards colapsables con score y nota IB; expandir muestra criterios, justificaciones, feedback, prompt usado.
  - `/prueba-1` y `/historial`: dispatcher por courseKey — Spanish B renderiza la vista propia, Lit conserva la página completa (hooks rules respetadas).
  - `/asignaturas`: TEXTS amplía a 3 cursos; stats query branch para Spanish B (lee `evaluaciones_paper1_b`, P2 y Oral fijos a 0).
  - `SiteHeader`: nav items gateados por `capabilities` (paper2Enabled, oralEnabled, exercises, theory, etc.). Para Spanish B desaparecen Paper 2, Oral, Practice dropdown completo.
  - `useUiLang` reescrito con `useSyncExternalStore` + event-bus en módulo: el toggle EN/ES propaga el cambio inmediato a todos los consumidores en la misma pestaña (antes cada hook tenía estado independiente).
- **Lo que NO está hecho**: calibración real (anchors), más estímulos en el catálogo (hay 3 placeholder), panel admin para gestionar prompts de B, generalización de los `isEN ? "EN" : "ES"` ternarios fuera del nav (≈64 ocurrencias siguen activas; cuando `isEN` se calcula desde `useUiLang`, Spanish B con UI en español ve el ramal ES, lo cual es lo correcto para esos textos).

**Fase 4 ✅ — Gamificación (2026-05-01):** racha diaria, puntos XP, 15 logros/medallas.

- Migración `supabase/migrations/20260502100000_gamificacion.sql`: 4 columnas nuevas en `perfiles` (xp_total, racha_actual, racha_maxima, ultima_actividad_fecha), tablas `logros_catalogo` y `logros_desbloqueados` con RLS.
- Módulo compartido `supabase/functions/_shared/gamificacion.ts`: `procesarGamificacion()` — no-fatal, ejecuta al final del happy path de las 3 edge functions de evaluación. XP base P1=30, P2=40, Oral=50; bonus +20/+30 para nota IB≥6/7. Racha: null→1, misma fecha→sin cambio, ayer→+1, antes→reset 1.
- 15 logros en 4 categorías (comienzo, constancia, calidad, cobertura). Desbloqueados con `ON CONFLICT DO NOTHING` para idempotencia.
- Hook `src/hooks/useGamificacion.ts`: queries perfiles + logros_desbloqueados con join a logros_catalogo.
- Componentes `src/components/gamificacion/`: `TarjetaRacha.tsx`, `BarraXP.tsx` (8 niveles del Siglo de Oro: Lazarillo→Juglar→Galán→Hidalgo→Gongorino→Quevedesco→El Fénix→Cervantes; nivel real = min(nivelPorXP, nivelPorNota)), `LogroCard.tsx`, `PanelLogros.tsx`, `ToastLogro.tsx`.
- `TarjetaRacha` y `BarraXP` en dashboard (`/`). `PanelLogros` en historial (`/historial`). `ToastLogro` en los 3 paneles de evaluación.

**Fase 5 — Pendiente (resto):** pulido UX, mobile, política de privacidad, tiers.
**Fase 5 — Pendiente (resto):** pulido UX, mobile, política de privacidad, tiers.

Hoja de ruta detallada: `docs/plan-desarrollo.md`.

---

## Modelo de evaluación

El corrector aplica los cuatro criterios oficiales del IB para Prueba 1, NM. Cada criterio puntúa 0-5; total 0-20.

**Tablas de conversión a nota IB (1-7) — actualizadas 2026-05-03:**

**Prueba 1 /20:**

| Puntuación total | Nota IB |
| ---------------- | ------- |
| 0–2              | 1       |
| 3–5              | 2       |
| 6–8              | 3       |
| 9–10             | 4       |
| 11–13            | 5       |
| 14–15            | 6       |
| 16–20            | 7       |

**Prueba 2 /25:**

| Puntuación total | Nota IB |
| ---------------- | ------- |
| 0–2              | 1       |
| 3–6              | 2       |
| 7–9              | 3       |
| 10–13            | 4       |
| 14–17            | 5       |
| 18–21            | 6       |
| 22–25            | 7       |

**Oral /40:**

| Puntuación total | Nota IB |
| ---------------- | ------- |
| 0–6              | 1       |
| 7–12             | 2       |
| 13–18            | 3       |
| 19–23            | 4       |
| 24–28            | 5       |
| 29–33            | 6       |
| 34–40            | 7       |

**Nota final IB compuesta (P1×35/20 + P2×35/25 + Oral×30/40, total /100):**

| Puntuación compuesta | Nota IB |
| -------------------- | ------- |
| 0–11                 | 1       |
| 12–26                | 2       |
| 27–40                | 3       |
| 41–53                | 4       |
| 54–68                | 5       |
| 69–81                | 6       |
| 82–100               | 7       |

Los descriptores oficiales, los diez consejos del IB y el marco conceptual del curso están en `docs/modelo-evaluacion.md`.

**Importante:** los ejemplos calibrados (Cristina, Maija, Dylan, Máximo, Elena) en `docs/ejemplos-correccion.md` son **ground truth** del corrector. La Edge Function debe replicar sus bandas dentro de ±1.

---

## Convenciones críticas

Detalle completo en `docs/convenciones.md`. Resumen:

- **Idioma de UI, código, comentarios y commits: español.** El dominio (criterios IB, recursos literarios) está en español; la coherencia evita traducciones mentales.
- **TypeScript estricto** (`"strict": true` en `tsconfig.json`). `npx tsc --noEmit` debe pasar.
- **ESLint + Prettier** sin warnings antes de comitear.
- **Deno 2.x** para validar Edge Functions con `deno task check:edge` y `deno task lint:edge`.
- **Componentes**: uno por archivo, en `/src/components/`.
- **Lógica compleja en Edge Functions**, no en componentes React. Si un componente tiene lógica de negocio no trivial, sácala a una función o a una Edge Function.
- **Acceso a Supabase desde el cliente** a través de `src/integrations/supabase/client.ts`, hooks o helpers finos. Mantener las queries de rutas pequeñas y legibles.
- **Validar respuestas de la API** con Zod, JSON Schema forzado o guards manuales antes de usar el JSON. Nunca confiar en que el modelo devuelve el shape correcto.

---

## Reglas críticas — NO HACER

- **Nunca** pongas la `ANTHROPIC_API_KEY` en código del cliente, en `.env` versionado, o en cualquier fichero subido a Git. Solo en secrets de Supabase Edge Functions.
- **Nunca** llames a la API de Anthropic desde un componente React o un hook del cliente. Toda llamada va por Edge Functions.
- **Nunca** crees una tabla en Supabase sin habilitar **RLS** y políticas explícitas (`auth.uid() = user_id`).
- **Nunca** parsees el JSON devuelto por Claude sin `try/catch` y sin validar shape. La Edge Function debe degradar con elegancia.
- **Nunca** comitees directamente a `main`. Siempre rama + Pull Request.
- **Nunca** subas datos de estudiantes reales (análisis, nombres, correos) al repositorio. Usa fixtures sintéticos en tests.
- **Nunca** añadas a la biblioteca fragmentos literarios de autores fallecidos hace menos de 70 años (ej. Neruda, Borges, García Márquez) sin evaluar el riesgo legal primero. La empresa es sueca: aplica el **§ 22 Upphovsrättslagen (URL)**, que permite citar obras publicadas de forma breve y proporcionada (_god sed_), sin excluir explícitamente el uso comercial — pero el uso sistemático de fragmentos protegidos como núcleo de una app de pago puede dejar de ser "proporcionado". Antes de monetizar, consulta jurídica o sustituye esos fragmentos por textos de dominio público.
- **Nunca** copies verbatim los descriptores o rúbricas del IBO — son propiedad de IBO. Parafrasea siempre.
- **Nunca** instales un paquete npm con licencia GPL en el cliente sin avisarme (es copyleft y puede obligar a publicar el código fuente).
- **Nunca** hagas evaluaciones a la API sin **rate limiting por usuario**. Un bug o un abuso puede generar una factura sorpresa.
- **Nunca** cambies el modelo de Claude sin avisarme.
- **Nunca** toques migraciones de Supabase sin generar un `.sql` versionado.
- **Nunca** termines una feature importante sin actualizar **todos los `.md` relevantes**: `CLAUDE.md`, el fichero correspondiente en `docs/`, y `TASKS_TO_DO.md` (marcar como hecho lo completado, añadir lo que quede pendiente). Esto es crítico para mantener la coherencia entre sesiones de Claude Code. Si no se actualizan los `.md`, la próxima sesión trabajará con contexto obsoleto.

### Nota: bloqueo del marco de análisis es pedagógico, no de seguridad

El campo `marco_analisis` en `textos_biblioteca` está protegido por **honor system**, no por RLS de base de datos. Supabase RLS es a nivel de fila; no puede restringir columnas individuales dentro de una fila. La implementación actual:

- La query bulk de `/biblioteca` **excluye** `marco_analisis` (`select` explícito sin ese campo).
- `TextoDetalle` lo fetchea de forma lazy **solo cuando el usuario lo solicita** (`abrirMarco`).
- El cliente puede en teoría pedir `marco_analisis` directamente vía Supabase SDK — no hay barrera técnica absoluta.
- La protección real requeriría mover `marco_analisis` a una tabla separada con RLS `(auth.uid() = user_id JOIN textos_vistos)`. Esto está **pendiente para una iteración futura** si la app sale de su contexto académico cerrado.

---

## Workflow

Detalle: `docs/workflow-claude-code.md`. Resumen:

1. Una rama por feature, nunca trabajar sobre `main`.
2. Antes de comitear: `npx tsc --noEmit`, `npm run lint`, `deno task check:edge`, `deno task lint:edge`, `npm audit --audit-level=moderate`, `npm run build`, prueba manual en local (caminos felices y caminos infelices).
3. **Revisión de seguridad, bugs, copyright y privacidad** (obligatoria antes de cada commit — ver checklist completo en `docs/workflow-claude-code.md`). **Claude Code debe mostrar siempre en el chat el resultado de esta revisión antes de ejecutar `git commit`**, indicando archivo por archivo qué ha comprobado y qué ha encontrado. No es suficiente hacerla internamente — si no aparece en el chat, no cuenta.
   - Secretos: `ANTHROPIC_API_KEY` nunca en el cliente ni en el diff.
   - Parámetros de URL validados antes de usarlos en queries de BD.
   - Tablas nuevas con RLS + política `auth.uid() = user_id`.
   - Errores de Supabase manejados explícitamente (toast o fallback), nunca silenciados.
   - Aserciones `!` solo dentro de guards que las garantizan.
   - JSON de Claude validado con Zod, JSON Schema o guards manuales antes de usarse.
   - Fragmentos literarios nuevos: dominio público o amparados por § 22 URL sueca (breve, proporcionado, _god sed_, con atribución). Los textos de autores †<70 años (Neruda, Borges, García Márquez) son de uso razonable ahora, pero requieren evaluación antes de monetizar.
   - Textos del IBO parafraseados, nunca copiados verbatim.
   - Paquetes npm nuevos con licencia permisiva (MIT / Apache 2.0 / BSD), no GPL.
   - Tablas nuevas con datos de usuario: base legal, retención y RLS definidos.
   - Envíos de datos a Anthropic u otros terceros cubiertos por la política de privacidad.
4. Subir rama, abrir PR, releer el diff en GitHub.
5. Para cambios grandes o sensibles, pedir review a un Claude independiente en claude.ai.

---

## Mapa de la documentación

- `docs/objetivo-y-alcance.md` — Qué hace la app, para quién, qué NO hace.
- `docs/arquitectura.md` — Estructura de carpetas, Edge Functions, esquema Supabase, flujo de datos.
- `docs/modelo-evaluacion.md` — Marco oficial del IB, criterios, descriptores, diez consejos, conversión.
- `docs/metodologia-pedagogica.md` — Los seis bloques de aprendizaje y la estructura del ensayo.
- `docs/ejemplos-correccion.md` — Calibración del corrector con ejemplos reales (ground truth).
- `docs/plan-desarrollo.md` — Hoja de ruta por fases (MVP hecho; pendiente).
- `docs/convenciones.md` — TypeScript, React, Supabase, naming, tests.
- `docs/workflow-claude-code.md` — Ramas, checklist de commit, verificaciones.
