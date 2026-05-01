# CLAUDE.md

Este fichero da contexto a Claude Code para trabajar en este repositorio. **Léelo siempre antes de generar o modificar código.** Cuando trabajes en un área concreta (corrector, diagnóstico, plan, biblioteca, gamificación, UI…), consulta también el documento correspondiente en `docs/`.

---

## Qué es este proyecto

Aplicación web para estudiantes de **Español A: Literatura del Bachillerato Internacional (IB), Nivel Medio**, centrada en la **Prueba 1** (análisis literario guiado de un texto no visto). Primera evaluación oficial en 2026.

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

- **Feedback detallado del corrector e historial completo** — `EvaluacionPanel` muestra tras las bandas A/B/C/D:
  1. `AnalisisAnotado.tsx` — "Tu solución anotada": reemplaza el bloque antiguo de "Tu análisis" y marca el texto del estudiante con highlights estructurales, de lenguaje y de reescritura. Las reescrituras se generan con `generate-rewrite-suggestions`: en correcciones nuevas se lanzan automáticamente tras recibir la evaluación, y en historial se pueden pedir con botón. Deben conservar voz, ideas y estructura del alumno. Usa tooltips CSS, no Radix Tooltip, para evitar hooks fuera del árbol React durante hot reload.
  2. `EnsayoBanda5.tsx` — bloque "Tu ensayo elevado a banda 5": aparece tras la corrección con un botón para generarlo bajo demanda mediante la Edge Function `generate-band5-essay`. Muestra una versión completa del ensayo basada en la respuesta del alumno, más un mapa de qué se conservó, qué se transformó y qué criterios suben. No debe presentarse como solución única ni como texto para copiar.
  3. `FeedbackEstructural.tsx` — ahora solo muestra el panel de "Lenguaje analítico". El análisis estructural separado se retiró porque sus sugerencias quedan reflejadas directamente sobre la solución anotada.
  4. `TextoLectura.tsx` + `src/lib/textFormatting.ts` — normalizan HTML y texto plano en párrafos legibles para que el texto literario y el análisis no aparezcan entrecortados ni con espacios raros.
  - La edge function `evaluate-analysis` usa `tool_choice` forzado con un JSON Schema completo. Los objetos `ELEMENTO_SCHEMA` y `EVAL_TOOL` están tipados como `Record<string, unknown>` para evitar `any` y mantener la inferencia de Deno bajo control.
  - El guardado del historial se hace en la Edge Function, no desde el cliente. Además de bandas y comentario global, `evaluaciones` persiste `introduccion`, `parrafos`, `conclusion`, `lenguaje_analitico` y el campo opcional `sugerencias_reescritura` como JSONB.
  - `generate-rewrite-suggestions` carga una evaluación guardada, genera 6-8 micro-reescrituras localizables, las persiste en `sugerencias_reescritura` y las reutiliza si ya hay suficientes.
  - `generate-band5-essay` carga una evaluación guardada, genera el ensayo completo de banda 5 bajo demanda, lo persiste en `ensayo_banda_5` y lo reutiliza en llamadas posteriores.
  - El diagnóstico inicial llama a la misma función con `guardar_historial: false`.
  - En desarrollo, `DevLogPanel` captura errores de consola, `unhandledrejection` y respuestas `fetch` fallidas para poder copiar un informe de depuración.

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
- **Ensayo anotado P2** (`EnsayoAnotadoPrueba2.tsx`) — mismo algoritmo de fuzzy matching que `AnalisisAnotado.tsx`. Criterios A/B1/B2/C/D en colores + reescrituras en teal. CSS tooltips, sin Radix Tooltip. Auto-genera reescrituras si `autoGenerar=true` y hay `evaluacionId`. Edge Function `generate-rewrite-suggestions-p2` (límite 20/día).
- **Ensayo elevado a banda alta P2** (`EnsayoBanda5Prueba2.tsx`) — botón bajo demanda, texto completo colapsable, grid 3 columnas (se conserva / se transforma / criterios que suben). Edge Function `generate-band5-essay-p2` (límite 10/día). Reutiliza si `ensayo_banda_5.texto` ya existe.
- **Historial unificado** (`/historial`) — portal actualizado con tres bloques clicables (P1, Oral, P2). P1 despliega lista inline; Oral navega a `/historial-oral`; P2 navega a `/historial-prueba-2`.

**Oral Individual ✅ MVP completo (2026-05-01)** — Módulo para el Trabajo Oral Individual:

