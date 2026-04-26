# Arquitectura

Stack: **React + TypeScript + Tailwind** en el frontend, **Supabase** en el backend (Auth + Postgres + Edge Functions + Storage) y la **API de Anthropic** invocada exclusivamente desde una Edge Function.

La regla central: **toda la lógica sensible (llamadas a Anthropic, validación de cuotas, parseo de respuestas, escrituras críticas) vive en Edge Functions, no en el cliente.** El cliente es una capa de presentación que habla con Supabase.

---

## Estructura de carpetas (estado real a 2026-04-26)

```
ib-lit-coach/
│
├── CLAUDE.md                          ← Lectura obligada para Claude Code
├── package.json
├── tsconfig.json                      ← strict: true
├── vite.config.ts                     ← usa @lovable.dev/vite-tanstack-config
├── .env                               ← gitignored (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── .gitignore
│
├── src/
│   ├── router.tsx                     ← Configuración del router TanStack
│   ├── routeTree.gen.ts               ← Auto-generado por TanStack Router; NO editar a mano
│   ├── styles.css
│   │
│   ├── routes/                        ← File-based routing (TanStack Router)
│   │   ├── __root.tsx                 ← Layout raíz, AuthProvider, Toaster
│   │   ├── index.tsx                  ← /  → Corrector (acepta ?texto_id=uuid)
│   │   ├── login.tsx                  ← /login
│   │   ├── onboarding.tsx             ← /onboarding → Diagnóstico + generación de plan
│   │   ├── mi-plan.tsx                ← /mi-plan → Plan de estudio por semanas
│   │   ├── historial.tsx              ← /historial → Evaluaciones pasadas
│   │   ├── biblioteca.tsx             ← /biblioteca → 12 textos canónicos
│   │   └── ejercicios.tsx             ← /ejercicios → Microejercicios (3 tipos)
│   │
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui (no tocar salvo actualización de librería)
│   │   ├── EvaluacionPanel.tsx        ← Panel de resultados A/B/C/D
│   │   └── SiteHeader.tsx             ← Navegación principal
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx                ← Sesión Supabase + AuthProvider
│   │   └── use-mobile.tsx
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts                  ← createClient (usa VITE_* env vars)
│   │   ├── client.server.ts           ← Cliente SSR (Cloudflare/servidor)
│   │   ├── types.ts                   ← Tipos generados del esquema Supabase (actualizar al añadir tablas)
│   │   └── auth-middleware.ts
│   │
│   └── lib/
│       ├── ib.ts                      ← CRITERIOS, notaIB(), tipo Evaluacion
│       ├── diagnostico.ts             ← Helpers del onboarding
│       └── utils.ts                   ← cn()
│
├── supabase/
│   ├── config.toml                    ← Proyecto: tlspxuwiakcrhshwvjeo
│   ├── migrations/
│   │   ├── 20260425140834_*.sql       ← profiles + evaluaciones
│   │   ├── 20260425144906_*.sql       ← perfiles + planes_estudio + tareas_plan
│   │   └── 20260426100000_biblioteca_fase3.sql  ← textos_biblioteca + textos_vistos
│   └── functions/                     ← Edge Functions (runtime Deno)
│       ├── evaluate-analysis/index.ts ← Corrector: llama a claude-opus-4-7
│       └── generate-study-plan/index.ts  ← Genera plan por semanas
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
[Estudiante en Corrector.tsx]
        │ rellena texto, pregunta, análisis
        ▼
[useEvaluarAnalisis hook]
        │ llama a supabase.functions.invoke("evaluate-analysis", { body })
        ▼
[Edge Function evaluate-analysis]
        │ 1. Verifica auth.uid() del JWT
        │ 2. Comprueba rate limit del usuario (consulta a Postgres)
        │ 3. Construye el prompt con descriptores + entrada del usuario
        │ 4. Llama a Anthropic API (claude-sonnet-4-5) con prompt caching
        │ 5. Parsea y valida el JSON con Zod
        │ 6. Calcula nota IB con la tabla oficial
        │ 7. Inserta la fila en evaluaciones (RLS asegura user_id correcto)
        │ 8. Devuelve la evaluación al cliente
        ▼
[PanelEvaluacion.tsx]
        │ renderiza las 4 tarjetas, total, nota IB, fortalezas, áreas de mejora
        ▼
[Estudiante ve el resultado]
```

**Puntos clave:**

