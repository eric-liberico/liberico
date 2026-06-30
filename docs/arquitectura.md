# Arquitectura

Stack: **React + TypeScript + Tailwind** en el frontend, **Supabase** en el backend (Auth + Postgres + Edge Functions + Storage) y la **API de Anthropic** invocada exclusivamente desde una Edge Function.

La regla central: **toda la lógica sensible (llamadas a Anthropic, validación de cuotas, parseo de respuestas, escrituras críticas) vive en Edge Functions, no en el cliente.** El cliente es una capa de presentación que habla con Supabase.

---

## Estructura de carpetas (estado real a 2026-04-27)

```
ib-lit-coach/
│
├── CLAUDE.md                          ← Lectura obligada para Claude Code
├── package.json
├── deno.json                          ← Tareas check:edge y lint:edge para Edge Functions
├── deno.lock                          ← Lockfile de dependencias Deno/Supabase Functions
├── tsconfig.json                      ← strict: true
├── vite.config.ts                     ← usa @lovable.dev/vite-tanstack-config
├── .env                               ← gitignored (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
├── .gitignore
│
├── src/
│   ├── router.tsx                     ← Configuración del router TanStack
│   ├── routeTree.gen.ts               ← Auto-generado por TanStack Router; NO editar a mano
│   ├── styles.css
│   │
│   ├── routes/                        ← File-based routing (TanStack Router)
│   │   ├── __root.tsx                 ← Layout raíz, AuthProvider, Toaster
│   │   ├── index.tsx                  ← /  → Corrector (acepta ?texto_id=uuid; editor Tiptap)
│   │   ├── login.tsx                  ← /login → tras signup redirige a /onboarding
│   │   ├── onboarding.tsx             ← /onboarding → paso 0: rol; pasos 1-n: diagnóstico + plan
│   │   ├── mi-plan.tsx                ← /mi-plan → Plan de estudio por semanas
│   │   ├── historial.tsx              ← /historial → Evaluaciones pasadas con solución anotada
│   │   ├── biblioteca.tsx             ← /biblioteca → 12 textos canónicos
│   │   ├── ejercicios.tsx             ← /ejercicios → Microejercicios (3 tipos)
│   │   ├── teoria.tsx                 ← /teoria → Contenido teórico del curso
│   │   ├── cuenta.tsx                 ← /cuenta → Ajustes + eliminación de cuenta
│   │   ├── profesor.tsx               ← /profesor → Panel principal del profesor
│   │   ├── profesor-alumnos.tsx       ← /profesor-alumnos → Lista de alumnos vinculados
│   │   ├── profesor-alumno.$alumnoId.tsx ← /profesor-alumno/:id → Historial de un alumno
│   │   ├── profesor-chat.tsx          ← /profesor-chat → Chat con Claude como asistente IB
│   │   ├── admin.tsx                  ← /admin → KPIs, gráficos de uso LLM, coste (solo admin)
│   │   └── admin-usuarios.tsx         ← /admin-usuarios → Gestión de usuarios (solo admin)
│   │
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui (no tocar salvo actualización de librería)
│   │   ├── EvaluacionPanel.tsx        ← Panel de resultados A/B/C/D
│   │   ├── AnalisisAnotado.tsx        ← "Tu solución anotada": highlights + leyenda + comentarios
│   │   ├── EnsayoBanda5.tsx           ← Ensayo completo elevado a banda 5 basado en la respuesta
│   │   ├── FeedbackEstructural.tsx    ← Panel de lenguaje analítico
│   │   ├── TextoLectura.tsx           ← Render de texto/HTML normalizado en párrafos
│   │   ├── DevLogPanel.tsx            ← Panel de logs de desarrollo
│   │   ├── SiteHeader.tsx             ← Navegación principal (alumno / profesor / admin)
│   │   ├── RichTextEditor.tsx         ← Editor Tiptap (negrita, cursiva, subrayado; MIT)
│   │   └── TextoAnotado.tsx           ← Visor de texto con anotaciones inline del profesor
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx                ← Sesión Supabase + AuthProvider; Rol: alumno|profesor|admin
│   │   ├── useDictado.tsx             ← Web Speech API para dictado de comentarios
│   │   └── use-mobile.tsx
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts                  ← createClient (usa VITE_* env vars)
│   │   ├── types.ts                   ← Tipos generados del esquema Supabase (actualizar al añadir tablas)
│   │   └── auth-middleware.ts
│   │
│   └── lib/
│       ├── ib.ts                      ← CRITERIOS, notaIB(), tipo Evaluacion
│       ├── textFormatting.ts          ← Normalización de HTML/texto plano a párrafos legibles
│       ├── devLogger.ts               ← Captura local de logs para depuración
│       ├── diagnostico.ts             ← Helpers del onboarding
│       └── utils.ts                   ← cn()
│
├── supabase/
│   ├── config.toml                    ← Proyecto: tlspxuwiakcrhshwvjeo
│   ├── migrations/
│   │   ├── 20260425140834_*.sql       ← profiles + evaluaciones
│   │   ├── 20260425144906_*.sql       ← perfiles + planes_estudio + tareas_plan
│   │   ├── 20260426100000_biblioteca_fase3.sql  ← textos_biblioteca + textos_vistos
│   │   ├── 20260426120000_roles_profesor.sql ← roles y mensajes de profesor
│   │   ├── 20260426130000_chats_profesor.sql ← chats del profesor
│   │   ├── 20260426140000_gestion_alumnos.sql ← vinculación profesor/alumno
│   │   ├── 20260426180000_anotaciones_evaluacion.sql ← anotaciones inline
│   │   ├── 20260426200000_comentarios_profesor.sql ← comentarios del profesor
│   │   ├── 20260427100000_admin_panel.sql ← llm_uso, llm_precios, admin_logs; activo en perfiles
│   │   ├── 20260427140000_harden_active_rls.sql ← endurecimiento de RLS
│   │   ├── 20260427195500_guardar_feedback_detallado_evaluaciones.sql ← JSONB de feedback detallado
│   │   ├── 20260427211000_sugerencias_reescritura_evaluaciones.sql ← JSONB de reescrituras
│   │   └── 20260427212500_ensayo_banda_5_evaluaciones.sql ← JSONB de ensayo elevado
│   └── functions/                     ← Edge Functions (runtime Deno)
│       ├── evaluate-analysis/         ← Corrector: llama a claude-opus-4-7; registra llm_uso
│       ├── generate-analysis-feedback/ ← Feedback completo de Prueba 1 bajo demanda
│       ├── evaluate-paper2/           ← Corrector Prueba 2: evaluación básica; registra llm_uso
│       ├── generate-paper2-feedback/  ← Feedback completo de Prueba 2 bajo demanda
│       ├── generate-band5-essay/      ← Genera bajo demanda el ensayo completo elevado a banda 5
│       ├── generate-band5-essay-p2/   ← Genera bajo demanda el ensayo elevado de Prueba 2
│       ├── generate-rewrite-suggestions/ ← Genera reescrituras anotadas de banda alta
│       ├── generate-rewrite-suggestions-p2/ ← Reescrituras anotadas de Prueba 2
│       ├── generate-study-plan/       ← Genera plan por semanas; registra llm_uso
│       ├── rewrite-feedback/          ← Reescribe apuntes del profesor con Claude; registra llm_uso
│       ├── teacher-chat/              ← Chat del profesor con Claude como asistente IB; registra llm_uso
│       ├── delete-account/            ← Elimina la propia cuenta del usuario autenticado
│       ├── admin-get-users/           ← Lista usuarios con paginación/búsqueda (solo admin)
│       ├── admin-get-metrics/         ← Métricas de uso LLM + coste estimado (solo admin)
│       ├── admin-update-user/         ← Cambia rol/activo de un usuario (solo admin)
│       ├── admin-delete-user/         ← Elimina cuenta de otro usuario (solo admin)
│       └── admin-reset-password/      ← Genera enlace de recuperación de contraseña (solo admin)
│
└── docs/
    ├── objetivo-y-alcance.md
    ├── arquitectura.md                ← Este fichero
    ├── modelo-evaluacion.md
    ├── metodologia-pedagogica.md
    ├── ejemplos-correccion.md
    ├── plan-desarrollo.md
    ├── convenciones.md
    └── workflow-claude-code.md
```

