-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish B — Lectura / Paper 2 (comprensión lectora)
--
-- Cambios:
--   1. Tabla `textos_paper2_b`: banco de textos auténticos para comprensión.
--   2. Tabla `evaluaciones_paper2_b`: respuestas del alumno + evaluación IA.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. textos_paper2_b ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.textos_paper2_b (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  theme       TEXT         NOT NULL CHECK (theme IN (
                'identidades', 'experiencias', 'ingenio_humano',
                'organizacion_social', 'planeta_compartido'
              )),
  title_es    TEXT         NOT NULL,
  title_en    TEXT         NOT NULL,
  text_es     TEXT         NOT NULL,   -- texto auténtico en español
  source      TEXT,                    -- fuente / atribución (autor, publicación, año)
  word_count  INTEGER,
  activo      BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.textos_paper2_b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "textos_paper2_b_select_active_authenticated"
  ON public.textos_paper2_b FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "textos_paper2_b_admin_all"
  ON public.textos_paper2_b FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_textos_paper2_b_activo_theme
  ON public.textos_paper2_b(activo, theme);

-- ── 2. evaluaciones_paper2_b ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.evaluaciones_paper2_b (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_key       TEXT         NOT NULL DEFAULT 'spanish-b-language' REFERENCES public.courses(key),
  nivel            TEXT         NOT NULL DEFAULT 'SL' CHECK (nivel IN ('SL', 'HL')),

  -- Texto leído
  texto_id         UUID,        -- FK a textos_paper2_b (nullable si texto custom)
  texto_content    TEXT         NOT NULL,  -- snapshot del texto al momento de la evaluación
  theme            TEXT         NOT NULL CHECK (theme IN (
                     'identidades', 'experiencias', 'ingenio_humano',
                     'organizacion_social', 'planeta_compartido'
                   )),

  -- Preguntas y respuestas (JSON arrays de strings)
  preguntas        JSONB        NOT NULL DEFAULT '[]',
  respuestas       JSONB        NOT NULL DEFAULT '[]',

  -- Criterios A/B (0-10 cada uno)
  criterio_a       INTEGER      NOT NULL CHECK (criterio_a BETWEEN 0 AND 10),
  criterio_b       INTEGER      NOT NULL CHECK (criterio_b BETWEEN 0 AND 10),
  puntuacion_total INTEGER      GENERATED ALWAYS AS (criterio_a + criterio_b) STORED,
  nota_ib          INTEGER      CHECK (nota_ib IS NULL OR nota_ib BETWEEN 1 AND 7),

  -- Feedback
  justificacion_a  TEXT,
  justificacion_b  TEXT,
  comentario_global TEXT,
  fortalezas       TEXT,
  areas_mejora     TEXT,

  feedback_lang    TEXT         NOT NULL DEFAULT 'en' CHECK (feedback_lang IN ('es', 'en')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluaciones_paper2_b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluaciones_paper2_b_select_own"
  ON public.evaluaciones_paper2_b FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE POLICY "evaluaciones_paper2_b_insert_own"
  ON public.evaluaciones_paper2_b FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE POLICY "evaluaciones_paper2_b_delete_own"
  ON public.evaluaciones_paper2_b FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_eval_paper2_b_user_created
  ON public.evaluaciones_paper2_b(user_id, created_at DESC);

-- FK diferida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_paper2_b_texto_id_fkey'
  ) THEN
    ALTER TABLE public.evaluaciones_paper2_b
      ADD CONSTRAINT evaluaciones_paper2_b_texto_id_fkey
      FOREIGN KEY (texto_id) REFERENCES public.textos_paper2_b(id) ON DELETE SET NULL;
  END IF;
END
$$;

COMMIT;
