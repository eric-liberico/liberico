-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2 — Spanish B Paper 1 backend
--
-- Cambios:
--   1. Tabla `prompts_paper1_b` con catálogo de estímulos para Spanish B P1.
--      RLS: lectura autenticada de prompts activos; escritura solo admin.
--   2. Columna `paper` en `llm_uso` (nullable, retrocompatible) — habilita
--      cuotas por (user, course, paper) sin chocar con cuotas legacy por
--      edge_function.
--   3. RPC generalizada `reservar_cuota_paper(user, course_key, paper, limite)`
--      — usa pg_advisory_xact_lock + placeholder en llm_uso. La nueva edge
--      function `evaluate-paper1-b` invoca esta RPC. Los EFs Lit existentes
--      siguen usando sus RPCs específicas (`reservar_cuota_evaluacion`,
--      `_prueba2`, `_oral`, `_apuntes_oral`) sin cambios.
--   4. Seed: 3 prompts iniciales placeholder para que `/prueba-1` Spanish B
--      sea testeable end-to-end. Marcados con `activo=false` para que no se
--      muestren en producción hasta que admin los apruebe.
--
-- El curso `spanish-b-language` permanece `is_active=false` (de la migración
-- de Phase 1) hasta que se aplique la activación final junto al UI.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 0. evaluaciones_paper1_b ─────────────────────────────────────────────────
-- Tabla dedicada para Spanish B P1. La existente `evaluaciones` no sirve:
-- impone banda_a..d 0-5 NOT NULL con puntuacion_total generada como suma,
-- mientras que Spanish B usa A 0-12, B 0-12, C 0-6 (= /30). Sigue el patrón
-- ya establecido por evaluaciones_prueba2 y evaluaciones_oral.
--
-- Nota de orden: la FK a prompts_paper1_b se crea con ALTER TABLE más abajo,
-- después de que esa tabla exista. Mantenemos el campo aquí sin FK por ahora.