---

## Flujo de datos del corrector (caso típico)

```
[Estudiante en /]
        │ rellena texto, pregunta, análisis
        ▼
[Ruta index.tsx]
        │ llama a supabase.functions.invoke("evaluate-analysis", { body })
        ▼
[Edge Function evaluate-analysis]
        │ 1. Verifica auth.uid() del JWT
        │ 2. Comprueba rate limit del usuario (consulta a Postgres)
        │ 3. Construye el prompt con descriptores + entrada del usuario
        │ 4. Llama a Anthropic API (claude-opus-4-7) con prompt caching
        │ 5. Fuerza tool use y valida el shape con JSON Schema + guards manuales
        │ 6. Calcula nota IB con la tabla oficial
        │ 7. Inserta la fila en evaluaciones con la evaluación básica
        │ 8. Devuelve la evaluación al cliente
        ▼
[EvaluacionPanel.tsx]
        │ renderiza bandas, nota, solución sin marcas y comentario global
        │ si el alumno pulsa "Dame feedback completo": llama generate-analysis-feedback
        ▼
[Estudiante ve el resultado]
```

**Puntos clave:**

- La `ANTHROPIC_API_KEY` solo existe dentro de la Edge Function (variable de entorno secreta).
- El cliente nunca habla con Anthropic directamente. Si lo hace, hay un bug de seguridad.
- RLS garantiza que el `user_id` de la fila insertada es el del usuario autenticado, sin que la Edge Function pueda saltárselo.
- Todo error en la API de Claude (timeout, JSON malformado, contenido bloqueado) se atrapa en la Edge Function y se devuelve un error estable que el cliente sabe renderizar con un mensaje empático.
- La estructura detallada (`introduccion`, `parrafos`, `conclusion`, `lenguaje_analitico` y el campo opcional `sugerencias_reescritura`) se guarda solo cuando el alumno solicita feedback completo. El ensayo completo de banda 5 se genera bajo demanda con `generate-band5-essay` y se persiste en `ensayo_banda_5`.

