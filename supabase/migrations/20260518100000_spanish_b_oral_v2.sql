-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish B — Oral Individual v2: alinear con la Guía de Lengua B (1.ª eval. 2020)
--
-- La estructura oficial del Oral usa 4 subcriterios:
--   A  · Lengua                       /12
--   B1 · Mensaje (estímulo/pasaje)    /6
--   B2 · Mensaje (conversación)       /6
--   C  · Destrezas de interacción     /6   → total /30
--
-- Esta migración ALTERA la tabla existente (el curso está activo; no se recrea
-- para preservar el historial). Backfill no destructivo desde el antiguo
-- criterio_b. También añade soporte de estímulo literario (NS) en prompts_oral_b.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. evaluaciones_oral_b: pasar de A/B/C (0-10) a A(0-12)/B1/B2/C(0-6) ──────

-- La columna generada depende de criterio_b: hay que eliminarla antes de tocar.
ALTER TABLE public.evaluaciones_oral_b DROP COLUMN IF EXISTS puntuacion_total;

ALTER TABLE public.evaluaciones_oral_b
  ADD COLUMN IF NOT EXISTS criterio_b1      INTEGER,
  ADD COLUMN IF NOT EXISTS criterio_b2      INTEGER,
  ADD COLUMN IF NOT EXISTS justificacion_b1 TEXT,
  ADD COLUMN IF NOT EXISTS justificacion_b2 TEXT;

-- Backfill: repartir el antiguo criterio_b (0-10) en dos mitades acotadas a 0-6.
UPDATE public.evaluaciones_oral_b
SET criterio_b1 = LEAST(CEIL(criterio_b::numeric / 2)::int, 6),
    criterio_b2 = LEAST(FLOOR(criterio_b::numeric / 2)::int, 6)
WHERE criterio_b1 IS NULL OR criterio_b2 IS NULL;

-- criterio_c pasa de 0-10 a 0-6: acotar valores históricos al nuevo máximo.
UPDATE public.evaluaciones_oral_b
SET criterio_c = LEAST(criterio_c, 6);

-- Seguridad: ninguna fila debe quedar NULL en los nuevos subcriterios.
UPDATE public.evaluaciones_oral_b
SET criterio_b1 = COALESCE(criterio_b1, 0),
    criterio_b2 = COALESCE(criterio_b2, 0);

ALTER TABLE public.evaluaciones_oral_b
  ALTER COLUMN criterio_b1 SET NOT NULL,
  ALTER COLUMN criterio_b2 SET NOT NULL;

-- criterio_b queda obsoleto pero se conserva (nullable) por compatibilidad.
ALTER TABLE public.evaluaciones_oral_b ALTER COLUMN criterio_b DROP NOT NULL;

-- Ajustar rangos de los CHECK (nombres auto-generados por columna).
ALTER TABLE public.evaluaciones_oral_b
  DROP CONSTRAINT IF EXISTS evaluaciones_oral_b_criterio_a_check,
  DROP CONSTRAINT IF EXISTS evaluaciones_oral_b_criterio_c_check;

ALTER TABLE public.evaluaciones_oral_b
  ADD CONSTRAINT evaluaciones_oral_b_criterio_a_check  CHECK (criterio_a  BETWEEN 0 AND 12),
  ADD CONSTRAINT evaluaciones_oral_b_criterio_b1_check CHECK (criterio_b1 BETWEEN 0 AND 6),
  ADD CONSTRAINT evaluaciones_oral_b_criterio_b2_check CHECK (criterio_b2 BETWEEN 0 AND 6),
  ADD CONSTRAINT evaluaciones_oral_b_criterio_c_check  CHECK (criterio_c  BETWEEN 0 AND 6);

-- Recrear el total generado /30 con la nueva estructura.
ALTER TABLE public.evaluaciones_oral_b
  ADD COLUMN puntuacion_total INTEGER
    GENERATED ALWAYS AS (criterio_a + criterio_b1 + criterio_b2 + criterio_c) STORED;

-- ── 2. prompts_oral_b: soporte de estímulo literario (NS) ─────────────────────

ALTER TABLE public.prompts_oral_b
  ADD COLUMN IF NOT EXISTS tipo                TEXT NOT NULL DEFAULT 'visual'
                                               CHECK (tipo IN ('visual', 'literario')),
  ADD COLUMN IF NOT EXISTS literary_passage_es TEXT,
  ADD COLUMN IF NOT EXISTS literary_passage_en TEXT,
  ADD COLUMN IF NOT EXISTS obra                TEXT,
  ADD COLUMN IF NOT EXISTS autor               TEXT;

COMMIT;
