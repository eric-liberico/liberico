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
- **Prompt caching activado** en ambas Edge Functions (parte estática del system prompt con `cache_control: { type: "ephemeral" }`)
- `ANTHROPIC_API_KEY` exclusivamente en secrets de Supabase Edge Functions

**Despliegue**
- Frontend: Lovable / Cloudflare (repo en GitHub: `EricPR1/ib-lit-coach`)
- Backend: Supabase Cloud, proyecto `tlspxuwiakcrhshwvjeo`
- CLI: `supabase` vinculado al proyecto de producción

Detalle de arquitectura, carpetas y flujo de datos: `docs/arquitectura.md`.

---

## Estado actual

**Fase 1 ✅** — Corrector end-to-end. Evaluación con bandas A/B/C/D, nota IB, fortalezas, áreas de mejora. Historial en Supabase.

**Fase 2 ✅** — Onboarding + diagnóstico inicial + plan de estudio personalizado.
- Rutas: `/onboarding`, `/mi-plan`.
- Edge Function `generate-study-plan` genera un plan por semanas según el perfil del estudiante.
- Tablas: `perfiles`, `planes_estudio`, `tareas_plan`.

**Fase 3 ✅** — Biblioteca de textos y microejercicios.
- Rutas: `/biblioteca`, `/ejercicios`.
- 12 textos canónicos con marco de análisis desbloqueado al analizar el texto en el corrector.
- El corrector acepta `?texto_id=uuid` para pre-rellenar desde la biblioteca.
- Tablas: `textos_biblioteca` (pública), `textos_vistos` (por usuario).
- Microejercicios: identificación de recursos, análisis de efectos, reescritura.

**Extras completados (fuera de fases):**

- **Panel de profesor** — Rutas `/profesor`, `/profesor-alumnos`, `/profesor-alumno.$alumnoId`, `/profesor-chat`. El profesor ve el historial de sus alumnos, puede anotar fragmentos del análisis del alumno con `TextoAnotado.tsx` (anotaciones inline con offsets de texto plano), dictar comentarios con `useDictado` (Web Speech API) y reescribirlos con Claude (`rewrite-feedback` edge function). Chat de consultas con Claude como asistente IB.

- **Eliminación de cuenta** — Ruta `/cuenta`. Cualquier usuario autenticado puede eliminar permanentemente su propia cuenta (confirmación con texto "eliminar") vía edge function `delete-account`.

- **Editor de texto enriquecido** — `RichTextEditor.tsx` con Tiptap (MIT). El corrector acepta negrita, cursiva y subrayado tanto en el análisis del estudiante como en el texto literario. La edge function recibe texto plano (stripped); el historial renderiza HTML.

- **Selección de rol en registro** — Tras signup se redirige a `/onboarding` (paso 0 = selección alumno/profesor) en lugar de al corrector directamente.

- **Panel de administración** ✅ (Fase 5 parcial) — Rutas `/admin`, `/admin-usuarios`. Solo accesible con `rol = 'admin'`. Incluye:
  - KPIs: peticiones totales, tokens, coste estimado (USD), usuarios activos en período.
  - Gráfico de evolución diaria (Recharts).
  - Desglose por función y por modelo.
  - Top 20 usuarios por consumo.
  - Filtro por rango de fechas.
  - Tabla de usuarios con búsqueda + filtro por rol, paginación, y acciones: cambiar rol, activar/desactivar, resetear contraseña (genera enlace), eliminar cuenta.
  - Audit log en `admin_logs`.
  - Todas las edge functions instrumentadas para registrar uso LLM en `llm_uso` (fire-and-forget).
  - Tablas: `llm_uso`, `llm_precios`, `admin_logs`. Campo `activo` añadido a `perfiles`.

**Fase 4 — Pendiente:** gamificación (progreso por criterio, medallas, racha, colección de recursos).
**Fase 5 — Pendiente (resto):** pulido UX, mobile, política de privacidad, tiers.

Hoja de ruta detallada: `docs/plan-desarrollo.md`.

---

## Modelo de evaluación

El corrector aplica los cuatro criterios oficiales del IB para Prueba 1, NM. Cada criterio puntúa 0-5; total 0-20.

**Tabla oficial de conversión a nota IB (1-7):**

| Puntuación total | Nota IB |
|---|---|
| 0–3 | 1 |
| 4–6 | 2 |
| 7–9 | 3 |
| 10–12 | 4 |
| 13–15 | 5 |
| 16–18 | 6 |
| 19–20 | 7 |

Los descriptores oficiales, los diez consejos del IB y el marco conceptual del curso están en `docs/modelo-evaluacion.md`.

