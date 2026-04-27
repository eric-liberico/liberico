# IB Lit Coach

Aplicación web para estudiantes de Español A: Literatura del Bachillerato Internacional (IB),
Nivel Medio, centrada en la Prueba 1.

## Qué incluye

- Corrector de análisis literario con bandas A/B/C/D, puntuación sobre 20 y nota IB estimada.
- Solución anotada con highlights estructurales y de lenguaje, leyenda y comentarios al pasar el cursor o enfocar la marca.
- Ensayo completo elevado a banda 5 bajo demanda, basado en la voz, ideas y estructura del alumno.
- Historial persistente de correcciones con el feedback detallado completo del corrector.
- Diagnóstico inicial y generación de plan de estudio personalizado.
- Biblioteca de textos y microejercicios.
- Panel de profesor con seguimiento de alumnos, anotaciones y chat pedagógico.
- Panel de administración con métricas de uso LLM y gestión de usuarios.
- Panel de logs de desarrollo para capturar errores de consola, promesas rechazadas y respuestas `fetch` fallidas.

## Stack

- React + TypeScript + TanStack Router
- Tailwind CSS + shadcn/ui
- Supabase Auth, Postgres, RLS y Edge Functions
- Anthropic desde Edge Functions, nunca desde el cliente

## Desarrollo local

```bash
npm install
npm run dev
```

La app se prueba normalmente en `http://localhost:8080` si ese puerto está libre.

Para validar Edge Functions en local también hace falta Deno:

```bash
deno --version
```

Variables esperadas en `.env`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Los secretos de backend, como `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, deben vivir en
Supabase Edge Functions, no en el cliente.

## Verificación

```bash
npx tsc --noEmit
npm run lint
npx prettier --check .
deno task check:edge
deno task lint:edge
npm audit --audit-level=moderate
npm run build
npx supabase db lint --linked --fail-on error
```

La documentación funcional y técnica está en `CLAUDE.md` y `docs/`.
