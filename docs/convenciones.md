# Convenciones

Reglas de estilo, nombres y prácticas que el código del proyecto debe respetar. Cuando Claude Code genere código, debe seguir estas convenciones.

## Idioma

- **Nombres de componentes, módulos, variables, funciones y comentarios: en español.** Decisión consciente: el dominio (criterios IB, bandas, recursos literarios, análisis) está en español, y mantener la coherencia evita traducciones mentales constantes.
- **Mensajes de error mostrados al usuario:** en español.
- **Logs internos:** en español también, por consistencia.
- **Excepciones:** cuando se usa una librería que impone nombres en inglés (campos de Supabase Auth, props estándar de React, eventos del DOM, conceptos de TypeScript), respetar la convención de la librería.

Ejemplos:

```typescript
// Bien
export type Evaluacion = {
  bandas: Record<CriterioIB, BandaCriterio>;
  puntuacionTotal: number;
  notaIB: number;
};

function calcularNotaIB(puntuacion: number): number { /* ... */ }

// Mal — mezcla de idiomas
export type Evaluation = {
  bands: Record<IBCriterion, CriterionBand>;
  total_score: number;
  nota_ib: number;
};
```

Caso particular: en columnas de Postgres se acepta `snake_case` (`user_id`, `created_at`) por convención del SQL, pero los tipos en TS usan `camelCase` (`userId`, `createdAt`). El cliente Supabase tiene utilidades para convertir entre ambos.

## TypeScript

- **`"strict": true`** en `tsconfig.json`. No negociable.
- `npx tsc --noEmit` debe pasar sin errores antes de cualquier commit.
- **Type hints explícitos** en toda función exportada y en parámetros de hooks personalizados.
- Preferir `unknown` sobre `any`. Si tienes que usar `any`, comenta por qué.
- Uniones discriminadas para estados (`{ tipo: "cargando" } | { tipo: "ok"; datos: T } | { tipo: "error"; mensaje: string }`).

## React

- **Un componente por archivo.**
- **Componentes funcionales** con hooks. No clases.
- Componentes se nombran con `PascalCase` (en español): `PanelEvaluacion.tsx`, `TarjetaCriterio.tsx`.
- Hooks personalizados con prefijo `use`: `useAuth`, `useEvaluarAnalisis`. El nombre **después** del `use` puede ser español: `useEvaluaciones`.
- Props tipadas explícitamente:
  ```typescript
  type TarjetaCriterioProps = {
    criterio: CriterioIB;
    banda: number;
    justificacion: string;
  };

  export function TarjetaCriterio({ criterio, banda, justificacion }: TarjetaCriterioProps) { /* ... */ }
  ```
- **No se usa estado global complejo** (Redux/Zustand) salvo necesidad clara. Para datos de servidor, usar **TanStack Query (React Query)** o el equivalente que use el proyecto para cachear y sincronizar.
- **Lógica compleja fuera de los componentes.** Si un `useEffect` se infla, mover a un hook personalizado o a una función pura. Si la lógica es de negocio (cálculo de plan, evaluación), debe estar en una **Edge Function**, no en el cliente.

## Tailwind

- Clases utilitarias directamente en JSX. No `@apply` salvo para componentes verdaderamente reutilizables y muy compuestos.
- Diseño **mobile-first**: las clases base son móvil, los breakpoints (`sm:`, `md:`, `lg:`) añaden estilos para pantallas mayores.
- Componentes base reutilizables (botones, inputs, cards) en `/src/components/ui/` para no repetir clases largas.

## Supabase

- **El cliente Supabase del frontend** se inicializa en `/src/lib/supabase.ts` y se importa desde ahí. Nunca crear instancias dispersas.
- **Acceso a tablas desde React**: a través de hooks (`useEvaluaciones`, `usePerfil`) que envuelven las llamadas. No mezclar SQL en componentes.
- **Cada tabla con datos de usuario** debe tener:
  - `user_id uuid references auth.users not null`
  - `created_at timestamptz default now()`
  - **RLS habilitado** y al menos una política basada en `auth.uid() = user_id`.
- **Migraciones versionadas** en `supabase/migrations/`. Una migración por cambio. Nunca tocar el esquema en producción a mano.

## Edge Functions