---

## Esquema de base de datos (Supabase / Postgres)

Todas las tablas con datos de usuario tienen **RLS habilitado** y políticas explícitas. Las tablas de contenido curado (sin datos de usuario) son de solo lectura para usuarios autenticados.

### Tablas implementadas

| Tabla                    | Migración      | RLS                           | Descripción                                                                                                                                                                                                                                                                                            |
| ------------------------ | -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`               | 20260425140834 | por user                      | Perfil básico (display_name). Auto-creado al registrarse.                                                                                                                                                                                                                                              |
| `evaluaciones`           | 20260425140834 | por user + lectura profesor   | Historial de evaluaciones del corrector. Incluye entrada del alumno, bandas, total, nota IB, comentario global y, solo cuando se solicita, fortalezas, áreas y feedback detallado JSONB (`introduccion`, `parrafos`, `conclusion`, `lenguaje_analitico`, `sugerencias_reescritura`, `ensayo_banda_5`). |
| `evaluaciones_prueba2`   | 20260430130000 | por user                      | Historial de ensayos comparativos de Prueba 2. La evaluación inicial guarda criterios A/B1/B2/C/D, justificaciones, comentario global, fortalezas y áreas; el feedback completo (`diagnostico_comparativo`, `anotaciones`, `sugerencias_reescritura`, `ensayo_banda_5`) se persiste bajo demanda.      |
| `perfiles`               | 20260425144906 | por user                      | Perfil pedagógico: fecha examen, horas/semana, bandas iniciales, rol (`alumno\|profesor\|admin`), `activo` (bool).                                                                                                                                                                                     |
| `planes_estudio`         | 20260425144906 | por user                      | Plan generado por IA, con semanas y enfoque. Campo `activo`.                                                                                                                                                                                                                                           |
| `tareas_plan`            | 20260425144906 | via plan                      | Tareas individuales del plan. RLS hereda del `plan_id`.                                                                                                                                                                                                                                                |
| `textos_biblioteca`      | 20260426100000 | lectura autenticada           | 12 textos canónicos con marco de análisis. Solo lectura para usuarios.                                                                                                                                                                                                                                 |
| `textos_vistos`          | 20260426100000 | por user                      | Qué textos ha analizado cada usuario (desbloquea el marco).                                                                                                                                                                                                                                            |
| `anotaciones_evaluacion` | 20260426180000 | por profesor + lectura alumno | Anotaciones inline del profesor sobre fragmentos de una evaluación. Guarda offsets (`inicio`, `fin`), texto seleccionado y comentario.                                                                                                                                                                 |
| `comentarios_profesor`   | 20260426200000 | por profesor + lectura alumno | Comentarios redactados por el profesor sobre una evaluación. Campos: `profesor_id`, `alumno_id`, `evaluacion_id`, `texto`, `created_at`, `updated_at`.                                                                                                                                                 |
| `llm_uso`                | 20260427100000 | SELECT admin y lectura propia | Registro de cada llamada LLM: `user_id`, `edge_function`, `modelo`, `tokens_entrada`, `tokens_salida`, cache tokens y `created_at`. Se usa también para límites diarios por función.                                                                                                                   |
| `llm_precios`            | 20260427100000 | ALL solo admin                | Precio por modelo: `modelo` (PK), `precio_entrada_por_millon`, `precio_salida_por_millon`. Precargado con los 4 modelos actuales.                                                                                                                                                                      |
| `admin_logs`             | 20260427100000 | SELECT solo admin             | Audit log de acciones destructivas del panel de admin: `admin_id`, `accion`, `target_user_id`, `detalles` (JSONB), `created_at`.                                                                                                                                                                       |

**Tablas pendientes (Fase 4):**

- `progreso_bloques` — avance por criterio en el tiempo.
- `medallas` — logros desbloqueados.
- `rachas` — días consecutivos de actividad.
- `coleccion_recursos` — recursos literarios identificados correctamente.

Cada nueva tabla **debe** tener RLS habilitado en la misma migración que la crea. Sin excepciones.

### Migraciones

- Cada cambio de esquema va en su propio fichero `.sql` en `supabase/migrations/`.
- **Nunca** modificar el esquema en producción a mano: siempre por migración versionada.
- Para aplicar: `supabase db push` (requiere CLI vinculado al proyecto). **Caveat actual:** en el proyecto compartido `db push` se **niega** por historial divergente (hay migraciones en el remoto que no están en el repo); ver [Entornos y despliegue (dev / prod)](#entornos-y-despliegue-dev--prod) para el workaround vía Management API.

---

## Edge Functions

### Convenciones generales

- Una carpeta por función en `supabase/functions/`.
- `index.ts` es el handler completo (funciones cortas; si crece, separar módulos).
- Siempre verificar JWT al inicio: `supabase.auth.getUser(token)`.
- Usar **prompt caching**: `system` como array con `cache_control: { type: "ephemeral" }` en el bloque estático.
- Tool use forzado (`tool_choice: { type: "tool", name: "..." }`) para garantizar salida estructurada.
- Validación con JSON Schema/tool use y guards manuales antes de persistir datos del modelo. Si se añade Zod en una función concreta, mantener el mismo criterio: nunca usar JSON del modelo sin comprobar shape.
- Errores 429 y 529 de Anthropic tienen manejo explícito con mensajes de usuario.
- Despliegue: `supabase functions deploy <nombre>`.
- Validación local: `deno task check:edge` y `deno task lint:edge`.

### Patrón común de seguridad en todas las edge functions

1. `OPTIONS` → respuesta CORS inmediata.
2. Verificar `Authorization` header → extraer JWT → `anonClient.auth.getUser(token)`.
3. Si `userErr || !userData.user` → 401.
4. Para funciones de profesor: verificar `perfiles.rol === 'profesor'`.
5. Para funciones de admin: verificar `perfiles.rol === 'admin' && activo === true`.
6. Toda lógica privilegiada usa `adminClient` creado con `SUPABASE_SERVICE_ROLE_KEY`.
7. Todas las funciones que llaman a Anthropic registran tokens en `llm_uso` y comprueban límites diarios antes de llamar al proveedor.

### `evaluate-analysis` ✅

Recibe la entrada del corrector vía POST: texto literario, pregunta de orientación, análisis del estudiante y `guardar_historial?`.

1. Verifica JWT → `user_id`.
2. Comprueba rate limit diario en `llm_uso` antes de llamar a Anthropic.
3. Llama a `claude-opus-4-7` con los 4 descriptores IB como system prompt cacheado.
4. Fuerza tool use `registrar_evaluacion` → bandas A/B/C/D + justificaciones + comentario global + fortalezas + áreas de mejora.
5. Calcula `nota_ib` con la tabla oficial (0-3→1, …, 19-20→7).
6. Si `guardar_historial !== false`, inserta en `evaluaciones` con los campos estructurales (`introduccion`, `parrafos`, `conclusion`, `lenguaje_analitico`, `sugerencias_reescritura`, `ensayo_banda_5`) a `NULL`.
7. Registra `llm_uso` y devuelve la evaluación al cliente.

### `generate-analysis-feedback` ✅

Recibe `{ evaluacion_id }` vía POST. Se llama desde `EvaluacionPanel.tsx` solo cuando el alumno pulsa "Dame feedback completo".

1. Verifica JWT → `user_id` y usuario activo.
2. Carga la fila de `evaluaciones` usando RLS.
3. Si el feedback estructural ya existe (`introduccion` + `parrafos` + `conclusion` + `lenguaje_analitico`), lo devuelve sin llamar a Anthropic.
4. Comprueba rate limit diario en `llm_uso` (20/día).
5. Llama a `claude-opus-4-7` con `MAX_TOKENS=8000` y `TIMEOUT=150s` para generar `introduccion`, `parrafos`, `conclusion` y `lenguaje_analitico`. La evaluación básica (incluidas fortalezas/áreas) se pasa como contexto para que no se repita.
6. Persiste esos campos en `evaluaciones`, registra `llm_uso` y devuelve los bloques al cliente con `feedback_completo_generado: true`.

Tras desbloquear feedback completo, `EvaluacionPanel.tsx` dispara automáticamente `generate-band5-essay` (prop `autoGenerar` de `EnsayoBanda5.tsx`) si la evaluación aún no tiene ensayo modelo persistido.

### `generate-rewrite-suggestions` ✅

Recibe `{ evaluacion_id }` vía POST. Se llama desde `AnalisisAnotado.tsx`: automáticamente después de una corrección nueva y mediante botón en el historial.

1. Verifica JWT → `user_id` y usuario activo.
2. Carga la fila de `evaluaciones` usando RLS.
3. Si ya hay al menos 5 `sugerencias_reescritura`, las devuelve sin llamar a Anthropic.
4. Comprueba rate limit diario en `llm_uso`.
5. Llama a `claude-opus-4-7` con tool use `registrar_sugerencias_reescritura`.
6. Genera 6-8 micro-reescrituras localizables que respetan voz, ideas y estructura del alumno.
7. Actualiza `evaluaciones.sugerencias_reescritura`, registra `llm_uso` y devuelve las sugerencias.

### `generate-band5-essay` ✅

Recibe `{ evaluacion_id }` vía POST. Se llama desde `EnsayoBanda5.tsx` cuando el alumno pulsa "Generar versión completa de banda 5".

1. Verifica JWT → `user_id` y usuario activo.
2. Carga la fila de `evaluaciones` usando RLS, por lo que solo el dueño puede generar su ensayo.
3. Si `ensayo_banda_5` ya existe, lo devuelve sin llamar a Anthropic.
4. Comprueba rate limit diario en `llm_uso`.
5. Llama a `claude-opus-4-7` con prompt cacheado y tool use `registrar_ensayo_banda_5`.
6. Actualiza `evaluaciones.ensayo_banda_5`, registra `llm_uso` y devuelve el ensayo.

### `evaluate-paper2` ✅

Recibe `{ pregunta, obra_1, obra_2, notas_obra_1?, notas_obra_2?, ensayo, ensayo_html? }` vía POST desde `/prueba-2`.

1. Verifica JWT → `user_id` y usuario activo.
2. Reserva cuota con `reservar_cuota_prueba2` antes de llamar a Anthropic.
3. Llama a `claude-opus-4-7` con prompt caching, `MAX_TOKENS=3500`, `TIMEOUT=90s` y tool use forzado.
4. Devuelve y persiste solo la evaluación básica: criterios A/B1/B2/C/D, justificaciones, total, comentario global, fortalezas y áreas de mejora.
5. Guarda `diagnostico_comparativo`, `anotaciones`, `sugerencias_reescritura` y `ensayo_banda_5` como `NULL`.
6. Mantiene guard de `stop_reason === "max_tokens"`, registro de uso LLM, `cancelarCuota()` en fallos y `procesarGamificacion({ tipo: "p2" })`.

### `generate-paper2-feedback` ✅

Recibe `{ evaluacion_id }` vía POST desde `EvaluacionPrueba2Panel.tsx` solo cuando el alumno pulsa "Dame feedback completo".

1. Verifica JWT → `user_id` y usuario activo.
2. Carga la fila de `evaluaciones_prueba2` usando el cliente del usuario y RLS.
3. Si ya existen `diagnostico_comparativo` y `anotaciones`, los devuelve sin llamar a Anthropic.
4. Comprueba cuota propia en `llm_uso` para `edge_function = 'generate-paper2-feedback'` (20/día).
5. Llama a `claude-opus-4-7` con `MAX_TOKENS=8000`, `TIMEOUT=150s` y tool use forzado.
6. Persiste `diagnostico_comparativo` (5 elementos) y `anotaciones` (4-8), registra uso LLM y devuelve `feedback_completo_generado: true`.

Tras desbloquear feedback completo, `EvaluacionPrueba2Panel.tsx` muestra `EnsayoAnotadoPrueba2`, dispara las reescrituras silenciosas con `generate-rewrite-suggestions-p2` y monta `EnsayoBanda5Prueba2` con `autoGenerar`, que llama a `generate-band5-essay-p2` si aún no hay ensayo persistido.

### `generate-study-plan` ✅

Sin body (usa el perfil del usuario autenticado).

1. Verifica JWT → `user_id`.
2. Carga `perfiles`: fecha de examen, horas/semana, bandas iniciales.
3. System prompt estático cacheado + parte dinámica con perfil del alumno.
4. Fuerza tool use `registrar_plan_estudio` → lista de tareas por semana.
5. Desactiva planes previos, inserta nuevo plan + tareas.
6. Devuelve `{ plan_id, preliminar, tareas_count }`. Registra `llm_uso`.

### `rewrite-feedback` ✅

Recibe `{ texto, contexto? }` vía POST. Solo para profesores.

1. Verifica JWT + `perfiles.rol === 'profesor'`.
2. Rate limiting: máximo 50 reescrituras/día por profesor (cuenta en `llm_uso`).
3. Llama a `claude-opus-4-7` con system prompt cacheado de asistente pedagógico IB.
4. Si `contexto` (fragmento del texto del alumno ≤500 chars) se incluye antes de los apuntes del profesor en el mensaje de usuario para mejorar la pertinencia.
5. Devuelve `{ texto }` (texto mejorado). Registra `llm_uso`.

### `teacher-chat` ✅

Chat de varias vueltas. Recibe `{ messages: [{role, content}] }`. Solo para profesores.

1. Verifica JWT + `perfiles.rol === 'profesor'`.
2. System prompt cacheado como asistente experto en IB Español A NM.
3. Pasa el historial de mensajes a `claude-opus-4-7`.
4. Devuelve `{ respuesta }`. Registra `llm_uso`.

### `create-booking` ✅

Recibe `{ slot_id, student_goal, student_timezone, consent_history, consent_payment }`. Solo para alumnos.

1. Verifica JWT y `perfiles.rol === 'alumno' && activo === true`.
2. Carga el slot disponible con `adminClient`, calcula precio + 25 % moms y crea la reserva confirmada.
3. Marca `booking_slots.status = 'booked'`.
4. Si hay consentimiento, crea `booking_teacher_access` hasta 7 días después de la sesión.
5. Intenta crear un evento de Google Calendar con conferencia Google Meet y asistentes profesor/alumno.
6. Guarda `meet_link`, `calendar_event_id`, `calendar_id`, `calendar_sync_status`, `calendar_sync_error` y `calendar_synced_at`.

Configuración de Google:

- `GOOGLE_SERVICE_ACCOUNT_JSON` contiene el JSON del service account.
- Con Google Workspace y delegación de dominio: `GOOGLE_CALENDAR_IMPERSONATE_TEACHER=true`; la función obtiene token con `sub = teacherEmail` y escribe en `primary`.
- Sin delegación: la función escribe en `teacher_profiles.calendar_email` o en el email del profesor; ese calendario debe estar compartido con el service account.
- Si Google falla, la reserva no se pierde: queda `calendar_sync_status = 'failed'` y el admin ve el error en `/admin-bookings`.

### `confirm-booking` ✅

Recibe `{ booking_id, action }`. Solo para admin.

1. Verifica JWT y `perfiles.rol === 'admin' && activo === true`.
2. Con `action: 'cancel'`, marca la reserva como cancelada, libera el slot, revoca `booking_teacher_access` e intenta eliminar el evento de Google Calendar.
3. Con confirmación, marca la reserva como confirmada, marca el slot como `booked` y crea acceso temporal al historial si procede.

### `delete-account` ✅

Sin body. Cualquier usuario autenticado puede llamarla.

1. Verifica JWT → `user_id`.
2. Llama a `adminClient.auth.admin.deleteUser(userId)` (el CASCADE borra todo).

### `admin-get-users` ✅ (solo admin)

Query params: `page`, `per_page`, `q` (búsqueda por email), `rol`.

1. Admin check.
2. `adminClient.auth.admin.listUsers({ page, perPage })`.
3. Enriquece con datos de `perfiles`. Filtros client-side.
4. Devuelve `{ usuarios, total }`.

### `admin-get-metrics` ✅ (solo admin)

Query params: `desde`, `hasta`, `user_id`.

1. Admin check.
2. Carga `llm_uso` con filtros + `llm_precios`.
3. Agrega: totales globales, por modelo, por función, top 20 usuarios (con emails), evolución diaria.
4. Devuelve `{ totales, por_modelo, por_funcion, top_usuarios, evolucion_diaria }`.

### `admin-update-user` ✅ (solo admin)

Recibe `{ user_id, activo?, rol? }`.

1. Admin check. Previene auto-modificación (`targetId === adminId` → 400).
2. Actualiza `perfiles`. Log en `admin_logs`.

### `admin-delete-user` ✅ (solo admin)

Recibe `{ user_id }`.

1. Admin check. Previene auto-eliminación.
2. Log en `admin_logs` **antes** de eliminar.
3. `adminClient.auth.admin.deleteUser(targetId)` (CASCADE borra todo).

### `admin-reset-password` ✅ (solo admin)

Recibe `{ email }`.

1. Admin check.
2. `adminClient.auth.admin.generateLink({ type: 'recovery', email })`.
3. Devuelve `{ ok, action_link }`. El admin copia el enlace y lo envía manualmente. Log en `admin_logs`.

---

## Entornos y despliegue (dev / prod)

### Estado actual: **un solo proyecto compartido**

Hoy existe **un único proyecto Supabase** (`tlspxuwiakcrhshwvjeo`) que usan por igual el desarrollo local, los previews de Cloudflare y producción. No hay proyecto de dev separado.

- Las variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` apuntan todas a ese proyecto.
- En **local** las define `.env` (gitignored). En los **builds desplegados** las inyecta **Cloudflare** como variables de entorno de build (no hay `.env` en el repo).
- La única separación que existe hoy es de **frontend**: el muro "Próximamente" (`LIBERICO_COMING_SOON`) y los previews por rama de Cloudflare (`main` = producción, otras ramas = preview). El **backend es el mismo** (misma BD, Auth, Storage y Edge Functions).