- La `ANTHROPIC_API_KEY` solo existe dentro de la Edge Function (variable de entorno secreta).
- El cliente nunca habla con Anthropic directamente. Si lo hace, hay un bug de seguridad.
- RLS garantiza que el `user_id` de la fila insertada es el del usuario autenticado, sin que la Edge Function pueda saltárselo.
- Todo error en la API de Claude (timeout, JSON malformado, contenido bloqueado) se atrapa en la Edge Function y se devuelve un error tipado que el cliente sabe renderizar con un mensaje empático.

---

## Esquema de base de datos (Supabase / Postgres)

Todas las tablas con datos de usuario tienen **RLS habilitado** y políticas explícitas. Las tablas de contenido curado (sin datos de usuario) son de solo lectura para usuarios autenticados.

### Tablas implementadas

| Tabla | Fase | RLS | Descripción |
|---|---|---|---|
| `profiles` | 1 | por user | Perfil básico (display_name). Auto-creado al registrarse. |
| `evaluaciones` | 1 | por user | Historial de evaluaciones del corrector. |
| `perfiles` | 2 | por user | Perfil pedagógico (fecha examen, horas/semana, bandas iniciales, etc.). |
| `planes_estudio` | 2 | por user | Plan generado por IA, con semanas y enfoque. Campo `activo`. |
| `tareas_plan` | 2 | via plan | Tareas individuales del plan. RLS hereda del `plan_id`. |
| `textos_biblioteca` | 3 | lectura autenticada | 12 textos canónicos con marco de análisis. Solo lectura para usuarios. |
| `textos_vistos` | 3 | por user | Qué textos ha analizado cada usuario (desbloquea el marco). |

**Tablas pendientes (Fase 4):**
- `progreso_bloques` — avance por criterio en el tiempo.
- `medallas` — logros desbloqueados.
- `rachas` — días consecutivos de actividad.
- `coleccion_recursos` — recursos literarios identificados correctamente.

Cada nueva tabla **debe** tener RLS habilitado en la misma migración que la crea. Sin excepciones.

### Migraciones

- Cada cambio de esquema va en su propio fichero `.sql` en `supabase/migrations/`.
- **Nunca** modificar el esquema en producción a mano: siempre por migración versionada.
- Para aplicar: `supabase db push` (requiere CLI vinculado al proyecto).

---

## Edge Functions

### Convenciones generales

- Una carpeta por función en `supabase/functions/`.
- `index.ts` es el handler completo (funciones cortas; si crece, separar módulos).
- Siempre verificar JWT al inicio: `supabase.auth.getUser(token)`.
- Usar **prompt caching**: `system` como array con `cache_control: { type: "ephemeral" }` en el bloque estático.
- Tool use forzado (`tool_choice: { type: "tool", name: "..." }`) para garantizar salida estructurada.
- Errores 429 y 529 de Anthropic tienen manejo explícito con mensajes de usuario.
- Despliegue: `supabase functions deploy <nombre>`.

### `evaluate-analysis` ✅

Recibe `{ texto, pregunta, analisis }` vía POST.

1. Verifica JWT → `user_id`.
2. Llama a `claude-opus-4-7` con los 4 descriptores oficiales IB como system prompt cacheado.
3. Fuerza tool use `registrar_evaluacion` → recibe bandas A/B/C/D + justificaciones + fortalezas + áreas + comentario.
4. Calcula `nota_ib` con la tabla oficial (0-3→1, …, 19-20→7).
5. Devuelve la evaluación al cliente (el cliente la guarda en `evaluaciones`).

### `generate-study-plan` ✅

Sin body (usa el perfil del usuario autenticado).

1. Verifica JWT → `user_id`.
2. Carga `perfiles` del usuario: fecha de examen, horas/semana, bandas iniciales.
3. Calcula semanas hasta el examen.
4. System prompt: parte estática (principios pedagógicos) cacheada + parte dinámica (perfil concreto).
5. Fuerza tool use `registrar_plan_estudio` → lista de tareas por semana.
6. Desactiva planes previos, inserta nuevo plan + tareas en `planes_estudio` y `tareas_plan`.
7. Devuelve `{ plan_id, preliminar, tareas_count }`.

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
- **Prompt caching:** activo en ambas Edge Functions sobre la parte estática del system prompt. Con volumen, reduce el coste de input un 60-70 %.
- **Coste por evaluación típica:** ~0,05–0,10 USD (Opus es más caro que Sonnet; monitorizar en Anthropic console).
- **Cap mensual:** configurar "monthly spend limit" en Anthropic console.
- **Rate limit por usuario:** pendiente de implementar. Añadir antes de abrir a más usuarios.
- **Batch API:** NO aplica al corrector (feedback inmediato requerido).