- **Una carpeta por función** en `supabase/functions/`.
- **Validación de entrada con Zod** al inicio del handler.
- **Validación de salida con Zod** antes de escribir en BBDD (especialmente cuando viene de la API de Claude).
- **Manejo de errores tipado**: respuestas de error con shape estable `{ error: { codigo: string; mensaje: string } }`.
- **Logs**: usar `console.log` con formato estructurado. No incluir contenido completo de prompts ni respuestas en logs persistentes (puede contener datos del estudiante).
- **Secretos**: leer con `Deno.env.get("ANTHROPIC_API_KEY")`. Nunca hardcodear.

## Validación con Zod

Toda respuesta del modelo se valida antes de usarse. Patrón:

```typescript
import { z } from "zod";

const BandaSchema = z.object({
  banda: z.number().int().min(0).max(5),
  justificacion: z.string().min(20),
});

const EvaluacionSchema = z.object({
  bandas: z.object({
    A: BandaSchema,
    B: BandaSchema,
    C: BandaSchema,
    D: BandaSchema,
  }),
  comentarioGlobal: z.string(),
  fortalezas: z.array(z.string()),
  areasMejora: z.array(z.string()),
  debilidadesDetectadas: z.array(z.string()),
});

export type Evaluacion = z.infer<typeof EvaluacionSchema>;
```

Si el parseo falla, la Edge Function reintenta una vez con prompt más explícito. Si vuelve a fallar, devuelve un error claro al usuario, **no** una traza interna.

## Tests

- **Vitest** (o el framework que use el proyecto) para tests unitarios y de integración.
- **Playwright** o **Cypress** para tests end-to-end. Al menos una prueba de "subo análisis y veo evaluación".
- Estructura espejo: `src/domain/notaIB.ts` se testea en `tests/unit/notaIB.test.ts`.
- **Ejemplos calibrados** del corrector como fixtures en `tests/fixtures/ejemplos_calibracion/`. La suite de calibración verifica que la Edge Function devuelve bandas dentro de **±1** de la referencia (ver `docs/ejemplos-correccion.md`).
- Tests que llamen a la API real **deben** estar marcados (`describe.skip` por defecto, o detrás de una variable de entorno) para no quemar créditos en cada CI.

## Linting y formato

- **ESLint** y **Prettier** configurados. `npm run lint` y `npm run format:check` pasan antes de comitear.
- Línea máxima: 100 caracteres.
- Reglas activadas: las recomendadas + reglas estrictas de React Hooks (`exhaustive-deps`).

## Manejo de secretos

- `.env.example` versionado con placeholders.
- `.env` **gitignored**, contiene solo claves públicas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **`ANTHROPIC_API_KEY` solo en secrets de Supabase Edge Functions.** Nunca en `.env` del frontend ni en ningún fichero del repo.
- Antes de cada commit: `git diff` y buscar `sk-ant`, `ANTHROPIC`, claves sospechosas. Si aparece, abortar.
- En el bundle del cliente desplegado: abrir Developer Tools → Sources → buscar `sk-ant`. Si aparece, hay un fallo de seguridad crítico.

## Mensajes de commit

- En español, formato corto e imperativo.
- Buenos: "Añade panel de criterios", "Corrige conversión nota IB en Edge Function", "Refactoriza useEvaluaciones para soportar paginación".
- Malos: "cambios", "wip", "stuff", "Fixed bug".
- Si el commit toca varios archivos, el mensaje describe el **qué** y el **porqué** brevemente, no lista archivos.

## Ramas

- `main` siempre desplegable.
- Una rama por feature: `feature/diagnostico-inicial`, `feature/biblioteca-textos`.
- Para arreglos: `fix/parseo-json-edge-function`.
- **Nunca** comitear directamente a `main`. Siempre rama + PR + merge.

## Imports

- Orden: librerías externas → módulos internos absolutos → relativos. ESLint/Prettier lo ordena.
- Imports absolutos siempre que se pueda (con alias `@/` apuntando a `src/`):
  ```typescript
  // Bien
  import { TarjetaCriterio } from "@/components/TarjetaCriterio";
  import { useAuth } from "@/hooks/useAuth";

  // Aceptable (relativo en el mismo subdirectorio)
  import { calcularNotaIB } from "./notaIB";
  ```
- No usar `import * as`.