**Importante:** los ejemplos calibrados (Cristina, Maija, Dylan, Máximo, Elena) en `docs/ejemplos-correccion.md` son **ground truth** del corrector. La Edge Function debe replicar sus bandas dentro de ±1.

---

## Convenciones críticas

Detalle completo en `docs/convenciones.md`. Resumen:

- **Idioma de UI, código, comentarios y commits: español.** El dominio (criterios IB, recursos literarios) está en español; la coherencia evita traducciones mentales.
- **TypeScript estricto** (`"strict": true` en `tsconfig.json`). `npx tsc --noEmit` debe pasar.
- **ESLint + Prettier** sin warnings antes de comitear.
- **Componentes**: uno por archivo, en `/src/components/`.
- **Lógica compleja en Edge Functions**, no en componentes React. Si un componente tiene lógica de negocio no trivial, sácala a una función o a una Edge Function.
- **Acceso a Supabase desde el cliente solo a través de hooks** o de una capa fina en `/src/lib/supabase.ts`. No mezclar SQL en componentes.
- **Validar respuestas de la API** con Zod (o equivalente) antes de usar el JSON. Nunca confiar en que el modelo devuelve el shape correcto.

---

## Reglas críticas — NO HACER

- **Nunca** pongas la `ANTHROPIC_API_KEY` en código del cliente, en `.env` versionado, o en cualquier fichero subido a Git. Solo en secrets de Supabase Edge Functions.
- **Nunca** llames a la API de Anthropic desde un componente React o un hook del cliente. Toda llamada va por Edge Functions.
- **Nunca** crees una tabla en Supabase sin habilitar **RLS** y políticas explícitas (`auth.uid() = user_id`).
- **Nunca** parsees el JSON devuelto por Claude sin `try/catch` y sin validar shape. La Edge Function debe degradar con elegancia.
- **Nunca** comitees directamente a `main`. Siempre rama + Pull Request.
- **Nunca** subas datos de estudiantes reales (análisis, nombres, correos) al repositorio. Usa fixtures sintéticos en tests.
- **Nunca** añadas a la biblioteca fragmentos literarios de autores fallecidos hace menos de 70 años (ej. Neruda, Borges, García Márquez) sin evaluar el riesgo legal primero. La empresa es sueca: aplica el **§ 22 Upphovsrättslagen (URL)**, que permite citar obras publicadas de forma breve y proporcionada (*god sed*), sin excluir explícitamente el uso comercial — pero el uso sistemático de fragmentos protegidos como núcleo de una app de pago puede dejar de ser "proporcionado". Antes de monetizar, consulta jurídica o sustituye esos fragmentos por textos de dominio público.
- **Nunca** copies verbatim los descriptores o rúbricas del IBO — son propiedad de IBO. Parafrasea siempre.
- **Nunca** instales un paquete npm con licencia GPL en el cliente sin avisarme (es copyleft y puede obligar a publicar el código fuente).
- **Nunca** hagas evaluaciones a la API sin **rate limiting por usuario**. Un bug o un abuso puede generar una factura sorpresa.
- **Nunca** cambies el modelo de Claude sin avisarme.
- **Nunca** toques migraciones de Supabase sin generar un `.sql` versionado.
- **Nunca** termines una feature importante sin actualizar `CLAUDE.md` y el `docs/` relevante. Esto es crítico para mantener la coherencia entre sesiones de Claude Code.

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
2. Antes de comitear: `npx tsc --noEmit`, `npm run lint`, `npm run build`, prueba manual en local (caminos felices y caminos infelices).
3. **Revisión de seguridad, bugs, copyright y privacidad** (obligatoria antes de cada commit — ver checklist completo en `docs/workflow-claude-code.md`). **Claude Code debe mostrar siempre en el chat el resultado de esta revisión antes de ejecutar `git commit`**, indicando archivo por archivo qué ha comprobado y qué ha encontrado. No es suficiente hacerla internamente — si no aparece en el chat, no cuenta.
   - Secretos: `ANTHROPIC_API_KEY` nunca en el cliente ni en el diff.
   - Parámetros de URL validados antes de usarlos en queries de BD.
   - Tablas nuevas con RLS + política `auth.uid() = user_id`.
   - Errores de Supabase manejados explícitamente (toast o fallback), nunca silenciados.
   - Aserciones `!` solo dentro de guards que las garantizan.
   - JSON de Claude validado con Zod antes de usarse.
   - Fragmentos literarios nuevos: dominio público o amparados por § 22 URL sueca (breve, proporcionado, *god sed*, con atribución). Los textos de autores †<70 años (Neruda, Borges, García Márquez) son de uso razonable ahora, pero requieren evaluación antes de monetizar.
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
