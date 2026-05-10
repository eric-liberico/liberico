# CLAUDE.md

Contexto inicial para Claude Code en LIBerico. **Léelo siempre**, pero no cargues documentación adicional salvo que el cambio lo requiera. El objetivo es reducir coste y ruido: un cambio, un alcance, pocos archivos.

## Política de Contexto y Coste

- Claude Code debe usar **Sonnet por defecto** para desarrollo normal.
- Usa Opus solo para arquitectura difícil, RLS/seguridad crítica, migraciones complejas, calibración de prompts IB o revisión final de cambios grandes.
- Antes de leer archivos grandes, localiza con `rg` el área exacta. No leas "todo el repo" salvo auditorías explícitas.
- Para cambios pequeños, limita la edición inicial a 1-3 archivos. Si necesitas más, explica por qué.
- Para errores de TypeScript, lint o build, trabaja desde el primer error relevante y no pegues logs completos si basta un extracto.
- No cambies modelos de producción de Anthropic sin instrucción explícita del usuario.

## Qué es LIBerico

Aplicación web para estudiantes de **IB Language A: Literature** (Español A y English A) y **Spanish B: Language**, centrada en práctica, evaluación y feedback pedagógico.

Capacidades principales:

- **Literature P1**: corrector de análisis literario con criterios A/B/C/D, nota IB, feedback, historial y extras.
- **Literature P2**: ensayo comparativo, diagnóstico comparativo, feedback y ensayo modelo.
- **Oral Individual**: evaluación del guion oral, asunto global, estructura, equilibrio entre obras y preguntas/respuestas.
- **Spanish B P1**: MVP activo para producción escrita SL con criterios A/B/C, catálogo de prompts e historial.
- **Profesor/admin**: panel de alumnos, chat docente, reservas, sesiones 1:1, métricas LLM y gestión de usuarios.
- **Soporte multiasignatura**: `course_key` (`spanish-a-literature`, `english-a-literature`, `spanish-b-language`) y UI ES/EN con `useUiLang()`.

Usuarios principales: adolescentes de IB. La app debe funcionar bien en móvil.

## Stack

Frontend:

- React + TypeScript estricto.
- Tailwind CSS + shadcn/ui.
- TanStack Router en `src/routes/`.
- Vite/TanStack Start.

Backend:

- Supabase Auth, Postgres, Storage y Edge Functions.
- RLS obligatorio en toda tabla con datos de usuario.
- Edge Functions en `supabase/functions/`.
- Migraciones versionadas en `supabase/migrations/`.

IA:

- Anthropic desde Edge Functions, nunca desde el cliente.
- `ANTHROPIC_API_KEY` solo en Supabase secrets.
- Prompt caching en llamadas con system prompt estático.
- Uso LLM registrado en `llm_uso`; costes en panel admin.
- OpenAI se usa para transcripción oral cuando aplique.

## Dónde Mirar

Usa estos documentos solo cuando el cambio toque ese tema:

- `docs/arquitectura.md` — estructura, Edge Functions, flujo de datos y tablas.
- `docs/workflow-claude-code.md` — ramas, verificaciones, revisión pre-commit y modo barato.
- `docs/objetivo-y-alcance.md` — producto, usuarios y límites.
- `docs/modelo-evaluacion.md` — criterios IB y conversión de notas.
- `docs/metodologia-pedagogica.md` — enfoque didáctico.
- `docs/ejemplos-correccion.md` — calibración del corrector.
- `docs/analisis-costes-api.md` — costes de modelos y métricas.
- `docs/modelo-negocio.md` — pricing, tiers y límites.
- `docs/convenciones.md` — convenciones de código.
- `TASKS_TO_DO.md` — tareas pendientes.
- `TRANSLATION_PLAN.md` — plan de traducción, si el cambio toca English A.

## Convenciones Críticas

- Usa patrones existentes antes de crear abstracciones nuevas.
- Mantén `CourseKey`, `COURSES`, capabilities y `useUiLang()` coherentes al tocar asignaturas.
- En frontend, maneja loading/error explícitamente; no silencies errores de Supabase.
- En Edge Functions, valida JWT al inicio y usa service role solo dentro de backend.
- Toda respuesta JSON de Claude debe pasar por tool use/JSON Schema, Zod o guards manuales antes de usarse.
- Al añadir tablas: migración SQL versionada, RLS activo, políticas explícitas e índices razonables.
- Al tocar texto IB: parafrasea; no copies rúbricas o descriptores oficiales verbatim.
- Al tocar textos literarios: evita material protegido salvo cita breve, atribuida y justificada.
- Al añadir paquetes: licencia permisiva (MIT, Apache 2.0, BSD o equivalente); avisa antes de GPL.

## Reglas Críticas — NO HACER

- Nunca pongas `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` u otros secretos en cliente, `.env` versionado o commits.
- Nunca llames a Anthropic desde React/hooks. Toda llamada va por Edge Functions.
- Nunca crees tablas con datos de usuario sin RLS.
- Nunca hagas evaluaciones LLM sin rate limiting por usuario.
- Nunca parsees JSON de Claude sin validación y manejo de fallo.
- Nunca subas datos reales de estudiantes.
- Nunca comitees directamente a `main`.
- Nunca toques migraciones aplicadas reescribiéndolas; crea una migración nueva.
- Nunca termines una feature importante sin actualizar la documentación relevante, pero no infles `CLAUDE.md` con historial largo.

## Workflow

Resumen operativo:

1. Trabaja en rama, no en `main`.
2. Localiza con `rg` antes de leer o editar.
3. Haz cambios estrechos y coherentes con patrones existentes.
4. Ejecuta checks relevantes:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `deno task check:edge`
   - `deno task lint:edge`
   - `npm run build`
5. Antes de commit, revisa diff completo por seguridad, bugs, copyright, privacidad y secretos.
6. Para cambios grandes o sensibles, usa revisión independiente, preferiblemente con contexto reducido y diff acotado.

Detalle completo en `docs/workflow-claude-code.md`.

## Notas de Producto Actuales

- Spanish B Paper 1 está activo, pero sus prompts están marcados como draft/calibración pendiente.
- P1/P2/Oral Literature usan evaluaciones y feedback con llamadas Anthropic desde Edge Functions.
- `teacher-chat` y varias funciones generativas pueden usar modelos más baratos, pero cambios de modelo de producción requieren aprobación explícita.
- El panel admin ya mide uso LLM desde `llm_uso`; úsalo para validar ahorros reales.