- Rutas: `/oral` (formulario + guía pedagógica con tabs), `/historial-oral` (historial).
- Edge Function `evaluate-oral`: prompt caching, `tool_choice` forzado (`registrar_evaluacion_oral`), 4 criterios (A/B/C/D) sobre 10 cada uno = 40 total. Estima duración (guion ÷ 135 ppm). Genera diagnóstico del asunto global (definición/especificidad/uso como lente), equilibrio entre obras (extracto_1/obra_1/extracto_2/obra_2) y estructura (apertura/progresión/transiciones/cierre). Para modalidad `taught`: 5-8 preguntas del profesor con respuestas modelo. Para `self_taught`: 4-6 zonas de desarrollo autónomo.
- Tabla `evaluaciones_oral` con RLS. Columna generada `puntuacion_total`. Índice `(user_id, created_at DESC)`. RPC `reservar_cuota_oral` con `pg_advisory_xact_lock` (5/día, independiente de P1/P2).
- `notaIBOral` en `src/lib/ib-oral.ts`: 0-9→1, 10-15→2, 16-21→3, 22-27→4, 28-32→5, 33-36→6, 37-40→7.
- Componentes: `EvaluacionOralPanel.tsx` (mobile-first, diagnósticos expandibles, alertas de duración), `GuiaOral.tsx` (guía pedagógica estática).
- Contenido pedagógico estático en `src/lib/oral-guide-content.ts`: 5 campos de indagación IB con ejemplos buenos/débiles, 3 ejemplos de introducción con comentario, minutajes taught/self_taught.
- Navegación: "Oral" en el header con ícono `Mic`; "Historial Oral" en el dropdown de usuario.

**Mejoras adicionales ✅ (2026-05-01):**

- **Transcripción de imagen/PDF a texto** — `ImageUploadButton.tsx` (botón cámara reutilizable en P1, P2 y Oral). Acepta JPG/PNG/WebP/HEIC/PDF hasta 8 MB. Convierte a base64 en cliente, llama a edge function `transcribe-image` (Haiku 4.5, límite 20/día). Muestra dialog editable con el texto transcrito antes de insertarlo. PDF usa bloque `document` con header `anthropic-beta: pdfs-2024-09-25`. Tabla `llm_precios` actualizada con ID completo `claude-haiku-4-5-20251001`.

- **Juego del Quijote en llamadas secundarias** — `EnsayoBanda5.tsx` y `EnsayoBanda5Prueba2.tsx` muestran `<JuegoEsperaEvaluacion>` mientras generan el ensayo de banda 5 (antes solo spinner en botón).

- **Sugeridor de asunto global para el Oral** — `SugeridorOral.tsx` + edge function `suggest-oral-topics`. Al entrar en `/oral`, el alumno puede describir sus intereses y recibir 3 sugerencias (asunto global + par de obras + justificación pedagógica). Puede omitir este paso y rellenar el formulario directamente. Usa `tool_choice` forzado; muestra `<JuegoEsperaEvaluacion modo="oral">` durante la carga.

- **Biblioteca de textos P1** — Ruta `/biblioteca` con tabs Poema/Prosa/Teatro. Tabla `textos_practica_p1` (RLS: lectura autenticados, escritura admin). Edge function `generate-practice-text` (solo desde admin) genera textos de práctica estilo IB (~200-300 palabras) + pregunta de orientación NM. Panel de admin (`/admin`) sección "Biblioteca P1": generar texto, toggle activo/inactivo, eliminar. Enlace en bloque "Practicar" del dashboard del alumno. Al seleccionar un texto, navega a `/prueba-1?texto_id=uuid` con texto y pregunta pre-rellenados.

- **Selector de preguntas de Prueba 2** — `SelectorPreguntaP2.tsx` (popover con búsqueda). Tabla `preguntas_prueba2` con 170 preguntas extraídas de past papers oficiales, ordenadas alfabéticamente. Botón junto al campo "Pregunta" en `/prueba-2`; al seleccionar, pre-rellena el campo.

**Fase 4 — Pendiente:** gamificación (progreso por criterio, medallas, racha, colección de recursos).
**Fase 5 — Pendiente (resto):** pulido UX, mobile, política de privacidad, tiers.

Hoja de ruta detallada: `docs/plan-desarrollo.md`.

---

## Modelo de evaluación

El corrector aplica los cuatro criterios oficiales del IB para Prueba 1, NM. Cada criterio puntúa 0-5; total 0-20.

**Tabla oficial de conversión a nota IB (1-7):**

| Puntuación total | Nota IB |
| ---------------- | ------- |
| 0–3              | 1       |
| 4–6              | 2       |
| 7–9              | 3       |
| 10–12            | 4       |
| 13–15            | 5       |
| 16–18            | 6       |
| 19–20            | 7       |

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
