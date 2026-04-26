# Arquitectura

Stack: **React + TypeScript + Tailwind** en el frontend, **Supabase** en el backend (Auth + Postgres + Edge Functions + Storage) y la **API de Anthropic** invocada exclusivamente desde una Edge Function.

La regla central: **toda la lógica sensible (llamadas a Anthropic, validación de cuotas, parseo de respuestas, escrituras críticas) vive en Edge Functions, no en el cliente.** El cliente es una capa de presentación que habla con Supabase.

---

## Estructura de carpetas

Lovable genera una estructura próxima a la siguiente. El nombre exacto de algunas carpetas puede variar; **lo importante es respetar la separación de responsabilidades**, no la nomenclatura.

```
ib-literatura-app/
│
├── README.md
├── CLAUDE.md                         ← Lectura obligada para Claude Code
├── package.json
├── tsconfig.json                     ← strict: true
├── tailwind.config.ts
├── vite.config.ts                    ← (o el bundler que use Lovable)
├── .env.example                      ← Variables públicas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── .env                              ← gitignored
├── .gitignore
│
├── src/
│   ├── main.tsx                      ← Punto de entrada
│   ├── App.tsx                       ← Router principal
│   │
│   ├── pages/                        ← Una por ruta
│   │   ├── Index.tsx                 ← Página de inicio
│   │   ├── Login.tsx
│   │   ├── Corrector.tsx             ← Página principal del MVP
│   │   ├── Historial.tsx
│   │   ├── Diagnostico.tsx           ← Pendiente
│   │   ├── Plan.tsx                  ← Pendiente
│   │   ├── Biblioteca.tsx            ← Pendiente
│   │   ├── Ejercicios.tsx            ← Pendiente
│   │   └── Progreso.tsx              ← Pendiente
│   │
│   ├── components/                   ← Componentes reutilizables, uno por archivo
│   │   ├── ui/                       ← Componentes base (botones, inputs, cards…)
│   │   ├── PanelEvaluacion.tsx       ← Resultado del corrector
│   │   ├── TarjetaCriterio.tsx       ← Una tarjeta por criterio (A, B, C, D)
│   │   ├── GraficoProgreso.tsx       ← Pendiente
│   │   └── ...
│   │
│   ├── hooks/                        ← Lógica reutilizable de React
│   │   ├── useAuth.ts                ← Sesión de Supabase
│   │   ├── useEvaluaciones.ts        ← CRUD del historial
│   │   ├── useEvaluarAnalisis.ts     ← Llama a la Edge Function
│   │   └── ...
│   │
│   ├── lib/                          ← Capa fina sobre librerías
│   │   ├── supabase.ts               ← Cliente Supabase configurado
│   │   ├── api.ts                    ← Wrappers de Edge Functions
│   │   └── tipos.ts                  ← Tipos compartidos del dominio
│   │
│   ├── domain/                       ← Tipos y helpers puros del dominio (opcional)
│   │   ├── evaluacion.ts             ← Tipos Evaluacion, BandaCriterio, CriterioIB
│   │   ├── notaIB.ts                 ← Conversión puntuación → nota IB
│   │   └── ...
│   │
│   ├── schemas/                      ← Esquemas de validación Zod
│   │   ├── evaluacion.ts             ← Valida lo que devuelve Claude
│   │   └── ...
│   │
│   └── styles/
│       └── globals.css
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                   ← Una migración .sql por cambio de esquema
│   │   ├── 20260101_init_evaluaciones.sql
│   │   └── ...
│   └── functions/                    ← Edge Functions (Deno + TypeScript)
│       ├── evaluate-analysis/
│       │   ├── index.ts              ← Función principal del corrector
│       │   ├── prompt.ts             ← Construcción del prompt (descriptores + texto + análisis)
│       │   ├── descriptores.ts       ← Descriptores oficiales IB (parte fija del prompt)
│       │   └── parsear.ts            ← Parseo y validación con Zod del JSON de Claude
│       ├── generar-plan/             ← Pendiente
│       │   └── index.ts
│       └── _shared/
│           └── cors.ts               ← Headers CORS compartidos
│
├── tests/
│   ├── unit/
│   │   ├── notaIB.test.ts
│   │   └── parseo.test.ts
│   ├── e2e/                          ← Playwright o Cypress
│   │   └── corrector.spec.ts
│   └── fixtures/
│       └── ejemplos_calibracion/     ← Análisis con bandas de referencia
│
└── docs/
    ├── objetivo-y-alcance.md
    ├── arquitectura.md
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

Todas las tablas con datos de usuario tienen **RLS habilitado** y políticas explícitas.

### Tabla `evaluaciones` (ya implementada en el MVP)

```sql
create table evaluaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  texto_literario text not null,
  pregunta_orientacion text not null,
  analisis_estudiante text not null,

  banda_a int check (banda_a between 0 and 5),
  banda_b int check (banda_b between 0 and 5),
  banda_c int check (banda_c between 0 and 5),
  banda_d int check (banda_d between 0 and 5),

  justificacion_a text,
  justificacion_b text,
  justificacion_c text,
  justificacion_d text,

  puntuacion_total int generated always as
    (banda_a + banda_b + banda_c + banda_d) stored,
  nota_ib int,

  fortalezas text,
  areas_mejora text,
  comentario_global text,
  debilidades_detectadas text[],

  created_at timestamptz default now()
);

