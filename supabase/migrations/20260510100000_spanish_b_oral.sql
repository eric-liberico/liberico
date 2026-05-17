-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish B — Oral Individual
--
-- Cambios:
--   1. Tabla `evaluaciones_oral_b`: resultados del oral evaluado por IA.
--   2. Tabla `prompts_oral_b`: banco de estímulos visuales.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. evaluaciones_oral_b ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.evaluaciones_oral_b (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_key            TEXT         NOT NULL DEFAULT 'spanish-b-language' REFERENCES public.courses(key),
  nivel                 TEXT         NOT NULL DEFAULT 'SL' CHECK (nivel IN ('SL', 'HL')),

  -- Estímulo visual
  stimulus_id           UUID,  -- FK a prompts_oral_b (añadida más abajo)
  stimulus_description  TEXT         NOT NULL,
  global_issue          TEXT         NOT NULL,  -- cuestión global (temática elegida)
  theme                 TEXT         NOT NULL CHECK (theme IN (
                          'identidades', 'experiencias', 'ingenio_humano',
                          'organizacion_social', 'planeta_compartido'
                        )),

  -- Guion / transcripción del alumno
  guion                 TEXT         NOT NULL,
  word_count            INTEGER      NOT NULL DEFAULT 0 CHECK (word_count >= 0),

  -- Criterios A/B/C (0-10 cada uno)
  criterio_a            INTEGER      NOT NULL CHECK (criterio_a BETWEEN 0 AND 10),
  criterio_b            INTEGER      NOT NULL CHECK (criterio_b BETWEEN 0 AND 10),
  criterio_c            INTEGER      NOT NULL CHECK (criterio_c BETWEEN 0 AND 10),
  puntuacion_total      INTEGER      GENERATED ALWAYS AS (criterio_a + criterio_b + criterio_c) STORED,
  nota_ib               INTEGER      CHECK (nota_ib IS NULL OR nota_ib BETWEEN 1 AND 7),

  -- Feedback
  justificacion_a       TEXT,
  justificacion_b       TEXT,
  justificacion_c       TEXT,
  comentario_global     TEXT,
  fortalezas            TEXT,
  areas_mejora          TEXT,

  feedback_lang         TEXT         NOT NULL DEFAULT 'en' CHECK (feedback_lang IN ('es', 'en')),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluaciones_oral_b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluaciones_oral_b_select_own"
  ON public.evaluaciones_oral_b FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE POLICY "evaluaciones_oral_b_insert_own"
  ON public.evaluaciones_oral_b FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE POLICY "evaluaciones_oral_b_delete_own"
  ON public.evaluaciones_oral_b FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_eval_oral_b_user_created
  ON public.evaluaciones_oral_b(user_id, created_at DESC);

-- ── 2. prompts_oral_b ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prompts_oral_b (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  theme           TEXT         NOT NULL CHECK (theme IN (
                    'identidades', 'experiencias', 'ingenio_humano',
                    'organizacion_social', 'planeta_compartido'
                  )),
  image_url       TEXT,        -- URL pública de la imagen (opcional)
  title_es        TEXT         NOT NULL,
  title_en        TEXT         NOT NULL,
  description_es  TEXT         NOT NULL,  -- descripción del estímulo para el alumno (ES)
  description_en  TEXT         NOT NULL,  -- descripción del estímulo para el alumno (EN)
  activo          BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.prompts_oral_b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompts_oral_b_select_active_authenticated"
  ON public.prompts_oral_b FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "prompts_oral_b_admin_all"
  ON public.prompts_oral_b FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_prompts_oral_b_activo_theme
  ON public.prompts_oral_b(activo, theme);

-- FK diferida: vincular evaluaciones con el estímulo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_oral_b_stimulus_id_fkey'
  ) THEN
    ALTER TABLE public.evaluaciones_oral_b
      ADD CONSTRAINT evaluaciones_oral_b_stimulus_id_fkey
      FOREIGN KEY (stimulus_id) REFERENCES public.prompts_oral_b(id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMIT;
