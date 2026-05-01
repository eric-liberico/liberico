-- Módulo Oral Individual: tabla, RLS, índice y RPC de cuota

CREATE TABLE public.evaluaciones_oral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  tipo_oral text NOT NULL CHECK (tipo_oral IN ('taught', 'self_taught')),

  asunto_global text NOT NULL,

  obra_1_titulo text NOT NULL,
  obra_1_autor text,
  obra_1_tipo text NOT NULL CHECK (obra_1_tipo IN ('original_espanol', 'traducida', 'no_especificado')),
  extracto_1 text,
  notas_obra_1 text,

  obra_2_titulo text NOT NULL,
  obra_2_autor text,
  obra_2_tipo text NOT NULL CHECK (obra_2_tipo IN ('original_espanol', 'traducida', 'no_especificado')),
  extracto_2 text,
  notas_obra_2 text,

  guion_oral text NOT NULL,

  criterio_a int NOT NULL CHECK (criterio_a BETWEEN 0 AND 10),
  criterio_b int NOT NULL CHECK (criterio_b BETWEEN 0 AND 10),
  criterio_c int NOT NULL CHECK (criterio_c BETWEEN 0 AND 10),
  criterio_d int NOT NULL CHECK (criterio_d BETWEEN 0 AND 10),

  puntuacion_total int GENERATED ALWAYS AS (
    criterio_a + criterio_b + criterio_c + criterio_d
  ) STORED,

  duracion_estimada_minutos numeric,

  justificacion_a text,
  justificacion_b text,
  justificacion_c text,
  justificacion_d text,

  fortalezas text,
  areas_mejora text,
  comentario_global text,

  diagnostico_asunto_global jsonb,
  diagnostico_equilibrio jsonb,
  diagnostico_estructura jsonb,
  preguntas_profesor jsonb,
  zonas_desarrollo_self_taught jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluaciones_oral ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own evaluaciones_oral"
  ON public.evaluaciones_oral FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own evaluaciones_oral"
  ON public.evaluaciones_oral FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own evaluaciones_oral"
  ON public.evaluaciones_oral FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX evaluaciones_oral_user_created_idx
  ON public.evaluaciones_oral(user_id, created_at DESC);

-- RPC de cuota diaria (independiente de P1 y P2)
CREATE OR REPLACE FUNCTION public.reservar_cuota_oral(
  p_user_id uuid,
  p_limite integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id uuid;
  v_hace24h timestamptz := now() - interval '24 hours';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('oral:' || p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id = p_user_id
      AND edge_function = 'evaluate-oral'
      AND created_at >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (
    user_id,
    edge_function,
    modelo,
    tokens_entrada,
    tokens_salida
  )
  VALUES (
    p_user_id,
    'evaluate-oral',
    'claude-opus-4-7',
    0,
    0
  )
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_oral(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_cuota_oral(uuid, integer) TO service_role;