**Implicación:** cualquier migración o `functions deploy` **toca producción**. Por eso, mientras siga habiendo un solo proyecto, solo se aplican a la BD compartida cambios seguros (p. ej. migraciones aditivas con columnas nullable).

> ⚠️ **Build-time, no runtime.** `VITE_SUPABASE_URL` se "hornea" al construir, no se lee en ejecución. La palanca de a qué proyecto apunta un build desplegado son las **variables de build de Cloudflare**, distintas por entorno (production vs preview). Cambiar una variable del worker en runtime no basta.

### Migraciones en el proyecto compartido (workaround)

`supabase db push` se **niega** porque el remoto tiene migraciones (`20260615120000/130000/140000`) que no están en el repo (historial divergente). **No** ejecutar `migration repair` ni `db pull`. Workaround usado:

1. Aplicar el SQL vía Management API con **curl** (urllib da Cloudflare 1010 por User-Agent):
   `POST https://api.supabase.com/v1/projects/<ref>/database/query` con `Authorization: Bearer <token sbp_>` y body `{"query":"..."}`.
2. Registrar la versión: `insert into supabase_migrations.schema_migrations (version, name) values (...) on conflict do nothing`.

Las migraciones del repo siguen siendo la fuente de verdad; deben poder reconstruir el esquema desde cero (idempotentes, `IF NOT EXISTS` cuando aplique) para el futuro proyecto dev.