CREATE TABLE IF NOT EXISTS public.evaluaciones_paper1_b (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_key    TEXT         NOT NULL DEFAULT 'spanish-b-language' REFERENCES public.courses(key),
  nivel         TEXT         NOT NULL DEFAULT 'SL' CHECK (nivel IN ('SL','HL')),

  -- Inputs del estímulo
  text_type     TEXT         NOT NULL CHECK (text_type IN (
                  'blog','email','article','brochure','speech','interview',
                  'instructions','leaflet','proposal','report','review'
                )),
  theme         TEXT         NOT NULL CHECK (theme IN (
                  'identidades','experiencias','ingenio_humano',
                  'organizacion_social','planeta_compartido'
                )),
  prompt_id     UUID,  -- FK añadida tras crear prompts_paper1_b (más abajo)
  prompt_text   TEXT         NOT NULL,
  student_response TEXT      NOT NULL,
  word_count    INTEGER      NOT NULL CHECK (word_count >= 0),

  -- Puntuaciones por criterio
  criterio_a    INTEGER      NOT NULL CHECK (criterio_a BETWEEN 0 AND 12),
  criterio_b    INTEGER      NOT NULL CHECK (criterio_b BETWEEN 0 AND 12),
  criterio_c    INTEGER      NOT NULL CHECK (criterio_c BETWEEN 0 AND 6),
  puntuacion_total INTEGER   GENERATED ALWAYS AS (criterio_a + criterio_b + criterio_c) STORED,
  nota_ib       INTEGER      CHECK (nota_ib IS NULL OR nota_ib BETWEEN 1 AND 7),

  -- Justificaciones por criterio
  justificacion_a TEXT,
  justificacion_b TEXT,
  justificacion_c TEXT,

  -- Feedback global
  comentario_global TEXT,
  fortalezas    TEXT,
  areas_mejora  TEXT,

  -- Datos estructurados
  errores_lengua          JSONB,
  apropiacion_tipo_texto  JSONB,

  -- Idioma del feedback (driver: uiLang del alumno al pedir la evaluación)
  feedback_lang TEXT         NOT NULL DEFAULT 'en' CHECK (feedback_lang IN ('es','en')),

  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluaciones_paper1_b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluaciones_paper1_b_select_own"
  ON public.evaluaciones_paper1_b FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE POLICY "evaluaciones_paper1_b_insert_own"
  ON public.evaluaciones_paper1_b FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE POLICY "evaluaciones_paper1_b_delete_own"
  ON public.evaluaciones_paper1_b FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_eval_paper1_b_user_created
  ON public.evaluaciones_paper1_b(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_paper1_b_course_key
  ON public.evaluaciones_paper1_b(course_key);

-- ── 1. prompts_paper1_b ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prompts_paper1_b (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  text_type   TEXT         NOT NULL CHECK (text_type IN (
                'blog','email','article','brochure','speech','interview',
                'instructions','leaflet','proposal','report','review'
              )),
  theme       TEXT         NOT NULL CHECK (theme IN (
                'identidades','experiencias','ingenio_humano',
                'organizacion_social','planeta_compartido'
              )),
  nivel       TEXT         NOT NULL DEFAULT 'SL' CHECK (nivel IN ('SL','HL')),
  title_es    TEXT         NOT NULL,
  title_en    TEXT         NOT NULL,
  context_es  TEXT         NOT NULL,
  context_en  TEXT         NOT NULL,
  activo      BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.prompts_paper1_b ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompts_paper1_b_select_active_authenticated"
  ON public.prompts_paper1_b FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "prompts_paper1_b_admin_all"
  ON public.prompts_paper1_b FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_prompts_paper1_b_activo_text_type
  ON public.prompts_paper1_b(activo, text_type);

-- FK diferida: ahora que prompts_paper1_b existe, añadir el constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'evaluaciones_paper1_b_prompt_id_fkey'
  ) THEN
    ALTER TABLE public.evaluaciones_paper1_b
      ADD CONSTRAINT evaluaciones_paper1_b_prompt_id_fkey
      FOREIGN KEY (prompt_id) REFERENCES public.prompts_paper1_b(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ── 2. paper column en llm_uso ───────────────────────────────────────────────

ALTER TABLE public.llm_uso
  ADD COLUMN IF NOT EXISTS paper TEXT
  CHECK (paper IS NULL OR paper IN ('p1','p2','oral'));

CREATE INDEX IF NOT EXISTS idx_llm_uso_user_course_paper_created
  ON public.llm_uso(user_id, course_key, paper, created_at DESC)
  WHERE course_key IS NOT NULL AND paper IS NOT NULL;

COMMENT ON COLUMN public.llm_uso.paper IS
  'Papel del IB asociado a la llamada LLM (p1|p2|oral). Nullable por compat. Usado por la RPC reservar_cuota_paper para cuotas por (user, course, paper, 24h).';

-- ── 3. RPC genérica reservar_cuota_paper ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reservar_cuota_paper(
  p_user_id     UUID,
  p_course_key  TEXT,
  p_paper       TEXT,
  p_limite      INTEGER,
  p_edge_function TEXT,
  p_modelo      TEXT DEFAULT 'claude-opus-4-7'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id   uuid;
  v_hace24h  timestamptz := now() - interval '24 hours';
BEGIN
  -- Lock por (user, course, paper) para serializar comprobaciones concurrentes.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text || '|' || p_course_key || '|' || p_paper)::bigint
  );

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id     = p_user_id
      AND course_key  = p_course_key
      AND paper       = p_paper
      AND created_at >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;  -- cuota agotada
  END IF;

  INSERT INTO public.llm_uso (
    user_id, edge_function, modelo, tokens_entrada, tokens_salida,
    course_key, paper
  )
  VALUES (
    p_user_id, p_edge_function, p_modelo, 0, 0,
    p_course_key, p_paper
  )
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_paper(uuid, text, text, integer, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reservar_cuota_paper(uuid, text, text, integer, text, text) TO service_role;

-- ── 4. Seed inicial: 3 prompts placeholder (inactivos) ───────────────────────
-- Estos prompts existen solo para que el sistema sea testeable end-to-end.
-- Marcados activo=false; el admin los activa cuando estén revisados.

INSERT INTO public.prompts_paper1_b (text_type, theme, title_es, title_en, context_es, context_en, activo) VALUES
(
  'blog',
  'experiencias',
  'Experiencia inolvidable',
  'An unforgettable experience',
  'Has vivido recientemente una experiencia que cambió tu manera de ver el mundo. Escribe una entrada de blog (250–400 palabras) dirigida a otros adolescentes, contando qué te pasó, qué sentiste y qué aprendiste. Usa un tono personal y cercano. Incluye un título atractivo y al menos un párrafo donde reflexiones sobre el aprendizaje.',
  'You recently had an experience that changed how you see the world. Write a blog post (250–400 words) addressed to other teenagers, telling what happened, what you felt and what you learned. Use a personal, close tone. Include an engaging title and at least one paragraph reflecting on what you learned.',
  false
),
(
  'article',
  'planeta_compartido',
  'Sostenibilidad en mi ciudad',
  'Sustainability in my city',
  'Tu profesor de español te ha pedido que escribas un artículo (250–400 palabras) para la revista escolar sobre una iniciativa local de sostenibilidad (transporte, residuos, energía, espacios verdes…). Describe la iniciativa, explica por qué es importante para tu comunidad y propón cómo los estudiantes pueden participar. Mantén un registro semi-formal apropiado para una revista escolar.',
  'Your Spanish teacher has asked you to write an article (250–400 words) for the school magazine about a local sustainability initiative (transport, waste, energy, green spaces…). Describe the initiative, explain why it matters to your community and propose how students can take part. Keep a semi-formal register appropriate for a school magazine.',
  false
),
(
  'email',
  'organizacion_social',
  'Carta al alcalde',
  'Letter to the mayor',
  'Has notado un problema en tu barrio que afecta a los jóvenes (transporte, instalaciones deportivas, espacios de estudio, seguridad…). Escribe un correo electrónico formal (250–400 palabras) al alcalde de tu ciudad. Saluda con la fórmula adecuada, describe el problema con datos o ejemplos concretos, propone una solución viable y termina con una despedida formal.',
  'You have noticed a problem in your neighbourhood that affects young people (transport, sports facilities, study spaces, safety…). Write a formal email (250–400 words) to the mayor of your city. Open with the right salutation, describe the problem with concrete examples or data, propose a feasible solution, and close with a formal sign-off.',
  false
)
ON CONFLICT DO NOTHING;

COMMIT;
