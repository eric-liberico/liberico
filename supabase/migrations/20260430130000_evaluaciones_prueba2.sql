-- Tabla principal de evaluaciones de Prueba 2 (ensayo comparativo IB)
CREATE TABLE public.evaluaciones_prueba2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  pregunta text NOT NULL,
  obra_1 text NOT NULL,
  obra_2 text NOT NULL,
  notas_obra_1 text,
  notas_obra_2 text,
  ensayo_estudiante text NOT NULL,

  criterio_a int NOT NULL CHECK (criterio_a BETWEEN 0 AND 5),
  criterio_b1 int NOT NULL CHECK (criterio_b1 BETWEEN 0 AND 5),
  criterio_b2 int NOT NULL CHECK (criterio_b2 BETWEEN 0 AND 5),
  criterio_c int NOT NULL CHECK (criterio_c BETWEEN 0 AND 5),
  criterio_d int NOT NULL CHECK (criterio_d BETWEEN 0 AND 5),

  puntuacion_total int GENERATED ALWAYS AS (
    criterio_a + criterio_b1 + criterio_b2 + criterio_c + criterio_d
  ) STORED,

  justificacion_a text,
  justificacion_b1 text,
  justificacion_b2 text,
  justificacion_c text,
  justificacion_d text,

  fortalezas text,
  areas_mejora text,
  comentario_global text,

  diagnostico_comparativo jsonb,
  anotaciones jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluaciones_prueba2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own evaluaciones_prueba2"
  ON public.evaluaciones_prueba2 FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own evaluaciones_prueba2"
  ON public.evaluaciones_prueba2 FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own evaluaciones_prueba2"
  ON public.evaluaciones_prueba2 FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX evaluaciones_prueba2_user_created_idx
  ON public.evaluaciones_prueba2(user_id, created_at DESC);

-- RPC atómica para reservar cuota de Prueba 2
-- Usa pg_advisory_xact_lock para evitar condiciones de carrera (idéntico patrón a reservar_cuota_evaluacion)
CREATE OR REPLACE FUNCTION public.reservar_cuota_prueba2(
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
  PERFORM pg_advisory_xact_lock(hashtext('paper2:' || p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id = p_user_id
      AND edge_function = 'evaluate-paper2'
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
    'evaluate-paper2',
    'claude-opus-4-7',
    0,
    0
  )
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_prueba2(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_cuota_prueba2(uuid, integer) TO service_role;