### Objetivo (tarea de pre-lanzamiento): **dos proyectos**

Antes de quitar el muro y abrir al público, separar en **dos proyectos Supabase**:

- **El actual se queda como `prod`** (conserva datos y todo el cableado).
- **Se crea uno nuevo, vacío, como `dev`.**

Motivo: la app maneja **pagos (Stripe)** y **datos de menores**, y se prueba vía **previews de Cloudflare** (que un Supabase local **no** aísla, porque un worker en la nube no llega a un Docker local). Branching de Supabase se descarta por ahora (plan Pro, coste por rama; rinde con CI/equipo).

Mapa de entornos objetivo:

```
Local (vite dev)   ─┐
Preview Cloudflare ─┼─►  Supabase DEV  (vacío, datos falsos, Stripe test)
Worker producción  ───►  Supabase PROD (tlspxuwiakcrhshwvjeo, datos reales, Stripe live)
```

Montaje (una vez): crear el proyecto dev → `supabase db push` desde cero para sembrar el esquema → `functions deploy` a dev → duplicar secrets con claves **test** (Anthropic, OpenAI, Stripe, LiveKit, Google SA) → reconfigurar Google OAuth y el webhook de Stripe en dev → en Cloudflare, dos entornos (`[env.preview]` → dev, `[env.production]` → prod) con sus respectivas variables de build `VITE_*`.