alter table evaluaciones enable row level security;

create policy "Usuarios ven sus propias evaluaciones"
  on evaluaciones for all
  using (auth.uid() = user_id);
```

### Tablas pendientes (Fase 2 y siguientes)

Se definirán cuando se implementen los módulos correspondientes. Esquema orientativo:

- `perfiles` — datos públicos del usuario (nombre, fecha de examen, tiempo semanal disponible).
- `diagnosticos` — resultado de la prueba diagnóstica inicial.
- `planes_estudio` — plan generado, con su distribución por etapas.
- `tareas_plan` — tareas individuales con estado (pendiente / en curso / completada).
- `progreso_bloques` — avance del estudiante por bloque pedagógico.
- `medallas` — logros desbloqueados.
- `coleccion_recursos` — recursos literarios desbloqueados.

Cada nueva tabla **debe** tener RLS habilitado en la misma migración que la crea. Sin excepciones.

### Migraciones

- Cada cambio de esquema va en su propio fichero `.sql` numerado en `supabase/migrations/`.
- **Nunca** modificar el esquema en producción a mano: siempre por migración versionada.
- Antes de mergear una migración a `main`, probarla contra una base de datos de staging.

---

## Edge Functions

### Convenciones generales

- Una carpeta por función en `supabase/functions/`.
- `index.ts` es el handler. Si la función tiene varios módulos (prompt, parseo, validación), se separan en archivos hermanos.
- TypeScript estricto.
- Validación de entrada con Zod al principio del handler.
- Validación de salida (lo que devuelve el modelo) con Zod antes de escribir en BBDD.
- Manejo de errores centralizado: cualquier error devuelve `{ error: { codigo, mensaje } }` con status HTTP apropiado.

### `evaluate-analysis` (corrector — implementada)

Recibe `{ texto_literario, pregunta_orientacion, analisis_estudiante }`.

Flujo:

1. Valida JWT y resuelve `user_id`.
2. Comprueba rate limit (ej. máximo 10 evaluaciones por usuario y día).
3. Construye el prompt: parte fija (sistema + descriptores oficiales) cacheable + parte variable (los tres campos del usuario).
4. Llama a Anthropic con `claude-sonnet-4-5` y **prompt caching activado** sobre la parte fija (descuento del 90 % en input cacheado).
5. Recibe respuesta JSON estructurada.
6. Parsea con Zod. Si falla, reintenta una vez con prompt más explícito; si vuelve a fallar, devuelve error legible.
7. Calcula `nota_ib` con la tabla oficial.
8. Inserta la fila en `evaluaciones`.
9. Devuelve la evaluación al cliente.

### `generar-plan` (pendiente)

Recibirá `{ diagnostico, fecha_examen, tiempo_semanal }` y devolverá un plan de estudio estructurado en etapas y tareas. Vivirá aquí, no en el cliente, porque el cálculo es no trivial y consultará el catálogo de bloques.

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

- **Modelo:** `claude-sonnet-4-5`. Buena relación calidad/coste para esta tarea.
- **Prompt caching:** activar en la parte fija del prompt (sistema + descriptores oficiales) → descuento del 90 % en input cacheado. Esto reduce la factura un 60-70 % cuando hay volumen.
- **Coste por evaluación típica:** ~0,02 USD.
- **Cap mensual:** configurar un "monthly spend limit" en Anthropic console (ej. 20 USD al inicio).
- **Rate limit por usuario:** máximo X evaluaciones / día (definir en la Edge Function leyendo de una tabla `cuotas` o de `evaluaciones` con count + filtro por `created_at`).
- **Batch API (50 % descuento):** **NO sirve** para el corrector (el estudiante quiere feedback inmediato). Sí puede servir más adelante para procesos nocturnos (generación masiva de planes, repasos).
