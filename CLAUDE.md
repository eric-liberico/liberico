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
- **React + TypeScript** (estricto)
- **Tailwind CSS**
- Generado inicialmente por **Lovable**, con plan de migrar a Cursor / Claude Code cuando la app madure (mes 3-4)

**Backend**
- **Supabase**: Auth + Postgres + Edge Functions + Storage
- **Row Level Security (RLS)** activo en toda tabla con datos de usuario

**IA**
- API de **Anthropic** (modelo `claude-sonnet-4-5`)
- Llamada **siempre desde una Edge Function de Supabase** (`evaluate-analysis`), nunca desde el cliente
- `ANTHROPIC_API_KEY` solo en secrets de Supabase Edge Functions

**Despliegue**
- Frontend: lo que Lovable conecte por defecto (Vercel u otro). Repo conectado a GitHub.
- Backend: Supabase Cloud.

Detalle de arquitectura, carpetas y flujo de datos: `docs/arquitectura.md`.

---

## Estado actual

- **MVP del corrector funcionando end-to-end.** El estudiante mete texto + pregunta + análisis y recibe la evaluación con bandas, nota IB, fortalezas, áreas de mejora y comentario global. Historial guardado en Supabase.
- **Pendiente:** módulo de diagnóstico inicial, plan de estudio personalizado, biblioteca de textos, microejercicios, gamificación.

Hoja de ruta: `docs/plan-desarrollo.md`.

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
- **Nunca** llames a la API de Anthropic desde un componente React o un hook del cliente. Toda llamada va por la Edge Function `evaluate-analysis`.
- **Nunca** crees una tabla en Supabase sin habilitar **RLS** y políticas explícitas (`auth.uid() = user_id`).
- **Nunca** parsees el JSON devuelto por Claude sin `try/catch` y sin validar shape. La Edge Function debe degradar con elegancia.
- **Nunca** comitees directamente a `main`. Siempre rama + Pull Request.
- **Nunca** subas datos de estudiantes reales (análisis, nombres, correos) al repositorio. Usa fixtures sintéticos en tests.
- **Nunca** hagas evaluaciones a la API sin **rate limiting por usuario**. Un bug o un abuso puede generar una factura sorpresa.
- **Nunca** cambies el modelo de Claude sin avisarme.
- **Nunca** toques migraciones de Supabase sin generar un `.sql` versionado.

---

## Workflow

Detalle: `docs/workflow-claude-code.md`. Resumen:

1. Una rama por feature, nunca trabajar sobre `main`.
2. Antes de comitear: `npx tsc --noEmit`, `npm run lint`, `npm run build`, prueba manual en local (caminos felices y caminos infelices).
3. Verificar que la `ANTHROPIC_API_KEY` no aparece en el bundle del cliente.
4. Verificar que tablas nuevas tienen RLS activo.
5. Subir rama, abrir PR, releer el diff en GitHub.
6. Para cambios grandes o sensibles, pedir review a un Claude independiente en claude.ai.

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