### Flujo de despliegue de un cambio a producción (con dos proyectos)

1. **Desarrollas contra dev:** escribes la migración → la aplicas a dev → pruebas en local (`vite dev` apuntando a dev).
2. **Promueves a prod:** aplicas las **mismas** migraciones a prod (`db push` es idempotente: aplica solo el delta; o el workaround de Management API si el historial diverge).
3. `supabase functions deploy <fn> --project-ref <PROD_REF>`.
4. **Frontend a prod:** PR `feat/...` → `main` (push directo a `main` está **bloqueado por política**); Cloudflare construye `main` = producción con sus variables de build de prod.

Regla de oro: **siempre dev → prod**; nunca probar una migración por primera vez en producción. Usar `--project-ref` explícito (o scripts `db:push:dev|:prod`, `deploy:dev|:prod`) para no empujar a prod por error.

---

## Por qué Edge Functions y no lógica en componentes

1. **Seguridad de la API key.** La única forma de que `ANTHROPIC_API_KEY` no termine expuesta al navegador es que la llamada se haga en un servidor.
2. **Rate limiting fiable.** Hecho en el cliente es teatro: cualquiera puede saltárselo modificando el código del navegador. En Edge Function es real.
3. **Validación de RLS coherente.** Las políticas de Supabase usan `auth.uid()`, que la Edge Function resuelve del JWT.
4. **Lógica compleja sin contaminar componentes.** Si el cálculo del plan tiene 200 líneas con reglas pedagógicas, no debe vivir en un componente React.
5. **Reutilización.** Cuando llegue una app móvil React Native o un panel de profesores, la misma Edge Function sirve a los nuevos clientes.

