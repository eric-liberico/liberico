-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1.3 — Foundations for Spanish B (Language B) MVP.
--
-- Cambios puramente aditivos. Ninguna fila existente se modifica.
--
--   1. Catálogo: inserta el curso 'spanish-b-language' con is_active = false.
--      Permanece oculto en la UI hasta que Phase 2 lo active (admin update).
--
--   2. evaluaciones / evaluaciones_prueba2 / evaluaciones_oral:
--      añade columna `criteria_scores JSONB` para guardar puntuaciones de
--      sets de criterios que no caben en banda_a/b/c/d (ej. Spanish B P1:
--      A Lenguaje /12, B Mensaje /12, C Comprensión conceptual /6).
--
--      Las edge functions de Lit siguen escribiendo banda_* como hoy. Las
--      futuras edge functions de Spanish B escribirán criteria_scores y
--      dejarán banda_* en su default. La validación de shape (Zod) se hace
--      en lectura desde el cliente y al insertar desde el Edge Function.
--
--   3. llm_uso: añade `course_key` (nullable) + índice compuesto. Habilita
--      cuotas por (user, course, paper) cuando Phase 2 las necesite. Las
--      RPCs existentes (reservar_cuota_evaluacion, reservar_cuota_prueba2,
--      reservar_cuota_oral, reservar_cuota_apuntes_oral) NO se modifican
--      en este paso — siguen filtrando por edge_function. La generalización
--      se hará cuando Spanish B Paper 1 entre en producción.
--
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT para que se pueda re-aplicar.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Curso Spanish B en el catálogo (inactivo) ─────────────────────────────

INSERT INTO public.courses (key, name_es, name_en, response_language, is_active)
VALUES (
  'spanish-b-language',
  'Español B (Adquisición)',
  'Spanish B (Acquisition)',
  'en',
  false
)
ON CONFLICT (key) DO NOTHING;

-- ── 2. criteria_scores JSONB en tablas de evaluación ─────────────────────────

ALTER TABLE public.evaluaciones
  ADD COLUMN IF NOT EXISTS criteria_scores JSONB;

ALTER TABLE public.evaluaciones_prueba2
  ADD COLUMN IF NOT EXISTS criteria_scores JSONB;

ALTER TABLE public.evaluaciones_oral
  ADD COLUMN IF NOT EXISTS criteria_scores JSONB;

COMMENT ON COLUMN public.evaluaciones.criteria_scores IS
  'Puntuaciones por criterio en formato {key: number}. Usado por cursos cuyo set de criterios no coincide con banda_a/b/c/d (ej. Spanish B). Nullable.';
COMMENT ON COLUMN public.evaluaciones_prueba2.criteria_scores IS
  'Puntuaciones por criterio en formato {key: number}. Reservado para futuros sets de criterios fuera de A/B1/B2/C/D. Nullable.';
COMMENT ON COLUMN public.evaluaciones_oral.criteria_scores IS
  'Puntuaciones por criterio en formato {key: number}. Reservado para futuros sets de criterios fuera de A/B/C/D. Nullable.';

-- ── 3. course_key en llm_uso para cuotas por curso ───────────────────────────

ALTER TABLE public.llm_uso
  ADD COLUMN IF NOT EXISTS course_key TEXT REFERENCES public.courses(key);

CREATE INDEX IF NOT EXISTS idx_llm_uso_user_course_function_created
  ON public.llm_uso(user_id, course_key, edge_function, created_at DESC);

COMMENT ON COLUMN public.llm_uso.course_key IS
  'Curso asociado a la llamada LLM. Nullable por compatibilidad histórica; las nuevas inserciones desde Edge Functions deberían poblarlo.';

COMMIT;
