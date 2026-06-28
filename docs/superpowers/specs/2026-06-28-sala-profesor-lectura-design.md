# Sala del profesor — rediseño + lectura completa de pruebas

**Fecha:** 2026-06-28
**Estado:** Aprobado (diseño).
**Rama:** `feat/sala-clase-1a1`

## Objetivo

Mejorar la interfaz de la sala del profesor (`/clase/$bookingId`, vista del
profe) y permitirle **leer el contenido completo** de las correcciones del
alumno: el **texto/consigna**, la **respuesta del alumno** y la **evaluación**
(notas + justificaciones + feedback), para P1, P2 y Oral de Literatura.

## No-objetivos

- No se toca el flujo de reserva, la invitación de calendario ni la vista del
  alumno.
- Sin migración (la RLS ya autoriza al profe a leer P1/P2/Oral con acceso
  activo). Sin Edge Functions, sin IA.

## Decisiones (brainstorming)

- Lectura mediante **panel deslizante (slide-over)**: clic en una corrección
  abre un panel amplio con pestañas Texto / Respuesta del alumno / Evaluación.
- La **lista** se mantiene ligera; el contenido largo se **carga al abrir** cada
  corrección (una fila por id desde su tabla).

## Arquitectura

### Componentes / archivos

- `src/components/clase/correction-content.ts` (nuevo) — tipos + configuración
  por prueba (qué columnas pedir, cómo mapear "texto", "respuesta",
  "evaluación") + función de carga de una corrección completa por `{ paper, id }`.
- `src/components/clase/CorrectionReader.tsx` (nuevo) — panel slide-over
  accesible (role="dialog", aria-modal, Esc, cierre por fondo, foco), con
  pestañas Texto / Respuesta / Evaluación. Carga perezosa del contenido al abrir.
- `src/components/clase/TeacherRoom.tsx` (rediseño) — cabecera del alumno
  (enfoque + objetivo + medias por prueba con criterio más flojo), lista de
  correcciones como filas escaneables con botón "Leer" que abre el reader.

### Datos por prueba (lo que muestra el reader)

- **P1 `evaluaciones`**: Texto = `texto_literario` + `pregunta_orientacion`;
  Respuesta = `analisis_estudiante`; Evaluación = `banda_a..d`, `nota_ib`,
  `justificacion_a..d`, `fortalezas`, `areas_mejora`, `comentario_global`.
- **P2 `evaluaciones_prueba2`**: Texto = `pregunta` + `obra_1`/`obra_2`
  (+ `notas_obra_1/2`); Respuesta = `ensayo_estudiante`; Evaluación =
  `criterio_a/b1/b2/c/d`, `justificacion_a/b1/b2/c/d`, `fortalezas`,
  `areas_mejora`, `comentario_global`.
- **Oral `evaluaciones_oral`**: Texto = `asunto_global` + obras
  (`obra_1_titulo/autor/tipo`, `extracto_1`, `notas_obra_1`, idem obra 2);
  Respuesta = `guion_oral`; Evaluación = `criterio_a..d`, `justificacion_a..d`,
  `fortalezas`, `areas_mejora`, `comentario_global`.

### Carga

- Lista: query ligero por prueba (id, created_at, notas/criterios + un campo de
  título: `texto_literario`/`pregunta`/`asunto_global`), `limit 10`, orden
  desc. Gateado por `booking_teacher_access` activo (igual que ahora).
- Al abrir: `select` de la fila completa por id desde la tabla correspondiente.

## Estética / accesibilidad

- Tokens de `@/lib/landing-theme`; ancho de lectura cómodo (prosa), texto
  literario legible; pestañas claras; criterio más flojo resaltado (no solo
  color). `prefers-reduced-motion`, `focus-visible`, foco atrapado en el panel,
  Esc para cerrar. Desktop-first, panel a pantalla completa en móvil. Bilingüe
  `isEN`.

## Criterios de éxito

1. El profe abre `/clase/<id>`, ve una sala clara con enfoque + medias +
   correcciones escaneables.
2. Al pulsar una corrección, lee el texto, la respuesta del alumno y la
   evaluación completa (por criterio) de P1/P2/Oral.
3. Sin acceso → estado claro. `tsc` + `build` verdes. Desplegado a `dev`.