---

## Diagrama de dependencias permitidas

```
[ pages/ ]  ─────────► [ components/ ]
    │                       │
    │                       ▼
    └────► [ hooks/ ] ────► [ lib/ ] ────► [ supabase Edge Functions ]
                              │
                              ▼
                         [ domain/, schemas/ ]
```

- `pages/` puede importar de todo.
- `components/` puede importar de `lib/`, `hooks/`, `domain/`, `schemas/`. **No** de `pages/`.
- `hooks/` puede importar de `lib/`, `domain/`, `schemas/`. **No** de `pages/` ni `components/`.
- `lib/` puede importar de `domain/` y `schemas/`. **No** de capas superiores.
- `domain/` y `schemas/` no importan nada del proyecto: solo librerías.

Edge Functions son código separado en `supabase/functions/`, en su propio runtime (Deno), no comparten imports con `src/` salvo tipos exportados explícitamente vía `lib/tipos.ts` (con copia, no symlink).

---

## Coste y rendimiento

- **Modelo:** `claude-opus-4-7`. Elegido sobre Sonnet porque el usuario consideró que la calidad de corrección es superior.
- **Prompt caching:** activo en las Edge Functions que llaman a Anthropic sobre la parte estática del system prompt. Con volumen, reduce el coste de input un 60-70 %.
- **Coste por evaluación típica:** ~0,05–0,10 USD (Opus es más caro que Sonnet; monitorizar en Anthropic console).
- **Cap mensual:** configurar "monthly spend limit" en Anthropic console.
- **Rate limit por usuario:** implementado en Edge Functions con `llm_uso` antes de llamar a Anthropic. Mantener los límites revisados si cambia el modelo o se abre a más usuarios.
- **Batch API:** NO aplica al corrector (feedback inmediato requerido).
