-- Endurece el control de uso LLM y hace atómico el reemplazo del plan activo.

CREATE INDEX IF NOT EXISTS idx_llm_uso_user_function_created
  ON public.llm_uso(user_id, edge_function, created_at DESC);

DROP POLICY IF EXISTS "users_read_own_llm_uso" ON public.llm_uso;
CREATE POLICY "users_read_own_llm_uso"
  ON public.llm_uso FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.replace_study_plan(
  p_resumen_diagnostico TEXT,
  p_enfoque_principal TEXT,
  p_semanas_totales INTEGER,
  p_preliminar BOOLEAN,
  p_tareas JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plan_id UUID;
  v_tarea JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE user_id = v_user_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'Perfil no activo';
  END IF;

  IF length(trim(coalesce(p_resumen_diagnostico, ''))) = 0
     OR length(trim(coalesce(p_enfoque_principal, ''))) = 0 THEN
    RAISE EXCEPTION 'El plan no tiene resumen o enfoque';
  END IF;

  IF p_semanas_totales IS NULL OR p_semanas_totales < 1 OR p_semanas_totales > 104 THEN
    RAISE EXCEPTION 'Número de semanas inválido';
  END IF;

  IF p_tareas IS NULL
     OR jsonb_typeof(p_tareas) <> 'array'
     OR jsonb_array_length(p_tareas) = 0
     OR jsonb_array_length(p_tareas) > 400 THEN
    RAISE EXCEPTION 'Lista de tareas inválida';
  END IF;

  FOR v_tarea IN SELECT * FROM jsonb_array_elements(p_tareas)
  LOOP
    IF jsonb_typeof(v_tarea) <> 'object'
       OR length(trim(coalesce(v_tarea->>'titulo', ''))) = 0
       OR length(trim(coalesce(v_tarea->>'descripcion', ''))) = 0
       OR (v_tarea->>'tipo') NOT IN ('lectura', 'ejercicio', 'analisis_practica', 'repaso_teoria')
       OR (v_tarea->>'criterio_objetivo') NOT IN ('A', 'B', 'C', 'D', 'global')
       OR coalesce((v_tarea->>'semana')::INTEGER, 0) < 1
       OR coalesce((v_tarea->>'duracion_estimada_min')::INTEGER, 0) < 1 THEN
      RAISE EXCEPTION 'Tarea de plan inválida';
    END IF;
  END LOOP;

  UPDATE public.planes_estudio
  SET activo = false
  WHERE user_id = v_user_id AND activo = true;

  INSERT INTO public.planes_estudio (
    user_id,
    resumen_diagnostico,
    enfoque_principal,
    semanas_totales,
    preliminar,
    activo
  )
  VALUES (
    v_user_id,
    p_resumen_diagnostico,
    p_enfoque_principal,
    p_semanas_totales,
    p_preliminar,
    true
  )
  RETURNING id INTO v_plan_id;

  FOR v_tarea IN SELECT * FROM jsonb_array_elements(p_tareas)
  LOOP
    INSERT INTO public.tareas_plan (
      plan_id,
      semana,
      titulo,
      descripcion,
      tipo,
      criterio_objetivo,
      duracion_estimada_min
    )
    VALUES (
      v_plan_id,
      (v_tarea->>'semana')::INTEGER,
      v_tarea->>'titulo',
      v_tarea->>'descripcion',
      v_tarea->>'tipo',
      v_tarea->>'criterio_objetivo',
      (v_tarea->>'duracion_estimada_min')::INTEGER
    );
  END LOOP;

  RETURN v_plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_study_plan(
  TEXT,
  TEXT,
  INTEGER,
  BOOLEAN,
  JSONB
) TO authenticated;
